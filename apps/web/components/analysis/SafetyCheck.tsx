'use client';

import { Shield, AlertTriangle, CheckCircle, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SafetyCheckData {
  symbol: string;
  manipulationRisk: string;
  whaleActivity: string;
  volumeAnomaly: boolean;
  warnings: string[];
  metrics: {
    bidAskSpread: number;
    orderBookImbalance: number;
    largeOrdersRatio: number;
  };
  aiInsight?: string;
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
          <Shield className="w-5 h-5 text-blue-500" />
          Safety Check - {symbol}
        </h3>
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'LOW': return 'text-green-500 bg-green-500/20';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/20';
      case 'HIGH': return 'text-red-500 bg-red-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'LOW': return 'Düşük';
      case 'MEDIUM': return 'Orta';
      case 'HIGH': return 'Yüksek';
      default: return risk;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Shield className="w-5 h-5 text-blue-500" />
        Safety Check - {symbol}
      </h3>

      {/* Risk Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-2">Manipülasyon Riski</p>
          <span className={cn(
            "inline-block px-3 py-1.5 rounded-lg text-sm font-medium",
            getRiskColor(data.manipulationRisk)
          )}>
            {getRiskLabel(data.manipulationRisk)}
          </span>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-2">Balina Aktivitesi</p>
          <span className={cn(
            "inline-block px-3 py-1.5 rounded-lg text-sm font-medium",
            getRiskColor(data.whaleActivity)
          )}>
            {getRiskLabel(data.whaleActivity)}
          </span>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-2">Hacim Anomalisi</p>
          <div className="flex items-center gap-2">
            {data.volumeAnomaly ? (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-500 font-medium">Tespit Edildi</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-500 font-medium">Normal</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-background rounded-lg p-4 border">
        <p className="text-sm font-medium mb-3">Piyasa Metrikleri</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Alış/Satış Farkı</p>
            <p className="text-lg font-bold">{data.metrics.bidAskSpread.toFixed(3)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Emir Defteri Dengesi</p>
            <p className="text-lg font-bold">{(data.metrics.orderBookImbalance * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Büyük Emir Oranı</p>
            <p className="text-lg font-bold">{(data.metrics.largeOrdersRatio * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
          <p className="text-sm font-medium text-yellow-500 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Uyarılar
          </p>
          <ul className="space-y-1">
            {data.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400">• {warning}</li>
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
              <p className="text-sm font-medium text-purple-500 mb-1">AI Risk Analizi</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
