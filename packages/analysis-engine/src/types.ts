// Analysis Engine Types

export interface AnalysisConfig {
  symbol: string;
  interval?: string;
  accountSize?: number;
}

export interface AnalysisResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export type MarketRegime = 'risk_on' | 'risk_off' | 'neutral';
export type TrendDirection = 'bullish' | 'bearish' | 'sideways';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Verdict = 'go' | 'conditional_go' | 'wait' | 'avoid';
