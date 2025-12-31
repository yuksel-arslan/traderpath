'use client';

// ===========================================
// Trap Check Component
// Matches API response structure
// ===========================================

import { AlertTriangle, Brain, Target, Shield, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrapCheckData {
  riskLevel: 'low' | 'medium' | 'high';
  traps: {
    bullTrap: boolean;
    bullTrapZone?: number;
    bearTrap: boolean;
    bearTrapZone?: number;
    fakeoutRisk: 'low' | 'medium' | 'high';
    liquidityGrab: {
      detected: boolean;
      zones: number[];
    };
    stopHuntZones: number[];
  };
  counterStrategy: string[];
  aiInsight?: string;
}

interface TrapCheckProps {
  data?: TrapCheckData;
  symbol: string;
}

export function TrapCheck({ data, symbol }: TrapCheckProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Trap Check - {symbol}
        </h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getRiskColor = (risk?: string) => {
    if (!risk) return 'text-gray-500 bg-gray-500/20';
    switch (risk.toLowerCase()) {
      case 'low': return 'text-green-500 bg-green-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20';
      case 'high': return 'text-red-500 bg-red-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getRiskLabel = (risk?: string) => {
    if (!risk) return 'Unknown';
    switch (risk.toLowerCase()) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return risk;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Trap Check - {symbol}
      </h3>

      {/* Overall Risk Level */}
      <div className={cn(
        "p-4 rounded-lg border-2 text-center",
        data.riskLevel === 'low' && 'bg-green-500/10 border-green-500/30',
        data.riskLevel === 'medium' && 'bg-yellow-500/10 border-yellow-500/30',
        data.riskLevel === 'high' && 'bg-red-500/10 border-red-500/30',
      )}>
        <p className="text-sm text-muted-foreground mb-1">Trap Risk Level</p>
        <p className={cn(
          "text-2xl font-bold uppercase",
          getRiskColor(data.riskLevel)?.split(' ')[0]
        )}>
          {getRiskLabel(data.riskLevel)} Risk
        </p>
      </div>

      {/* Trap Detection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Bull Trap */}
        <div className={cn(
          "rounded-lg p-4 border",
          data.traps?.bullTrap ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            <p className="text-sm font-medium">Bull Trap</p>
          </div>
          {data.traps?.bullTrap ? (
            <>
              <p className="text-red-500 font-bold">DETECTED</p>
              {data.traps?.bullTrapZone && (
                <p className="text-xs text-muted-foreground mt-1">
                  Zone: ${data.traps.bullTrapZone.toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-green-500 font-bold">Clear</p>
          )}
        </div>

        {/* Bear Trap */}
        <div className={cn(
          "rounded-lg p-4 border",
          data.traps?.bearTrap ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            <p className="text-sm font-medium">Bear Trap</p>
          </div>
          {data.traps?.bearTrap ? (
            <>
              <p className="text-red-500 font-bold">DETECTED</p>
              {data.traps?.bearTrapZone && (
                <p className="text-xs text-muted-foreground mt-1">
                  Zone: ${data.traps.bearTrapZone.toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-green-500 font-bold">Clear</p>
          )}
        </div>

        {/* Fakeout Risk */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Fakeout Risk</p>
          </div>
          <span className={cn(
            "inline-block px-3 py-1.5 rounded-lg text-sm font-medium",
            getRiskColor(data.traps?.fakeoutRisk)
          )}>
            {getRiskLabel(data.traps?.fakeoutRisk)}
          </span>
        </div>
      </div>

      {/* Liquidity Grab Zones */}
      {data.traps?.liquidityGrab?.zones && data.traps.liquidityGrab.zones.length > 0 && (
        <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
          <p className="text-sm font-medium text-orange-500 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Liquidity Grab Zones
          </p>
          <div className="flex flex-wrap gap-2">
            {data.traps.liquidityGrab.zones.map((zone, i) => (
              <span key={i} className="px-3 py-1 bg-orange-500/20 rounded text-sm font-mono">
                ${zone.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stop Hunt Zones */}
      {data.traps?.stopHuntZones && data.traps.stopHuntZones.length > 0 && (
        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
          <p className="text-sm font-medium text-red-500 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Stop Hunt Zones
          </p>
          <div className="flex flex-wrap gap-2">
            {data.traps.stopHuntZones.map((zone, i) => (
              <span key={i} className="px-3 py-1 bg-red-500/20 rounded text-sm font-mono">
                ${zone.toLocaleString()}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Avoid placing stop losses near these levels
          </p>
        </div>
      )}

      {/* Counter Strategies */}
      {data.counterStrategy && data.counterStrategy.length > 0 && (
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
          <p className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Counter Strategies
          </p>
          <ul className="space-y-1">
            {data.counterStrategy.map((strategy, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{strategy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Trap Analysis</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
