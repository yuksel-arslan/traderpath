/**
 * Morning Briefing Types
 * Automatic daily market briefing system
 */

export interface MorningBriefing {
  id: string;
  date: string; // ISO date string
  generatedAt: Date;

  // L1-L4 Capital Flow Summary
  globalLiquidityStatus: {
    bias: 'risk_on' | 'risk_off' | 'neutral';
    fedBalanceSheet: number;
    m2Growth: number;
    dxyLevel: number;
    vixLevel: number;
    verdict: string; // 1-2 sentences
  };

  marketBias: {
    primary: 'crypto' | 'stocks' | 'bonds' | 'metals';
    flow7d: number;
    flow30d: number;
    phase: 'early' | 'mid' | 'late' | 'exit';
    recommendation: string; // "Focus on Crypto assets"
  };

  topAssets: {
    symbol: string;
    name: string;
    direction: 'long' | 'short';
    score: number;
    reason: string; // "Bullish breakout setup"
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

export interface BriefingPreferences {
  userId: string;
  enabled: boolean;
  deliveryTime: string; // "08:00" format (UTC)
  channels: ('email' | 'telegram' | 'discord')[];
  includePersonalStats: boolean;
  markets: ('crypto' | 'stocks' | 'bonds' | 'metals')[];
}

export interface BriefingDelivery {
  briefingId: string;
  userId: string;
  deliveredAt: Date;
  channel: 'email' | 'telegram' | 'discord' | 'in-app';
  status: 'sent' | 'failed';
  error?: string;
}

export interface BriefingStats {
  totalGenerated: number;
  totalDelivered: number;
  lastGenerated: Date;
  nextScheduled: Date;
}
