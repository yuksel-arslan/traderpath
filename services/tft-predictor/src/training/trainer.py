"""
Ana Training Pipeline
Tüm bileşenleri birleştiren orchestrator
"""

import asyncio
import gc
import pandas as pd
import numpy as np
import torch
# Use lightning.pytorch instead of pytorch_lightning for compatibility with pytorch-forecasting 1.1.0+
import lightning.pytorch as pl
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import QuantileLoss, SMAPE, MAE, MAPE
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime
import json
from loguru import logger

from .config import TrainingConfig, TradeType, TradeTypeConfig, TRADE_TYPE_CONFIGS
from .data_fetcher import fetch_training_data, HistoricalDataFetcher
from .feature_engineering import FeatureEngineer
from .hyperparameter_tuning import HyperparameterTuner, run_hyperparameter_search
from .walk_forward_validation import WalkForwardValidator, run_walk_forward_validation
from .backtester import Backtester, BacktestResult


class TFTTrainer:
    """
    End-to-end TFT model eğitim pipeline'ı.

    Pipeline:
    1. Veri çekme (Binance API)
    2. Feature engineering (trade type bazlı)
    3. Hyperparameter optimization (Optuna)
    4. Walk-forward validation
    5. Final model eğitimi
    6. Backtest ve performans değerlendirme
    7. Model kaydetme
    """

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.trade_config = config.trade_type_config

        # State
        self.raw_data: Dict[str, pd.DataFrame] = {}
        self.processed_data: Optional[pd.DataFrame] = None
        self.metadata: Optional[Dict] = None
        self.best_params: Optional[Dict] = None
        self.validation_results: Optional[Dict] = None
        self.backtest_results: Optional[BacktestResult] = None
        self.final_model: Optional[TemporalFusionTransformer] = None

        # Paths
        self.output_dir = Path(config.model_output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.logs_dir = Path(config.logs_dir)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    async def fetch_data(self) -> Dict[str, pd.DataFrame]:
        """Step 1: Veri çek"""
        logger.info("=" * 60)
        logger.info("STEP 1: Veri Çekme")
        logger.info("=" * 60)

        self.raw_data = await fetch_training_data(
            symbols=self.config.symbols,
            config=self.trade_config,
            cache_dir=self.config.data_cache_dir
        )

        total_samples = sum(len(df) for df in self.raw_data.values())
        logger.info(f"Toplam {len(self.raw_data)} sembol, {total_samples:,} sample çekildi")

        return self.raw_data

    def engineer_features(self) -> Tuple[pd.DataFrame, Dict]:
        """Step 2: Feature engineering"""
        logger.info("=" * 60)
        logger.info("STEP 2: Feature Engineering")
        logger.info("=" * 60)

        if not self.raw_data:
            raise ValueError("Önce fetch_data() çalıştırın")

        engineer = FeatureEngineer(self.trade_config)
        all_dfs = []

        for symbol, raw_df in self.raw_data.items():
            logger.info(f"Processing {symbol}...")

            df, metadata = engineer.engineer_features(raw_df)

            # Add group identifier
            df['group'] = symbol
            df['time_idx'] = range(len(df))

            all_dfs.append(df)
            self.metadata = metadata  # Use last metadata (same structure)

        # Combine all symbols
        self.processed_data = pd.concat(all_dfs, ignore_index=True)

        # Re-index time_idx per group
        self.processed_data['time_idx'] = self.processed_data.groupby('group').cumcount()

        logger.info(f"Toplam {len(self.processed_data):,} sample, "
                   f"{len(self.metadata['time_varying_unknown'])} feature")

        # Clear raw data to free memory
        self.raw_data = {}
        gc.collect()

        return self.processed_data, self.metadata

    def optimize_hyperparameters(
        self,
        n_trials: Optional[int] = None
    ) -> Dict:
        """Step 3: Hyperparameter optimization"""
        logger.info("=" * 60)
        logger.info("STEP 3: Hyperparameter Optimization")
        logger.info("=" * 60)

        if self.processed_data is None:
            raise ValueError("Önce engineer_features() çalıştırın")

        # Split data for optimization
        df = self.processed_data.copy()
        train_cutoff = int(len(df) * 0.7)
        val_cutoff = int(len(df) * 0.85)

        train_df = df.iloc[:train_cutoff]
        val_df = df.iloc[train_cutoff:val_cutoff]

        # Run optimization
        results = run_hyperparameter_search(
            config=self.config,
            train_df=train_df,
            val_df=val_df,
            metadata=self.metadata,
            output_dir=str(self.output_dir / "optuna")
        )

        self.best_params = results.get('model_config', {})

        logger.info(f"Best params: {self.best_params}")

        return results

    def run_walk_forward_validation(self) -> Dict:
        """Step 4: Walk-forward validation"""
        logger.info("=" * 60)
        logger.info("STEP 4: Walk-Forward Validation")
        logger.info("=" * 60)

        if self.processed_data is None:
            raise ValueError("Önce engineer_features() çalıştırın")

        self.validation_results = run_walk_forward_validation(
            config=self.config,
            df=self.processed_data,
            metadata=self.metadata,
            model_params=self.best_params
        )

        return self.validation_results

    def train_final_model(self) -> TemporalFusionTransformer:
        """Step 5: Final model eğitimi"""
        logger.info("=" * 60)
        logger.info("STEP 5: Final Model Eğitimi")
        logger.info("=" * 60)

        if self.processed_data is None:
            raise ValueError("Önce engineer_features() çalıştırın")

        df = self.processed_data.copy()

        # Use all data except last portion for test
        train_cutoff = int(len(df) * 0.85)
        train_df = df.iloc[:train_cutoff]
        val_df = df.iloc[train_cutoff:]

        # Create dataset
        primary_target = f'target_return_{self.trade_config.prediction_horizons[0]}h'
        if primary_target not in df.columns:
            primary_target = 'close'

        training_dataset = TimeSeriesDataSet(
            train_df,
            time_idx='time_idx',
            target=primary_target,
            group_ids=['group'],
            min_encoder_length=self.trade_config.min_encoder_length,
            max_encoder_length=self.trade_config.max_encoder_length,
            min_prediction_length=self.trade_config.min_prediction_length,
            max_prediction_length=self.trade_config.max_prediction_length,
            time_varying_known_reals=[
                c for c in self.metadata.get('time_varying_known', [])
                if c in df.columns
            ],
            time_varying_unknown_reals=[
                c for c in self.metadata.get('time_varying_unknown', [])
                if c in df.columns
            ],
            target_normalizer=GroupNormalizer(
                groups=['group'],
                transformation='softplus'
            ),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True,
        )

        validation_dataset = TimeSeriesDataSet.from_dataset(
            training_dataset,
            val_df,
            predict=True,
            stop_randomization=True
        )

        # Dataloaders
        # Use num_workers=0 in containerized environments (Railway) to avoid shared memory issues
        # The default /dev/shm in Docker is only 64MB which is insufficient for PyTorch multiprocessing
        num_workers = 0  # Disable multiprocessing to avoid shm errors
        train_loader = training_dataset.to_dataloader(
            train=True,
            batch_size=self.config.batch_size,
            num_workers=num_workers
        )
        val_loader = validation_dataset.to_dataloader(
            train=False,
            batch_size=self.config.batch_size,
            num_workers=num_workers
        )

        # Build model with best params (reduced defaults for memory efficiency)
        params = self.best_params or {}

        self.final_model = TemporalFusionTransformer.from_dataset(
            training_dataset,
            learning_rate=params.get('learning_rate', 0.001),
            hidden_size=params.get('hidden_size', 16),          # Reduced from 64
            attention_head_size=params.get('attention_head_size', 1),  # Reduced from 4
            dropout=params.get('dropout', 0.1),
            hidden_continuous_size=params.get('hidden_continuous_size', 8),  # Reduced from 32
            lstm_layers=params.get('lstm_layers', 1),           # Reduced from 2
            output_size=7,
            loss=QuantileLoss(quantiles=[0.1, 0.5, 0.9]),       # Reduced from 7 quantiles
            reduce_on_plateau_patience=params.get('reduce_on_plateau_patience', 4),
            logging_metrics=[MAE()],                             # Reduced metrics
        )

        logger.info(f"Model parameters: {sum(p.numel() for p in self.final_model.parameters()):,}")

        # Trainer
        checkpoint_callback = pl.callbacks.ModelCheckpoint(
            dirpath=str(self.output_dir / "checkpoints"),
            filename=f"tft_{self.trade_config.trade_type.value}_{{epoch}}_{{val_loss:.4f}}",
            monitor='val_loss',
            mode='min',
            save_top_k=3
        )

        # Use gradient accumulation to maintain effective batch size while using less memory
        # Effective batch size = batch_size * accumulate_grad_batches = 16 * 4 = 64
        accumulate_batches = getattr(self.config, 'accumulate_grad_batches', 4)

        trainer = pl.Trainer(
            max_epochs=self.config.max_epochs,
            accelerator='gpu' if self.config.use_gpu and torch.cuda.is_available() else 'cpu',
            devices=1,
            gradient_clip_val=self.config.gradient_clip_val,
            accumulate_grad_batches=accumulate_batches,
            enable_progress_bar=True,
            callbacks=[
                pl.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=self.trade_config.early_stopping_patience,
                    mode='min'
                ),
                checkpoint_callback,
                pl.callbacks.LearningRateMonitor()
            ],
        )

        # Clear memory before training
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        # Train
        logger.info("Eğitim başlıyor...")
        logger.info(f"Batch size: {self.config.batch_size}, Accumulate batches: {accumulate_batches}")
        logger.info(f"Effective batch size: {self.config.batch_size * accumulate_batches}")
        trainer.fit(self.final_model, train_loader, val_loader)

        # Load best model
        best_path = checkpoint_callback.best_model_path
        if best_path:
            self.final_model = TemporalFusionTransformer.load_from_checkpoint(best_path)
            logger.info(f"Best model loaded: {best_path}")

        return self.final_model

    def run_backtest(self) -> BacktestResult:
        """Step 6: Backtest"""
        logger.info("=" * 60)
        logger.info("STEP 6: Backtest")
        logger.info("=" * 60)

        if self.final_model is None:
            raise ValueError("Önce train_final_model() çalıştırın")

        # Get test data (last 15%)
        df = self.processed_data.copy()
        test_start = int(len(df) * 0.85)
        test_df = df.iloc[test_start:]

        # Generate predictions
        # (Simplified - in production, use proper dataloader)
        predictions_df = pd.DataFrame({
            'timestamp': test_df['timestamp'] if 'timestamp' in test_df.columns else range(len(test_df)),
            'predicted_return': np.random.randn(len(test_df)) * 0.02,  # Placeholder
            'confidence': np.random.uniform(0.5, 0.9, len(test_df))
        })

        prices_df = test_df[['timestamp', 'close', 'high', 'low']].copy() if 'timestamp' in test_df.columns else \
            pd.DataFrame({
                'timestamp': range(len(test_df)),
                'close': test_df['close'],
                'high': test_df['high'],
                'low': test_df['low']
            })

        backtester = Backtester(self.trade_config)
        self.backtest_results = backtester.run_backtest(predictions_df, prices_df)

        return self.backtest_results

    def save_model(self, filename: Optional[str] = None) -> str:
        """Step 7: Model kaydet"""
        logger.info("=" * 60)
        logger.info("STEP 7: Model Kaydetme")
        logger.info("=" * 60)

        if self.final_model is None:
            raise ValueError("Önce train_final_model() çalıştırın")

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            filename = f"tft_{self.trade_config.trade_type.value}_{timestamp}.pt"

        model_path = self.output_dir / filename
        meta_path = self.output_dir / f"{filename.replace('.pt', '_meta.json')}"

        # Save model
        torch.save({
            'model_state_dict': self.final_model.state_dict(),
            'model_hparams': dict(self.final_model.hparams),
            'best_params': self.best_params,
            'trade_type': self.trade_config.trade_type.value,
            'metadata': self.metadata,
            'training_config': {
                'symbols': self.config.symbols,
                'max_epochs': self.config.max_epochs,
                'batch_size': self.config.batch_size
            }
        }, model_path)

        # Save metadata
        meta = {
            'trade_type': self.trade_config.trade_type.value,
            'symbols': self.config.symbols,
            'best_params': self.best_params,
            'validation_results': self.validation_results,
            'backtest_results': {
                'total_trades': self.backtest_results.total_trades if self.backtest_results else 0,
                'win_rate': self.backtest_results.win_rate if self.backtest_results else 0,
                'sharpe_ratio': self.backtest_results.sharpe_ratio if self.backtest_results else 0,
                'max_drawdown': self.backtest_results.max_drawdown if self.backtest_results else 0,
            } if self.backtest_results else None,
            'created_at': datetime.now().isoformat(),
            'feature_count': len(self.metadata.get('time_varying_unknown', [])) if self.metadata else 0
        }

        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2, default=str)

        logger.info(f"Model kaydedildi: {model_path}")
        logger.info(f"Metadata kaydedildi: {meta_path}")

        return str(model_path)

    async def run_full_pipeline(
        self,
        skip_optuna: bool = False,
        skip_validation: bool = False,
        skip_backtest: bool = False
    ) -> Dict:
        """Tam pipeline çalıştır"""

        logger.info("=" * 60)
        logger.info(f"TFT TRAINING PIPELINE - {self.trade_config.trade_type.value.upper()}")
        logger.info("=" * 60)
        logger.info(f"Symbols: {self.config.symbols}")
        logger.info(f"Data interval: {self.trade_config.data_interval}")
        logger.info(f"Lookback: {self.trade_config.lookback_days} days")

        results = {}

        # Step 1: Fetch data
        await self.fetch_data()
        results['data_fetched'] = len(self.raw_data)

        # Step 2: Feature engineering
        self.engineer_features()
        results['total_samples'] = len(self.processed_data)
        results['features'] = len(self.metadata.get('time_varying_unknown', []))

        # Step 3: Hyperparameter optimization
        if not skip_optuna:
            optuna_results = self.optimize_hyperparameters()
            results['optuna'] = {
                'best_value': optuna_results.get('best_value'),
                'n_trials': optuna_results.get('n_trials')
            }

        # Step 4: Walk-forward validation
        if not skip_validation:
            validation_results = self.run_walk_forward_validation()
            results['validation'] = {
                'n_folds': validation_results.get('n_folds'),
                'mean_val_loss': validation_results.get('val_loss', {}).get('mean'),
                'mean_direction_accuracy': validation_results.get('direction_accuracy', {}).get('mean')
            }

        # Step 5: Train final model
        self.train_final_model()
        results['model_params'] = sum(p.numel() for p in self.final_model.parameters())

        # Step 6: Backtest
        if not skip_backtest:
            backtest_result = self.run_backtest()
            results['backtest'] = {
                'total_trades': backtest_result.total_trades,
                'win_rate': backtest_result.win_rate,
                'sharpe_ratio': backtest_result.sharpe_ratio,
                'max_drawdown': backtest_result.max_drawdown
            }

        # Step 7: Save model
        model_path = self.save_model()
        results['model_path'] = model_path

        logger.info("=" * 60)
        logger.info("PIPELINE TAMAMLANDI")
        logger.info("=" * 60)
        logger.info(f"Results: {json.dumps(results, indent=2, default=str)}")

        return results


async def train_tft_model(
    trade_type: TradeType,
    symbols: List[str] = None,
    skip_optuna: bool = False,
    skip_validation: bool = False
) -> Dict:
    """
    Convenience function: TFT model eğit

    Args:
        trade_type: SCALP, SWING, or POSITION
        symbols: Sembol listesi (default: BTC, ETH, SOL, BNB, XRP)
        skip_optuna: Hyperparameter optimization atla
        skip_validation: Walk-forward validation atla

    Returns:
        Training results
    """
    config = TrainingConfig(
        symbols=symbols or ["BTC", "ETH", "SOL", "BNB", "XRP"],
        trade_type=trade_type
    )

    trainer = TFTTrainer(config)
    return await trainer.run_full_pipeline(
        skip_optuna=skip_optuna,
        skip_validation=skip_validation
    )
