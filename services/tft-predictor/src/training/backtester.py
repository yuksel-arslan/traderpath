"""
Backtesting ve Performance Metrics
Model performansını gerçek trading senaryolarında test eder
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import torch
from pytorch_forecasting import TemporalFusionTransformer
from loguru import logger
import json
from pathlib import Path

from .config import TradeType, TradeTypeConfig


@dataclass
class Trade:
    """Tek bir trade"""
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    direction: str  # 'long' or 'short'
    size: float
    pnl: float
    pnl_percent: float
    confidence: float
    predicted_return: float
    actual_return: float


@dataclass
class BacktestResult:
    """Backtest sonuçları"""
    # Trade statistics
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float

    # Returns
    total_return: float
    avg_return_per_trade: float
    best_trade: float
    worst_trade: float

    # Risk metrics
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    max_drawdown_duration: int  # periods

    # Prediction quality
    direction_accuracy: float
    avg_prediction_error: float
    correlation: float

    # Trade analysis
    avg_holding_period: float
    profit_factor: float
    expectancy: float

    # Detailed trades
    trades: List[Trade] = field(default_factory=list)
    equity_curve: List[float] = field(default_factory=list)


class Backtester:
    """
    Model predictions ile backtest yapar.

    Features:
    - Trade type'a göre farklı strateji kuralları
    - Commission ve slippage modelleme
    - Detaylı performans metrikleri
    - Risk-adjusted returns
    """

    def __init__(
        self,
        trade_config: TradeTypeConfig,
        initial_capital: float = 100000,
        commission_rate: float = 0.001,  # 0.1% per trade
        slippage_rate: float = 0.0005,   # 0.05% slippage
        max_position_size: float = 0.1,  # Max 10% of capital per trade
    ):
        self.trade_config = trade_config
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.slippage_rate = slippage_rate
        self.max_position_size = max_position_size

        # Trade thresholds based on trade type
        self._set_trade_thresholds()

    def _set_trade_thresholds(self):
        """Trade type'a göre threshold'lar belirle"""

        if self.trade_config.trade_type == TradeType.SCALP:
            self.min_confidence = 0.6
            self.min_predicted_return = 0.003  # 0.3%
            self.stop_loss = 0.01              # 1%
            self.take_profit = 0.015           # 1.5%
            self.holding_periods = [1, 2, 4]   # 1-4 saat

        elif self.trade_config.trade_type == TradeType.SWING:
            self.min_confidence = 0.55
            self.min_predicted_return = 0.02   # 2%
            self.stop_loss = 0.05              # 5%
            self.take_profit = 0.10            # 10%
            self.holding_periods = [24, 48, 168]  # 1-7 gün

        else:  # POSITION
            self.min_confidence = 0.5
            self.min_predicted_return = 0.05   # 5%
            self.stop_loss = 0.15              # 15%
            self.take_profit = 0.30            # 30%
            self.holding_periods = [168, 336, 672]  # 1-4 hafta

    def run_backtest(
        self,
        predictions_df: pd.DataFrame,
        prices_df: pd.DataFrame
    ) -> BacktestResult:
        """
        Backtest çalıştır.

        Args:
            predictions_df: Model predictions (columns: timestamp, predicted_return, confidence, ...)
            prices_df: Actual prices (columns: timestamp, close, high, low, ...)

        Returns:
            BacktestResult
        """
        logger.info(f"Backtest başlıyor...")
        logger.info(f"  Trade type: {self.trade_config.trade_type.value}")
        logger.info(f"  Period: {prices_df['timestamp'].min()} - {prices_df['timestamp'].max()}")

        # Merge predictions with prices
        df = self._prepare_data(predictions_df, prices_df)

        if len(df) == 0:
            logger.warning("No data for backtest")
            return self._empty_result()

        # Run trading simulation
        trades, equity_curve = self._simulate_trading(df)

        # Calculate metrics
        result = self._calculate_metrics(trades, equity_curve, df)

        logger.info(f"\nBacktest tamamlandı:")
        logger.info(f"  Total trades: {result.total_trades}")
        logger.info(f"  Win rate: {result.win_rate:.2%}")
        logger.info(f"  Total return: {result.total_return:.2%}")
        logger.info(f"  Sharpe ratio: {result.sharpe_ratio:.2f}")
        logger.info(f"  Max drawdown: {result.max_drawdown:.2%}")

        return result

    def _prepare_data(
        self,
        predictions_df: pd.DataFrame,
        prices_df: pd.DataFrame
    ) -> pd.DataFrame:
        """Verileri birleştir ve hazırla"""

        predictions_df = predictions_df.copy()
        prices_df = prices_df.copy()

        # Ensure datetime
        predictions_df['timestamp'] = pd.to_datetime(predictions_df['timestamp'])
        prices_df['timestamp'] = pd.to_datetime(prices_df['timestamp'])

        # Merge
        df = pd.merge(
            predictions_df,
            prices_df[['timestamp', 'close', 'high', 'low']],
            on='timestamp',
            how='inner'
        )

        # Calculate actual future returns for comparison
        for horizon in self.holding_periods:
            df[f'actual_return_{horizon}h'] = df['close'].shift(-horizon) / df['close'] - 1
            df[f'future_high_{horizon}h'] = df['high'].rolling(horizon).max().shift(-horizon)
            df[f'future_low_{horizon}h'] = df['low'].rolling(horizon).min().shift(-horizon)

        df = df.dropna()

        return df

    def _simulate_trading(
        self,
        df: pd.DataFrame
    ) -> Tuple[List[Trade], List[float]]:
        """Trading simülasyonu"""

        trades = []
        equity_curve = [self.initial_capital]
        capital = self.initial_capital
        position = None  # Current open position

        for i, row in df.iterrows():
            # Check if we have an open position
            if position is not None:
                # Check exit conditions
                should_exit, exit_price, exit_reason = self._check_exit(position, row)

                if should_exit:
                    # Close position
                    trade = self._close_position(position, row, exit_price)
                    trades.append(trade)

                    # Update capital
                    capital += trade.pnl
                    position = None

            # Check entry conditions (only if no position)
            if position is None:
                signal = self._generate_signal(row)

                if signal is not None:
                    # Open position
                    position = self._open_position(row, signal, capital)

            equity_curve.append(capital)

        # Close any remaining position at end
        if position is not None:
            last_row = df.iloc[-1]
            trade = self._close_position(position, last_row, last_row['close'])
            trades.append(trade)
            capital += trade.pnl

        return trades, equity_curve

    def _generate_signal(self, row: pd.Series) -> Optional[str]:
        """Entry signal üret"""

        predicted_return = row.get('predicted_return', 0)
        confidence = row.get('confidence', 0)

        # Check minimum thresholds
        if confidence < self.min_confidence:
            return None

        if abs(predicted_return) < self.min_predicted_return:
            return None

        # Generate signal
        if predicted_return > self.min_predicted_return:
            return 'long'
        elif predicted_return < -self.min_predicted_return:
            return 'short'

        return None

    def _open_position(
        self,
        row: pd.Series,
        direction: str,
        capital: float
    ) -> Dict:
        """Pozisyon aç"""

        entry_price = row['close'] * (1 + self.slippage_rate if direction == 'long' else 1 - self.slippage_rate)
        position_size = capital * self.max_position_size

        return {
            'entry_time': row['timestamp'],
            'entry_price': entry_price,
            'direction': direction,
            'size': position_size,
            'confidence': row.get('confidence', 0),
            'predicted_return': row.get('predicted_return', 0),
            'stop_loss': entry_price * (1 - self.stop_loss if direction == 'long' else 1 + self.stop_loss),
            'take_profit': entry_price * (1 + self.take_profit if direction == 'long' else 1 - self.take_profit),
            'holding_period': 0
        }

    def _check_exit(
        self,
        position: Dict,
        row: pd.Series
    ) -> Tuple[bool, float, str]:
        """Exit koşullarını kontrol et"""

        current_price = row['close']
        high = row['high']
        low = row['low']

        position['holding_period'] += 1

        if position['direction'] == 'long':
            # Stop loss hit
            if low <= position['stop_loss']:
                return True, position['stop_loss'], 'stop_loss'

            # Take profit hit
            if high >= position['take_profit']:
                return True, position['take_profit'], 'take_profit'

        else:  # short
            # Stop loss hit
            if high >= position['stop_loss']:
                return True, position['stop_loss'], 'stop_loss'

            # Take profit hit
            if low <= position['take_profit']:
                return True, position['take_profit'], 'take_profit'

        # Max holding period
        max_holding = max(self.holding_periods)
        if position['holding_period'] >= max_holding:
            return True, current_price, 'max_holding'

        return False, 0, ''

    def _close_position(
        self,
        position: Dict,
        row: pd.Series,
        exit_price: float
    ) -> Trade:
        """Pozisyon kapat"""

        # Apply slippage
        if position['direction'] == 'long':
            exit_price *= (1 - self.slippage_rate)
        else:
            exit_price *= (1 + self.slippage_rate)

        # Calculate PnL
        if position['direction'] == 'long':
            pnl_percent = (exit_price - position['entry_price']) / position['entry_price']
        else:
            pnl_percent = (position['entry_price'] - exit_price) / position['entry_price']

        # Subtract commission
        pnl_percent -= self.commission_rate * 2  # Entry + exit

        pnl = position['size'] * pnl_percent

        # Actual return for comparison
        actual_return = (exit_price - position['entry_price']) / position['entry_price']
        if position['direction'] == 'short':
            actual_return = -actual_return

        return Trade(
            entry_time=position['entry_time'],
            exit_time=row['timestamp'],
            entry_price=position['entry_price'],
            exit_price=exit_price,
            direction=position['direction'],
            size=position['size'],
            pnl=pnl,
            pnl_percent=pnl_percent,
            confidence=position['confidence'],
            predicted_return=position['predicted_return'],
            actual_return=actual_return
        )

    def _calculate_metrics(
        self,
        trades: List[Trade],
        equity_curve: List[float],
        df: pd.DataFrame
    ) -> BacktestResult:
        """Performance metrikleri hesapla"""

        if not trades:
            return self._empty_result()

        # Basic stats
        total_trades = len(trades)
        winning_trades = sum(1 for t in trades if t.pnl > 0)
        losing_trades = total_trades - winning_trades
        win_rate = winning_trades / total_trades if total_trades > 0 else 0

        # Returns
        returns = [t.pnl_percent for t in trades]
        total_return = (equity_curve[-1] - self.initial_capital) / self.initial_capital
        avg_return = np.mean(returns)
        best_trade = max(returns)
        worst_trade = min(returns)

        # Risk metrics
        equity_returns = np.diff(equity_curve) / equity_curve[:-1]
        sharpe_ratio = self._calculate_sharpe(equity_returns)
        sortino_ratio = self._calculate_sortino(equity_returns)
        max_dd, max_dd_duration = self._calculate_max_drawdown(equity_curve)

        # Prediction quality
        pred_returns = [t.predicted_return for t in trades]
        actual_returns = [t.actual_return for t in trades]

        direction_accuracy = np.mean([
            np.sign(p) == np.sign(a)
            for p, a in zip(pred_returns, actual_returns)
        ])

        avg_pred_error = np.mean(np.abs(np.array(pred_returns) - np.array(actual_returns)))
        correlation = np.corrcoef(pred_returns, actual_returns)[0, 1] if len(trades) > 1 else 0

        # Trade analysis
        holding_periods = [
            (t.exit_time - t.entry_time).total_seconds() / 3600
            for t in trades
        ]
        avg_holding = np.mean(holding_periods)

        gross_profit = sum(t.pnl for t in trades if t.pnl > 0)
        gross_loss = abs(sum(t.pnl for t in trades if t.pnl < 0))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        expectancy = avg_return * total_trades

        return BacktestResult(
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            total_return=total_return,
            avg_return_per_trade=avg_return,
            best_trade=best_trade,
            worst_trade=worst_trade,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_dd,
            max_drawdown_duration=max_dd_duration,
            direction_accuracy=direction_accuracy,
            avg_prediction_error=avg_pred_error,
            correlation=correlation,
            avg_holding_period=avg_holding,
            profit_factor=profit_factor,
            expectancy=expectancy,
            trades=trades,
            equity_curve=equity_curve
        )

    def _calculate_sharpe(self, returns: np.ndarray, rf: float = 0) -> float:
        """Sharpe ratio hesapla (annualized)"""
        if len(returns) == 0 or np.std(returns) == 0:
            return 0

        # Assume hourly data, annualize
        periods_per_year = 24 * 365
        excess_returns = returns - rf / periods_per_year
        return np.sqrt(periods_per_year) * np.mean(excess_returns) / np.std(excess_returns)

    def _calculate_sortino(self, returns: np.ndarray, rf: float = 0) -> float:
        """Sortino ratio hesapla"""
        if len(returns) == 0:
            return 0

        downside_returns = returns[returns < 0]
        if len(downside_returns) == 0 or np.std(downside_returns) == 0:
            return float('inf') if np.mean(returns) > 0 else 0

        periods_per_year = 24 * 365
        return np.sqrt(periods_per_year) * np.mean(returns - rf / periods_per_year) / np.std(downside_returns)

    def _calculate_max_drawdown(self, equity_curve: List[float]) -> Tuple[float, int]:
        """Maximum drawdown ve süresini hesapla"""
        equity = np.array(equity_curve)
        peak = np.maximum.accumulate(equity)
        drawdown = (peak - equity) / peak

        max_dd = np.max(drawdown)

        # Find max drawdown duration
        in_drawdown = drawdown > 0
        max_duration = 0
        current_duration = 0

        for i in range(len(in_drawdown)):
            if in_drawdown[i]:
                current_duration += 1
                max_duration = max(max_duration, current_duration)
            else:
                current_duration = 0

        return max_dd, max_duration

    def _empty_result(self) -> BacktestResult:
        """Boş sonuç döndür"""
        return BacktestResult(
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            win_rate=0,
            total_return=0,
            avg_return_per_trade=0,
            best_trade=0,
            worst_trade=0,
            sharpe_ratio=0,
            sortino_ratio=0,
            max_drawdown=0,
            max_drawdown_duration=0,
            direction_accuracy=0,
            avg_prediction_error=0,
            correlation=0,
            avg_holding_period=0,
            profit_factor=0,
            expectancy=0,
            trades=[],
            equity_curve=[self.initial_capital]
        )


def generate_model_predictions(
    model: TemporalFusionTransformer,
    test_loader,
    df: pd.DataFrame
) -> pd.DataFrame:
    """Model predictions oluştur (backtest için)"""

    model.eval()

    predictions = []

    with torch.no_grad():
        raw_predictions = model.predict(test_loader, mode='quantiles', return_x=True)

        # Extract median prediction (quantile 0.5)
        pred_values = raw_predictions.output[:, :, 3].cpu().numpy()  # Assuming 7 quantiles, middle is index 3

        # Get timestamps from dataloader
        for i, (x, _) in enumerate(test_loader):
            if i >= len(pred_values):
                break

            # Get the prediction for each sample
            batch_preds = pred_values[i * test_loader.batch_size:(i + 1) * test_loader.batch_size]

            for j, pred in enumerate(batch_preds):
                if len(pred) > 0:
                    predictions.append({
                        'predicted_return': float(pred[0]),  # First prediction horizon
                        'confidence': 0.6,  # Default confidence
                    })

    # Align with timestamps
    pred_df = pd.DataFrame(predictions)

    if len(pred_df) > 0 and 'timestamp' in df.columns:
        pred_df['timestamp'] = df['timestamp'].iloc[-len(pred_df):].values

    return pred_df


def run_backtest(
    trade_config: TradeTypeConfig,
    predictions_df: pd.DataFrame,
    prices_df: pd.DataFrame,
    initial_capital: float = 100000
) -> BacktestResult:
    """Convenience function: Backtest çalıştır"""

    backtester = Backtester(trade_config, initial_capital)
    return backtester.run_backtest(predictions_df, prices_df)
