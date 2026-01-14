#!/usr/bin/env python3
"""
Training Script for Crypto TFT Model

Usage:
    python scripts/train.py --symbols BTC,ETH,SOL --epochs 50 --output models/tft_crypto.pt
"""

import os
import sys
import argparse
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from loguru import logger

from src.data_processor import CryptoDataProcessor
from src.model import CryptoTFTModel
from src.predictor import CryptoPredictorService


async def fetch_training_data(
    symbols: list,
    days: int = 365
) -> dict:
    """Fetch historical data for multiple symbols."""
    service = CryptoPredictorService()

    all_data = {}

    for symbol in symbols:
        logger.info(f"Fetching data for {symbol}...")
        try:
            # Fetch OHLCV
            ohlcv = await service.fetch_ohlcv(symbol, interval='1h', limit=min(days * 24, 1000))

            # Fetch order book snapshot (current only)
            order_book = await service.fetch_order_book(symbol)

            # Fetch recent trades for whale detection
            trades = await service.fetch_recent_trades(symbol)
            whale_data = service.detect_whale_activity(trades)

            all_data[symbol] = {
                'ohlcv': ohlcv,
                'order_book': [order_book],
                'whale_data': whale_data
            }
            logger.info(f"Fetched {len(ohlcv)} candles for {symbol}")

        except Exception as e:
            logger.error(f"Failed to fetch data for {symbol}: {e}")

    return all_data


def prepare_training_data(
    all_data: dict,
    processor: CryptoDataProcessor
) -> tuple:
    """Prepare all data for training."""

    all_dfs = []

    for symbol, data in all_data.items():
        df, metadata = processor.prepare_for_tft(
            data['ohlcv'],
            symbol,
            data.get('order_book'),
            data.get('whale_data')
        )

        # Add target
        df = processor.create_target(df, horizon=24)

        if len(df) > 0:
            all_dfs.append(df)
            logger.info(f"Prepared {len(df)} samples for {symbol}")

    # Combine all data
    if not all_dfs:
        raise ValueError("No data available for training")

    combined_df = pd.concat(all_dfs, ignore_index=True)

    # Re-index time_idx for combined dataset
    combined_df = combined_df.sort_values(['group', 'time_idx']).reset_index(drop=True)

    # Create new sequential time_idx per group
    combined_df['time_idx'] = combined_df.groupby('group').cumcount()

    logger.info(f"Total training samples: {len(combined_df)}")

    return combined_df, metadata


def train_model(
    df: pd.DataFrame,
    metadata: dict,
    max_epochs: int = 50,
    batch_size: int = 64,
    output_path: str = 'models/tft_crypto.pt'
):
    """Train the TFT model."""

    # Split into train/val (80/20)
    train_cutoff = int(len(df) * 0.8)

    # Sort by time_idx to ensure temporal split
    df = df.sort_values(['group', 'time_idx']).reset_index(drop=True)

    train_df = df.iloc[:train_cutoff]
    val_df = df.iloc[train_cutoff:]

    logger.info(f"Training samples: {len(train_df)}, Validation samples: {len(val_df)}")

    # Initialize model
    model = CryptoTFTModel()

    # Train
    logger.info("Starting training...")
    results = model.train(
        train_df=train_df,
        val_df=val_df,
        metadata=metadata,
        max_epochs=max_epochs,
        batch_size=batch_size,
        gpus=1 if os.environ.get('CUDA_VISIBLE_DEVICES') else 0
    )

    logger.info(f"Training complete. Best validation loss: {results['best_val_loss']:.4f}")

    # Save model
    model.save(output_path)
    logger.info(f"Model saved to {output_path}")

    return model, results


async def main():
    parser = argparse.ArgumentParser(description='Train TFT model for crypto prediction')
    parser.add_argument(
        '--symbols',
        type=str,
        default='BTC,ETH,SOL,BNB,XRP',
        help='Comma-separated list of symbols to train on'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=365,
        help='Days of historical data to use'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=50,
        help='Maximum training epochs'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=64,
        help='Training batch size'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='models/tft_crypto.pt',
        help='Output model path'
    )
    args = parser.parse_args()

    # Parse symbols
    symbols = [s.strip().upper() for s in args.symbols.split(',')]
    logger.info(f"Training on symbols: {symbols}")

    # Create output directory
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    # Fetch data
    logger.info("Fetching training data...")
    all_data = await fetch_training_data(symbols, days=args.days)

    if not all_data:
        logger.error("No data fetched. Exiting.")
        return

    # Prepare data
    logger.info("Preparing training data...")
    processor = CryptoDataProcessor()
    df, metadata = prepare_training_data(all_data, processor)

    # Train
    model, results = train_model(
        df=df,
        metadata=metadata,
        max_epochs=args.epochs,
        batch_size=args.batch_size,
        output_path=args.output
    )

    logger.info("Training complete!")
    logger.info(f"Results: {results}")


if __name__ == "__main__":
    asyncio.run(main())
