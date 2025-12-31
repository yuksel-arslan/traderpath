'use client';

// ===========================================
// Timing Analysis Component
// Matches API response structure
// ===========================================

import { Clock, ArrowDown, ArrowUp, Brain, CheckCircle, XCircle, Timer } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EntryZone {
  priceLow: number;
  priceHigh: number;
  probability: number;
  eta: string;
}

interface Condition {
  name: string;
  met: boolean;
  details: string;
}

interface WaitFor {
  event: string;
  eta: string;
  importance: 'high' | 'medium' | 'low';
}

interface TimingData {
  currentPrice: number;
  optimalEntry: number;
  tradeNow: boolean;
  entryZones: EntryZone[];
  conditions: Condition[];
  waitFor?: WaitFor;
  aiInsight?: string;
}

interface TimingAnalysisProps {
  data?: TimingData;
  symbol: string;
}

export function TimingAnalysis({ data, symbol }: TimingAnalysisProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Clock className="w-5 h-5 text-purple-500" />
          Timing Analysis - {symbol}
        </h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const currentPrice = data.currentPrice || 0;
  const optimalEntry = data.optimalEntry || currentPrice;
  const priceDiff = optimalEntry > 0 ? ((currentPrice - optimalEntry) / optimalEntry * 100) : 0;
  const isAboveOptimal = priceDiff > 0;

  const conditionsMet = data.conditions?.filter(c => c.met).length || 0;
  const totalConditions = data.conditions?.length || 0;
  const conditionProgress = totalConditions > 0 ? (conditionsMet / totalConditions) * 100 : 0;

  const bestZone = data.entryZones?.[0];

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="w-5 h-5 text-purple-500" />
        Timing Analysis - {symbol}
      </h3>

      {/* Trade Now Status */}
      <div className={cn(
        "p-4 rounded-lg border-2 text-center",
        data.tradeNow
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      )}>
        <p className="text-sm text-muted-foreground mb-1">Trade Signal</p>
        <p className={cn(
          "text-2xl font-bold",
          data.tradeNow ? 'text-green-500' : 'text-yellow-500'
        )}>
          {data.tradeNow ? 'ENTER NOW' : 'WAIT'}
        </p>
        {data.waitFor && !data.tradeNow && (
          <p className="text-sm text-muted-foreground mt-1">
            Waiting for: {data.waitFor.event}
          </p>
        )}
      </div>

      {/* Price Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-xl font-bold">${currentPrice.toLocaleString()}</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Optimal Entry</p>
          <p className="text-xl font-bold text-green-500">${optimalEntry.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {isAboveOptimal ? (
              <span className="text-red-500 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" /> {priceDiff.toFixed(2)}% above
              </span>
            ) : (
              <span className="text-green-500 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" /> {Math.abs(priceDiff).toFixed(2)}% below
              </span>
            )}
          </p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Conditions Met</p>
          <p className="text-xl font-bold">{conditionsMet}/{totalConditions}</p>
          <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                conditionProgress >= 70 ? 'bg-green-500' :
                conditionProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${conditionProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Entry Zones */}
      {data.entryZones && data.entryZones.length > 0 && (
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm font-medium mb-3">Entry Zones</p>
          <div className="space-y-3">
            {data.entryZones.slice(0, 3).map((zone, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  index === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/30'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      index === 0 ? 'bg-green-500 text-white' : 'bg-muted'
                    )}>
                      Zone {index + 1}
                    </span>
                    <span className="font-semibold">
                      ${zone.priceLow?.toLocaleString()} - ${zone.priceHigh?.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    ETA: {zone.eta || 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{(zone.probability * 100).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">probability</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Conditions */}
      {data.conditions && data.conditions.length > 0 && (
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm font-medium mb-3">Entry Conditions</p>
          <div className="space-y-2">
            {data.conditions.map((condition, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-2 rounded",
                  condition.met ? 'bg-green-500/10' : 'bg-muted/30'
                )}
              >
                {condition.met ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-sm">{condition.name}</p>
                  <p className="text-xs text-muted-foreground">{condition.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wait For */}
      {data.waitFor && !data.tradeNow && (
        <div className={cn(
          "p-4 rounded-lg border",
          data.waitFor.importance === 'high' && 'bg-red-500/10 border-red-500/30',
          data.waitFor.importance === 'medium' && 'bg-yellow-500/10 border-yellow-500/30',
          data.waitFor.importance === 'low' && 'bg-blue-500/10 border-blue-500/30',
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Wait For</p>
              <p className="font-semibold">{data.waitFor.event}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Expected</p>
              <p className="font-medium">{data.waitFor.eta}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Timing Analysis</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
