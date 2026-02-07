/**
 * Morning Briefing Frontend Types
 */

export interface MorningBriefing {
  id: string;
  date: string;
  generatedAt: Date;

  globalLiquidityStatus: {
    bias: 'risk_on' | 'risk_off' | 'neutral';
    fedBalanceSheet: number;
    m2Growth: number;
    dxyLevel: number;
    vixLevel: number;
    verdict: string;
  };

  marketBias: {
    primary: 'crypto' | 'stocks' | 'bonds' | 'metals';
    flow7d: number;
    flow30d: number;
    phase: 'early' | 'mid' | 'late' | 'exit';
    recommendation: string;
  };

  topAssets: {
    symbol: string;
    name: string;
    direction: 'long' | 'short';
    score: number;
    reason: string;
  }[];

  riskAlerts: {
    severity: 'high' | 'medium' | 'low';
    message: string;
  }[];

  opportunities: {
    title: string;
    description: string;
    market: string;
    confidence: number;
  }[];
}
