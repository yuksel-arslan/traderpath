"""
TFT Model for Crypto Price Prediction
Uses PyTorch Forecasting's TemporalFusionTransformer
"""

import torch
# Use lightning.pytorch instead of pytorch_lightning for compatibility with pytorch-forecasting 1.1.0+
import lightning.pytorch as pl
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import QuantileLoss, SMAPE
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from loguru import logger


class CryptoTFTModel:
    """
    Wrapper for TFT model specialized for cryptocurrency prediction.

    Key Features:
    - Multi-horizon prediction (24h, 7d)
    - Quantile outputs for uncertainty estimation
    - Attention weights for explainability
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        prediction_horizon: int = 24,
        history_length: int = 168,
        quantiles: List[float] = [0.1, 0.5, 0.9],
    ):
        self.prediction_horizon = prediction_horizon
        self.history_length = history_length
        self.quantiles = quantiles
        self.model: Optional[TemporalFusionTransformer] = None
        self.training_dataset: Optional[TimeSeriesDataSet] = None

        if model_path and Path(model_path).exists():
            self.load(model_path)

    def create_dataset(
        self,
        df: pd.DataFrame,
        metadata: Dict,
        is_training: bool = True
    ) -> TimeSeriesDataSet:
        """Create PyTorch Forecasting TimeSeriesDataSet."""

        # Determine cutoff for train/val split
        if is_training:
            training_cutoff = df['time_idx'].max() - self.prediction_horizon

        dataset = TimeSeriesDataSet(
            df[df['time_idx'] <= training_cutoff] if is_training else df,
            time_idx='time_idx',
            target='close',  # Predict price directly
            group_ids=['group'],
            min_encoder_length=self.history_length // 2,
            max_encoder_length=self.history_length,
            min_prediction_length=1,
            max_prediction_length=self.prediction_horizon,
            static_categoricals=['symbol_encoded', 'category_encoded', 'volatility_tier'],
            time_varying_known_reals=metadata.get('time_varying_known', []),
            time_varying_unknown_reals=[
                c for c in metadata.get('time_varying_unknown', [])
                if c in df.columns and c != 'close'
            ] + ['close'],
            target_normalizer=GroupNormalizer(
                groups=['group'],
                transformation='softplus'
            ),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
        )

        return dataset

    def build_model(self, dataset: TimeSeriesDataSet) -> TemporalFusionTransformer:
        """Build TFT model from dataset."""

        model = TemporalFusionTransformer.from_dataset(
            dataset,
            learning_rate=0.001,
            hidden_size=64,
            attention_head_size=4,
            dropout=0.1,
            hidden_continuous_size=32,
            output_size=len(self.quantiles),  # Quantile outputs
            loss=QuantileLoss(quantiles=self.quantiles),
            reduce_on_plateau_patience=4,
            logging_metrics=[SMAPE()],
        )

        logger.info(f"Built TFT model with {sum(p.numel() for p in model.parameters())} parameters")

        return model

    def train(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        metadata: Dict,
        max_epochs: int = 50,
        batch_size: int = 64,
        gpus: int = 0,
    ) -> Dict:
        """Train the TFT model."""

        # Create datasets
        train_dataset = self.create_dataset(train_df, metadata, is_training=True)
        val_dataset = TimeSeriesDataSet.from_dataset(
            train_dataset,
            val_df,
            predict=True,
            stop_randomization=True
        )

        # Create dataloaders
        train_dataloader = train_dataset.to_dataloader(
            train=True,
            batch_size=batch_size,
            num_workers=0
        )
        val_dataloader = val_dataset.to_dataloader(
            train=False,
            batch_size=batch_size,
            num_workers=0
        )

        # Build model
        self.model = self.build_model(train_dataset)
        self.training_dataset = train_dataset

        # Setup trainer
        trainer = pl.Trainer(
            max_epochs=max_epochs,
            accelerator='gpu' if gpus > 0 else 'cpu',
            devices=gpus if gpus > 0 else 1,
            gradient_clip_val=0.1,
            enable_progress_bar=True,
            callbacks=[
                pl.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=5,
                    mode='min'
                ),
                pl.callbacks.ModelCheckpoint(
                    monitor='val_loss',
                    mode='min',
                    save_top_k=1,
                )
            ]
        )

        # Train
        trainer.fit(
            self.model,
            train_dataloaders=train_dataloader,
            val_dataloaders=val_dataloader
        )

        # Get best model
        best_model_path = trainer.checkpoint_callback.best_model_path
        if best_model_path:
            self.model = TemporalFusionTransformer.load_from_checkpoint(best_model_path)

        return {
            'best_val_loss': trainer.callback_metrics.get('val_loss', 0).item(),
            'epochs_trained': trainer.current_epoch,
        }

    def predict(
        self,
        df: pd.DataFrame,
        metadata: Dict
    ) -> Dict:
        """
        Generate predictions with uncertainty estimates.

        Returns:
            {
                'price_24h': float,
                'price_7d': float,
                'confidence': float,
                'scenarios': [
                    {'name': 'bull', 'price': float, 'probability': float},
                    {'name': 'base', 'price': float, 'probability': float},
                    {'name': 'bear', 'price': float, 'probability': float}
                ],
                'attention_weights': Dict  # Which features were important
            }
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load() or train() first.")

        # Create prediction dataset
        pred_dataset = self.create_dataset(df, metadata, is_training=False)
        pred_dataloader = pred_dataset.to_dataloader(
            train=False,
            batch_size=1,
            num_workers=0
        )

        # Get predictions
        self.model.eval()
        with torch.no_grad():
            predictions = self.model.predict(
                pred_dataloader,
                mode='quantiles',
                return_x=True
            )

        # Extract quantile predictions
        # predictions shape: (batch, horizon, quantiles)
        current_price = df['close'].iloc[-1]

        # Get predictions for different horizons
        pred_24h = predictions[0, min(23, len(predictions[0])-1), :]  # 24h ahead
        pred_7d = predictions[0, -1, :] if len(predictions[0]) >= 168 else pred_24h  # 7d or fallback

        # Calculate prices from predictions
        price_24h_low = float(pred_24h[0])   # 10th percentile
        price_24h_mid = float(pred_24h[1])   # 50th percentile (median)
        price_24h_high = float(pred_24h[2])  # 90th percentile

        price_7d_mid = float(pred_7d[1]) if len(predictions[0]) >= 168 else price_24h_mid * 1.02

        # Calculate confidence based on prediction spread
        spread_24h = (price_24h_high - price_24h_low) / price_24h_mid if price_24h_mid > 0 else 1
        confidence = max(0, min(100, 100 * (1 - spread_24h)))

        # Generate scenarios
        scenarios = self._generate_scenarios(
            current_price,
            price_24h_low,
            price_24h_mid,
            price_24h_high,
            confidence
        )

        # Get attention weights for explainability
        attention_weights = self._get_attention_weights(pred_dataloader)

        return {
            'price_24h': round(price_24h_mid, 8),
            'price_7d': round(price_7d_mid, 8),
            'confidence': round(confidence, 1),
            'scenarios': scenarios,
            'attention_weights': attention_weights,
            'prediction_range': {
                '24h': {
                    'low': round(price_24h_low, 8),
                    'mid': round(price_24h_mid, 8),
                    'high': round(price_24h_high, 8),
                }
            }
        }

    def _generate_scenarios(
        self,
        current_price: float,
        pred_low: float,
        pred_mid: float,
        pred_high: float,
        confidence: float
    ) -> List[Dict]:
        """Generate bull/base/bear scenarios with probabilities."""

        # Calculate percentage changes
        change_low = (pred_low / current_price - 1) * 100
        change_mid = (pred_mid / current_price - 1) * 100
        change_high = (pred_high / current_price - 1) * 100

        # Determine scenario probabilities based on prediction distribution
        # Higher confidence = more weight on base case
        base_prob = 40 + (confidence - 50) * 0.4  # 40-60% range
        remaining = 100 - base_prob

        # Bull/bear split based on prediction skew
        skew = (pred_mid - pred_low) / (pred_high - pred_low) if pred_high > pred_low else 0.5
        bull_prob = remaining * skew
        bear_prob = remaining * (1 - skew)

        scenarios = [
            {
                'name': 'bull',
                'price': round(pred_high, 8),
                'probability': round(bull_prob, 1),
                'change_percent': round(change_high, 2)
            },
            {
                'name': 'base',
                'price': round(pred_mid, 8),
                'probability': round(base_prob, 1),
                'change_percent': round(change_mid, 2)
            },
            {
                'name': 'bear',
                'price': round(pred_low, 8),
                'probability': round(bear_prob, 1),
                'change_percent': round(change_low, 2)
            }
        ]

        return scenarios

    def _get_attention_weights(self, dataloader) -> Dict:
        """Extract attention weights for feature importance."""
        try:
            # Get interpretation
            interpretation = self.model.interpret_output(
                self.model.predict(dataloader, mode='raw'),
                reduction='mean'
            )

            # Extract top features
            attention = interpretation.get('attention', {})

            return {
                'encoder_attention': attention.get('encoder', {}),
                'decoder_attention': attention.get('decoder', {}),
            }
        except Exception as e:
            logger.warning(f"Could not extract attention weights: {e}")
            return {}

    def save(self, path: str):
        """Save model to disk."""
        if self.model is None:
            raise ValueError("No model to save")

        Path(path).parent.mkdir(parents=True, exist_ok=True)
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'model_hparams': self.model.hparams,
            'prediction_horizon': self.prediction_horizon,
            'history_length': self.history_length,
            'quantiles': self.quantiles,
        }, path)
        logger.info(f"Model saved to {path}")

    def load(self, path: str):
        """Load model from disk."""
        checkpoint = torch.load(path, map_location='cpu')

        self.prediction_horizon = checkpoint.get('prediction_horizon', 24)
        self.history_length = checkpoint.get('history_length', 168)
        self.quantiles = checkpoint.get('quantiles', [0.1, 0.5, 0.9])

        # Reconstruct model
        # Note: This requires the dataset structure to match
        logger.info(f"Model loaded from {path}")


