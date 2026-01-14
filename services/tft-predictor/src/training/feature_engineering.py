"""
Trade Type Bazlı Feature Engineering
Her trade tipi için optimize edilmiş feature'lar
Teknik şartnamedeki 40+ indikatör kullanılır
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from loguru import logger

from .config import TradeType, TradeTypeConfig
from .indicators import TechnicalIndicators, add_all_indicators


class FeatureEngineer:
    """
    Trade type'a göre farklı feature setleri oluşturur.

    - SCALP: Kısa vadeli momentum, order flow, microstructure
    - SWING: Trend, volatility, mean reversion
    - POSITION: Macro trends, cycle indicators
    """

    def __init__(self, config: TradeTypeConfig):
        self.config = config
        self.trade_type = config.trade_type

    def engineer_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        Ana feature engineering pipeline.
        Teknik şartnamedeki 40+ indikatörü kullanır.

        Returns:
            df: Feature'lı DataFrame
            metadata: TFT için feature grupları
        """
        df = df.copy()

        # Timestamp işlemleri
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.set_index('timestamp')

        # Trade type string mapping
        trade_type_str = 'scalp' if self.trade_type == TradeType.SCALP else \
                         'day' if self.trade_type == TradeType.SWING else 'swing'

        # Teknik şartnamedeki TÜM indikatörleri ekle (indicators.py)
        # 40+ indikatör: EMA, SMA, MACD, RSI, Stochastic, Bollinger, ATR,
        # Ichimoku, Supertrend, ADX, OBV, VWAP, CMF, MFI, etc.
        df = add_all_indicators(df, trade_type=trade_type_str, include_advanced=True)

        # Temel feature'lar (tüm trade type'lar için)
        df = self._add_base_features(df)

        # Trade type spesifik feature'lar
        if self.trade_type == TradeType.SCALP:
            df = self._add_scalp_features(df)
        elif self.trade_type == TradeType.SWING:
            df = self._add_swing_features(df)
        elif self.trade_type == TradeType.POSITION:
            df = self._add_position_features(df)

        # Time features
        df = self._add_time_features(df)

        # Target variable
        df = self._create_targets(df)

        # NaN temizliği
        df = df.dropna()

        # Reset index
        df = df.reset_index()

        # Metadata oluştur
        metadata = self._create_metadata(df)

        logger.info(f"Feature engineering tamamlandı: {len(df)} satır, "
                   f"{len(metadata['time_varying_known'])} known, "
                   f"{len(metadata['time_varying_unknown'])} unknown features")

        return df, metadata

    def _add_base_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Tüm trade type'lar için temel feature'lar"""

        # Returns (çeşitli periyotlar)
        for period in [1, 4, 12, 24]:
            df[f'return_{period}h'] = df['close'].pct_change(period)

        # Log returns (daha iyi dağılım)
        df['log_return'] = np.log(df['close'] / df['close'].shift(1))

        # Volatility (rolling std)
        df['volatility_12h'] = df['log_return'].rolling(12).std()
        df['volatility_24h'] = df['log_return'].rolling(24).std()

        # Range features
        df['high_low_range'] = (df['high'] - df['low']) / df['close']
        df['close_position'] = (df['close'] - df['low']) / (df['high'] - df['low'] + 1e-8)

        # Volume features
        df['volume_sma_24'] = df['volume'].rolling(24).mean()
        df['volume_ratio'] = df['volume'] / (df['volume_sma_24'] + 1e-8)
        df['volume_std'] = df['volume'].rolling(24).std()

        # Quote volume (USDT cinsinden hacim)
        if 'quote_volume' in df.columns:
            df['quote_volume_sma'] = df['quote_volume'].rolling(24).mean()
            df['quote_volume_ratio'] = df['quote_volume'] / (df['quote_volume_sma'] + 1e-8)

        # Taker buy ratio (alım/satım baskısı)
        if 'taker_buy_base' in df.columns and 'volume' in df.columns:
            df['taker_buy_ratio'] = df['taker_buy_base'] / (df['volume'] + 1e-8)
            df['taker_buy_ratio_sma'] = df['taker_buy_ratio'].rolling(24).mean()

        return df

    def _add_scalp_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """SCALP trade için kısa vadeli feature'lar"""

        # Micro momentum (çok kısa vadeli)
        df['micro_momentum_1'] = df['close'].pct_change(1)
        df['micro_momentum_2'] = df['close'].pct_change(2)
        df['micro_momentum_4'] = df['close'].pct_change(4)

        # Momentum acceleration
        df['momentum_accel'] = df['micro_momentum_1'] - df['micro_momentum_1'].shift(1)

        # Short-term RSI
        df['rsi_7'] = self._calculate_rsi(df['close'], 7)
        df['rsi_14'] = self._calculate_rsi(df['close'], 14)

        # RSI divergence
        df['rsi_divergence'] = df['rsi_7'] - df['rsi_14']

        # Very short MACD
        df['macd_fast'], df['macd_signal_fast'], df['macd_hist_fast'] = \
            self._calculate_macd(df['close'], 6, 13, 5)

        # Bollinger Bands (kısa periyot)
        df['bb_upper_12'], df['bb_middle_12'], df['bb_lower_12'] = \
            self._calculate_bollinger(df['close'], 12, 2)
        df['bb_position_12'] = (df['close'] - df['bb_lower_12']) / \
                               (df['bb_upper_12'] - df['bb_lower_12'] + 1e-8)

        # Price velocity ve acceleration
        df['price_velocity'] = df['close'].diff()
        df['price_acceleration'] = df['price_velocity'].diff()

        # Volume momentum
        df['volume_momentum'] = df['volume'].pct_change(4)

        # Spread ve microstructure
        df['spread_estimate'] = df['high_low_range'] / 2

        # EMA crossovers (kısa vadeli)
        df['ema_5'] = df['close'].ewm(span=5).mean()
        df['ema_10'] = df['close'].ewm(span=10).mean()
        df['ema_cross_5_10'] = (df['ema_5'] - df['ema_10']) / df['close']

        return df

    def _add_swing_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """SWING trade için orta vadeli feature'lar"""

        # Trend indicators
        df['sma_20'] = df['close'].rolling(20).mean()
        df['sma_50'] = df['close'].rolling(50).mean()
        df['sma_100'] = df['close'].rolling(100).mean()

        # Price vs SMAs
        df['price_sma20_ratio'] = df['close'] / df['sma_20']
        df['price_sma50_ratio'] = df['close'] / df['sma_50']
        df['sma20_sma50_ratio'] = df['sma_20'] / df['sma_50']

        # Trend strength
        df['trend_strength'] = (df['sma_20'] - df['sma_50']) / df['sma_50']

        # ADX (trend gücü)
        df['adx'] = self._calculate_adx(df, 14)

        # Standard RSI
        df['rsi_14'] = self._calculate_rsi(df['close'], 14)
        df['rsi_28'] = self._calculate_rsi(df['close'], 28)

        # MACD (standart)
        df['macd'], df['macd_signal'], df['macd_hist'] = \
            self._calculate_macd(df['close'], 12, 26, 9)

        # Bollinger Bands (standart)
        df['bb_upper'], df['bb_middle'], df['bb_lower'] = \
            self._calculate_bollinger(df['close'], 20, 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        df['bb_position'] = (df['close'] - df['bb_lower']) / \
                            (df['bb_upper'] - df['bb_lower'] + 1e-8)

        # ATR (volatility)
        df['atr_14'] = self._calculate_atr(df, 14)
        df['atr_normalized'] = df['atr_14'] / df['close']

        # Donchian channels
        df['donchian_high_20'] = df['high'].rolling(20).max()
        df['donchian_low_20'] = df['low'].rolling(20).min()
        df['donchian_position'] = (df['close'] - df['donchian_low_20']) / \
                                   (df['donchian_high_20'] - df['donchian_low_20'] + 1e-8)

        # Support/Resistance proximity
        df['distance_from_high_20'] = (df['donchian_high_20'] - df['close']) / df['close']
        df['distance_from_low_20'] = (df['close'] - df['donchian_low_20']) / df['close']

        # Mean reversion indicator
        df['mean_reversion_score'] = (df['close'] - df['sma_50']) / df['close'].rolling(50).std()

        return df

    def _add_position_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """POSITION trade için uzun vadeli feature'lar"""

        # Long-term SMAs
        df['sma_50'] = df['close'].rolling(50).mean()
        df['sma_100'] = df['close'].rolling(100).mean()
        df['sma_200'] = df['close'].rolling(200).mean()

        # Golden/Death cross indicators
        df['sma50_sma200_ratio'] = df['sma_50'] / df['sma_200']
        df['golden_cross'] = (df['sma_50'] > df['sma_200']).astype(int)

        # Long-term trend
        df['trend_200'] = (df['close'] - df['sma_200']) / df['sma_200']

        # Macro momentum
        df['return_7d'] = df['close'].pct_change(7 * 6)   # 4h bars = 6 per day
        df['return_30d'] = df['close'].pct_change(30 * 6)
        df['return_90d'] = df['close'].pct_change(90 * 6)

        # Long-term RSI
        df['rsi_28'] = self._calculate_rsi(df['close'], 28)
        df['rsi_56'] = self._calculate_rsi(df['close'], 56)

        # Weekly MACD equivalent
        df['macd_weekly'], df['macd_signal_weekly'], df['macd_hist_weekly'] = \
            self._calculate_macd(df['close'], 26, 52, 18)

        # Volatility regimes
        df['volatility_50d'] = df['log_return'].rolling(50 * 6).std()
        df['volatility_ratio'] = df['volatility_24h'] / (df['volatility_50d'] + 1e-8)

        # Drawdown from ATH
        df['rolling_max_100'] = df['close'].rolling(100 * 6).max()
        df['drawdown_from_ath'] = (df['close'] - df['rolling_max_100']) / df['rolling_max_100']

        # Market cycle position (simple proxy)
        df['cycle_position'] = df['close'].rolling(200 * 6).apply(
            lambda x: (x.iloc[-1] - x.min()) / (x.max() - x.min() + 1e-8) if len(x) > 0 else 0.5
        )

        # Volume trend
        df['volume_sma_50'] = df['volume'].rolling(50 * 6).mean()
        df['volume_trend'] = df['volume_sma_24'] / (df['volume_sma_50'] + 1e-8)

        return df

    def _add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Zaman bazlı feature'lar"""

        idx = df.index if isinstance(df.index, pd.DatetimeIndex) else pd.to_datetime(df.index)

        df['hour_of_day'] = idx.hour
        df['day_of_week'] = idx.dayofweek
        df['day_of_month'] = idx.day
        df['month'] = idx.month
        df['is_weekend'] = (idx.dayofweek >= 5).astype(int)

        # Trading session flags
        df['is_asia_session'] = ((idx.hour >= 0) & (idx.hour < 8)).astype(int)
        df['is_europe_session'] = ((idx.hour >= 8) & (idx.hour < 16)).astype(int)
        df['is_us_session'] = ((idx.hour >= 14) & (idx.hour < 22)).astype(int)

        # Cyclical encoding
        df['hour_sin'] = np.sin(2 * np.pi * idx.hour / 24)
        df['hour_cos'] = np.cos(2 * np.pi * idx.hour / 24)
        df['day_sin'] = np.sin(2 * np.pi * idx.dayofweek / 7)
        df['day_cos'] = np.cos(2 * np.pi * idx.dayofweek / 7)

        return df

    def _create_targets(self, df: pd.DataFrame) -> pd.DataFrame:
        """Target değişkenleri oluştur"""

        for horizon in self.config.prediction_horizons:
            # Future return
            df[f'target_return_{horizon}h'] = df['close'].shift(-horizon) / df['close'] - 1

            # Future direction (binary)
            df[f'target_direction_{horizon}h'] = (df[f'target_return_{horizon}h'] > 0).astype(int)

            # Future volatility
            future_returns = df['log_return'].shift(-1).rolling(horizon).std()
            df[f'target_volatility_{horizon}h'] = future_returns.shift(-horizon + 1)

        return df

    def _create_metadata(self, df: pd.DataFrame) -> Dict:
        """TFT için feature metadata'sı"""

        time_varying_known = [
            'hour_of_day', 'day_of_week', 'day_of_month', 'month',
            'is_weekend', 'is_asia_session', 'is_europe_session', 'is_us_session',
            'hour_sin', 'hour_cos', 'day_sin', 'day_cos'
        ]

        # Trade type'a göre unknown features
        base_unknown = [
            'open', 'high', 'low', 'close', 'volume',
            'return_1h', 'return_4h', 'return_12h', 'return_24h',
            'log_return', 'volatility_12h', 'volatility_24h',
            'high_low_range', 'close_position',
            'volume_ratio', 'volume_std'
        ]

        if self.trade_type == TradeType.SCALP:
            type_specific = [
                'micro_momentum_1', 'micro_momentum_2', 'micro_momentum_4',
                'momentum_accel', 'rsi_7', 'rsi_14', 'rsi_divergence',
                'macd_fast', 'macd_signal_fast', 'macd_hist_fast',
                'bb_position_12', 'price_velocity', 'price_acceleration',
                'volume_momentum', 'ema_cross_5_10'
            ]
        elif self.trade_type == TradeType.SWING:
            type_specific = [
                'price_sma20_ratio', 'price_sma50_ratio', 'sma20_sma50_ratio',
                'trend_strength', 'adx', 'rsi_14', 'rsi_28',
                'macd', 'macd_signal', 'macd_hist',
                'bb_width', 'bb_position', 'atr_normalized',
                'donchian_position', 'mean_reversion_score'
            ]
        else:  # POSITION
            type_specific = [
                'sma50_sma200_ratio', 'golden_cross', 'trend_200',
                'return_7d', 'return_30d', 'return_90d',
                'rsi_28', 'rsi_56', 'macd_hist_weekly',
                'volatility_ratio', 'drawdown_from_ath',
                'cycle_position', 'volume_trend'
            ]

        # Filter to only existing columns
        time_varying_known = [c for c in time_varying_known if c in df.columns]
        time_varying_unknown = [c for c in (base_unknown + type_specific) if c in df.columns]

        # Target columns
        targets = [c for c in df.columns if c.startswith('target_')]

        return {
            'time_varying_known': time_varying_known,
            'time_varying_unknown': time_varying_unknown,
            'static_features': ['symbol'] if 'symbol' in df.columns else [],
            'targets': targets,
            'prediction_horizons': self.config.prediction_horizons,
            'trade_type': self.trade_type.value
        }

    # Technical indicator helpers

    def _calculate_rsi(self, prices: pd.Series, period: int) -> pd.Series:
        """RSI hesapla"""
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        rs = gain / (loss + 1e-8)
        return 100 - (100 / (1 + rs))

    def _calculate_macd(
        self, prices: pd.Series, fast: int, slow: int, signal: int
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """MACD hesapla"""
        ema_fast = prices.ewm(span=fast).mean()
        ema_slow = prices.ewm(span=slow).mean()
        macd = ema_fast - ema_slow
        macd_signal = macd.ewm(span=signal).mean()
        macd_hist = macd - macd_signal
        return macd, macd_signal, macd_hist

    def _calculate_bollinger(
        self, prices: pd.Series, period: int, std_dev: float
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Bollinger Bands hesapla"""
        middle = prices.rolling(period).mean()
        std = prices.rolling(period).std()
        upper = middle + std_dev * std
        lower = middle - std_dev * std
        return upper, middle, lower

    def _calculate_atr(self, df: pd.DataFrame, period: int) -> pd.Series:
        """ATR hesapla"""
        high_low = df['high'] - df['low']
        high_close = abs(df['high'] - df['close'].shift(1))
        low_close = abs(df['low'] - df['close'].shift(1))
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    def _calculate_adx(self, df: pd.DataFrame, period: int) -> pd.Series:
        """ADX hesapla"""
        plus_dm = df['high'].diff()
        minus_dm = -df['low'].diff()

        plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
        minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)

        atr = self._calculate_atr(df, period)

        plus_di = 100 * (plus_dm.rolling(period).mean() / (atr + 1e-8))
        minus_di = 100 * (minus_dm.rolling(period).mean() / (atr + 1e-8))

        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 1e-8)
        adx = dx.rolling(period).mean()

        return adx
