'use client';

// ===========================================
// Safety Check Component
// Matches API response structure
// ===========================================

import { Shield, AlertTriangle, CheckCircle, Brain, Activity, Users, Waves } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IndicatorDetails } from './IndicatorDetails';

// Import type from the shared types package
import type { IndicatorAnalysis } from '@traderpath/types';

interface SafetyCheckData {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  manipulation: {
    pumpDumpRisk: 'low' | 'medium' | 'high';
    spoofingDetected: boolean;
    washTrading: boolean;
    unusualVolume: boolean;
  };
  whaleActivity: {
    bias: 'accumulating' | 'distributing' | 'neutral';
    netFlowUsd: number;
    largeTransactions: number;
  };
  smartMoney: {
    positioning: 'long' | 'short' | 'neutral';
    confidence: number;
  };
  warnings: string[];
  aiInsight?: string;
  // New: detailed indicator analysis for advanced metrics
  indicatorDetails?: IndicatorAnalysis;
}

interface SafetyCheckProps {
  data?: SafetyCheckData;
  symbol: string;
}

export function SafetyCheck({ data, symbol }: SafetyCheckProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Shield className="w-5 h-5 text-orange-500" />
          Safety Check - {symbol}
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
      case 'high': return 'text-orange-500 bg-orange-500/20';
      case 'extreme': return 'text-red-500 bg-red-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getRiskLabel = (risk?: string) => {
    if (!risk) return 'Unknown';
    switch (risk.toLowerCase()) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'High Risk';
      case 'extreme': return 'Extreme Risk';
      default: return risk;
    }
  };

  const getBiasColor = (bias?: string) => {
    if (!bias) return 'text-gray-500';
    switch (bias.toLowerCase()) {
      case 'accumulating': return 'text-green-500';
      case 'distributing': return 'text-red-500';
      case 'neutral': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const formatUsd = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Shield className="w-5 h-5 text-orange-500" />
        Safety Check - {symbol}
      </h3>

      {/* Overall Risk Level */}
      <div className={cn(
        "p-4 rounded-lg border-2 text-center",
        data.riskLevel === 'low' && 'bg-green-500/10 border-green-500/30',
        data.riskLevel === 'medium' && 'bg-yellow-500/10 border-yellow-500/30',
        data.riskLevel === 'high' && 'bg-orange-500/10 border-orange-500/30',
        data.riskLevel === 'extreme' && 'bg-red-500/10 border-red-500/30',
      )}>
        <p className="text-sm text-muted-foreground mb-1">Overall Risk Level</p>
        <p className={cn(
          "text-2xl font-bold uppercase",
          getRiskColor(data.riskLevel)?.split(' ')[0]
        )}>
          {getRiskLabel(data.riskLevel)}
        </p>
      </div>

      {/* Risk Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Manipulation Risk */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Pump/Dump</p>
          </div>
          <span className={cn(
            "inline-block px-3 py-1.5 rounded-lg text-sm font-medium",
            getRiskColor(data.manipulation?.pumpDumpRisk)
          )}>
            {getRiskLabel(data.manipulation?.pumpDumpRisk)}
          </span>
        </div>

        {/* Whale Activity */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Whale Activity</p>
          </div>
          <p className={cn("font-bold capitalize", getBiasColor(data.whaleActivity?.bias))}>
            {data.whaleActivity?.bias || 'Unknown'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Net: {formatUsd(data.whaleActivity?.netFlowUsd || 0)}
          </p>
        </div>

        {/* Spoofing */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Spoofing</p>
          </div>
          {data.manipulation?.spoofingDetected ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-medium">Detected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-500 font-medium">Clear</span>
            </div>
          )}
        </div>

        {/* Wash Trading */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Wash Trading</p>
          </div>
          {data.manipulation?.washTrading ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-medium">Detected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-500 font-medium">Clear</span>
            </div>
          )}
        </div>
      </div>

      {/* Smart Money */}
      <div className="bg-background rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-purple-500" />
          <p className="font-medium">Smart Money Positioning</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn(
              "inline-block px-3 py-1.5 rounded-lg text-sm font-medium uppercase",
              data.smartMoney?.positioning === 'long' && 'text-green-500 bg-green-500/20',
              data.smartMoney?.positioning === 'short' && 'text-red-500 bg-red-500/20',
              data.smartMoney?.positioning === 'neutral' && 'text-yellow-500 bg-yellow-500/20',
            )}>
              {data.smartMoney?.positioning || 'Unknown'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="font-bold">{((data.smartMoney?.confidence || 0) * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
          <p className="text-sm font-medium text-yellow-500 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({data.warnings.length})
          </p>
          <ul className="space-y-1">
            {data.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Indicator Analysis - Advanced Metrics */}
      {data.indicatorDetails && (
        <div className="mt-6 pt-6 border-t">
          <IndicatorDetails
            data={data.indicatorDetails}
            title="Advanced Metric Analysis"
            compact={false}
          />
        </div>
      )}

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Risk Analysis</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
