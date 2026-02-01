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
  SeriesMarker,
} from 'lightweight-charts';
import { Loader2, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';

/**
 * Format price for display - handles crypto prices properly
 * Avoids locale issues with toLocaleString()
 */
function formatPrice(price: number): string {
  if (price === 0 || isNaN(price)) return '0';

  // For very small prices (< 0.0001), use scientific-like format
  if (price < 0.0001) {
    return price.toFixed(8).replace(/\.?0+$/, '');
  }

  // For small prices (< 1), show more decimals
  if (price < 1) {
    return price.toFixed(6).replace(/\.?0+$/, '');
  }

  // For prices between 1 and 10, show 4 decimals
  if (price < 10) {
    return price.toFixed(4).replace(/\.?0+$/, '');
  }

  // For prices between 10 and 1000, show 2 decimals
  if (price < 1000) {
    return price.toFixed(2);
  }

  // For large prices (>= 1000), use comma as thousands separator with 2 decimals
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TradePlanChartProps {
  symbol: string;
  direction: 'long' | 'short';
  entries: { price: number; percentage: number }[];
  stopLoss: { price: number; percentage: number };
  takeProfits: { price: number; percentage: number; riskReward: number }[];
  currentPrice: number;
  support?: number[];
  resistance?: number[];
  onChartReady?: () => void; // Callback when chart is fully rendered with data
  chartId?: string; // Optional custom ID for the chart container (default: 'trade-plan-chart')
  tradeType?: 'scalping' | 'dayTrade' | 'swing'; // Trade type to determine chart interval
  analysisTime?: string | Date; // When the analysis was created (for marker placement)
}

// Get Binance interval based on trade type
function getChartInterval(tradeType?: string): { interval: string; label: string } {
  switch (tradeType) {
    case 'scalping':
      return { interval: '5m', label: '5 Min' };
    case 'swing':
      return { interval: '1d', label: '1 Day' };
    case 'dayTrade':
    default:
      return { interval: '1h', label: '1 Hour' };
  }
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
  onChartReady,
  chartId = 'trade-plan-chart',
  tradeType = 'dayTrade',
  analysisTime,
}: TradePlanChartProps) {
  const { interval: chartInterval, label: intervalLabel } = getChartInterval(tradeType);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const isDisposedRef = useRef(false);
  const analysisMarkerTimeRef = useRef<Time | null>(null); // Time of candle closest to analysis creation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null); // Live price from latest candle

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

    // Fetch kline data with the appropriate interval
    fetchKlineData(symbol, candleSeries, chart, chartInterval);

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
  }, [symbol, chartInterval]);

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

    // Current price line - use live price from latest candle if available
    const displayPrice = livePrice || currentPrice;
    if (displayPrice > 0) {
      addPriceLine({
        price: displayPrice,
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Current',
      });
    }

    // Calculate average entry for prominent marker
    const avgEntryPrice = entries?.length > 0
      ? entries.reduce((sum, e) => sum + (e?.price ?? 0), 0) / entries.length
      : 0;

    // PROMINENT AVERAGE ENTRY LINE (Yellow/Gold - Most visible)
    if (avgEntryPrice > 0) {
      addPriceLine({
        price: avgEntryPrice,
        color: '#fbbf24', // Yellow/Amber - stands out
        lineWidth: 3,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: '▶ ENTRY',
      });
    }

    // Entry levels (cyan/blue) - DCA levels
    entries?.filter(e => e != null).forEach((entry, index) => {
      if (entry?.price) {
        addPriceLine({
          price: entry.price,
          color: '#06b6d4',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `E${index + 1} (${entry.percentage ?? 0}%)`,
        });
      }
    });

    // Add analysis marker on the candle when analysis was created
    if (analysisMarkerTimeRef.current && !isDisposedRef.current) {
      try {
        const marker: SeriesMarker<Time> = {
          time: analysisMarkerTimeRef.current,
          position: 'aboveBar',
          color: '#a855f7', // Purple - distinct from entry/SL/TP colors
          shape: 'circle',
          text: 'Analysis',
        };
        series.setMarkers([marker]);
      } catch {
        // Marker may fail if chart is disposed
      }
    }

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
    takeProfits?.filter(tp => tp != null).forEach((tp, index) => {
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

  }, [loading, entries, stopLoss, takeProfits, currentPrice, livePrice, support, resistance]);

  const fetchKlineData = async (
    sym: string,
    series: ISeriesApi<'Candlestick'>,
    chart: IChartApi,
    interval: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Use TraderPath API which supports multiple asset classes (crypto, stocks, metals, bonds)
      // This routes to Binance for crypto and Yahoo Finance for stocks/metals/bonds
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io';
      const response = await fetch(
        `${apiBaseUrl}/api/analysis/chart/candles?symbol=${encodeURIComponent(sym)}&interval=${interval}&limit=100`
      );

      if (!response.ok) {
        // Try to get error message from response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || 'Failed to fetch chart data';
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success || !result.data?.candles) {
        throw new Error(result.error?.message || 'No chart data available');
      }

      // Check if chart was disposed during async fetch
      if (isDisposedRef.current) return;

      const candleData: CandlestickData<Time>[] = result.data.candles.map((k: { time: number; open: number; high: number; low: number; close: number }) => ({
        time: k.time as Time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      // Find the candle closest to analysis time for marker placement
      if (candleData.length > 0) {
        if (analysisTime) {
          // Convert analysis time to unix timestamp (seconds)
          const analysisTimestamp = new Date(analysisTime).getTime() / 1000;

          // Find the candle with time closest to (but not after) analysis time
          let closestCandle = candleData[0];
          for (const candle of candleData) {
            const candleTime = candle.time as number;
            if (candleTime <= analysisTimestamp) {
              closestCandle = candle;
            } else {
              break; // Candles are sorted, so we can stop here
            }
          }
          analysisMarkerTimeRef.current = closestCandle.time;
        } else {
          // No analysis time provided - use last candle (for new/live analysis)
          analysisMarkerTimeRef.current = candleData[candleData.length - 1].time;
        }
      }

      // Update live price from last candle's close
      if (candleData.length > 0) {
        const lastCandle = candleData[candleData.length - 1];
        setLivePrice(lastCandle.close);
      }

      // Guard chart operations with try-catch in case of disposal
      try {
        if (!isDisposedRef.current) {
          series.setData(candleData);
          chart.timeScale().fitContent();
        }
      } catch (chartErr) {
        // Chart may be disposed - log for debugging
        console.warn('Chart operation failed:', chartErr);
      }

    } catch (err) {
      if (!isDisposedRef.current) {
        console.error('Chart data error:', err);
        setError('Failed to load chart data');
      }
    } finally {
      if (!isDisposedRef.current) {
        setLoading(false);
        // Notify parent that chart is ready after a small delay to ensure rendering is complete
        setTimeout(() => {
          if (!isDisposedRef.current && onChartReady) {
            onChartReady();
          }
        }, 100);
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
    <div id={chartId} className="bg-card rounded-lg border overflow-hidden">
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
                {direction === 'long' ? 'Long Position' : 'Short Position'} • {intervalLabel} Chart
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <div className="text-muted-foreground">Timeframe</div>
              <div className="font-bold text-blue-500">{intervalLabel}</div>
            </div>
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
            <div className="w-4 h-1 bg-yellow-400 rounded"></div>
            <span className="font-semibold text-yellow-400">▶ Entry Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-cyan-500"></div>
            <span>DCA Levels</span>
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
        {/* Average Entry - Highlighted */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Entry Point</div>
          <div className="flex justify-between text-sm">
            <span className="text-yellow-400 font-bold">▶ AVG</span>
            <span className="font-mono font-bold text-yellow-400">${formatPrice(avgEntry)}</span>
          </div>
          {entries?.filter(e => e != null).map((entry, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground">
              <span className="text-cyan-500">E{i + 1}</span>
              <span className="font-mono">${formatPrice(entry.price ?? 0)}</span>
            </div>
          ))}
        </div>

        {/* Stop Loss */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Stop Loss</div>
          <div className="flex justify-between text-sm">
            <span className="text-red-500">SL</span>
            <span className="font-mono">${formatPrice(slPrice)}</span>
          </div>
          <div className="text-xs text-red-400">-{(stopLoss?.percentage ?? 0).toFixed(1)}% risk</div>
        </div>

        {/* Take Profits */}
        <div className="space-y-1 md:col-span-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Take Profit Targets</div>
          <div className="grid grid-cols-3 gap-2">
            {takeProfits?.filter(tp => tp != null).map((tp, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-green-500">TP{i + 1}</span>
                  <span className="font-mono">${formatPrice(tp.price ?? 0)}</span>
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
