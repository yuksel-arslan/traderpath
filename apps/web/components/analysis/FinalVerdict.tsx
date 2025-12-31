'use client';

import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Brain, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ComponentScore {
  step: string;
  score: number;
  weight: number;
}

interface ConfidenceFactor {
  factor: string;
  positive: boolean;
  impact: 'high' | 'medium' | 'low';
}

interface FinalVerdictData {
  overallScore: number;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  componentScores: ComponentScore[];
  confidenceFactors: ConfidenceFactor[];
  recommendation: string;
  analysisId: string;
  createdAt: string;
  expiresAt: string;
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
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getVerdictStyle = () => {
    switch (data.verdict) {
      case 'go': return 'from-green-500/20 to-green-500/5 border-green-500/30';
      case 'conditional_go': return 'from-blue-500/20 to-blue-500/5 border-blue-500/30';
      case 'wait': return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
      case 'avoid': return 'from-red-500/20 to-red-500/5 border-red-500/30';
      default: return 'from-gray-500/20 to-gray-500/5 border-gray-500/30';
    }
  };

  const getVerdictIcon = () => {
    switch (data.verdict) {
      case 'go': return <TrendingUp className="w-8 h-8 text-green-500" />;
      case 'conditional_go': return <Target className="w-8 h-8 text-blue-500" />;
      case 'wait': return <Minus className="w-8 h-8 text-yellow-500" />;
      case 'avoid': return <TrendingDown className="w-8 h-8 text-red-500" />;
      default: return <Minus className="w-8 h-8 text-gray-500" />;
    }
  };

  const getVerdictColor = () => {
    switch (data.verdict) {
      case 'go': return 'text-green-500';
      case 'conditional_go': return 'text-blue-500';
      case 'wait': return 'text-yellow-500';
      case 'avoid': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getVerdictLabel = () => {
    switch (data.verdict) {
      case 'go': return 'GO';
      case 'conditional_go': return 'CONDITIONAL GO';
      case 'wait': return 'WAIT';
      case 'avoid': return 'AVOID';
      default: return 'UNKNOWN';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 7) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getImpactStyle = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-purple-500/20 text-purple-400';
      case 'medium': return 'bg-blue-500/20 text-blue-400';
      case 'low': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const positiveFactors = data.confidenceFactors?.filter(f => f.positive) || [];
  const negativeFactors = data.confidenceFactors?.filter(f => !f.positive) || [];

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
              <p className="text-sm text-muted-foreground">Overall Verdict</p>
              <p className={cn("text-3xl font-bold uppercase", getVerdictColor())}>
                {getVerdictLabel()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className={cn("text-4xl font-bold", getScoreColor(data.overallScore ?? 0))}>
              {data.overallScore ?? 0}<span className="text-lg text-muted-foreground">/10</span>
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-4 p-3 bg-background/50 rounded-lg">
          <p className="text-sm">{data.recommendation}</p>
        </div>
      </div>

      {/* Component Scores */}
      {data.componentScores && data.componentScores.length > 0 && (
        <div className="bg-card rounded-lg p-4 border">
          <h4 className="font-medium mb-4">Component Scores</h4>
          <div className="space-y-3">
            {data.componentScores.map((cs, i) => {
              const score = cs.score ?? 0;
              const weight = cs.weight ?? 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm w-32 truncate">{cs.step || `Step ${i + 1}`}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", getScoreBarColor(score))}
                      style={{ width: `${score * 10}%` }}
                    />
                  </div>
                  <span className={cn("text-sm font-medium w-8", getScoreColor(score))}>
                    {score.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground w-12">
                    ({(weight * 100).toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confidence Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <h4 className="font-medium text-green-500 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Bullish Factors
          </h4>
          <ul className="space-y-2">
            {positiveFactors.length > 0 ? positiveFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{factor.factor}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded", getImpactStyle(factor.impact))}>
                  {factor.impact}
                </span>
              </li>
            )) : (
              <li className="text-sm text-muted-foreground">No bullish factors identified</li>
            )}
          </ul>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <h4 className="font-medium text-red-500 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" />
            Risk Factors
          </h4>
          <ul className="space-y-2">
            {negativeFactors.length > 0 ? negativeFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{factor.factor}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded", getImpactStyle(factor.impact))}>
                  {factor.impact}
                </span>
              </li>
            )) : (
              <li className="text-sm text-muted-foreground">No risk factors identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* AI Verdict */}
      {data.aiVerdict && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Analysis</p>
              <p className="text-sm whitespace-pre-wrap">{data.aiVerdict}</p>
            </div>
          </div>
        </div>
      )}

      {/* Meta Info */}
      {(data.analysisId || data.expiresAt) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {data.analysisId && <span>Analysis ID: {data.analysisId}</span>}
          {data.expiresAt && <span>Valid until: {new Date(data.expiresAt).toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}
