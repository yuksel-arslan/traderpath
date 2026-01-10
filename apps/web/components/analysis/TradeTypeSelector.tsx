'use client';

/**
 * Trade Type Selector Component
 * ==============================
 *
 * Allows users to select their trading style:
 * - Scalping (1-15 min, 3 credits)
 * - Day Trade (1-8 hours, 2 credits)
 * - Swing (2-14 days, 1 credit)
 *
 * The selection affects:
 * - Which timeframes are analyzed
 * - Which indicators are used
 * - How strict the safety checks are
 * - Credit cost
 */

import { useState, useEffect } from 'react';
import {
  Zap,
  Sun,
  Moon,
  Clock,
  TrendingUp,
  Shield,
  Info,
  ChevronDown,
  Check,
  Gem,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type TradeType = 'scalping' | 'dayTrade' | 'swing';

interface TradeTypeConfig {
  id: TradeType;
  name: string;
  description: string;
  holdingPeriod: string;
  timeframes: string;
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

const TRADE_TYPES: TradeTypeConfig[] = [
  {
    id: 'scalping',
    name: 'Scalping',
    description: 'Ultra short-term trades with quick entries and exits',
    holdingPeriod: '1-15 minutes',
    timeframes: '1m, 5m, 15m',
    creditCost: 3,
    icon: Zap,
    color: 'text-orange-500',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-500/10',
    borderLight: 'border-orange-200',
    borderDark: 'dark:border-orange-500/30',
    riskLevel: 'high',
    features: [
      'Fastest indicator response',
      'Tight stop-loss (0.5-1%)',
      'High volume confirmation',
      'Liquidity focused',
    ],
  },
  {
    id: 'dayTrade',
    name: 'Day Trade',
    description: 'Intraday positions closed before market end',
    holdingPeriod: '1-8 hours',
    timeframes: '15m, 1h, 4h',
    creditCost: 2,
    icon: Sun,
    color: 'text-blue-500',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-500/10',
    borderLight: 'border-blue-200',
    borderDark: 'dark:border-blue-500/30',
    riskLevel: 'medium',
    features: [
      'Balanced analysis',
      'Moderate stop-loss (1-2%)',
      'Trend confirmation',
      'Ichimoku & ADX focus',
    ],
  },
  {
    id: 'swing',
    name: 'Swing Trade',
    description: 'Multi-day positions for larger moves',
    holdingPeriod: '2-14 days',
    timeframes: '4h, 1d, 1w',
    creditCost: 1,
    icon: Moon,
    color: 'text-purple-500',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-500/10',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-500/30',
    riskLevel: 'low',
    features: [
      'Deep trend analysis',
      'Wider stop-loss (2-5%)',
      'Smart money tracking',
      'Multiple take-profits',
    ],
  },
];

interface TradeTypeSelectorProps {
  value?: TradeType;
  onChange?: (type: TradeType) => void;
  variant?: 'cards' | 'dropdown' | 'tabs';
  showCreditCost?: boolean;
  className?: string;
}

export function TradeTypeSelector({
  value = 'dayTrade',
  onChange,
  variant = 'cards',
  showCreditCost = true,
  className,
}: TradeTypeSelectorProps) {
  const [selected, setSelected] = useState<TradeType>(value);
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState<TradeType | null>(null);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleSelect = (type: TradeType) => {
    setSelected(type);
    onChange?.(type);
    setIsOpen(false);
  };

  const selectedConfig = TRADE_TYPES.find((t) => t.id === selected)!;

  // Cards variant - shows all options as clickable cards
  if (variant === 'cards') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Trade Type
          </h3>
          <button
            onClick={() => setShowInfo(showInfo ? null : selected)}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TRADE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;

            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type.id)}
                className={cn(
                  'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200',
                  isSelected
                    ? cn(type.bgLight, type.bgDark, type.borderLight, type.borderDark)
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                )}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className={cn('w-4 h-4', type.color)} />
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mb-2',
                    isSelected
                      ? cn(type.bgLight, type.bgDark)
                      : 'bg-gray-100 dark:bg-slate-700'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isSelected ? type.color : 'text-gray-400 dark:text-slate-400')} />
                </div>

                {/* Name */}
                <span
                  className={cn(
                    'font-semibold text-sm',
                    isSelected ? type.color : 'text-gray-700 dark:text-slate-300'
                  )}
                >
                  {type.name}
                </span>

                {/* Holding period */}
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {type.holdingPeriod}
                </span>

                {/* Credit cost */}
                {showCreditCost && (
                  <div className="flex items-center gap-1 mt-2">
                    <Gem className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {type.creditCost} credits
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
                  {selectedConfig.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {selectedConfig.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-slate-500">Timeframes</span>
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {selectedConfig.timeframes}
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
                  <span className="text-xs text-gray-500 dark:text-slate-500">Features</span>
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

  // Tabs variant - horizontal tabs
  if (variant === 'tabs') {
    return (
      <div className={cn('flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg', className)}>
        {TRADE_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.id;

          return (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                isSelected
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              )}
            >
              <Icon className={cn('w-4 h-4', isSelected ? type.color : '')} />
              <span>{type.name}</span>
              {showCreditCost && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    isSelected
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                  )}
                >
                  {type.creditCost}
                </span>
              )}
            </button>
          );
        })}
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
              'w-8 h-8 rounded-lg flex items-center justify-center',
              selectedConfig.bgLight,
              selectedConfig.bgDark
            )}
          >
            <selectedConfig.icon className={cn('w-4 h-4', selectedConfig.color)} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={cn('font-semibold text-sm', selectedConfig.color)}>
                {selectedConfig.name}
              </span>
              {showCreditCost && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                  {selectedConfig.creditCost} credits
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {selectedConfig.holdingPeriod} • {selectedConfig.timeframes}
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
          {TRADE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;

            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                  isSelected
                    ? cn(type.bgLight, type.bgDark)
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    isSelected
                      ? cn(type.bgLight, type.bgDark)
                      : 'bg-gray-100 dark:bg-slate-700'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isSelected ? type.color : 'text-gray-400')} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-semibold text-sm',
                        isSelected ? type.color : 'text-gray-700 dark:text-slate-300'
                      )}
                    >
                      {type.name}
                    </span>
                    {showCreditCost && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                        {type.creditCost}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {type.holdingPeriod}
                  </span>
                </div>
                {isSelected && <Check className={cn('w-4 h-4', type.color)} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export hook for easy access to trade type config
export function useTradeTypeConfig(type: TradeType) {
  return TRADE_TYPES.find((t) => t.id === type)!;
}

// Export all trade types for external use
export { TRADE_TYPES };
