'use client';

import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FinalVerdictData {
  verdict: string;
  confidence: number;
  action: string;
  riskLevel: string;
  reasons: {
    bullish: string[];
    bearish: string[];
  };
  aiVerdict?: string;
}

interface FinalVerdictProps {
  data?: FinalVerdictData;
  symbol: string;
}

export function FinalVerdict({ data, symbol }: FinalVerdictProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Final Verdict - {symbol}
        </h3>
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const getVerdictStyle = () => {
    const upper = data.verdict.toUpperCase();
    if (upper === 'BULLISH' || upper === 'BUY') return 'from-green-500/20 to-green-500/5 border-green-500/30';
    if (upper === 'BEARISH' || upper === 'SELL') return 'from-red-500/20 to-red-500/5 border-red-500/30';
    return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
  };

  const getVerdictIcon = () => {
    const upper = data.verdict.toUpperCase();
    if (upper === 'BULLISH' || upper === 'BUY') return <TrendingUp className="w-8 h-8 text-green-500" />;
    if (upper === 'BEARISH' || upper === 'SELL') return <TrendingDown className="w-8 h-8 text-red-500" />;
    return <Minus className="w-8 h-8 text-yellow-500" />;
  };

  const getVerdictColor = () => {
    const upper = data.verdict.toUpperCase();
    if (upper === 'BULLISH' || upper === 'BUY') return 'text-green-500';
    if (upper === 'BEARISH' || upper === 'SELL') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getVerdictLabel = () => {
    const upper = data.verdict.toUpperCase();
    if (upper === 'BULLISH' || upper === 'BUY') return 'Yükseliş';
    if (upper === 'BEARISH' || upper === 'SELL') return 'Düşüş';
    return 'Nötr';
  };

  const getRiskStyle = (risk: string) => {
    const upper = risk.toUpperCase();
    if (upper === 'LOW') return 'bg-green-500/20 text-green-500';
    if (upper === 'MEDIUM') return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-red-500/20 text-red-500';
  };

  const getRiskLabel = (risk: string) => {
    const upper = risk.toUpperCase();
    if (upper === 'LOW') return 'DÜŞÜK RİSK';
    if (upper === 'MEDIUM') return 'ORTA RİSK';
    return 'YÜKSEK RİSK';
  };

  const getActionStyle = () => {
    const upper = data.action.toUpperCase();
    if (upper === 'BUY' || upper === 'LONG') return 'bg-green-500 text-white';
    if (upper === 'SELL' || upper === 'SHORT') return 'bg-red-500 text-white';
    return 'bg-yellow-500 text-white';
  };

  const getActionLabel = () => {
    const upper = data.action.toUpperCase();
    if (upper === 'BUY' || upper === 'LONG') return 'AL';
    if (upper === 'SELL' || upper === 'SHORT') return 'SAT';
    return 'BEKLE';
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        Final Verdict - {symbol}
      </h3>

      {/* Main Verdict Card */}
      <div className={cn("p-6 rounded-lg bg-gradient-to-br border", getVerdictStyle())}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {getVerdictIcon()}
            <div>
              <p className="text-sm text-muted-foreground">Genel Değerlendirme</p>
              <p className={cn("text-3xl font-bold uppercase", getVerdictColor())}>
                {getVerdictLabel()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Güven</p>
            <p className="text-3xl font-bold">{data.confidence}%</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={cn("px-4 py-2 rounded-lg font-bold text-lg", getActionStyle())}>
            {getActionLabel()}
          </span>
          <span className={cn("px-3 py-1 rounded-full text-sm font-medium", getRiskStyle(data.riskLevel))}>
            {getRiskLabel(data.riskLevel)}
          </span>
        </div>
      </div>

      {/* Pros and Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <h4 className="font-medium text-green-500 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Yükseliş Faktörleri
          </h4>
          <ul className="space-y-2">
            {data.reasons.bullish.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <h4 className="font-medium text-red-500 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" />
            Risk Faktörleri
          </h4>
          <ul className="space-y-2">
            {data.reasons.bearish.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Verdict */}
      {data.aiVerdict && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Final Değerlendirme</p>
              <p className="text-sm">{data.aiVerdict}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
