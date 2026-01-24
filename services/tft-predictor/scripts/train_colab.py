#!/usr/bin/env python3
"""
TFT Model Training Script for Google Colab
Usage: python train_colab.py --trade-type swing --symbols BTC ETH
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import torch
from loguru import logger

from training.config import TrainingConfig, TradeType
from training.trainer import TFTTrainer


async def main():
    parser = argparse.ArgumentParser(description="Train TFT model")
    parser.add_argument(
        "--trade-type",
        type=str,
        choices=["scalp", "swing", "position"],
        default="swing",
        help="Trade type (default: swing)"
    )
    parser.add_argument(
        "--symbols",
        nargs="+",
        default=["BTC", "ETH"],
        help="Symbols to train on (default: BTC ETH)"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=100,
        help="Max epochs (default: 100)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
        help="Batch size (default: 64)"
    )
    parser.add_argument(
        "--skip-optuna",
        action="store_true",
        help="Skip hyperparameter optimization"
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip walk-forward validation"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models",
        help="Output directory for models"
    )

    args = parser.parse_args()

    # GPU check
    logger.info("=" * 60)
    logger.info("TFT MODEL TRAINING - Google Colab")
    logger.info("=" * 60)
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logger.info(f"CUDA device: {torch.cuda.get_device_name(0)}")
        logger.info(f"CUDA memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    # Config
    trade_type = TradeType(args.trade_type)
    config = TrainingConfig(
        symbols=args.symbols,
        trade_type=trade_type,
        max_epochs=args.epochs,
        batch_size=args.batch_size,
        use_gpu=torch.cuda.is_available(),
        num_workers=2 if torch.cuda.is_available() else 0,
        model_output_dir=args.output_dir,
    )

    logger.info(f"Trade Type: {trade_type.value}")
    logger.info(f"Symbols: {args.symbols}")
    logger.info(f"Epochs: {args.epochs}")
    logger.info(f"Batch Size: {args.batch_size}")

    # Train
    trainer = TFTTrainer(config)
    results = await trainer.run_full_pipeline(
        skip_optuna=args.skip_optuna,
        skip_validation=args.skip_validation,
        skip_backtest=True  # Backtest sonra yapılabilir
    )

    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Model path: {results.get('model_path')}")
    logger.info(f"Total samples: {results.get('total_samples')}")
    logger.info(f"Model parameters: {results.get('model_params')}")

    return results


if __name__ == "__main__":
    asyncio.run(main())
