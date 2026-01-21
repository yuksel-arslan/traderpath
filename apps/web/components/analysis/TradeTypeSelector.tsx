'use client';

/**
 * Timeframe Selector Component
 * ==============================
 *
 * Allows users to select their analysis timeframe.
 * The system automatically determines the appropriate trading strategy
 * based on the selected timeframe.
 *
 * Timeframe → Strategy Mapping:
 * - 15m → Scalping (High frequency, tight stops)
 * - 1h  → Day Trade (Intraday positions)
 * - 4h  → Day Trade (Intraday positions, longer timeframe)
 * - 1d  → Swing Trade (Multi-day positions)
 */

import { useState, useEffect } from 'react';
import {
  Zap,
  Sun,
  Moon,
  Star,
  Clock,
  TrendingUp,
  Shield,
  Info,
  ChevronDown,
  Check,
  Gem,
  Timer,
  BarChart3,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Trade types - matches backend
export type TradeType = 'scalping' | 'dayTrade' | 'swing';
export type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1W';

interface TimeframeConfig {
  id: Timeframe;
  label: string;
  description: string;
  tradeType: TradeType;
  tradeTypeName: string;
  holdingPeriod: string;
  creditCost: number;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  riskLevel: 'high' | 'medium' | 'low';
  features: string[];
}

const TIMEFRAMES: TimeframeConfig[] = [
  // SCALPING (1000 candles)
  {
    id: '5m',
    label: '5 Min',
    description: 'Ultra-fast scalping with 1000 candles analysis',
    tradeType: 'scalping',
    tradeTypeName: 'Scalping',
    holdingPeriod: '5-30 min',
    creditCost: 3,
    icon: Zap,
    color: 'text-red-500',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-500/10',
    borderLight: 'border-red-200',
    borderDark: 'dark:border-red-500/30',
    riskLevel: 'high',
    features: ['1000 candles', 'Ultra-fast signals', 'Tight stops (0.3-0.5%)', 'High frequency'],
  },
  {
    id: '15m',
    label: '15 Min',
    description: 'Quick scalping trades with 1000 candles analysis',
    tradeType: 'scalping',
    tradeTypeName: 'Scalping',
    holdingPeriod: '15min - 2h',
    creditCost: 3,
    icon: Zap,
    color: 'text-orange-500',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-500/10',
    borderLight: 'border-orange-200',
    borderDark: 'dark:border-orange-500/30',
    riskLevel: 'high',
    features: ['1000 candles', 'Fast signals', 'Tight stops (0.5-1%)', 'Quick entries'],
  },
  // DAY TRADE (500 candles)
  {
    id: '30m',
    label: '30 Min',
    description: 'Intraday trading with 500 candles analysis',
    tradeType: 'dayTrade',
    tradeTypeName: 'Day Trade',
    holdingPeriod: '1-4 hours',
    creditCost: 2,
    icon: Sun,
    color: 'text-amber-500',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-500/10',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-500/30',
    riskLevel: 'medium',
    features: ['500 candles', 'Balanced analysis', 'Moderate stops (1-2%)', 'Trend following'],
  },
  {
    id: '1h',
    label: '1 Hour',
    description: 'Intraday trading with balanced risk/reward',
    tradeType: 'dayTrade',
    tradeTypeName: 'Day Trade',
    holdingPeriod: '2-8 hours',
    creditCost: 2,
    icon: Sun,
    color: 'text-blue-500',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-500/10',
    borderLight: 'border-blue-200',
    borderDark: 'dark:border-blue-500/30',
    riskLevel: 'medium',
    features: ['500 candles', 'Ichimoku & ADX', 'Moderate stops (1-2%)', 'Trend confirmation'],
  },
  {
    id: '2h',
    label: '2 Hour',
    description: 'Extended intraday with 500 candles analysis',
    tradeType: 'dayTrade',
    tradeTypeName: 'Day Trade',
    holdingPeriod: '4-12 hours',
    creditCost: 2,
    icon: Sun,
    color: 'text-cyan-500',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-500/10',
    borderLight: 'border-cyan-200',
    borderDark: 'dark:border-cyan-500/30',
    riskLevel: 'medium',
    features: ['500 candles', 'Extended analysis', 'Moderate stops (1-2%)', 'Multiple TPs'],
  },
  {
    id: '4h',
    label: '4 Hour',
    description: 'Day trading with extended timeframe analysis',
    tradeType: 'dayTrade',
    tradeTypeName: 'Day Trade',
    holdingPeriod: '8-24 hours',
    creditCost: 2,
    icon: Moon,
    color: 'text-purple-500',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-500/10',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-500/30',
    riskLevel: 'medium',
    features: ['500 candles', 'Deep analysis', 'Moderate stops (1-3%)', 'Strong confirmations'],
  },
  // SWING TRADE (250 candles)
  {
    id: '1d',
    label: '1 Day',
    description: 'Swing trading with 250 candles analysis',
    tradeType: 'swing',
    tradeTypeName: 'Swing Trade',
    holdingPeriod: '1-14 days',
    creditCost: 1,
    icon: Star,
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-500/10',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-500/30',
    riskLevel: 'low',
    features: ['250 candles', 'Deep trend analysis', 'Wider stops (2-5%)', 'Smart money tracking'],
  },
  {
    id: '1W',
    label: '1 Week',
    description: 'Long-term swing with 250 candles analysis',
    tradeType: 'swing',
    tradeTypeName: 'Swing Trade',
    holdingPeriod: '1-8 weeks',
    creditCost: 1,
    icon: Star,
    color: 'text-teal-500',
    bgLight: 'bg-teal-50',
    bgDark: 'dark:bg-teal-500/10',
    borderLight: 'border-teal-200',
    borderDark: 'dark:border-teal-500/30',
    riskLevel: 'low',
    features: ['250 candles', 'Macro analysis', 'Wide stops (3-7%)', 'Position sizing'],
  },
];

// Map timeframe to trade type
export function getTradeTypeFromTimeframe(timeframe: Timeframe): TradeType {
  const config = TIMEFRAMES.find((t) => t.id === timeframe);
  return config?.tradeType || 'dayTrade';
}

// Map trade type to default timeframe (for backwards compatibility)
export function getTimeframeFromTradeType(tradeType: TradeType): Timeframe {
  switch (tradeType) {
    case 'scalping':
      return '15m';
    case 'dayTrade':
      return '1h';
    case 'swing':
      return '1d';
    default:
      return '1h';
  }
}

interface TimeframeSelectorProps {
  value?: Timeframe;
  onChange?: (timeframe: Timeframe, tradeType: TradeType) => void;
  variant?: 'cards' | 'dropdown' | 'tabs';
  showCreditCost?: boolean;
  className?: string;
}

export function TradeTypeSelector({
  value = '4h',
  onChange,
  variant = 'cards',
  showCreditCost = false,
  className,
}: TimeframeSelectorProps) {
  const [selected, setSelected] = useState<Timeframe>(value);
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState<Timeframe | null>(null);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleSelect = (timeframe: Timeframe) => {
    setSelected(timeframe);
    const tradeType = getTradeTypeFromTimeframe(timeframe);
    onChange?.(timeframe, tradeType);
    setIsOpen(false);
  };

  const selectedConfig = TIMEFRAMES.find((t) => t.id === selected)!;

  // Cards variant - shows all options as clickable cards
  if (variant === 'cards') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Select Timeframe
          </h3>
          <button
            onClick={() => setShowInfo(showInfo ? null : selected)}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {TIMEFRAMES.map((tf) => {
            const Icon = tf.icon;
            const isSelected = selected === tf.id;

            return (
              <button
                key={tf.id}
                onClick={() => handleSelect(tf.id)}
                className={cn(
                  'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200',
                  isSelected
                    ? cn(tf.bgLight, tf.bgDark, tf.borderLight, tf.borderDark)
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                )}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5">
                    <Check className={cn('w-3.5 h-3.5', tf.color)} />
                  </div>
                )}

                {/* Timeframe label */}
                <span
                  className={cn(
                    'font-bold text-lg',
                    isSelected ? tf.color : 'text-gray-700 dark:text-slate-300'
                  )}
                >
                  {tf.id}
                </span>

                {/* Trade type name */}
                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {tf.tradeTypeName}
                </span>

                {/* Credit cost */}
                {showCreditCost && (
                  <div className="flex items-center gap-0.5 mt-1.5">
                    <Gem className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      {tf.creditCost}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Info panel */}
        {showInfo && (
          <div
            className={cn(
              'p-4 rounded-xl border',
              selectedConfig.bgLight,
              selectedConfig.bgDark,
              selectedConfig.borderLight,
              selectedConfig.borderDark
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  selectedConfig.bgLight,
                  selectedConfig.bgDark
                )}
              >
                <selectedConfig.icon className={cn('w-5 h-5', selectedConfig.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={cn('font-semibold', selectedConfig.color)}>
                  {selectedConfig.id} - {selectedConfig.tradeTypeName}
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {selectedConfig.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-slate-500">Holding Period</span>
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {selectedConfig.holdingPeriod}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-slate-500">Risk Level</span>
                    <p className={cn(
                      'text-sm font-medium',
                      selectedConfig.riskLevel === 'high' ? 'text-red-500' :
                      selectedConfig.riskLevel === 'medium' ? 'text-yellow-500' :
                      'text-green-500'
                    )}>
                      {selectedConfig.riskLevel.charAt(0).toUpperCase() + selectedConfig.riskLevel.slice(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-xs text-gray-500 dark:text-slate-500">Strategy Features</span>
                  <ul className="mt-1 space-y-1">
                    {selectedConfig.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                        <Check className={cn('w-3 h-3 flex-shrink-0', selectedConfig.color)} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tabs variant - horizontal tabs (responsive) - 2026 Glassmorphism style
  if (variant === 'tabs') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
            <BarChart3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            Timeframe
          </span>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
            <Clock className="w-3 h-3" />
            <span>Auto-selects strategy</span>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-0.5 sm:gap-1 p-1 sm:p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/10">
          {TIMEFRAMES.map((tf) => {
            const isSelected = selected === tf.id;

            return (
              <button
                key={tf.id}
                onClick={() => handleSelect(tf.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0 px-0.5 sm:px-1 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs font-medium transition-all duration-300',
                  isSelected
                    ? cn(
                        'bg-white dark:bg-slate-700 shadow-lg',
                        'ring-2 ring-offset-1 ring-offset-transparent',
                        tf.borderLight.replace('border-', 'ring-').replace('-200', '-500/50')
                      )
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                )}
              >
                <span className={cn(
                  'font-bold text-[10px] sm:text-sm transition-colors',
                  isSelected ? tf.color : ''
                )}>
                  {tf.id}
                </span>
                <span className={cn(
                  'text-[7px] sm:text-[9px] transition-colors hidden sm:block',
                  isSelected ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'
                )}>
                  {tf.tradeTypeName.split(' ')[0]}
                </span>
                {showCreditCost && isSelected && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center gap-0.5 text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  >
                    <Gem className="w-2 h-2" />
                    {tf.creditCost}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Selected timeframe info - compact */}
        <div className="flex items-center justify-between px-1 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="flex items-center gap-0.5 sm:gap-1">
              <selectedConfig.icon className={cn('w-2.5 h-2.5 sm:w-3 sm:h-3', selectedConfig.color)} />
              <span className="hidden xs:inline">{selectedConfig.tradeTypeName}</span>
              <span className="xs:hidden">{selectedConfig.tradeTypeName.split(' ')[0]}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {selectedConfig.holdingPeriod}
            </span>
          </div>
          <span className={cn(
            'px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold uppercase whitespace-nowrap',
            selectedConfig.riskLevel === 'high' && 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
            selectedConfig.riskLevel === 'medium' && 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            selectedConfig.riskLevel === 'low' && 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          )}>
            {selectedConfig.riskLevel}
          </span>
        </div>
      </div>
    );
  }

  // Dropdown variant - compact dropdown
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all',
          selectedConfig.bgLight,
          selectedConfig.bgDark,
          selectedConfig.borderLight,
          selectedConfig.borderDark
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              selectedConfig.bgLight,
              selectedConfig.bgDark
            )}
          >
            <span className={cn('font-bold text-lg', selectedConfig.color)}>
              {selectedConfig.id}
            </span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={cn('font-semibold text-sm', selectedConfig.color)}>
                {selectedConfig.tradeTypeName}
              </span>
              {showCreditCost && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                  {selectedConfig.creditCost} credits
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {selectedConfig.holdingPeriod}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {TIMEFRAMES.map((tf) => {
            const isSelected = selected === tf.id;

            return (
              <button
                key={tf.id}
                onClick={() => handleSelect(tf.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                  isSelected
                    ? cn(tf.bgLight, tf.bgDark)
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected
                      ? cn(tf.bgLight, tf.bgDark)
                      : 'bg-gray-100 dark:bg-slate-700'
                  )}
                >
                  <span className={cn('font-bold', isSelected ? tf.color : 'text-gray-500')}>
                    {tf.id}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-semibold text-sm',
                        isSelected ? tf.color : 'text-gray-700 dark:text-slate-300'
                      )}
                    >
                      {tf.tradeTypeName}
                    </span>
                    {showCreditCost && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                        {tf.creditCost}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {tf.holdingPeriod}
                  </span>
                </div>
                {isSelected && <Check className={cn('w-4 h-4', tf.color)} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export hook for easy access to timeframe config
export function useTimeframeConfig(timeframe: Timeframe) {
  return TIMEFRAMES.find((t) => t.id === timeframe)!;
}

// Export hook for backwards compatibility
export function useTradeTypeConfig(tradeType: TradeType) {
  const timeframe = getTimeframeFromTradeType(tradeType);
  return TIMEFRAMES.find((t) => t.id === timeframe)!;
}

// Export all timeframes for external use
export { TIMEFRAMES };

// Backwards compatibility: TRADE_TYPES maps to TIMEFRAMES
export const TRADE_TYPES = TIMEFRAMES;
