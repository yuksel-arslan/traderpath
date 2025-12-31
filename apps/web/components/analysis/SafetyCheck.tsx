'use client';

import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SafetyCheckProps {
  data: unknown;
  symbol: string;
}

export function SafetyCheck({ data, symbol }: SafetyCheckProps) {
  // Mock data for demo
  const mockData = {
    overallScore: 78,
    manipulationRisk: 'low' as const,
    whaleActivity: 'moderate' as const,
    volumeAnomaly: false,
    priceManipulation: false,
    warnings: ['Large sell wall detected at $44,500', 'Unusual options activity'],
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'low') return 'text-green-500 bg-green-500/10';
    if (risk === 'moderate') return 'text-yellow-500 bg-yellow-500/10';
    return 'text-red-500 bg-red-500/10';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-500" />
        Safety Check - {symbol}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-accent/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">Safety Score</p>
          <p className={`text-3xl font-bold ${getScoreColor(mockData.overallScore)}`}>
            {mockData.overallScore}
          </p>
        </div>

        <div className={`p-4 rounded-lg text-center ${getRiskColor(mockData.manipulationRisk)}`}>
          <p className="text-sm opacity-80 mb-2">Manipulation Risk</p>
          <p className="text-lg font-bold capitalize">{mockData.manipulationRisk}</p>
        </div>

        <div className={`p-4 rounded-lg text-center ${getRiskColor(mockData.whaleActivity)}`}>
          <p className="text-sm opacity-80 mb-2">Whale Activity</p>
          <p className="text-lg font-bold capitalize">{mockData.whaleActivity}</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Checks</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {mockData.volumeAnomaly ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span>Volume Normal</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {mockData.priceManipulation ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span>Price Clean</span>
            </div>
          </div>
        </div>
      </div>

      {mockData.warnings.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <h4 className="font-medium text-yellow-500 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {mockData.warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
