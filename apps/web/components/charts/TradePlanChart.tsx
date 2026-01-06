'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineStyle } from 'lightweight-charts';

interface TradePlanLevels {
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  currentPrice?: number;
  direction?: string;
}

interface TradePlanChartProps {
  symbol: string;
  interval: string;
  tradePlan?: TradePlanLevels;
}

// Convert interval to Binance API format
function getIntervalForApi(interval: string): string {
  const map: Record<string, string> = {
    '5': '5m',
    '15': '15m',
    '60': '1h',
    '240': '4h',
    '1D': '1d',
  };
  return map[interval] || '1h';
}

// Get number of candles based on interval
function getCandleCount(interval: string): number {
  const map: Record<string, number> = {
    '5': 200,   // ~16 hours
    '15': 200,  // ~2 days
    '60': 168,  // 1 week
    '240': 180, // 1 month
  };
  return map[interval] || 100;
}

export function TradePlanChart({ symbol, interval, tradePlan }: TradePlanChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e293b' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#475569',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    seriesRef.current = candlestickSeries;

    // Fetch candlestick data from Binance
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const apiInterval = getIntervalForApi(interval);
        const limit = getCandleCount(interval);
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${apiInterval}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const data = await response.json();

        // Convert Binance data to Lightweight Charts format
        const candleData: CandlestickData[] = data.map((d: number[]) => ({
          time: Math.floor(d[0] / 1000) as any, // Binance returns ms, we need seconds
          open: parseFloat(d[1] as any),
          high: parseFloat(d[2] as any),
          low: parseFloat(d[3] as any),
          close: parseFloat(d[4] as any),
        }));

        candlestickSeries.setData(candleData);

        // Add price lines for trade plan
        if (tradePlan) {
          // Entry Price - Yellow dashed line
          if (tradePlan.entryPrice) {
            candlestickSeries.createPriceLine({
              price: tradePlan.entryPrice,
              color: '#eab308',
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: 'ENTRY',
            });
          }

          // Stop Loss - Red solid line
          if (tradePlan.stopLoss) {
            candlestickSeries.createPriceLine({
              price: tradePlan.stopLoss,
              color: '#ef4444',
              lineWidth: 2,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: 'SL',
            });
          }

          // Take Profit 1 - Green solid line
          if (tradePlan.takeProfit1) {
            candlestickSeries.createPriceLine({
              price: tradePlan.takeProfit1,
              color: '#22c55e',
              lineWidth: 2,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: 'TP1',
            });
          }

          // Take Profit 2 - Green dashed line
          if (tradePlan.takeProfit2) {
            candlestickSeries.createPriceLine({
              price: tradePlan.takeProfit2,
              color: '#22c55e',
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: 'TP2',
            });
          }

          // Take Profit 3 - Green dotted line
          if (tradePlan.takeProfit3) {
            candlestickSeries.createPriceLine({
              price: tradePlan.takeProfit3,
              color: '#22c55e',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: 'TP3',
            });
          }

          // Current Price - Blue line
          if (tradePlan.currentPrice) {
            candlestickSeries.createPriceLine({
              price: tradePlan.currentPrice,
              color: '#3b82f6',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: 'NOW',
            });
          }
        }

        // Fit content
        chart.timeScale().fitContent();
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        setError('Failed to load chart data');
        setIsLoading(false);
      }
    };

    fetchData();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, interval, tradePlan]);

  return (
    <div className="relative w-full h-full">
      <div ref={chartContainerRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading chart...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-slate-500 text-xs mt-1">Try refreshing</p>
          </div>
        </div>
      )}
    </div>
  );
}
