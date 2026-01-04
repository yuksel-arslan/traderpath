'use client';

// ===========================================
// Trade Plan Chart Component
// Professional candlestick chart with trade levels
// ===========================================

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  IPriceLine,
} from 'lightweight-charts';
import { Loader2, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';

interface TradePlanChartProps {
  symbol: string;
  direction: 'long' | 'short';
  entries: { price: number; percentage: number }[];
  stopLoss: { price: number; percentage: number };
  takeProfits: { price: number; percentage: number; riskReward: number }[];
  currentPrice: number;
  support?: number[];
  resistance?: number[];
}

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function TradePlanChart({
  symbol,
  direction,
  entries,
  stopLoss,
  takeProfits,
  currentPrice,
  support = [],
  resistance = [],
}: TradePlanChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const isDisposedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Reset disposed state
    isDisposedRef.current = false;

    // Create chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candleSeriesRef.current = candleSeries;

    // Fetch kline data
    fetchKlineData(symbol, candleSeries, chart);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && !isDisposedRef.current) {
        try {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        } catch {
          // Chart may be disposed
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposedRef.current = true;
      window.removeEventListener('resize', handleResize);
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLinesRef.current = [];
      try {
        chart.remove();
      } catch {
        // Chart may already be disposed
      }
    };
  }, [symbol]);

  // Add price lines when chart is ready
  useEffect(() => {
    if (!candleSeriesRef.current || loading || isDisposedRef.current) return;

    const series = candleSeriesRef.current;

    // Clear existing price lines first
    priceLinesRef.current.forEach((line) => {
      try {
        if (!isDisposedRef.current) {
          series.removePriceLine(line);
        }
      } catch {
        // Line may already be removed or chart disposed
      }
    });
    priceLinesRef.current = [];

    // Helper to create and track price lines
    const addPriceLine = (options: Parameters<typeof series.createPriceLine>[0]) => {
      if (isDisposedRef.current) return null;
      try {
        const line = series.createPriceLine(options);
        priceLinesRef.current.push(line);
        return line;
      } catch {
        return null;
      }
    };

    // Current price line
    addPriceLine({
      price: currentPrice,
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Current',
    });

    // Entry levels (cyan/blue)
    entries?.forEach((entry, index) => {
      if (entry?.price) {
        addPriceLine({
          price: entry.price,
          color: '#06b6d4',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Entry ${index + 1} (${entry.percentage ?? 0}%)`,
        });
      }
    });

    // Stop Loss (red)
    if (stopLoss?.price) {
      addPriceLine({
        price: stopLoss.price,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `Stop Loss (${(stopLoss.percentage ?? 0).toFixed(1)}%)`,
      });
    }

    // Take Profits (green gradient)
    const tpColors = ['#22c55e', '#16a34a', '#15803d'];
    takeProfits?.forEach((tp, index) => {
      if (tp?.price) {
        addPriceLine({
          price: tp.price,
          color: tpColors[index] || '#22c55e',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP${index + 1} (${(tp.riskReward ?? 0).toFixed(1)}R)`,
        });
      }
    });

    // Support levels (orange, subtle)
    support.slice(0, 2).forEach((level) => {
      addPriceLine({
        price: level,
        color: 'rgba(251, 146, 60, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: '',
      });
    });

    // Resistance levels (purple, subtle)
    resistance.slice(0, 2).forEach((level) => {
      addPriceLine({
        price: level,
        color: 'rgba(168, 85, 247, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: '',
      });
    });

  }, [loading, entries, stopLoss, takeProfits, currentPrice, support, resistance]);

  const fetchKlineData = async (
    sym: string,
    series: ISeriesApi<'Candlestick'>,
    chart: IChartApi
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from Binance directly (public endpoint)
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${sym}USDT&interval=1h&limit=200`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();

      // Check if chart was disposed during async fetch
      if (isDisposedRef.current) return;

      const candleData: CandlestickData<Time>[] = data.map((k: number[]) => ({
        time: (k[0] / 1000) as Time,
        open: parseFloat(k[1] as unknown as string),
        high: parseFloat(k[2] as unknown as string),
        low: parseFloat(k[3] as unknown as string),
        close: parseFloat(k[4] as unknown as string),
      }));

      // Guard chart operations with try-catch in case of disposal
      try {
        if (!isDisposedRef.current) {
          series.setData(candleData);
          chart.timeScale().fitContent();
        }
      } catch {
        // Chart may be disposed
      }

    } catch (err) {
      if (!isDisposedRef.current) {
        console.error('Chart data error:', err);
        setError('Failed to load chart data');
      }
    } finally {
      if (!isDisposedRef.current) {
        setLoading(false);
      }
    }
  };

  const avgEntry = entries?.length > 0
    ? entries.reduce((sum, e) => sum + (e.price ?? 0), 0) / entries.length
    : currentPrice || 0;
  const slPrice = stopLoss?.price ?? 0;
  const riskPercent = avgEntry > 0 ? Math.abs((slPrice - avgEntry) / avgEntry * 100) : 0;
  const rewardPercent = takeProfits?.[0]?.price && avgEntry > 0
    ? Math.abs((takeProfits[0].price - avgEntry) / avgEntry * 100)
    : 0;

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Chart Header */}
      <div className="p-4 border-b bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              direction === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {direction === 'long' ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">{symbol}/USDT Trade Plan</h3>
              <p className="text-sm text-muted-foreground">
                {direction === 'long' ? 'Long Position' : 'Short Position'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <div className="text-muted-foreground">Risk</div>
              <div className="font-bold text-red-500">{riskPercent.toFixed(2)}%</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Reward</div>
              <div className="font-bold text-green-500">{rewardPercent.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full h-[500px]"
        />
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-muted/20">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-cyan-500"></div>
            <span>Entry Zones</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span>Stop Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>Take Profits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>Current Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-orange-400/50" style={{ borderStyle: 'dotted' }}></div>
            <span>Support</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-400/50" style={{ borderStyle: 'dotted' }}></div>
            <span>Resistance</span>
          </div>
        </div>
      </div>

      {/* Price Levels Summary */}
      <div className="p-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Entries */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Entry Levels</div>
          {entries?.map((entry, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-cyan-500">E{i + 1}</span>
              <span className="font-mono">${(entry.price ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Stop Loss */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Stop Loss</div>
          <div className="flex justify-between text-sm">
            <span className="text-red-500">SL</span>
            <span className="font-mono">${slPrice.toLocaleString()}</span>
          </div>
          <div className="text-xs text-red-400">-{(stopLoss?.percentage ?? 0).toFixed(1)}% risk</div>
        </div>

        {/* Take Profits */}
        <div className="space-y-1 md:col-span-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Take Profit Targets</div>
          <div className="grid grid-cols-3 gap-2">
            {takeProfits?.map((tp, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-green-500">TP{i + 1}</span>
                  <span className="font-mono">${(tp.price ?? 0).toLocaleString()}</span>
                </div>
                <div className="text-xs text-green-400">{(tp.riskReward ?? 0).toFixed(1)}R</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
