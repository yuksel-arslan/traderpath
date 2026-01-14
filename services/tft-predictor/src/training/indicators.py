"""
Technical Indicators Library
Teknik şartnamedeki 40+ indikatör implementasyonu
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional
from loguru import logger


class TechnicalIndicators:
    """
    TraderPath Teknik Şartnamesindeki tüm indikatörler.

    Categories:
    - Trend: EMA, SMA, MACD, ADX, SUPERTREND, ICHIMOKU, PSAR, AROON, VWMA
    - Momentum: RSI, STOCHASTIC, STOCH_RSI, CCI, WILLIAMS_R, ROC, MFI, ULTIMATE, TSI
    - Volatility: BOLLINGER, ATR, KELTNER, DONCHIAN, HISTORICAL_VOLATILITY, SQUEEZE
    - Volume: OBV, VWAP, AD, CMF, FORCE_INDEX, EOM, PVT, RELATIVE_VOLUME, VOLUME_SPIKE
    - Advanced: ORDER_FLOW_IMBALANCE, LIQUIDITY_SCORE, etc.
    """

    # ============ TREND INDICATORS ============

    @staticmethod
    def ema(series: pd.Series, period: int) -> pd.Series:
        """Exponential Moving Average"""
        return series.ewm(span=period, adjust=False).mean()

    @staticmethod
    def sma(series: pd.Series, period: int) -> pd.Series:
        """Simple Moving Average"""
        return series.rolling(period).mean()

    @staticmethod
    def vwma(df: pd.DataFrame, period: int) -> pd.Series:
        """Volume Weighted Moving Average"""
        return (df['close'] * df['volume']).rolling(period).sum() / df['volume'].rolling(period).sum()

    @staticmethod
    def macd(
        series: pd.Series,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """MACD - Moving Average Convergence Divergence"""
        ema_fast = series.ewm(span=fast, adjust=False).mean()
        ema_slow = series.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    @staticmethod
    def adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Average Directional Index"""
        high = df['high']
        low = df['low']
        close = df['close']

        plus_dm = high.diff()
        minus_dm = -low.diff()

        plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
        minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)

        tr = pd.concat([
            high - low,
            abs(high - close.shift(1)),
            abs(low - close.shift(1))
        ], axis=1).max(axis=1)

        atr = tr.rolling(period).mean()
        plus_di = 100 * (plus_dm.rolling(period).mean() / (atr + 1e-8))
        minus_di = 100 * (minus_dm.rolling(period).mean() / (atr + 1e-8))

        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 1e-8)
        adx = dx.rolling(period).mean()

        return adx

    @staticmethod
    def supertrend(
        df: pd.DataFrame,
        period: int = 10,
        multiplier: float = 3.0
    ) -> Tuple[pd.Series, pd.Series]:
        """Supertrend Indicator"""
        high = df['high']
        low = df['low']
        close = df['close']

        # ATR
        tr = pd.concat([
            high - low,
            abs(high - close.shift(1)),
            abs(low - close.shift(1))
        ], axis=1).max(axis=1)
        atr = tr.rolling(period).mean()

        # Basic bands
        hl2 = (high + low) / 2
        upper_band = hl2 + multiplier * atr
        lower_band = hl2 - multiplier * atr

        # Supertrend calculation
        supertrend = pd.Series(index=df.index, dtype=float)
        direction = pd.Series(index=df.index, dtype=int)

        supertrend.iloc[0] = upper_band.iloc[0]
        direction.iloc[0] = 1

        for i in range(1, len(df)):
            if close.iloc[i] > supertrend.iloc[i-1]:
                supertrend.iloc[i] = lower_band.iloc[i]
                direction.iloc[i] = 1
            else:
                supertrend.iloc[i] = upper_band.iloc[i]
                direction.iloc[i] = -1

        return supertrend, direction

    @staticmethod
    def ichimoku(
        df: pd.DataFrame,
        tenkan: int = 9,
        kijun: int = 26,
        senkou_b: int = 52
    ) -> dict:
        """Ichimoku Cloud"""
        high = df['high']
        low = df['low']
        close = df['close']

        # Tenkan-sen (Conversion Line)
        tenkan_sen = (high.rolling(tenkan).max() + low.rolling(tenkan).min()) / 2

        # Kijun-sen (Base Line)
        kijun_sen = (high.rolling(kijun).max() + low.rolling(kijun).min()) / 2

        # Senkou Span A (Leading Span A)
        senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(kijun)

        # Senkou Span B (Leading Span B)
        senkou_span_b = ((high.rolling(senkou_b).max() + low.rolling(senkou_b).min()) / 2).shift(kijun)

        # Chikou Span (Lagging Span)
        chikou_span = close.shift(-kijun)

        # Cloud color (1 = bullish, -1 = bearish)
        cloud_color = (senkou_span_a > senkou_span_b).astype(int) * 2 - 1

        # Price vs cloud
        price_vs_cloud = pd.Series(0, index=df.index)
        price_vs_cloud[close > senkou_span_a.combine(senkou_span_b, max)] = 1  # Above cloud
        price_vs_cloud[close < senkou_span_a.combine(senkou_span_b, min)] = -1  # Below cloud

        return {
            'tenkan_sen': tenkan_sen,
            'kijun_sen': kijun_sen,
            'senkou_span_a': senkou_span_a,
            'senkou_span_b': senkou_span_b,
            'chikou_span': chikou_span,
            'cloud_color': cloud_color,
            'price_vs_cloud': price_vs_cloud
        }

    @staticmethod
    def psar(
        df: pd.DataFrame,
        af_start: float = 0.02,
        af_step: float = 0.02,
        af_max: float = 0.2
    ) -> pd.Series:
        """Parabolic SAR"""
        high = df['high'].values
        low = df['low'].values
        close = df['close'].values
        n = len(df)

        psar = np.zeros(n)
        af = af_start
        trend = 1  # 1 = uptrend, -1 = downtrend
        ep = low[0]  # Extreme point

        psar[0] = high[0] if trend == -1 else low[0]

        for i in range(1, n):
            if trend == 1:
                psar[i] = psar[i-1] + af * (ep - psar[i-1])
                psar[i] = min(psar[i], low[i-1], low[i-2] if i > 1 else low[i-1])

                if high[i] > ep:
                    ep = high[i]
                    af = min(af + af_step, af_max)

                if low[i] < psar[i]:
                    trend = -1
                    psar[i] = ep
                    ep = low[i]
                    af = af_start
            else:
                psar[i] = psar[i-1] + af * (ep - psar[i-1])
                psar[i] = max(psar[i], high[i-1], high[i-2] if i > 1 else high[i-1])

                if low[i] < ep:
                    ep = low[i]
                    af = min(af + af_step, af_max)

                if high[i] > psar[i]:
                    trend = 1
                    psar[i] = ep
                    ep = high[i]
                    af = af_start

        return pd.Series(psar, index=df.index)

    @staticmethod
    def aroon(df: pd.DataFrame, period: int = 25) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Aroon Indicator"""
        high = df['high']
        low = df['low']

        aroon_up = 100 * high.rolling(period + 1).apply(lambda x: x.argmax(), raw=True) / period
        aroon_down = 100 * low.rolling(period + 1).apply(lambda x: x.argmin(), raw=True) / period
        aroon_osc = aroon_up - aroon_down

        return aroon_up, aroon_down, aroon_osc

    # ============ MOMENTUM INDICATORS ============

    @staticmethod
    def rsi(series: pd.Series, period: int = 14) -> pd.Series:
        """Relative Strength Index"""
        delta = series.diff()
        gain = delta.where(delta > 0, 0).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        rs = gain / (loss + 1e-8)
        return 100 - (100 / (1 + rs))

    @staticmethod
    def stochastic(
        df: pd.DataFrame,
        k_period: int = 14,
        d_period: int = 3,
        smooth_k: int = 3
    ) -> Tuple[pd.Series, pd.Series]:
        """Stochastic Oscillator"""
        high = df['high']
        low = df['low']
        close = df['close']

        lowest_low = low.rolling(k_period).min()
        highest_high = high.rolling(k_period).max()

        stoch_k = 100 * (close - lowest_low) / (highest_high - lowest_low + 1e-8)
        stoch_k = stoch_k.rolling(smooth_k).mean()  # Smoothed %K
        stoch_d = stoch_k.rolling(d_period).mean()

        return stoch_k, stoch_d

    @staticmethod
    def stoch_rsi(
        series: pd.Series,
        rsi_period: int = 14,
        stoch_period: int = 14,
        k_period: int = 3,
        d_period: int = 3
    ) -> Tuple[pd.Series, pd.Series]:
        """Stochastic RSI"""
        rsi = TechnicalIndicators.rsi(series, rsi_period)

        lowest_rsi = rsi.rolling(stoch_period).min()
        highest_rsi = rsi.rolling(stoch_period).max()

        stoch_rsi = (rsi - lowest_rsi) / (highest_rsi - lowest_rsi + 1e-8)
        stoch_rsi_k = stoch_rsi.rolling(k_period).mean()
        stoch_rsi_d = stoch_rsi_k.rolling(d_period).mean()

        return stoch_rsi_k, stoch_rsi_d

    @staticmethod
    def cci(df: pd.DataFrame, period: int = 20) -> pd.Series:
        """Commodity Channel Index"""
        tp = (df['high'] + df['low'] + df['close']) / 3
        sma_tp = tp.rolling(period).mean()
        mad = tp.rolling(period).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
        return (tp - sma_tp) / (0.015 * mad + 1e-8)

    @staticmethod
    def williams_r(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Williams %R"""
        highest_high = df['high'].rolling(period).max()
        lowest_low = df['low'].rolling(period).min()
        return -100 * (highest_high - df['close']) / (highest_high - lowest_low + 1e-8)

    @staticmethod
    def roc(series: pd.Series, period: int = 12) -> pd.Series:
        """Rate of Change"""
        return 100 * (series - series.shift(period)) / (series.shift(period) + 1e-8)

    @staticmethod
    def mfi(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Money Flow Index"""
        tp = (df['high'] + df['low'] + df['close']) / 3
        mf = tp * df['volume']

        positive_mf = mf.where(tp > tp.shift(1), 0).rolling(period).sum()
        negative_mf = mf.where(tp < tp.shift(1), 0).rolling(period).sum()

        mfi = 100 - (100 / (1 + positive_mf / (negative_mf + 1e-8)))
        return mfi

    @staticmethod
    def ultimate_oscillator(
        df: pd.DataFrame,
        period1: int = 7,
        period2: int = 14,
        period3: int = 28
    ) -> pd.Series:
        """Ultimate Oscillator"""
        high = df['high']
        low = df['low']
        close = df['close']

        bp = close - pd.concat([low, close.shift(1)], axis=1).min(axis=1)
        tr = pd.concat([high - low, abs(high - close.shift(1)), abs(low - close.shift(1))], axis=1).max(axis=1)

        avg1 = bp.rolling(period1).sum() / tr.rolling(period1).sum()
        avg2 = bp.rolling(period2).sum() / tr.rolling(period2).sum()
        avg3 = bp.rolling(period3).sum() / tr.rolling(period3).sum()

        uo = 100 * (4 * avg1 + 2 * avg2 + avg3) / 7
        return uo

    @staticmethod
    def tsi(series: pd.Series, long_period: int = 25, short_period: int = 13) -> pd.Series:
        """True Strength Index"""
        diff = series.diff()

        double_smoothed = diff.ewm(span=long_period).mean().ewm(span=short_period).mean()
        double_smoothed_abs = abs(diff).ewm(span=long_period).mean().ewm(span=short_period).mean()

        return 100 * double_smoothed / (double_smoothed_abs + 1e-8)

    # ============ VOLATILITY INDICATORS ============

    @staticmethod
    def bollinger_bands(
        series: pd.Series,
        period: int = 20,
        std_dev: float = 2.0
    ) -> Tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
        """Bollinger Bands with %B and Bandwidth"""
        middle = series.rolling(period).mean()
        std = series.rolling(period).std()

        upper = middle + std_dev * std
        lower = middle - std_dev * std

        percent_b = (series - lower) / (upper - lower + 1e-8)
        bandwidth = (upper - lower) / (middle + 1e-8) * 100

        return upper, middle, lower, percent_b

    @staticmethod
    def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Average True Range"""
        high = df['high']
        low = df['low']
        close = df['close']

        tr = pd.concat([
            high - low,
            abs(high - close.shift(1)),
            abs(low - close.shift(1))
        ], axis=1).max(axis=1)

        return tr.rolling(period).mean()

    @staticmethod
    def keltner_channels(
        df: pd.DataFrame,
        ema_period: int = 20,
        atr_period: int = 10,
        multiplier: float = 2.0
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Keltner Channels"""
        middle = df['close'].ewm(span=ema_period).mean()
        atr = TechnicalIndicators.atr(df, atr_period)

        upper = middle + multiplier * atr
        lower = middle - multiplier * atr

        return upper, middle, lower

    @staticmethod
    def donchian_channels(
        df: pd.DataFrame,
        period: int = 20
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Donchian Channels"""
        upper = df['high'].rolling(period).max()
        lower = df['low'].rolling(period).min()
        middle = (upper + lower) / 2

        return upper, middle, lower

    @staticmethod
    def historical_volatility(series: pd.Series, period: int = 20) -> pd.Series:
        """Historical Volatility (annualized)"""
        log_returns = np.log(series / series.shift(1))
        return log_returns.rolling(period).std() * np.sqrt(252)

    @staticmethod
    def squeeze_indicator(
        df: pd.DataFrame,
        bb_period: int = 20,
        bb_mult: float = 2.0,
        kc_period: int = 20,
        kc_mult: float = 1.5
    ) -> Tuple[pd.Series, pd.Series]:
        """Squeeze Momentum Indicator (TTM Squeeze)"""
        # Bollinger Bands
        bb_upper, bb_middle, bb_lower, _ = TechnicalIndicators.bollinger_bands(
            df['close'], bb_period, bb_mult
        )

        # Keltner Channels
        kc_upper, kc_middle, kc_lower = TechnicalIndicators.keltner_channels(
            df, kc_period, 10, kc_mult
        )

        # Squeeze: BB inside KC
        squeeze_on = (bb_lower > kc_lower) & (bb_upper < kc_upper)

        # Momentum
        highest = df['high'].rolling(kc_period).max()
        lowest = df['low'].rolling(kc_period).min()
        m1 = (highest + lowest) / 2
        m2 = (highest + lowest + df['close'].rolling(kc_period).mean()) / 3
        momentum = df['close'] - (m1 + m2) / 2

        return squeeze_on.astype(int), momentum

    # ============ VOLUME INDICATORS ============

    @staticmethod
    def obv(df: pd.DataFrame) -> pd.Series:
        """On-Balance Volume"""
        obv = pd.Series(0, index=df.index, dtype=float)
        obv.iloc[0] = df['volume'].iloc[0]

        for i in range(1, len(df)):
            if df['close'].iloc[i] > df['close'].iloc[i-1]:
                obv.iloc[i] = obv.iloc[i-1] + df['volume'].iloc[i]
            elif df['close'].iloc[i] < df['close'].iloc[i-1]:
                obv.iloc[i] = obv.iloc[i-1] - df['volume'].iloc[i]
            else:
                obv.iloc[i] = obv.iloc[i-1]

        return obv

    @staticmethod
    def vwap(df: pd.DataFrame) -> pd.Series:
        """Volume Weighted Average Price (cumulative for the day)"""
        tp = (df['high'] + df['low'] + df['close']) / 3
        return (tp * df['volume']).cumsum() / df['volume'].cumsum()

    @staticmethod
    def ad(df: pd.DataFrame) -> pd.Series:
        """Accumulation/Distribution Line"""
        clv = ((df['close'] - df['low']) - (df['high'] - df['close'])) / (df['high'] - df['low'] + 1e-8)
        ad_line = (clv * df['volume']).cumsum()
        return ad_line

    @staticmethod
    def cmf(df: pd.DataFrame, period: int = 20) -> pd.Series:
        """Chaikin Money Flow"""
        clv = ((df['close'] - df['low']) - (df['high'] - df['close'])) / (df['high'] - df['low'] + 1e-8)
        mfv = clv * df['volume']
        return mfv.rolling(period).sum() / df['volume'].rolling(period).sum()

    @staticmethod
    def force_index(df: pd.DataFrame, period: int = 13) -> pd.Series:
        """Force Index"""
        fi = df['close'].diff() * df['volume']
        return fi.ewm(span=period).mean()

    @staticmethod
    def eom(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Ease of Movement"""
        distance = ((df['high'] + df['low']) / 2) - ((df['high'].shift(1) + df['low'].shift(1)) / 2)
        box_ratio = (df['volume'] / 1e8) / (df['high'] - df['low'] + 1e-8)
        eom = distance / box_ratio
        return eom.rolling(period).mean()

    @staticmethod
    def pvt(df: pd.DataFrame) -> pd.Series:
        """Price Volume Trend"""
        return ((df['close'] - df['close'].shift(1)) / df['close'].shift(1) * df['volume']).cumsum()

    @staticmethod
    def relative_volume(df: pd.DataFrame, period: int = 20) -> pd.Series:
        """Relative Volume"""
        return df['volume'] / df['volume'].rolling(period).mean()

    @staticmethod
    def volume_spike(df: pd.DataFrame, threshold: float = 2.0, period: int = 20) -> pd.Series:
        """Volume Spike Detection"""
        rel_vol = TechnicalIndicators.relative_volume(df, period)
        return (rel_vol > threshold).astype(int)

    # ============ ADVANCED INDICATORS ============

    @staticmethod
    def order_flow_imbalance(df: pd.DataFrame) -> pd.Series:
        """
        Order Flow Imbalance (proxy using taker buy/sell data)
        Requires 'taker_buy_base' column from Binance
        """
        if 'taker_buy_base' not in df.columns:
            return pd.Series(0, index=df.index)

        taker_buy = df['taker_buy_base']
        taker_sell = df['volume'] - taker_buy

        imbalance = (taker_buy - taker_sell) / (df['volume'] + 1e-8)
        return imbalance

    @staticmethod
    def bid_ask_spread_estimate(df: pd.DataFrame) -> pd.Series:
        """Bid-Ask Spread Estimate (from high-low range)"""
        return (df['high'] - df['low']) / ((df['high'] + df['low']) / 2 + 1e-8)

    @staticmethod
    def liquidity_score(df: pd.DataFrame, period: int = 20) -> pd.Series:
        """Liquidity Score based on volume and spread"""
        spread = TechnicalIndicators.bid_ask_spread_estimate(df)
        vol_ratio = TechnicalIndicators.relative_volume(df, period)

        # Higher volume, lower spread = higher liquidity
        liquidity = vol_ratio / (spread * 100 + 1)
        return liquidity.rolling(period).mean()

    @staticmethod
    def market_impact_estimate(df: pd.DataFrame, period: int = 20) -> pd.Series:
        """Market Impact Estimate (price change per volume)"""
        price_change = abs(df['close'].pct_change())
        volume_normalized = df['volume'] / df['volume'].rolling(period).mean()

        impact = price_change / (volume_normalized + 1e-8)
        return impact.rolling(period).mean()


def add_all_indicators(
    df: pd.DataFrame,
    trade_type: str = 'swing',
    include_advanced: bool = True
) -> pd.DataFrame:
    """
    Trade type'a göre tüm indikatörleri ekle.

    Args:
        df: OHLCV DataFrame
        trade_type: 'scalp', 'day', 'swing'
        include_advanced: Order flow gibi advanced indikatörleri ekle

    Returns:
        Indicator'lı DataFrame
    """
    df = df.copy()
    ti = TechnicalIndicators

    logger.info(f"Adding indicators for {trade_type} trade type...")

    # === TREND ===
    # EMAs
    for period in [5, 9, 10, 12, 20, 21, 26, 50, 100, 200]:
        df[f'ema_{period}'] = ti.ema(df['close'], period)

    # SMAs
    for period in [20, 50, 100, 200]:
        df[f'sma_{period}'] = ti.sma(df['close'], period)

    # VWMA
    df['vwma_20'] = ti.vwma(df, 20)

    # MACD
    if trade_type == 'scalp':
        macd, signal, hist = ti.macd(df['close'], 6, 13, 5)
    else:
        macd, signal, hist = ti.macd(df['close'], 12, 26, 9)
    df['macd'] = macd
    df['macd_signal'] = signal
    df['macd_histogram'] = hist

    # ADX
    df['adx_14'] = ti.adx(df, 14)

    # Supertrend
    if trade_type == 'scalp':
        st, st_dir = ti.supertrend(df, 7, 2)
    elif trade_type == 'day':
        st, st_dir = ti.supertrend(df, 10, 3)
    else:
        st, st_dir = ti.supertrend(df, 10, 3)
    df['supertrend'] = st
    df['supertrend_direction'] = st_dir

    # Ichimoku
    ichimoku = ti.ichimoku(df)
    df['ichimoku_tenkan'] = ichimoku['tenkan_sen']
    df['ichimoku_kijun'] = ichimoku['kijun_sen']
    df['ichimoku_cloud_color'] = ichimoku['cloud_color']
    df['ichimoku_price_vs_cloud'] = ichimoku['price_vs_cloud']

    # PSAR
    df['psar'] = ti.psar(df)

    # Aroon
    aroon_up, aroon_down, aroon_osc = ti.aroon(df, 25)
    df['aroon_up'] = aroon_up
    df['aroon_down'] = aroon_down
    df['aroon_osc'] = aroon_osc

    # === MOMENTUM ===
    # RSI
    if trade_type == 'scalp':
        df['rsi_7'] = ti.rsi(df['close'], 7)
    df['rsi_14'] = ti.rsi(df['close'], 14)
    df['rsi_28'] = ti.rsi(df['close'], 28)

    # Stochastic
    stoch_k, stoch_d = ti.stochastic(df, 14, 3, 3)
    df['stoch_k'] = stoch_k
    df['stoch_d'] = stoch_d

    # Stochastic RSI
    stoch_rsi_k, stoch_rsi_d = ti.stoch_rsi(df['close'], 14, 14, 3, 3)
    df['stoch_rsi_k'] = stoch_rsi_k
    df['stoch_rsi_d'] = stoch_rsi_d

    # CCI
    df['cci_20'] = ti.cci(df, 20)

    # Williams %R
    df['williams_r'] = ti.williams_r(df, 14)

    # ROC
    df['roc_12'] = ti.roc(df['close'], 12)

    # MFI
    df['mfi_14'] = ti.mfi(df, 14)

    # Ultimate Oscillator
    df['ultimate_osc'] = ti.ultimate_oscillator(df, 7, 14, 28)

    # TSI
    df['tsi'] = ti.tsi(df['close'], 25, 13)

    # === VOLATILITY ===
    # Bollinger Bands
    bb_upper, bb_middle, bb_lower, bb_pct = ti.bollinger_bands(df['close'], 20, 2)
    df['bb_upper'] = bb_upper
    df['bb_middle'] = bb_middle
    df['bb_lower'] = bb_lower
    df['bb_percent_b'] = bb_pct
    df['bb_width'] = (bb_upper - bb_lower) / (bb_middle + 1e-8)

    # ATR
    if trade_type == 'scalp':
        df['atr_7'] = ti.atr(df, 7)
    df['atr_14'] = ti.atr(df, 14)
    df['atr_normalized'] = df['atr_14'] / df['close']

    # Keltner Channels
    kc_upper, kc_middle, kc_lower = ti.keltner_channels(df, 20, 10, 2)
    df['keltner_upper'] = kc_upper
    df['keltner_middle'] = kc_middle
    df['keltner_lower'] = kc_lower

    # Donchian Channels
    dc_upper, dc_middle, dc_lower = ti.donchian_channels(df, 20)
    df['donchian_upper'] = dc_upper
    df['donchian_middle'] = dc_middle
    df['donchian_lower'] = dc_lower
    df['donchian_position'] = (df['close'] - dc_lower) / (dc_upper - dc_lower + 1e-8)

    # Historical Volatility
    df['hist_volatility'] = ti.historical_volatility(df['close'], 20)

    # Squeeze
    squeeze_on, squeeze_momentum = ti.squeeze_indicator(df)
    df['squeeze_on'] = squeeze_on
    df['squeeze_momentum'] = squeeze_momentum

    # === VOLUME ===
    df['obv'] = ti.obv(df)
    df['obv_ema'] = ti.ema(df['obv'], 20)

    df['vwap'] = ti.vwap(df)

    df['ad_line'] = ti.ad(df)

    df['cmf'] = ti.cmf(df, 20)

    df['force_index'] = ti.force_index(df, 13)

    df['eom'] = ti.eom(df, 14)

    df['pvt'] = ti.pvt(df)

    df['relative_volume'] = ti.relative_volume(df, 20)

    df['volume_spike'] = ti.volume_spike(df, 2.0, 20)

    # === ADVANCED ===
    if include_advanced:
        df['order_flow_imbalance'] = ti.order_flow_imbalance(df)
        df['bid_ask_spread'] = ti.bid_ask_spread_estimate(df)
        df['liquidity_score'] = ti.liquidity_score(df, 20)
        df['market_impact'] = ti.market_impact_estimate(df, 20)

    # === DERIVED FEATURES ===
    # EMA crossovers
    df['ema_cross_9_21'] = (df['ema_9'] - df['ema_21']) / df['close']
    df['ema_cross_50_200'] = (df['ema_50'] - df['ema_200']) / df['close']
    df['golden_cross'] = (df['ema_50'] > df['ema_200']).astype(int)

    # Price vs MAs
    df['price_vs_ema_20'] = (df['close'] - df['ema_20']) / df['ema_20']
    df['price_vs_ema_50'] = (df['close'] - df['ema_50']) / df['ema_50']
    df['price_vs_sma_200'] = (df['close'] - df['sma_200']) / df['sma_200']

    # Trend strength combined
    df['trend_strength'] = (df['adx_14'] / 100) * df['supertrend_direction']

    # Momentum divergence
    df['rsi_price_divergence'] = df['rsi_14'].diff(5) - df['close'].pct_change(5) * 100

    # Volatility regime
    df['volatility_regime'] = pd.cut(
        df['atr_normalized'],
        bins=[0, 0.01, 0.02, 0.05, float('inf')],
        labels=[0, 1, 2, 3]
    ).astype(float)

    logger.info(f"Added {len([c for c in df.columns if c not in ['open', 'high', 'low', 'close', 'volume', 'timestamp']])} indicators")

    return df