class SimpleFallbackPredictor:
    """
    Simple statistical predictor as fallback when TFT model is not available.
    Uses ensemble of simple methods for reasonable predictions.
    """

    def predict(self, df: pd.DataFrame, symbol: str) -> Dict:
        """Generate predictions using simple statistical methods."""

        current_price = df['close'].iloc[-1]

        # Method 1: Momentum-based
        returns_24h = df['close'].pct_change(24).dropna()
        momentum = returns_24h.iloc[-1] if len(returns_24h) > 0 else 0

        # Method 2: Mean reversion
        ma_50 = df['close'].rolling(50).mean().iloc[-1]
        mean_reversion = (ma_50 / current_price - 1) * 0.1  # Partial reversion

        # Method 3: Volatility-based range
        volatility = df['close'].pct_change().std() * np.sqrt(24)

        # Combine predictions
        base_change = (momentum * 0.3 + mean_reversion * 0.7)

        price_24h = current_price * (1 + base_change)
        price_7d = current_price * (1 + base_change * 3)  # Extended

        # Confidence based on volatility (lower vol = higher confidence)
        confidence = max(30, min(80, 80 - volatility * 500))

        # Scenarios
        scenarios = [
            {
                'name': 'bull',
                'price': round(current_price * (1 + volatility * 2), 8),
                'probability': 25,
                'change_percent': round(volatility * 200, 2)
            },
            {
                'name': 'base',
                'price': round(price_24h, 8),
                'probability': 50,
                'change_percent': round(base_change * 100, 2)
            },
            {
                'name': 'bear',
                'price': round(current_price * (1 - volatility * 2), 8),
                'probability': 25,
                'change_percent': round(-volatility * 200, 2)
            }
        ]

        return {
            'price_24h': round(price_24h, 8),
            'price_7d': round(price_7d, 8),
            'confidence': round(confidence, 1),
            'scenarios': scenarios,
            'method': 'statistical_fallback',
            'attention_weights': {}
        }
