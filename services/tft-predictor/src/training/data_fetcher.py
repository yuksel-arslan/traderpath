"""
Historical Data Fetcher
Binance'den yeterli miktarda historical veri çeker
"""

import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import httpx
from loguru import logger
import json
import hashlib

from .config import TradeTypeConfig, TradeType


class HistoricalDataFetcher:
    """
    Binance'den historical veri çeker.
    - Rate limiting ile API limitlerini aşmaz
    - Disk cache ile tekrar çekmeyi önler
    - Eksik verileri tamamlar
    """

    BINANCE_BASE_URL = "https://api.binance.com"
    BINANCE_KLINES_ENDPOINT = "/api/v3/klines"

    # Binance API limits
    MAX_CANDLES_PER_REQUEST = 1000
    REQUEST_DELAY_MS = 100  # Rate limiting

    # Interval to milliseconds mapping
    INTERVAL_MS = {
        "1m": 60 * 1000,
        "3m": 3 * 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "2h": 2 * 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "8h": 8 * 60 * 60 * 1000,
        "12h": 12 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "1w": 7 * 24 * 60 * 60 * 1000,
    }

    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    def _get_cache_path(self, symbol: str, interval: str, start_date: str, end_date: str) -> Path:
        """Cache dosyası için unique path oluştur"""
        cache_key = f"{symbol}_{interval}_{start_date}_{end_date}"
        cache_hash = hashlib.md5(cache_key.encode()).hexdigest()[:12]
        return self.cache_dir / f"{symbol}_{interval}_{cache_hash}.parquet"

    def _load_from_cache(self, cache_path: Path) -> Optional[pd.DataFrame]:
        """Cache'den veri yükle"""
        if cache_path.exists():
            try:
                df = pd.read_parquet(cache_path)
                logger.info(f"Cache'den yüklendi: {cache_path.name} ({len(df)} satır)")
                return df
            except Exception as e:
                logger.warning(f"Cache okuma hatası: {e}")
        return None

    def _save_to_cache(self, df: pd.DataFrame, cache_path: Path):
        """Veriyi cache'e kaydet"""
        try:
            df.to_parquet(cache_path, index=False)
            logger.info(f"Cache'e kaydedildi: {cache_path.name}")
        except Exception as e:
            logger.warning(f"Cache yazma hatası: {e}")

    async def fetch_klines(
        self,
        symbol: str,
        interval: str,
        start_time: int,
        end_time: int
    ) -> List[List]:
        """
        Binance'den kline (OHLCV) verisi çek.
        Otomatik pagination ile tüm veriyi alır.
        """
        if not self.client:
            raise RuntimeError("Client not initialized. Use 'async with' context.")

        all_klines = []
        current_start = start_time
        interval_ms = self.INTERVAL_MS.get(interval, 3600000)

        request_count = 0
        max_requests = 500  # Safety limit

        while current_start < end_time and request_count < max_requests:
            params = {
                "symbol": f"{symbol}USDT",
                "interval": interval,
                "startTime": current_start,
                "endTime": end_time,
                "limit": self.MAX_CANDLES_PER_REQUEST
            }

            try:
                response = await self.client.get(
                    f"{self.BINANCE_BASE_URL}{self.BINANCE_KLINES_ENDPOINT}",
                    params=params
                )
                response.raise_for_status()
                klines = response.json()

                if not klines:
                    break

                all_klines.extend(klines)

                # Sonraki batch için start time güncelle
                last_close_time = klines[-1][6]  # Close time
                current_start = last_close_time + 1

                request_count += 1

                # Rate limiting
                await asyncio.sleep(self.REQUEST_DELAY_MS / 1000)

                if request_count % 10 == 0:
                    logger.info(f"  {symbol}: {len(all_klines)} candle çekildi...")

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    # Rate limit - bekle ve tekrar dene
                    logger.warning("Rate limit! 60 saniye bekleniyor...")
                    await asyncio.sleep(60)
                    continue
                raise
            except Exception as e:
                logger.error(f"Kline çekme hatası: {e}")
                break

        return all_klines

    def _klines_to_dataframe(self, klines: List[List], symbol: str) -> pd.DataFrame:
        """Kline listesini DataFrame'e dönüştür"""
        if not klines:
            return pd.DataFrame()

        df = pd.DataFrame(klines, columns=[
            'open_time', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])

        # Type conversions
        df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)
        df['quote_volume'] = df['quote_volume'].astype(float)
        df['trades'] = df['trades'].astype(int)
        df['taker_buy_base'] = df['taker_buy_base'].astype(float)
        df['taker_buy_quote'] = df['taker_buy_quote'].astype(float)

        # Symbol ekle
        df['symbol'] = symbol

        # Gereksiz kolonları kaldır
        df = df.drop(columns=['open_time', 'close_time', 'ignore'])

        # Duplicate'ları kaldır
        df = df.drop_duplicates(subset=['timestamp'])

        # Sırala
        df = df.sort_values('timestamp').reset_index(drop=True)

        return df

    async def fetch_symbol_data(
        self,
        symbol: str,
        config: TradeTypeConfig,
        use_cache: bool = True
    ) -> pd.DataFrame:
        """
        Tek bir symbol için historical veri çek.

        Args:
            symbol: Coin sembolü (BTC, ETH, vs.)
            config: Trade type konfigürasyonu
            use_cache: Cache kullan

        Returns:
            OHLCV DataFrame
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=config.lookback_days)

        start_str = start_date.strftime("%Y%m%d")
        end_str = end_date.strftime("%Y%m%d")

        # Cache kontrol
        cache_path = self._get_cache_path(symbol, config.data_interval, start_str, end_str)

        if use_cache:
            cached_df = self._load_from_cache(cache_path)
            if cached_df is not None:
                return cached_df

        logger.info(f"Veri çekiliyor: {symbol} ({config.data_interval}, {config.lookback_days} gün)")

        start_ms = int(start_date.timestamp() * 1000)
        end_ms = int(end_date.timestamp() * 1000)

        klines = await self.fetch_klines(symbol, config.data_interval, start_ms, end_ms)

        df = self._klines_to_dataframe(klines, symbol)

        if len(df) > 0:
            logger.info(f"  {symbol}: {len(df)} candle çekildi "
                       f"({df['timestamp'].min()} - {df['timestamp'].max()})")

            if use_cache:
                self._save_to_cache(df, cache_path)
        else:
            logger.warning(f"  {symbol}: Veri çekilemedi!")

        return df

    async def fetch_all_symbols(
        self,
        symbols: List[str],
        config: TradeTypeConfig,
        use_cache: bool = True
    ) -> Dict[str, pd.DataFrame]:
        """
        Tüm semboller için veri çek.
        Paralel çekim yapar ama rate limit'e dikkat eder.
        """
        results = {}

        for symbol in symbols:
            try:
                df = await self.fetch_symbol_data(symbol, config, use_cache)
                if len(df) > 0:
                    results[symbol] = df
            except Exception as e:
                logger.error(f"{symbol} veri çekme hatası: {e}")
                continue

            # Semboller arası bekleme
            await asyncio.sleep(0.5)

        return results

    def validate_data(
        self,
        df: pd.DataFrame,
        config: TradeTypeConfig
    ) -> Tuple[bool, str]:
        """
        Veri kalitesini kontrol et.

        Returns:
            (is_valid, message)
        """
        if df.empty:
            return False, "DataFrame boş"

        # Minimum sample kontrolü
        if len(df) < config.min_training_samples * 0.5:
            return False, f"Yetersiz veri: {len(df)} < {config.min_training_samples * 0.5}"

        # Missing value kontrolü
        missing_pct = df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100
        if missing_pct > 5:
            return False, f"Çok fazla eksik veri: {missing_pct:.1f}%"

        # Timestamp gap kontrolü
        time_diffs = df['timestamp'].diff().dropna()
        interval_ms = self.INTERVAL_MS.get(config.data_interval, 3600000)
        expected_diff = pd.Timedelta(milliseconds=interval_ms)

        large_gaps = time_diffs[time_diffs > expected_diff * 2]
        if len(large_gaps) > len(df) * 0.01:  # %1'den fazla gap
            return False, f"Çok fazla veri boşluğu: {len(large_gaps)} gap"

        # Price anomaly kontrolü
        returns = df['close'].pct_change().dropna()
        extreme_returns = returns[abs(returns) > 0.5]  # %50'den fazla değişim
        if len(extreme_returns) > 10:
            logger.warning(f"Dikkat: {len(extreme_returns)} ekstrem fiyat hareketi")

        return True, f"OK - {len(df)} satır, {missing_pct:.2f}% eksik"


async def fetch_training_data(
    symbols: List[str],
    config: TradeTypeConfig,
    cache_dir: str = "data/cache"
) -> Dict[str, pd.DataFrame]:
    """
    Training için tüm veriyi çek - convenience function.
    """
    async with HistoricalDataFetcher(cache_dir) as fetcher:
        data = await fetcher.fetch_all_symbols(symbols, config)

        # Validate
        valid_data = {}
        for symbol, df in data.items():
            is_valid, msg = fetcher.validate_data(df, config)
            if is_valid:
                valid_data[symbol] = df
                logger.info(f"  {symbol}: {msg}")
            else:
                logger.warning(f"  {symbol}: INVALID - {msg}")

        return valid_data
