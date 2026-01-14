"""
Main Predictor Service
Orchestrates data processing and model inference
"""

import os
from typing import Dict, List, Optional
from pathlib import Path
import pandas as pd
import httpx
from loguru import logger

from .data_processor import CryptoDataProcessor
from .model import CryptoTFTModel, SimpleFallbackPredictor


class CryptoPredictorService:
    """
    Main service for cryptocurrency price prediction.

    Fetches data from Binance, processes it, and generates predictions
    using TFT model (or fallback if model not available).
    """

    BINANCE_BASE_URL = "https://api.binance.com/api/v3"

    def __init__(self, model_path: Optional[str] = None):
        self.data_processor = CryptoDataProcessor()
        self.model_path = model_path or os.getenv('TFT_MODEL_PATH', 'models/tft_crypto.pt')

        # Try to load TFT model, fallback to simple predictor
        try:
            if Path(self.model_path).exists():
                self.model = CryptoTFTModel(model_path=self.model_path)
                self.use_tft = True
                logger.info(f"Loaded TFT model from {self.model_path}")
            else:
                self.model = SimpleFallbackPredictor()
                self.use_tft = False
                logger.warning(f"TFT model not found at {self.model_path}, using fallback predictor")
        except Exception as e:
            logger.error(f"Failed to load TFT model: {e}, using fallback")
            self.model = SimpleFallbackPredictor()
            self.use_tft = False

    async def fetch_ohlcv(
        self,
        symbol: str,
        interval: str = '1h',
        limit: int = 1000
    ) -> List[Dict]:
        """Fetch OHLCV data from Binance."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BINANCE_BASE_URL}/klines",
                params={
                    'symbol': f"{symbol}USDT",
                    'interval': interval,
                    'limit': limit
                }
            )
            response.raise_for_status()
            data = response.json()

        # Convert to standard format
        ohlcv = []
        for candle in data:
            ohlcv.append({
                'timestamp': candle[0],
                'open': float(candle[1]),
                'high': float(candle[2]),
                'low': float(candle[3]),
                'close': float(candle[4]),
                'volume': float(candle[5])
            })

        return ohlcv

    async def fetch_order_book(
        self,
        symbol: str,
        limit: int = 100
    ) -> Dict:
        """Fetch order book from Binance."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BINANCE_BASE_URL}/depth",
                params={
                    'symbol': f"{symbol}USDT",
                    'limit': limit
                }
            )
            response.raise_for_status()
            return response.json()

    async def fetch_recent_trades(
        self,
        symbol: str,
        limit: int = 1000
    ) -> List[Dict]:
        """Fetch recent trades for whale detection."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BINANCE_BASE_URL}/trades",
                params={
                    'symbol': f"{symbol}USDT",
                    'limit': limit
                }
            )
            response.raise_for_status()
            return response.json()

    def detect_whale_activity(self, trades: List[Dict]) -> List[Dict]:
        """Detect whale trades from recent trades."""
        WHALE_THRESHOLD_USD = 100000

        whale_activity = []
        for trade in trades:
            value_usd = float(trade['price']) * float(trade['qty'])
            if value_usd >= WHALE_THRESHOLD_USD:
                whale_activity.append({
                    'timestamp': trade['time'],
                    'price': float(trade['price']),
                    'quantity': float(trade['qty']),
                    'value_usd': value_usd,
                    'is_buyer': trade['isBuyerMaker'] == False,
                    'buy_volume': value_usd if not trade['isBuyerMaker'] else 0,
                    'sell_volume': value_usd if trade['isBuyerMaker'] else 0,
                })

        return whale_activity

    async def predict(
        self,
        symbol: str,
        include_order_book: bool = True,
        include_whale_activity: bool = True
    ) -> Dict:
        """
        Main prediction endpoint.

        Args:
            symbol: Crypto symbol (e.g., 'BTC', 'ETH')
            include_order_book: Whether to fetch and include order book data
            include_whale_activity: Whether to detect and include whale activity

        Returns:
            Prediction result matching technical specification format:
            {
                'price_24h': float,
                'price_7d': float,
                'confidence': float,
                'scenarios': [...]
            }
        """
        logger.info(f"Generating prediction for {symbol}")

        # Fetch OHLCV data
        ohlcv_data = await self.fetch_ohlcv(symbol, interval='1h', limit=1000)
        logger.info(f"Fetched {len(ohlcv_data)} OHLCV candles")

        # Fetch order book if requested
        order_book_data = None
        if include_order_book:
            try:
                order_book_data = [await self.fetch_order_book(symbol)]
            except Exception as e:
                logger.warning(f"Failed to fetch order book: {e}")

        # Detect whale activity if requested
        whale_data = None
        if include_whale_activity:
            try:
                trades = await self.fetch_recent_trades(symbol)
                whale_data = self.detect_whale_activity(trades)
                logger.info(f"Detected {len(whale_data)} whale trades")
            except Exception as e:
                logger.warning(f"Failed to fetch trades for whale detection: {e}")

        # Process data
        df, metadata = self.data_processor.prepare_for_tft(
            ohlcv_data,
            symbol,
            order_book_data,
            whale_data
        )

        # Generate prediction
        if self.use_tft:
            prediction = self.model.predict(df, metadata)
        else:
            prediction = self.model.predict(df, symbol)

        # Add metadata
        prediction['symbol'] = symbol
        prediction['model_type'] = 'tft' if self.use_tft else 'statistical_fallback'
        prediction['data_points'] = len(df)

        return prediction

    async def batch_predict(self, symbols: List[str]) -> Dict[str, Dict]:
        """Generate predictions for multiple symbols."""
        results = {}
        for symbol in symbols:
            try:
                results[symbol] = await self.predict(symbol)
            except Exception as e:
                logger.error(f"Prediction failed for {symbol}: {e}")
                results[symbol] = {'error': str(e)}
        return results


# Singleton instance
_predictor_service: Optional[CryptoPredictorService] = None


def get_predictor_service() -> CryptoPredictorService:
    """Get or create singleton predictor service."""
    global _predictor_service
    if _predictor_service is None:
        _predictor_service = CryptoPredictorService()
    return _predictor_service
