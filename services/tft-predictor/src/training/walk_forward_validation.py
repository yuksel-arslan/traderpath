"""
Walk-Forward Validation
Zaman serisi için doğru cross-validation yaklaşımı
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Generator
from dataclasses import dataclass
from datetime import datetime
import torch
# Use lightning.pytorch instead of pytorch_lightning for compatibility with pytorch-forecasting 1.1.0+
import lightning.pytorch as pl
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import QuantileLoss, SMAPE, MAE, MAPE
from loguru import logger

from .config import TradeTypeConfig, TrainingConfig


@dataclass
class WalkForwardFold:
    """Tek bir walk-forward fold'u"""
    fold_id: int
    train_start_idx: int
    train_end_idx: int
    val_start_idx: int
    val_end_idx: int
    test_start_idx: int
    test_end_idx: int


@dataclass
class FoldResult:
    """Fold eğitim sonucu"""
    fold_id: int
    train_loss: float
    val_loss: float
    test_metrics: Dict[str, float]
    epochs_trained: int
    best_epoch: int


class WalkForwardValidator:
    """
    Walk-Forward Cross Validation

    Standart k-fold yerine zaman serisine uygun validation:
    - Her fold'da train -> validation -> test sıralaması korunur
    - Data leakage önlenir
    - Out-of-sample test performansı ölçülür

    Örnek (5 fold):
    Fold 1: [====TRAIN====][VAL][TEST]........................
    Fold 2: .....[====TRAIN====][VAL][TEST]...................
    Fold 3: ..........[====TRAIN====][VAL][TEST]..............
    Fold 4: ...............[====TRAIN====][VAL][TEST].........
    Fold 5: ....................[====TRAIN====][VAL][TEST]....
    """

    def __init__(
        self,
        config: TrainingConfig,
        df: pd.DataFrame,
        metadata: Dict,
        model_params: Optional[Dict] = None
    ):
        self.config = config
        self.trade_config = config.trade_type_config
        self.df = df
        self.metadata = metadata
        self.model_params = model_params or {}

        self.n_splits = self.trade_config.n_walk_forward_splits
        self.results: List[FoldResult] = []

    def create_folds(self) -> List[WalkForwardFold]:
        """Walk-forward fold'ları oluştur"""
        n_samples = len(self.df)

        # Minimum requirements
        min_train = self.trade_config.min_encoder_length * 2
        min_val = self.trade_config.max_prediction_length * 2
        min_test = self.trade_config.max_prediction_length

        # Calculate fold sizes
        # Her fold için train + val + test + gap
        gap = self.trade_config.max_prediction_length  # Data leakage önlemek için gap

        # Total samples needed per fold
        samples_per_fold = (n_samples - min_train) // self.n_splits

        folds = []

        for i in range(self.n_splits):
            # Sliding window approach
            train_start = 0  # Her zaman baştan başla (expanding window)
            train_end = min_train + (i + 1) * samples_per_fold - min_val - min_test - gap

            val_start = train_end + gap
            val_end = val_start + min_val

            test_start = val_end + gap
            test_end = min(test_start + min_test, n_samples)

            if test_end <= test_start or val_end <= val_start or train_end <= train_start:
                logger.warning(f"Fold {i} oluşturulamadı, yetersiz veri")
                continue

            fold = WalkForwardFold(
                fold_id=i,
                train_start_idx=train_start,
                train_end_idx=train_end,
                val_start_idx=val_start,
                val_end_idx=val_end,
                test_start_idx=test_start,
                test_end_idx=test_end
            )
            folds.append(fold)

            logger.debug(
                f"Fold {i}: train[{train_start}:{train_end}] "
                f"val[{val_start}:{val_end}] test[{test_start}:{test_end}]"
            )

        return folds

    def _create_dataset(
        self,
        df: pd.DataFrame,
        training_dataset: Optional[TimeSeriesDataSet] = None
    ) -> TimeSeriesDataSet:
        """TimeSeriesDataSet oluştur"""

        # Primary target
        primary_target = f'target_return_{self.trade_config.prediction_horizons[0]}h'
        if primary_target not in df.columns:
            primary_target = 'close'

        if training_dataset is not None:
            # Validation/test için existing dataset'ten oluştur
            return TimeSeriesDataSet.from_dataset(
                training_dataset,
                df,
                predict=True,
                stop_randomization=True
            )

        # Training dataset
        return TimeSeriesDataSet(
            df,
            time_idx='time_idx',
            target=primary_target,
            group_ids=['symbol'] if 'symbol' in df.columns else ['group'],
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
                groups=['symbol'] if 'symbol' in df.columns else ['group'],
                transformation='softplus'
            ),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True,
        )

    def train_fold(self, fold: WalkForwardFold) -> FoldResult:
        """Tek bir fold'u eğit"""

        logger.info(f"\n{'='*50}")
        logger.info(f"Fold {fold.fold_id} eğitimi başlıyor...")
        logger.info(f"  Train: {fold.train_end_idx - fold.train_start_idx} samples")
        logger.info(f"  Val: {fold.val_end_idx - fold.val_start_idx} samples")
        logger.info(f"  Test: {fold.test_end_idx - fold.test_start_idx} samples")

        # Split data
        train_df = self.df.iloc[fold.train_start_idx:fold.train_end_idx].copy()
        val_df = self.df.iloc[fold.val_start_idx:fold.val_end_idx].copy()
        test_df = self.df.iloc[fold.test_start_idx:fold.test_end_idx].copy()

        # Ensure time_idx is sequential within each split
        for split_df in [train_df, val_df, test_df]:
            if 'group' not in split_df.columns and 'symbol' in split_df.columns:
                split_df['group'] = split_df['symbol']

        # Create datasets
        train_dataset = self._create_dataset(train_df)
        val_dataset = self._create_dataset(val_df, train_dataset)
        test_dataset = self._create_dataset(test_df, train_dataset)

        # Create dataloaders
        train_loader = train_dataset.to_dataloader(
            train=True,
            batch_size=self.config.batch_size,
            num_workers=0
        )
        val_loader = val_dataset.to_dataloader(
            train=False,
            batch_size=self.config.batch_size,
            num_workers=0
        )
        test_loader = test_dataset.to_dataloader(
            train=False,
            batch_size=self.config.batch_size,
            num_workers=0
        )

        # Create model with tuned params
        model = TemporalFusionTransformer.from_dataset(
            train_dataset,
            learning_rate=self.model_params.get('learning_rate', 0.001),
            hidden_size=self.model_params.get('hidden_size', 64),
            attention_head_size=self.model_params.get('attention_head_size', 4),
            dropout=self.model_params.get('dropout', 0.1),
            hidden_continuous_size=self.model_params.get('hidden_continuous_size', 32),
            lstm_layers=self.model_params.get('lstm_layers', 2),
            output_size=7,
            loss=QuantileLoss(quantiles=[0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98]),
            reduce_on_plateau_patience=self.model_params.get('reduce_on_plateau_patience', 4),
            logging_metrics=[SMAPE(), MAE(), MAPE()],
        )

        # Trainer
        checkpoint_callback = pl.callbacks.ModelCheckpoint(
            monitor='val_loss',
            mode='min',
            save_top_k=1
        )

        trainer = pl.Trainer(
            max_epochs=self.config.max_epochs,
            accelerator='gpu' if self.config.use_gpu and torch.cuda.is_available() else 'cpu',
            devices=1,
            gradient_clip_val=self.config.gradient_clip_val,
            enable_progress_bar=True,
            callbacks=[
                pl.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=self.trade_config.early_stopping_patience,
                    mode='min'
                ),
                checkpoint_callback
            ],
            logger=False
        )

        # Train
        trainer.fit(model, train_loader, val_loader)

        # Load best model
        best_model_path = checkpoint_callback.best_model_path
        if best_model_path:
            model = TemporalFusionTransformer.load_from_checkpoint(best_model_path)

        # Get train/val loss
        train_loss = float(trainer.callback_metrics.get('train_loss', 0))
        val_loss = float(trainer.callback_metrics.get('val_loss', 0))

        # Evaluate on test set
        test_metrics = self._evaluate_model(model, test_loader, test_df)

        result = FoldResult(
            fold_id=fold.fold_id,
            train_loss=train_loss,
            val_loss=val_loss,
            test_metrics=test_metrics,
            epochs_trained=trainer.current_epoch,
            best_epoch=checkpoint_callback.best_model_score.item() if checkpoint_callback.best_model_score else 0
        )

        logger.info(f"Fold {fold.fold_id} tamamlandı:")
        logger.info(f"  Val Loss: {val_loss:.6f}")
        logger.info(f"  Test MAE: {test_metrics.get('mae', 0):.6f}")
        logger.info(f"  Test Direction Acc: {test_metrics.get('direction_accuracy', 0):.2%}")

        return result

    def _evaluate_model(
        self,
        model: TemporalFusionTransformer,
        test_loader,
        test_df: pd.DataFrame
    ) -> Dict[str, float]:
        """Model performansını test set üzerinde değerlendir"""

        model.eval()

        all_predictions = []
        all_actuals = []

        with torch.no_grad():
            predictions = model.predict(test_loader, mode='prediction', return_y=True)

            # Predictions: (n_samples, prediction_length)
            pred_values = predictions.output.cpu().numpy()
            actual_values = predictions.y[0].cpu().numpy() if hasattr(predictions, 'y') else None

            if actual_values is not None:
                all_predictions.extend(pred_values.flatten())
                all_actuals.extend(actual_values.flatten())

        if not all_predictions or not all_actuals:
            return {'mae': 0, 'mape': 0, 'direction_accuracy': 0}

        predictions = np.array(all_predictions)
        actuals = np.array(all_actuals)

        # Calculate metrics
        mae = np.mean(np.abs(predictions - actuals))
        mape = np.mean(np.abs((predictions - actuals) / (actuals + 1e-8))) * 100

        # Direction accuracy
        pred_direction = np.sign(predictions)
        actual_direction = np.sign(actuals)
        direction_accuracy = np.mean(pred_direction == actual_direction)

        # RMSE
        rmse = np.sqrt(np.mean((predictions - actuals) ** 2))

        # Correlation
        if len(predictions) > 1:
            correlation = np.corrcoef(predictions, actuals)[0, 1]
        else:
            correlation = 0

        return {
            'mae': float(mae),
            'mape': float(mape),
            'rmse': float(rmse),
            'direction_accuracy': float(direction_accuracy),
            'correlation': float(correlation),
            'n_samples': len(predictions)
        }

    def run_validation(self) -> Dict:
        """Tüm fold'ları çalıştır"""

        logger.info(f"\nWalk-Forward Validation başlıyor...")
        logger.info(f"  N splits: {self.n_splits}")
        logger.info(f"  Trade type: {self.trade_config.trade_type.value}")

        folds = self.create_folds()

        if not folds:
            raise ValueError("Fold oluşturulamadı - yetersiz veri")

        logger.info(f"  {len(folds)} fold oluşturuldu")

        self.results = []

        for fold in folds:
            try:
                result = self.train_fold(fold)
                self.results.append(result)
            except Exception as e:
                logger.error(f"Fold {fold.fold_id} başarısız: {e}")
                continue

        return self.aggregate_results()

    def aggregate_results(self) -> Dict:
        """Tüm fold sonuçlarını birleştir"""

        if not self.results:
            return {'error': 'No successful folds'}

        # Aggregate metrics
        val_losses = [r.val_loss for r in self.results]
        test_maes = [r.test_metrics['mae'] for r in self.results]
        test_mapes = [r.test_metrics['mape'] for r in self.results]
        direction_accs = [r.test_metrics['direction_accuracy'] for r in self.results]

        summary = {
            'n_folds': len(self.results),
            'val_loss': {
                'mean': float(np.mean(val_losses)),
                'std': float(np.std(val_losses)),
                'min': float(np.min(val_losses)),
                'max': float(np.max(val_losses))
            },
            'test_mae': {
                'mean': float(np.mean(test_maes)),
                'std': float(np.std(test_maes)),
                'min': float(np.min(test_maes)),
                'max': float(np.max(test_maes))
            },
            'test_mape': {
                'mean': float(np.mean(test_mapes)),
                'std': float(np.std(test_mapes))
            },
            'direction_accuracy': {
                'mean': float(np.mean(direction_accs)),
                'std': float(np.std(direction_accs)),
                'min': float(np.min(direction_accs)),
                'max': float(np.max(direction_accs))
            },
            'fold_details': [
                {
                    'fold_id': r.fold_id,
                    'val_loss': r.val_loss,
                    'test_metrics': r.test_metrics,
                    'epochs': r.epochs_trained
                }
                for r in self.results
            ]
        }

        logger.info(f"\n{'='*50}")
        logger.info("Walk-Forward Validation Sonuçları:")
        logger.info(f"  Val Loss: {summary['val_loss']['mean']:.6f} ± {summary['val_loss']['std']:.6f}")
        logger.info(f"  Test MAE: {summary['test_mae']['mean']:.6f} ± {summary['test_mae']['std']:.6f}")
        logger.info(f"  Direction Acc: {summary['direction_accuracy']['mean']:.2%} ± {summary['direction_accuracy']['std']:.2%}")

        return summary


def run_walk_forward_validation(
    config: TrainingConfig,
    df: pd.DataFrame,
    metadata: Dict,
    model_params: Optional[Dict] = None
) -> Dict:
    """Convenience function: Walk-forward validation çalıştır"""

    validator = WalkForwardValidator(config, df, metadata, model_params)
    return validator.run_validation()
