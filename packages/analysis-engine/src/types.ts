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

export interface NewsItem {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
  url?: string;
}

export interface NewsSentimentResult {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -100 to 100
  newsCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topNews: NewsItem[];
  lastUpdated: string;
}
