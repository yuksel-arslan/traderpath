'use client';

import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FinalVerdictProps {
  data: unknown;
  symbol: string;
}

export function FinalVerdict({ data, symbol }: FinalVerdictProps) {
  // Mock data for demo
  const mockData = {
    verdict: 'bullish' as const,
    confidence: 78,
    action: 'BUY',
    summary: 'Market conditions favor a long position with moderate confidence. Key support levels are holding, and whale activity suggests accumulation.',
    pros: [
      'Strong support at $42,000',
      'Bullish divergence on RSI',
      'Whale accumulation detected',
      'Low manipulation risk',
    ],
    cons: [
      'Resistance at $45,000 may slow progress',
      'Overall market sentiment mixed',
    ],
    riskLevel: 'moderate' as const,
    suggestedAction: 'Enter long position with 2-3% portfolio allocation. Use tight stop-loss at $41,500.',
  };

  const getVerdictStyle = () => {
    if (mockData.verdict === 'bullish') return 'from-green-500/20 to-green-500/5 border-green-500/30';
    if (mockData.verdict === 'bearish') return 'from-red-500/20 to-red-500/5 border-red-500/30';
    return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
  };

  const getVerdictIcon = () => {
    if (mockData.verdict === 'bullish') return <TrendingUp className="w-8 h-8 text-green-500" />;
    if (mockData.verdict === 'bearish') return <TrendingDown className="w-8 h-8 text-red-500" />;
    return <Minus className="w-8 h-8 text-yellow-500" />;
  };

  const getVerdictColor = () => {
    if (mockData.verdict === 'bullish') return 'text-green-500';
    if (mockData.verdict === 'bearish') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getRiskStyle = (risk: string) => {
    if (risk === 'low') return 'bg-green-500/20 text-green-500';
    if (risk === 'moderate') return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-red-500/20 text-red-500';
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        Final Verdict - {symbol}
      </h3>

      {/* Main Verdict Card */}
      <div className={`p-6 rounded-lg bg-gradient-to-br border mb-6 ${getVerdictStyle()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {getVerdictIcon()}
            <div>
              <p className="text-sm text-muted-foreground">Overall Verdict</p>
              <p className={`text-3xl font-bold uppercase ${getVerdictColor()}`}>
                {mockData.verdict}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="text-3xl font-bold">{mockData.confidence}%</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-lg font-bold text-lg ${
            mockData.action === 'BUY' ? 'bg-green-500 text-white' :
            mockData.action === 'SELL' ? 'bg-red-500 text-white' :
            'bg-yellow-500 text-white'
          }`}>
            {mockData.action}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskStyle(mockData.riskLevel)}`}>
            {mockData.riskLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-accent/50 rounded-lg mb-4">
        <p className="text-muted-foreground">{mockData.summary}</p>
      </div>

      {/* Pros and Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <h4 className="font-medium text-green-500 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Bullish Factors
          </h4>
          <ul className="space-y-2">
            {mockData.pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <h4 className="font-medium text-red-500 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" />
            Risk Factors
          </h4>
          <ul className="space-y-2">
            {mockData.cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Suggested Action */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="font-medium text-blue-500 mb-2">Suggested Action</h4>
        <p className="text-muted-foreground">{mockData.suggestedAction}</p>
      </div>
    </div>
  );
}
