#!/usr/bin/env python3
"""
TFT Model Training CLI v2
Trade type bazlı, doğru eğitim pipeline'ı

Usage:
    # Scalp model eğit
    python scripts/train_v2.py --trade-type scalp --symbols BTC,ETH

    # Swing model eğit (varsayılan)
    python scripts/train_v2.py --trade-type swing --symbols BTC,ETH,SOL,BNB,XRP

    # Position model eğit
    python scripts/train_v2.py --trade-type position --symbols BTC,ETH

    # Hızlı test (optuna ve validation atla)
    python scripts/train_v2.py --quick

    # Full pipeline
    python scripts/train_v2.py --full
"""

import os
import sys
import argparse
import asyncio
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from src.training import (
    TradeType,
    TrainingConfig,
    TFTTrainer,
    train_tft_model
)


def setup_logging(log_dir: str = "logs"):
    """Configure logging"""
    Path(log_dir).mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"{log_dir}/training_{timestamp}.log"

    logger.add(
        log_file,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
        level="DEBUG",
        rotation="100 MB"
    )

    logger.info(f"Logging to {log_file}")


def parse_args():
    parser = argparse.ArgumentParser(
        description='TFT Model Training v2 - Trade Type Based',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --trade-type swing --symbols BTC,ETH,SOL
  %(prog)s --trade-type scalp --quick
  %(prog)s --full --n-trials 100
        """
    )

    # Trade type
    parser.add_argument(
        '--trade-type', '-t',
        type=str,
        choices=['scalp', 'swing', 'position'],
        default='swing',
        help='Trade type: scalp (1-4h), swing (1-7d), position (1-4w)'
    )

    # Symbols
    parser.add_argument(
        '--symbols', '-s',
        type=str,
        default='BTC,ETH,SOL,BNB,XRP',
        help='Comma-separated list of symbols'
    )

    # Optuna settings
    parser.add_argument(
        '--n-trials',
        type=int,
        default=50,
        help='Number of Optuna trials'
    )

    parser.add_argument(
        '--timeout-hours',
        type=float,
        default=6.0,
        help='Optuna timeout in hours'
    )

    # Training settings
    parser.add_argument(
        '--epochs',
        type=int,
        default=100,
        help='Maximum training epochs'
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=64,
        help='Training batch size'
    )

    # Skip options
    parser.add_argument(
        '--skip-optuna',
        action='store_true',
        help='Skip hyperparameter optimization'
    )

    parser.add_argument(
        '--skip-validation',
        action='store_true',
        help='Skip walk-forward validation'
    )

    parser.add_argument(
        '--skip-backtest',
        action='store_true',
        help='Skip backtesting'
    )

    # Presets
    parser.add_argument(
        '--quick',
        action='store_true',
        help='Quick mode: skip optuna and validation'
    )

    parser.add_argument(
        '--full',
        action='store_true',
        help='Full mode: run everything with more trials'
    )

    # Output
    parser.add_argument(
        '--output-dir',
        type=str,
        default='models',
        help='Output directory for models'
    )

    parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Disable data caching'
    )

    # Hardware
    parser.add_argument(
        '--cpu',
        action='store_true',
        help='Force CPU training (no GPU)'
    )

    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for reproducibility'
    )

    return parser.parse_args()


async def main():
    args = parse_args()

    # Setup logging
    setup_logging()

    logger.info("=" * 60)
    logger.info("TFT Model Training v2")
    logger.info("=" * 60)

    # Parse trade type
    trade_type_map = {
        'scalp': TradeType.SCALP,
        'swing': TradeType.SWING,
        'position': TradeType.POSITION
    }
    trade_type = trade_type_map[args.trade_type]

    # Parse symbols
    symbols = [s.strip().upper() for s in args.symbols.split(',')]

    # Apply presets
    skip_optuna = args.skip_optuna
    skip_validation = args.skip_validation
    skip_backtest = args.skip_backtest
    n_trials = args.n_trials

    if args.quick:
        skip_optuna = True
        skip_validation = True
        skip_backtest = False
        logger.info("Quick mode: Skipping optuna and validation")

    if args.full:
        skip_optuna = False
        skip_validation = False
        skip_backtest = False
        n_trials = 100
        logger.info("Full mode: Running complete pipeline with 100 trials")

    # Create config
    config = TrainingConfig(
        symbols=symbols,
        trade_type=trade_type,
        n_optuna_trials=n_trials,
        optuna_timeout_hours=args.timeout_hours,
        max_epochs=args.epochs,
        batch_size=args.batch_size,
        use_gpu=not args.cpu,
        seed=args.seed,
        model_output_dir=args.output_dir
    )

    # Log config
    logger.info(f"Trade type: {trade_type.value}")
    logger.info(f"Symbols: {symbols}")
    logger.info(f"Data interval: {config.trade_type_config.data_interval}")
    logger.info(f"Lookback days: {config.trade_type_config.lookback_days}")
    logger.info(f"Prediction horizons: {config.trade_type_config.prediction_horizons}")
    logger.info(f"Skip optuna: {skip_optuna}")
    logger.info(f"Skip validation: {skip_validation}")
    logger.info(f"Skip backtest: {skip_backtest}")

    # Run training
    trainer = TFTTrainer(config)

    try:
        results = await trainer.run_full_pipeline(
            skip_optuna=skip_optuna,
            skip_validation=skip_validation,
            skip_backtest=skip_backtest
        )

        logger.info("=" * 60)
        logger.info("TRAINING COMPLETE")
        logger.info("=" * 60)

        # Print summary
        print("\n" + "=" * 60)
        print("TRAINING SUMMARY")
        print("=" * 60)
        print(f"Trade Type: {trade_type.value}")
        print(f"Symbols: {', '.join(symbols)}")
        print(f"Total Samples: {results.get('total_samples', 'N/A')}")
        print(f"Features: {results.get('features', 'N/A')}")

        if 'validation' in results:
            val = results['validation']
            print(f"\nValidation Results:")
            print(f"  - Mean Val Loss: {val.get('mean_val_loss', 'N/A')}")
            print(f"  - Direction Accuracy: {val.get('mean_direction_accuracy', 'N/A'):.2%}" if val.get('mean_direction_accuracy') else "  - Direction Accuracy: N/A")

        if 'backtest' in results:
            bt = results['backtest']
            print(f"\nBacktest Results:")
            print(f"  - Total Trades: {bt.get('total_trades', 0)}")
            print(f"  - Win Rate: {bt.get('win_rate', 0):.2%}")
            print(f"  - Sharpe Ratio: {bt.get('sharpe_ratio', 0):.2f}")
            print(f"  - Max Drawdown: {bt.get('max_drawdown', 0):.2%}")

        print(f"\nModel saved to: {results.get('model_path', 'N/A')}")
        print("=" * 60)

        return results

    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
