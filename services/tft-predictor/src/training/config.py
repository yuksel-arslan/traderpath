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
    # SCALP: 15m interval, 6 ay veri = 180 * 24 * 4 = 17,280 candle
    # Sequence: 72 + 4 = 76 candle → ~17,200 sequence (yeterli)
    TradeType.SCALP: TradeTypeConfig(
        trade_type=TradeType.SCALP,
        prediction_horizons=[1, 2, 4],        # 1, 2, 4 saat
        min_encoder_length=24,                # 6 saat minimum (24 × 15m)
        max_encoder_length=72,                # 18 saat maximum (72 × 15m)
        min_prediction_length=1,
        max_prediction_length=4,              # 1 saat prediction (4 × 15m)
        min_training_samples=15000,           # 17,280 candle, validation ile ~15K OK
        data_interval="15m",                  # 15 dakikalık mumlar
        lookback_days=180,                    # 6 ay veri = 17,280 candle
        hidden_size_range=(64, 128),
        attention_heads_range=(2, 4),
        dropout_range=(0.1, 0.25),
        learning_rate_range=(1e-4, 5e-3),
        use_orderbook_features=True,
        use_whale_features=True,
        early_stopping_patience=8,
        n_walk_forward_splits=5,
    ),

    # SWING: 1h interval, 2 yıl veri = 730 * 24 = 17,520 candle
    # Sequence: 168 + 48 = 216 candle → ~17,300 sequence (yeterli)
    TradeType.SWING: TradeTypeConfig(
        trade_type=TradeType.SWING,
        prediction_horizons=[24, 48],         # 1, 2 gün (168 çok uzun, kaldırıldı)
        min_encoder_length=72,                # 3 gün minimum history
        max_encoder_length=168,               # 7 gün maximum history
        min_prediction_length=24,
        max_prediction_length=48,             # 2 gün prediction
        min_training_samples=15000,           # 17,520 candle, validation ile ~15K OK
        data_interval="1h",                   # Saatlik mumlar
        lookback_days=730,                    # 2 yıl veri = 17,520 candle
        hidden_size_range=(64, 128),          # Orta boy model
        attention_heads_range=(2, 4),
        dropout_range=(0.1, 0.3),
        learning_rate_range=(1e-4, 1e-3),
        use_orderbook_features=True,
        use_whale_features=True,
        early_stopping_patience=10,
        n_walk_forward_splits=5,
    ),

    # POSITION: 4h interval, 3 yıl veri = 1095 * 6 = 6,570 candle
    # Sequence: 252 + 168 = 420 candle → ~6,150 sequence (minimum yeterli)
    TradeType.POSITION: TradeTypeConfig(
        trade_type=TradeType.POSITION,
        prediction_horizons=[168, 336],       # 1, 2 hafta (672 çok uzun)
        min_encoder_length=168,               # 4 hafta minimum (168 × 4h = 28 gün)
        max_encoder_length=252,               # 6 hafta maximum (252 × 4h = 42 gün)
        min_prediction_length=42,             # 1 hafta minimum
        max_prediction_length=168,            # 4 hafta maximum (168 × 4h = 28 gün)
        min_training_samples=5000,            # 6,570 candle, validation ile ~5K OK
        data_interval="4h",                   # 4 saatlik mumlar
        lookback_days=1095,                   # 3 yıl veri = 6,570 candle
        hidden_size_range=(64, 128),
        attention_heads_range=(2, 4),
        dropout_range=(0.15, 0.3),
        learning_rate_range=(1e-5, 5e-4),
        use_orderbook_features=False,
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

    # Training (optimized for Google Cloud GPU)
    max_epochs: int = 100
    batch_size: int = 64
    gradient_clip_val: float = 0.1
    accumulate_grad_batches: int = 1  # No accumulation needed with GPU

    # Hardware
    use_gpu: bool = True
    num_workers: int = 4  # Enable multiprocessing for GPU environment

    # Paths
    model_output_dir: str = "models"
    data_cache_dir: str = "data/cache"
    logs_dir: str = "logs"

    # Reproducibility
    seed: int = 42

    @property
    def trade_type_config(self) -> TradeTypeConfig:
        return TRADE_TYPE_CONFIGS[self.trade_type]
