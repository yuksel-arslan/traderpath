// AI Concierge Types

export type IntentType =
  | 'QUICK_ANALYSIS'      // "BTC nasıl?", "ETH'ye gireyim mi?"
  | 'SPECIFIC_ANALYSIS'   // "BTC scalp analizi", "ETH 1h analiz"
  | 'MULTI_ANALYSIS'      // "Top 5 coin analiz et", "Favori coinlerim"
  | 'EXPERT_ASK'          // "RSI nedir?", "MACD nasıl çalışır?"
  | 'ALERT_SET'           // "BTC 70K olunca haber ver"
  | 'ALERT_LIST'          // "Alarmlarım neler?"
  | 'STATUS'              // "Son analizlerim", "Portföyüm nasıl?"
  | 'HELP'                // "Ne yapabilirsin?", "Yardım"
  | 'UNKNOWN';            // Tanınmayan intent

export type VerdictType = 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';

export interface ExtractedEntities {
  symbol?: string;           // BTC, ETH, SOL...
  interval?: string;         // 15m, 1h, 4h, 1d
  tradeType?: string;        // scalping, dayTrade, swing
  targetPrice?: number;      // Alert için hedef fiyat
  direction?: 'above' | 'below';  // Alert yönü
  count?: number;            // Multi-analysis için coin sayısı
  expertId?: string;         // ARIA, NEXUS, ORACLE, SENTINEL
}

export interface IntentDetectionResult {
  intent: IntentType;
  confidence: number;        // 0-1 arası
  entities: ExtractedEntities;
  originalMessage: string;
  language: string;          // tr, en, etc.
}

export interface ConciergeRequest {
  message: string;
  userId: string;
  sessionId?: string;        // Oturum takibi için
  language?: string;         // Zorunlu dil tercihi
}

export interface QuickAnalysisResult {
  symbol: string;
  interval: string;
  tradeType: string;
  verdict: VerdictType;
  score: number;
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  riskReward: number;
  reasoning: string;
  analysisId: string;
  creditsSpent: number;
}

export interface ExpertAskResult {
  expertId: string;
  expertName: string;
  answer: string;
  creditsSpent: number;
}

export interface AlertSetResult {
  alertId: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  creditsSpent: number;
}

export interface StatusResult {
  recentAnalyses: Array<{
    id: string;
    symbol: string;
    verdict: VerdictType;
    score: number;
    createdAt: Date;
  }>;
  activeAlerts: number;
  creditBalance: number;
}

export interface HelpResult {
  capabilities: string[];
  examples: string[];
}

export type ConciergeResultData =
  | QuickAnalysisResult
  | QuickAnalysisResult[]   // Multi-analysis
  | ExpertAskResult
  | AlertSetResult
  | StatusResult
  | HelpResult
  | { error: string };

export interface ConciergeResponse {
  success: boolean;
  intent: IntentType;
  message: string;           // Kullanıcıya gösterilecek özet mesaj
  data?: ConciergeResultData;
  suggestions?: string[];    // Sonraki olası sorular
  creditsSpent: number;
  creditsRemaining: number;
  error?: string;
}

// Coin sembolleri için mapping (Türkçe/kısaltma → sembol)
export const COIN_ALIASES: Record<string, string> = {
  // Bitcoin
  'bitcoin': 'BTC',
  'btc': 'BTC',
  'bc': 'BTC',
  'bitkoin': 'BTC',

  // Ethereum (including common typos)
  'ethereum': 'ETH',
  'etherium': 'ETH',
  'eth': 'ETH',
  'ether': 'ETH',
  'eteryum': 'ETH',

  // Solana
  'solana': 'SOL',
  'sol': 'SOL',

  // BNB
  'bnb': 'BNB',
  'binance': 'BNB',

  // XRP
  'xrp': 'XRP',
  'ripple': 'XRP',

  // Cardano
  'cardano': 'ADA',
  'ada': 'ADA',

  // Dogecoin
  'dogecoin': 'DOGE',
  'doge': 'DOGE',

  // Polygon
  'polygon': 'MATIC',
  'matic': 'MATIC',

  // Avalanche
  'avalanche': 'AVAX',
  'avax': 'AVAX',

  // Chainlink
  'chainlink': 'LINK',
  'link': 'LINK',

  // Popular altcoins
  'sui': 'SUI',
  'arbitrum': 'ARB',
  'arb': 'ARB',
  'optimism': 'OP',
  'op': 'OP',
  'aptos': 'APT',
  'apt': 'APT',
  'near': 'NEAR',
  'atom': 'ATOM',
  'cosmos': 'ATOM',
  'polkadot': 'DOT',
  'dot': 'DOT',
  'litecoin': 'LTC',
  'ltc': 'LTC',
  'tron': 'TRX',
  'trx': 'TRX',
  'uniswap': 'UNI',
  'uni': 'UNI',
  'aave': 'AAVE',
  'maker': 'MKR',
  'mkr': 'MKR',
  'injective': 'INJ',
  'inj': 'INJ',
  'render': 'RENDER',
  'pepe': 'PEPE',
  'shiba': 'SHIB',
  'shib': 'SHIB',
  'bonk': 'BONK',
  'wif': 'WIF',
  'floki': 'FLOKI',
};

// Timeframe aliases
export const TIMEFRAME_ALIASES: Record<string, string> = {
  // Turkish
  'dakika': 'm',
  'dk': 'm',
  'saat': 'h',
  'saatlik': 'h',
  'günlük': 'd',
  'gün': 'd',
  'haftalık': 'W',
  'hafta': 'W',

  // English
  'minute': 'm',
  'min': 'm',
  'hour': 'h',
  'hourly': 'h',
  'daily': 'd',
  'day': 'd',
  'weekly': 'W',
  'week': 'W',

  // Common patterns
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1W',
};

// Trade type aliases
export const TRADE_TYPE_ALIASES: Record<string, string> = {
  // Turkish
  'scalp': 'scalping',
  'scalping': 'scalping',
  'günlük': 'dayTrade',
  'gün içi': 'dayTrade',
  'günlük trade': 'dayTrade',
  'day': 'dayTrade',
  'daytrade': 'dayTrade',
  'day trade': 'dayTrade',
  'swing': 'swing',
  'swing trade': 'swing',
  'orta vade': 'swing',
  'orta vadeli': 'swing',

  // English
  'short term': 'scalping',
  'quick': 'scalping',
  'intraday': 'dayTrade',
  'medium term': 'swing',
};

// Expert aliases
export const EXPERT_ALIASES: Record<string, string> = {
  'aria': 'aria',
  'arya': 'aria',
  'nexus': 'nexus',
  'oracle': 'oracle',
  'sentinel': 'sentinel',
  'strateji': 'aria',
  'teknik': 'nexus',
  'risk': 'oracle',
  'psikoloji': 'sentinel',
};
