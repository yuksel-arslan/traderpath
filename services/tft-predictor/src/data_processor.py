"""
Data Processor for Crypto TFT Model
Converts raw OHLCV + Order Book + Features into TFT-ready format
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from loguru import logger


class CryptoDataProcessor:
    """
    Processes cryptocurrency data for TFT model input.

    Features:
    - Time-varying known: hour_of_day, day_of_week, is_weekend
    - Time-varying unknown: OHLCV, indicators, order_book_imbalance, whale_activity
    - Static: symbol category, volatility profile
    """

    # Feature groups for TFT
    TIME_VARYING_KNOWN = [
        'hour_of_day',
        'day_of_week',
        'is_weekend',
        'is_market_open',  # Major markets open
    ]

    TIME_VARYING_UNKNOWN = [
        # OHLCV
        'open', 'high', 'low', 'close', 'volume',
        # Returns
        'return_1h', 'return_4h', 'return_24h',
        # Volatility
        'volatility', 'atr_normalized',
        # Volume features
        'volume_ma_ratio', 'volume_spike',
        # Order Book
        'order_book_imbalance', 'bid_ask_spread',
        # Whale Activity
        'whale_buy_pressure', 'whale_sell_pressure', 'whale_net_flow',
        # Technical
        'rsi', 'macd_histogram', 'bb_position',
    ]

    STATIC_FEATURES = [
        'symbol_encoded',
        'category_encoded',  # L1, DeFi, Meme, etc.
        'volatility_tier',   # low, medium, high
    ]

    # Symbol categories
    SYMBOL_CATEGORIES = {
        'BTC': 'store_of_value',
        'ETH': 'l1',
        'SOL': 'l1',
        'BNB': 'exchange',
        'XRP': 'payment',
        'ADA': 'l1',
        'DOGE': 'meme',
        'AVAX': 'l1',
        'DOT': 'l1',
        'MATIC': 'l2',
    }

    def __init__(self, prediction_horizon: int = 24, history_length: int = 168):
        """
        Args:
            prediction_horizon: Hours to predict ahead (default 24h)
            history_length: Hours of history to use (default 168 = 7 days)
        """
        self.prediction_horizon = prediction_horizon
        self.history_length = history_length

    def process_ohlcv(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process raw OHLCV data and add features."""
        df = df.copy()

        # Ensure datetime index
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)

        # Basic returns
        df['return_1h'] = df['close'].pct_change(1)
        df['return_4h'] = df['close'].pct_change(4)
        df['return_24h'] = df['close'].pct_change(24)

        # Volatility (rolling std of returns)
        df['volatility'] = df['return_1h'].rolling(24).std()

        # ATR normalized
        df['tr'] = np.maximum(
            df['high'] - df['low'],
            np.maximum(
                abs(df['high'] - df['close'].shift(1)),
                abs(df['low'] - df['close'].shift(1))
            )
        )
        df['atr'] = df['tr'].rolling(14).mean()
        df['atr_normalized'] = df['atr'] / df['close']

        # Volume features
        df['volume_ma'] = df['volume'].rolling(24).mean()
        df['volume_ma_ratio'] = df['volume'] / df['volume_ma'].replace(0, 1)
        df['volume_spike'] = (df['volume_ma_ratio'] > 2).astype(int)

        # RSI
        delta = df['close'].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss.replace(0, 1)
        df['rsi'] = 100 - (100 / (1 + rs))

        # MACD
        ema12 = df['close'].ewm(span=12).mean()
        ema26 = df['close'].ewm(span=26).mean()
        df['macd'] = ema12 - ema26
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']

        # Bollinger Bands position (-1 to 1)
        bb_mid = df['close'].rolling(20).mean()
        bb_std = df['close'].rolling(20).std()
        df['bb_upper'] = bb_mid + 2 * bb_std
        df['bb_lower'] = bb_mid - 2 * bb_std
        df['bb_position'] = (df['close'] - bb_mid) / (2 * bb_std).replace(0, 1)
        df['bb_position'] = df['bb_position'].clip(-1, 1)

        # Time features
        df['hour_of_day'] = df.index.hour
        df['day_of_week'] = df.index.dayofweek
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

        # Major market hours (US market: 14:30-21:00 UTC)
        df['is_market_open'] = ((df['hour_of_day'] >= 14) & (df['hour_of_day'] <= 21)).astype(int)

        return df

    def add_order_book_features(
        self,
        df: pd.DataFrame,
        order_book_data: Optional[List[Dict]] = None
    ) -> pd.DataFrame:
        """Add order book imbalance features."""
        df = df.copy()

        if order_book_data is None:
            # Default neutral values if no order book data
            df['order_book_imbalance'] = 0.0
            df['bid_ask_spread'] = 0.001
            return df

        # Process order book snapshots
        imbalances = []
        spreads = []

        for ob in order_book_data:
            bids = ob.get('bids', [])
            asks = ob.get('asks', [])

            if bids and asks:
                bid_volume = sum(float(b[1]) for b in bids[:10])
                ask_volume = sum(float(a[1]) for a in asks[:10])
                total = bid_volume + ask_volume

                imbalance = (bid_volume - ask_volume) / total if total > 0 else 0
                spread = (float(asks[0][0]) - float(bids[0][0])) / float(bids[0][0])

                imbalances.append(imbalance)
                spreads.append(spread)

        # Align with dataframe (simplified - in production, match timestamps)
        if imbalances:
            df['order_book_imbalance'] = np.interp(
                range(len(df)),
                np.linspace(0, len(df), len(imbalances)),
                imbalances
            )
            df['bid_ask_spread'] = np.interp(
                range(len(df)),
                np.linspace(0, len(df), len(spreads)),
                spreads
            )
        else:
            df['order_book_imbalance'] = 0.0
            df['bid_ask_spread'] = 0.001

        return df

    def add_whale_features(
        self,
        df: pd.DataFrame,
        whale_data: Optional[List[Dict]] = None
    ) -> pd.DataFrame:
        """Add whale activity features."""
        df = df.copy()

        if whale_data is None:
            df['whale_buy_pressure'] = 0.0
            df['whale_sell_pressure'] = 0.0
            df['whale_net_flow'] = 0.0
            return df

        # Aggregate whale activity by hour
        whale_df = pd.DataFrame(whale_data)

        if not whale_df.empty and 'timestamp' in whale_df.columns:
            whale_df['timestamp'] = pd.to_datetime(whale_df['timestamp'])
            whale_df['hour'] = whale_df['timestamp'].dt.floor('H')

            # Group by hour
            hourly_whales = whale_df.groupby('hour').agg({
                'buy_volume': 'sum',
                'sell_volume': 'sum'
            }).reset_index()

            # Normalize
            max_vol = max(hourly_whales['buy_volume'].max(), hourly_whales['sell_volume'].max(), 1)
            hourly_whales['whale_buy_pressure'] = hourly_whales['buy_volume'] / max_vol
            hourly_whales['whale_sell_pressure'] = hourly_whales['sell_volume'] / max_vol
            hourly_whales['whale_net_flow'] = (
                hourly_whales['whale_buy_pressure'] - hourly_whales['whale_sell_pressure']
            )

            # Merge with main df
            df = df.merge(
                hourly_whales[['hour', 'whale_buy_pressure', 'whale_sell_pressure', 'whale_net_flow']],
                left_index=True,
                right_on='hour',
                how='left'
            )
            df.set_index('hour', inplace=True)
        else:
            df['whale_buy_pressure'] = 0.0
            df['whale_sell_pressure'] = 0.0
            df['whale_net_flow'] = 0.0

        # Fill missing values
        df['whale_buy_pressure'] = df['whale_buy_pressure'].fillna(0)
        df['whale_sell_pressure'] = df['whale_sell_pressure'].fillna(0)
        df['whale_net_flow'] = df['whale_net_flow'].fillna(0)

        return df

    def add_static_features(self, df: pd.DataFrame, symbol: str) -> pd.DataFrame:
        """Add static (time-invariant) features."""
        df = df.copy()

        # Symbol encoding (simple ordinal)
        symbols = list(self.SYMBOL_CATEGORIES.keys())
        df['symbol_encoded'] = symbols.index(symbol) if symbol in symbols else 0

        # Category encoding
        category = self.SYMBOL_CATEGORIES.get(symbol, 'other')
        categories = list(set(self.SYMBOL_CATEGORIES.values())) + ['other']
        df['category_encoded'] = categories.index(category)

        # Volatility tier based on historical volatility
        avg_volatility = df['volatility'].mean() if 'volatility' in df.columns else 0.02
        if avg_volatility < 0.02:
            df['volatility_tier'] = 0  # low
        elif avg_volatility < 0.05:
            df['volatility_tier'] = 1  # medium
        else:
            df['volatility_tier'] = 2  # high

        return df

    def prepare_for_tft(
        self,
        ohlcv_data: List[Dict],
        symbol: str,
        order_book_data: Optional[List[Dict]] = None,
        whale_data: Optional[List[Dict]] = None
    ) -> Tuple[pd.DataFrame, Dict]:
        """
        Main entry point: prepare all data for TFT model.

        Returns:
            df: Processed DataFrame ready for TFT
            metadata: Dictionary with feature info
        """
        # Convert to DataFrame
        df = pd.DataFrame(ohlcv_data)

        # Process features
        df = self.process_ohlcv(df)
        df = self.add_order_book_features(df, order_book_data)
        df = self.add_whale_features(df, whale_data)
        df = self.add_static_features(df, symbol)

        # Add time index for TFT
        df['time_idx'] = range(len(df))
        df['group'] = symbol

        # Drop NaN rows (from rolling calculations)
        df = df.dropna()

        # Select final features
        feature_cols = (
            self.TIME_VARYING_KNOWN +
            self.TIME_VARYING_UNKNOWN +
            self.STATIC_FEATURES +
            ['time_idx', 'group']
        )

        # Only keep columns that exist
        available_cols = [c for c in feature_cols if c in df.columns]
        df = df[available_cols]

        metadata = {
            'symbol': symbol,
            'time_varying_known': [c for c in self.TIME_VARYING_KNOWN if c in available_cols],
            'time_varying_unknown': [c for c in self.TIME_VARYING_UNKNOWN if c in available_cols],
            'static_features': [c for c in self.STATIC_FEATURES if c in available_cols],
            'prediction_horizon': self.prediction_horizon,
            'history_length': self.history_length,
        }

        logger.info(f"Prepared data for {symbol}: {len(df)} rows, {len(available_cols)} features")

        return df, metadata

    def create_target(self, df: pd.DataFrame, horizon: int = 24) -> pd.DataFrame:
        """Create target variable (future price change)."""
        df = df.copy()

        # Target: percentage change after 'horizon' periods
        df['target'] = df['close'].shift(-horizon) / df['close'] - 1

        # Remove rows without target
        df = df.dropna(subset=['target'])

        return df
