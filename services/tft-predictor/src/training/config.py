"""
TFT Training Configuration
Trade type bazlı eğitim parametreleri
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum


class TradeType(Enum):
    """Trade tipleri - her biri farklı prediction horizon ve feature set kullanır"""
    SCALP = "scalp"          # 1-4 saat, yüksek frekanslı sinyaller
    SWING = "swing"          # 1-7 gün, orta vadeli trendler
    POSITION = "position"    # 1-4 hafta, uzun vadeli pozisyonlar


@dataclass
class TradeTypeConfig:
    """Her trade tipi için spesifik konfigürasyon"""
    trade_type: TradeType

    # Prediction horizons (saat cinsinden)
    prediction_horizons: List[int]

    # Encoder/decoder uzunlukları
    min_encoder_length: int
    max_encoder_length: int
    min_prediction_length: int
    max_prediction_length: int

    # Veri gereksinimleri
    min_training_samples: int  # Minimum eğitim örneği sayısı
    data_interval: str         # Binance interval: 1m, 5m, 15m, 1h, 4h, 1d
    lookback_days: int         # Kaç günlük veri çekilecek

    # Model parametreleri (başlangıç değerleri, Optuna optimize edecek)
    hidden_size_range: tuple = (32, 256)
    attention_heads_range: tuple = (1, 8)
    dropout_range: tuple = (0.05, 0.3)
    learning_rate_range: tuple = (1e-5, 1e-2)

    # Feature grupları
    use_orderbook_features: bool = True
    use_whale_features: bool = True
    use_sentiment_features: bool = False  # İleride eklenebilir

    # Validation
    validation_split: float = 0.2
    n_walk_forward_splits: int = 5  # Walk-forward cross validation

    # Early stopping
    early_stopping_patience: int = 10
    min_delta: float = 0.0001


# Trade tipi bazlı varsayılan konfigürasyonlar
TRADE_TYPE_CONFIGS: Dict[TradeType, TradeTypeConfig] = {
    TradeType.SCALP: TradeTypeConfig(
        trade_type=TradeType.SCALP,
        prediction_horizons=[1, 2, 4],  # 1, 2, 4 saat
        min_encoder_length=24,           # 24 saat minimum history
        max_encoder_length=72,           # 72 saat maximum history (3 gün)
        min_prediction_length=1,
        max_prediction_length=4,
        min_training_samples=50000,      # Scalp için çok veri lazım
        data_interval="15m",             # 15 dakikalık mumlar
        lookback_days=180,               # 6 ay veri
        hidden_size_range=(64, 128),     # Daha küçük model, hızlı inference
        attention_heads_range=(2, 4),
        dropout_range=(0.1, 0.25),
        learning_rate_range=(1e-4, 5e-3),
        use_orderbook_features=True,     # Order book çok önemli scalp için
        use_whale_features=True,
        early_stopping_patience=8,
        n_walk_forward_splits=8,         # Daha fazla validation split
    ),

    TradeType.SWING: TradeTypeConfig(
        trade_type=TradeType.SWING,
        prediction_horizons=[24, 48, 168],  # 1, 2, 7 gün
        min_encoder_length=168,              # 7 gün minimum history
        max_encoder_length=504,              # 21 gün maximum history
        min_prediction_length=24,
        max_prediction_length=168,
        min_training_samples=20000,
        data_interval="1h",                  # Saatlik mumlar
        lookback_days=730,                   # 2 yıl veri
        hidden_size_range=(64, 256),
        attention_heads_range=(2, 8),
        dropout_range=(0.1, 0.3),
        learning_rate_range=(1e-5, 1e-3),
        use_orderbook_features=True,
        use_whale_features=True,
        early_stopping_patience=10,
        n_walk_forward_splits=5,
    ),

    TradeType.POSITION: TradeTypeConfig(
        trade_type=TradeType.POSITION,
        prediction_horizons=[168, 336, 672],  # 1, 2, 4 hafta
        min_encoder_length=336,               # 2 hafta minimum history
        max_encoder_length=1008,              # 6 hafta maximum history
        min_prediction_length=168,
        max_prediction_length=672,
        min_training_samples=10000,
        data_interval="4h",                   # 4 saatlik mumlar
        lookback_days=1095,                   # 3 yıl veri
        hidden_size_range=(128, 256),         # Daha büyük model
        attention_heads_range=(4, 8),
        dropout_range=(0.15, 0.35),
        learning_rate_range=(1e-5, 5e-4),
        use_orderbook_features=False,         # Uzun vade için order book gereksiz
        use_whale_features=True,
        early_stopping_patience=15,
        n_walk_forward_splits=4,
    ),
}


@dataclass
class TrainingConfig:
    """Genel eğitim konfigürasyonu"""
    # Symbols
    symbols: List[str] = field(default_factory=lambda: ["BTC", "ETH", "SOL", "BNB", "XRP"])

    # Trade type
    trade_type: TradeType = TradeType.SWING

    # Optuna
    n_optuna_trials: int = 50
    optuna_timeout_hours: float = 6.0

    # Training
    max_epochs: int = 100
    batch_size: int = 64
    gradient_clip_val: float = 0.1

    # Hardware
    use_gpu: bool = True
    num_workers: int = 4

    # Paths
    model_output_dir: str = "models"
    data_cache_dir: str = "data/cache"
    logs_dir: str = "logs"

    # Reproducibility
    seed: int = 42

    @property
    def trade_type_config(self) -> TradeTypeConfig:
        return TRADE_TYPE_CONFIGS[self.trade_type]
