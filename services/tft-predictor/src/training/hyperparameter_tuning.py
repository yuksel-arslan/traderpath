"""
Optuna ile Hyperparameter Optimization
Trade type'a göre optimize edilmiş model parametreleri bulur
"""

import optuna
from optuna.samplers import TPESampler
from optuna.pruners import MedianPruner
import torch
# Use lightning.pytorch instead of pytorch_lightning for compatibility with pytorch-forecasting 1.1.0+
import lightning.pytorch as pl
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import QuantileLoss, SMAPE, MAE, MAPE
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Callable
from pathlib import Path
from loguru import logger
from datetime import datetime
import json

from .config import TradeTypeConfig, TrainingConfig


class HyperparameterTuner:
    """
    Optuna ile TFT model hyperparameter optimization.

    Features:
    - Trade type'a göre arama alanı belirleme
    - Early stopping ile verimsiz trial'ları kesme
    - Best model checkpoint kaydetme
    - Detaylı optimization log'u
    """

    def __init__(
        self,
        config: TrainingConfig,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        metadata: Dict
    ):
        self.config = config
        self.trade_config = config.trade_type_config
        self.train_df = train_df
        self.val_df = val_df
        self.metadata = metadata

        self.study: Optional[optuna.Study] = None
        self.best_params: Optional[Dict] = None
        self.best_model: Optional[TemporalFusionTransformer] = None

    def create_objective(self) -> Callable:
        """Optuna objective function oluştur"""

        def objective(trial: optuna.Trial) -> float:
            # Hyperparameters to tune
            hidden_size = trial.suggest_int(
                'hidden_size',
                self.trade_config.hidden_size_range[0],
                self.trade_config.hidden_size_range[1],
                step=16
            )

            attention_head_size = trial.suggest_int(
                'attention_head_size',
                self.trade_config.attention_heads_range[0],
                self.trade_config.attention_heads_range[1]
            )

            dropout = trial.suggest_float(
                'dropout',
                self.trade_config.dropout_range[0],
                self.trade_config.dropout_range[1]
            )

            learning_rate = trial.suggest_float(
                'learning_rate',
                self.trade_config.learning_rate_range[0],
                self.trade_config.learning_rate_range[1],
                log=True
            )

            hidden_continuous_size = trial.suggest_int(
                'hidden_continuous_size',
                16, min(hidden_size, 64),
                step=8
            )

            lstm_layers = trial.suggest_int('lstm_layers', 1, 3)

            reduce_on_plateau_patience = trial.suggest_int(
                'reduce_on_plateau_patience', 2, 6
            )

            # Create dataset
            try:
                training_dataset = self._create_dataset(self.train_df, is_training=True)
                validation_dataset = TimeSeriesDataSet.from_dataset(
                    training_dataset,
                    self.val_df,
                    predict=True,
                    stop_randomization=True
                )
            except Exception as e:
                logger.warning(f"Dataset creation failed: {e}")
                return float('inf')

            # Create dataloaders
            train_dataloader = training_dataset.to_dataloader(
                train=True,
                batch_size=self.config.batch_size,
                num_workers=0
            )
            val_dataloader = validation_dataset.to_dataloader(
                train=False,
                batch_size=self.config.batch_size,
                num_workers=0
            )

            # Create model
            model = TemporalFusionTransformer.from_dataset(
                training_dataset,
                learning_rate=learning_rate,
                hidden_size=hidden_size,
                attention_head_size=attention_head_size,
                dropout=dropout,
                hidden_continuous_size=hidden_continuous_size,
                lstm_layers=lstm_layers,
                output_size=7,  # 7 quantiles
                loss=QuantileLoss(quantiles=[0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98]),
                reduce_on_plateau_patience=reduce_on_plateau_patience,
                logging_metrics=[SMAPE(), MAE(), MAPE()],
            )

            # Trainer with pruning callback
            trainer = pl.Trainer(
                max_epochs=30,  # Optuna trial için daha az epoch
                accelerator='gpu' if self.config.use_gpu and torch.cuda.is_available() else 'cpu',
                devices=1,
                gradient_clip_val=self.config.gradient_clip_val,
                enable_progress_bar=False,
                enable_model_summary=False,
                callbacks=[
                    pl.callbacks.EarlyStopping(
                        monitor='val_loss',
                        patience=self.trade_config.early_stopping_patience // 2,
                        mode='min'
                    ),
                    OptunaPruningCallback(trial, monitor='val_loss')
                ],
                logger=False,  # Disable logging for trials
            )

            try:
                trainer.fit(model, train_dataloader, val_dataloader)
            except optuna.TrialPruned:
                raise
            except Exception as e:
                logger.warning(f"Training failed: {e}")
                return float('inf')

            # Return validation loss
            val_loss = trainer.callback_metrics.get('val_loss', float('inf'))
            if isinstance(val_loss, torch.Tensor):
                val_loss = val_loss.item()

            return val_loss

        return objective

    def _create_dataset(
        self,
        df: pd.DataFrame,
        is_training: bool = True
    ) -> TimeSeriesDataSet:
        """TimeSeriesDataSet oluştur"""

        # Training cutoff
        if is_training:
            max_time_idx = df['time_idx'].max()
            training_cutoff = max_time_idx - self.trade_config.max_prediction_length
            df = df[df['time_idx'] <= training_cutoff]

        # Primary target
        primary_target = f'target_return_{self.trade_config.prediction_horizons[0]}h'
        if primary_target not in df.columns:
            primary_target = 'close'

        dataset = TimeSeriesDataSet(
            df,
            time_idx='time_idx',
            target=primary_target,
            group_ids=['symbol'] if 'symbol' in df.columns else ['group'],
            min_encoder_length=self.trade_config.min_encoder_length,
            max_encoder_length=self.trade_config.max_encoder_length,
            min_prediction_length=self.trade_config.min_prediction_length,
            max_prediction_length=self.trade_config.max_prediction_length,
            time_varying_known_reals=self.metadata.get('time_varying_known', []),
            time_varying_unknown_reals=[
                c for c in self.metadata.get('time_varying_unknown', [])
                if c in df.columns
            ],
            target_normalizer=GroupNormalizer(
                groups=['symbol'] if 'symbol' in df.columns else ['group'],
                transformation='softplus'
            ),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True,
        )

        return dataset

    def optimize(
        self,
        n_trials: Optional[int] = None,
        timeout_hours: Optional[float] = None,
        show_progress: bool = True
    ) -> Dict:
        """
        Hyperparameter optimization çalıştır.

        Returns:
            Best parameters ve study istatistikleri
        """
        n_trials = n_trials or self.config.n_optuna_trials
        timeout = (timeout_hours or self.config.optuna_timeout_hours) * 3600

        logger.info(f"Optuna optimization başlıyor...")
        logger.info(f"  Trade type: {self.trade_config.trade_type.value}")
        logger.info(f"  N trials: {n_trials}")
        logger.info(f"  Timeout: {timeout_hours or self.config.optuna_timeout_hours} saat")

        # Create study
        study_name = f"tft_{self.trade_config.trade_type.value}_{datetime.now().strftime('%Y%m%d_%H%M')}"

        self.study = optuna.create_study(
            study_name=study_name,
            direction='minimize',
            sampler=TPESampler(seed=self.config.seed),
            pruner=MedianPruner(
                n_startup_trials=5,
                n_warmup_steps=10,
                interval_steps=1
            )
        )

        # Run optimization
        self.study.optimize(
            self.create_objective(),
            n_trials=n_trials,
            timeout=timeout,
            show_progress_bar=show_progress,
            gc_after_trial=True
        )

        # Get best params
        self.best_params = self.study.best_params

        logger.info(f"\nOptimization tamamlandı!")
        logger.info(f"  Best trial: {self.study.best_trial.number}")
        logger.info(f"  Best value: {self.study.best_value:.6f}")
        logger.info(f"  Best params: {self.best_params}")

        return {
            'best_params': self.best_params,
            'best_value': self.study.best_value,
            'n_trials': len(self.study.trials),
            'study_name': study_name
        }

    def get_best_model_config(self) -> Dict:
        """Best parametrelerle model config döndür"""
        if self.best_params is None:
            raise ValueError("Önce optimize() çalıştırın")

        return {
            'learning_rate': self.best_params['learning_rate'],
            'hidden_size': self.best_params['hidden_size'],
            'attention_head_size': self.best_params['attention_head_size'],
            'dropout': self.best_params['dropout'],
            'hidden_continuous_size': self.best_params['hidden_continuous_size'],
            'lstm_layers': self.best_params['lstm_layers'],
            'reduce_on_plateau_patience': self.best_params['reduce_on_plateau_patience'],
            'output_size': 7,
            'loss': 'QuantileLoss',
            'quantiles': [0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98]
        }

    def save_study_results(self, output_dir: str):
        """Study sonuçlarını kaydet"""
        if self.study is None:
            return

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save best params
        params_file = output_path / f"best_params_{self.trade_config.trade_type.value}.json"
        with open(params_file, 'w') as f:
            json.dump({
                'best_params': self.best_params,
                'best_value': self.study.best_value,
                'trade_type': self.trade_config.trade_type.value,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)

        # Save all trials
        trials_df = self.study.trials_dataframe()
        trials_file = output_path / f"trials_{self.trade_config.trade_type.value}.csv"
        trials_df.to_csv(trials_file, index=False)

        logger.info(f"Study sonuçları kaydedildi: {output_path}")

    def plot_optimization_history(self) -> Optional[object]:
        """Optimization history görselleştir"""
        if self.study is None:
            return None

        try:
            import plotly.graph_objects as go
            from optuna.visualization import (
                plot_optimization_history,
                plot_param_importances,
                plot_parallel_coordinate
            )

            # Return figure objects
            return {
                'history': plot_optimization_history(self.study),
                'importance': plot_param_importances(self.study),
                'parallel': plot_parallel_coordinate(self.study)
            }
        except ImportError:
            logger.warning("plotly yüklü değil, görselleştirme atlanıyor")
            return None


class OptunaPruningCallback(pl.Callback):
    """PyTorch Lightning callback for Optuna pruning"""

    def __init__(self, trial: optuna.Trial, monitor: str = 'val_loss'):
        self.trial = trial
        self.monitor = monitor

    def on_validation_end(self, trainer: pl.Trainer, pl_module: pl.LightningModule):
        epoch = trainer.current_epoch
        current_score = trainer.callback_metrics.get(self.monitor)

        if current_score is None:
            return

        if isinstance(current_score, torch.Tensor):
            current_score = current_score.item()

        self.trial.report(current_score, epoch)

        if self.trial.should_prune():
            raise optuna.TrialPruned()


def run_hyperparameter_search(
    config: TrainingConfig,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    metadata: Dict,
    output_dir: str = "models/optuna"
) -> Dict:
    """
    Convenience function: Hyperparameter search çalıştır
    """
    tuner = HyperparameterTuner(config, train_df, val_df, metadata)

    results = tuner.optimize()

    tuner.save_study_results(output_dir)

    return {
        **results,
        'model_config': tuner.get_best_model_config()
    }
