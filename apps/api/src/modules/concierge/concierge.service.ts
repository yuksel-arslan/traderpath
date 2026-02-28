import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { aiExpertService } from '../ai-expert/ai-expert.service';
import { callGeminiWithRetry } from '../../core/gemini';
import { INTENT_DETECTION_PROMPT, RESPONSE_TEMPLATES } from './system-prompt';
import { coinScoreCacheService, CoinScore } from '../analysis/services/coin-score-cache.service';
import * as capitalFlowService from '../capital-flow/capital-flow.service';
import { translationService, SUPPORTED_LANGUAGES } from '../translation/translation.service';
import { logger } from '../../core/logger';
import { analysisEngine } from '../analysis/analysis.engine';

interface ConciergeRequest {
  message: string;
  userId: string;
  language?: string;
}

interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradePlan {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  direction: 'long' | 'short';
}

interface ConciergeResponse {
  success: boolean;
  intent: string;
  message: string;
  creditsSpent: number;
  creditsRemaining: number;
  error?: string;
  detectedLanguage?: string;  // Language detected from user message
  // Analysis-specific fields
  analysisId?: string;
  verdict?: string;
  score?: number;
  direction?: string;  // LONG or SHORT
  tradePlan?: TradePlan;  // Trade plan with entry, SL, TPs
  voltranSynthesis?: string;
  fromCache?: boolean;  // True if result came from pre-computed cache (free)
  cacheExpiresAt?: Date;  // When the cached result expires
  // Chart-specific fields
  chartData?: {
    symbol: string;
    interval: string;
    candles: ChartCandle[];
    tradePlan?: TradePlan;
    currentPrice?: number;
  };
  // MLIS analysis result
  mlisResult?: {
    recommendation: string;
    direction: string;
    confidence: number;
    riskLevel: string;
    layers: Record<string, { score: number; signals: string[] }>;
    keySignals: string[];
    riskFactors: string[];
  };
}

// Expanded asset list - 80+ assets including crypto, stocks, bonds, metals
const SUPPORTED_ASSETS = [
  // ===== CRYPTO =====
  // Top 20 by market cap
  'btc', 'eth', 'bnb', 'xrp', 'ada', 'doge', 'sol', 'trx', 'dot', 'matic',
  'shib', 'ltc', 'avax', 'link', 'atom', 'uni', 'xlm', 'etc', 'xmr', 'bch',
  // DeFi tokens
  'aave', 'mkr', 'crv', 'comp', 'sushi', 'snx', 'yfi', '1inch',
  // Layer 2 / New chains
  'arb', 'op', 'apt', 'sui', 'sei', 'near', 'ftm', 'algo', 'egld', 'flow',
  // Meme coins
  'pepe', 'floki', 'wif', 'bonk',
  // Gaming / Metaverse
  'sand', 'mana', 'axs', 'gala', 'imx', 'enj',
  // AI tokens
  'fet', 'agix', 'ocean', 'rndr',
  // Others
  'vet', 'hbar', 'qnt', 'inj', 'ldo', 'rune', 'grt', 'fil', 'theta', 'icp',

  // ===== STOCKS =====
  // Major indices ETFs
  'spy', 'qqq', 'dia', 'iwm', 'voo',
  // Tech giants
  'aapl', 'msft', 'googl', 'amzn', 'meta', 'nvda', 'tsla', 'nflx',
  // Other popular stocks
  'amd', 'intc', 'crm', 'adbe', 'pypl', 'v', 'ma', 'jpm', 'bac', 'wfc',

  // ===== BONDS =====
  // Treasury ETFs
  'tlt', 'ief', 'shy', 'bnd', 'agg', 'tip',
  // Corporate bonds
  'lqd', 'hyg', 'jnk',

  // ===== METALS =====
  // Gold
  'gld', 'iau', 'xauusd', 'gold',
  // Silver
  'slv', 'xagusd', 'silver',
  // Other metals
  'pplt', 'pall', 'dba'
];

// Asset name aliases for natural language (Turkish and English)
const ASSET_ALIASES: Record<string, string> = {
  // Crypto aliases (English)
  'bitcoin': 'btc',
  'ethereum': 'eth',
  'binance': 'bnb',
  'ripple': 'xrp',
  'cardano': 'ada',
  'dogecoin': 'doge',
  'solana': 'sol',
  'polygon': 'matic',
  'polkadot': 'dot',
  'chainlink': 'link',
  'uniswap': 'uni',
  'avalanche': 'avax',
  'cosmos': 'atom',
  'litecoin': 'ltc',
  'arbitrum': 'arb',
  'optimism': 'op',
  'aptos': 'apt',
  'shiba': 'shib',
  'pepe coin': 'pepe',
  'render': 'rndr',
  'fetch': 'fet',
  'singularity': 'agix',

  // Crypto aliases (Turkish)
  'eteryum': 'eth',
  'etherium': 'eth',
  'bitekoyn': 'btc',
  'bitkoin': 'btc',
  'solena': 'sol',
  'dogekoyn': 'doge',
  'dojkoyn': 'doge',
  'doçkoyn': 'doge',
  'litekoyn': 'ltc',
  'kozmoz': 'atom',
  'çeynlink': 'link',
  'shibarium': 'shib',
  'bonk coin': 'bonk',
  'sui coin': 'sui',
  'sei coin': 'sei',

  // Metal aliases (Turkish and English)
  'altın': 'gld',
  'altin': 'gld',
  'gold': 'gld',
  'gümüş': 'slv',
  'gumus': 'slv',
  'silver': 'slv',
  'platin': 'pplt',
  'platinum': 'pplt',
  'paladyum': 'pall',
  'palladium': 'pall',

  // Stock aliases (Turkish and English)
  'apple': 'aapl',
  'microsoft': 'msft',
  'google': 'googl',
  'amazon': 'amzn',
  'nvidia': 'nvda',
  'tesla': 'tsla',
  'sp500': 'spy',
  's&p': 'spy',
  's&p500': 'spy',
  'nasdaq': 'qqq',

  // Bond aliases (Turkish)
  'tahvil': 'tlt',
  'treasury': 'tlt',
  'hazine': 'tlt',
  'bono': 'shy',
};

// Intent detection with advanced pattern matching
function detectIntent(message: string): {
  intent: string;
  symbol?: string;
  interval?: string;
  intervalExplicit?: boolean;
  expertType?: string;
  market?: string;
} {
  const lower = message.toLowerCase().trim();

  // ===== CAPITAL FLOW INTENTS (Priority - Check First) =====

  // CAPITAL_FLOW_SUMMARY - Full 4-layer overview
  if (
    lower.includes('capital flow') ||
    lower.includes('sermaye akış') ||
    lower.includes('para akış') ||
    lower.includes('para nereye') ||
    lower.includes('money flow') ||
    lower.includes('where is money') ||
    lower.includes('4 layer') ||
    lower.includes('4 katman') ||
    lower.includes('dört katman') ||
    lower.includes('follow the money') ||
    lower.includes('parayı takip') ||
    (lower.includes('akış') && lower.includes('özet')) ||
    (lower.includes('flow') && lower.includes('summary'))
  ) {
    return { intent: 'CAPITAL_FLOW_SUMMARY' };
  }

  // CAPITAL_FLOW_LIQUIDITY - Layer 1 (Fed, M2, DXY, VIX, Yield)
  if (
    lower.includes('fed balance') ||
    lower.includes('fed bilanço') ||
    lower.includes('m2 money') ||
    lower.includes('m2 para') ||
    lower.includes('dxy') ||
    lower.includes('dolar endeks') ||
    lower.includes('dollar index') ||
    lower.includes('vix') ||
    lower.includes('korku endeks') ||
    lower.includes('fear index') ||
    lower.includes('yield curve') ||
    lower.includes('verim eğri') ||
    lower.includes('global liquidity') ||
    lower.includes('küresel likidite') ||
    lower.includes('makro') ||
    lower.includes('macro') ||
    (lower.includes('likidite') && !lower.includes('piyasa'))
  ) {
    return { intent: 'CAPITAL_FLOW_LIQUIDITY' };
  }

  // CAPITAL_FLOW_MARKETS - Layer 2 (Crypto/Stocks/Bonds/Metals flow)
  if (
    lower.includes('market flow') ||
    lower.includes('piyasa akış') ||
    lower.includes('hangi piyasa') ||
    lower.includes('which market') ||
    lower.includes('rotasyon') ||
    lower.includes('rotation') ||
    lower.includes('crypto vs') ||
    lower.includes('kripto mu') ||
    lower.includes('hisse mi') ||
    lower.includes('stocks vs') ||
    lower.includes('para nereye gidiyor') ||
    lower.includes('where is capital going') ||
    lower.includes('market leading') ||
    lower.includes('öne çıkan piyasa') ||
    lower.includes('en iyi piyasa') ||
    lower.includes('best market')
  ) {
    return { intent: 'CAPITAL_FLOW_MARKETS' };
  }

  // CAPITAL_FLOW_SECTORS - Layer 3 (Sector breakdown)
  if (
    lower.includes('sektör') ||
    lower.includes('sector') ||
    lower.includes('defi') ||
    lower.includes('layer2') ||
    lower.includes('l2') ||
    lower.includes('meme coin') ||
    lower.includes('ai token') ||
    lower.includes('gaming') ||
    lower.includes('tech stock') ||
    lower.includes('teknoloji hisse') ||
    lower.includes('finans sektör') ||
    lower.includes('finance sector')
  ) {
    // Detect market from context
    let market: string | undefined;
    if (lower.includes('crypto') || lower.includes('kripto') || lower.includes('defi') || lower.includes('layer2') || lower.includes('meme')) {
      market = 'crypto';
    } else if (lower.includes('stock') || lower.includes('hisse') || lower.includes('tech') || lower.includes('finance')) {
      market = 'stocks';
    } else if (lower.includes('metal') || lower.includes('gold') || lower.includes('altın') || lower.includes('silver') || lower.includes('gümüş')) {
      market = 'metals';
    }
    return { intent: 'CAPITAL_FLOW_SECTORS', market };
  }

  // CAPITAL_FLOW_RECOMMENDATION - AI recommendation based on flow
  // Also handles "alınır mı?", "satmalı mıyım?", "should I buy?" style questions
  // Also handles "analyze the best X asset" patterns
  if (
    lower.includes('ne yapmalı') ||
    lower.includes('what should i') ||
    lower.includes('nereye yatırım') ||
    lower.includes('where to invest') ||
    lower.includes('best opportunity') ||
    lower.includes('en iyi fırsat') ||
    lower.includes('trade yapmalı') ||
    lower.includes('should i trade') ||
    lower.includes('öner') ||
    lower.includes('recommend') ||
    lower.includes('tavsiye') ||
    (lower.includes('best') && lower.includes('asset')) ||
    (lower.includes('best') && (lower.includes('crypto') || lower.includes('stock') || lower.includes('coin'))) ||
    (lower.includes('analyze') && lower.includes('best')) ||
    (lower.includes('en iyi') && (lower.includes('kripto') || lower.includes('hisse') || lower.includes('coin'))) ||
    (lower.includes('şimdi') && (lower.includes('ne') || lower.includes('what'))) ||
    // Buy/sell question patterns (Turkish)
    lower.includes('alınır mı') ||
    lower.includes('satmalı mı') ||
    lower.includes('satılmalı mı') ||
    lower.includes('almalı mı') ||
    lower.includes('gireyim mi') ||
    lower.includes('girilir mi') ||
    lower.includes('yatırım yap') ||
    lower.includes('al mı') ||
    lower.includes('sat mı') ||
    // Buy/sell question patterns (English)
    lower.includes('should i buy') ||
    lower.includes('should i sell') ||
    lower.includes('is it good to buy') ||
    lower.includes('worth buying') ||
    lower.includes('worth investing') ||
    lower.includes('good investment') ||
    lower.includes('iyi yatırım')
  ) {
    // Try to detect asset from the question
    let assetHint: string | undefined;

    // Check for metals (Turkish and English)
    if (lower.includes('altın') || lower.includes('gold') || lower.includes('gld') || lower.includes('xau')) {
      assetHint = 'GOLD';
    } else if (lower.includes('gümüş') || lower.includes('silver') || lower.includes('slv') || lower.includes('xag')) {
      assetHint = 'SILVER';
    }
    // Check for crypto aliases
    else if (lower.includes('bitcoin') || lower.match(/\bbtc\b/)) {
      assetHint = 'BTC';
    } else if (lower.includes('ethereum') || lower.match(/\beth\b/)) {
      assetHint = 'ETH';
    }
    // Check for stocks
    else if (lower.includes('hisse') || lower.includes('stock') || lower.includes('spy') || lower.includes('qqq')) {
      assetHint = 'STOCKS';
    }
    // Check for bonds
    else if (lower.includes('tahvil') || lower.includes('bond') || lower.includes('tlt')) {
      assetHint = 'BONDS';
    }

    return { intent: 'CAPITAL_FLOW_RECOMMENDATION', symbol: assetHint };
  }

  // ===== OTHER INTENTS =====

  // Platform info intent - questions about the platform itself
  if (
    lower.includes('özetle') ||
    lower.includes('summarize') ||
    lower.includes('tanıt') ||
    lower.includes('describe') ||
    lower.includes('platform nedir') ||
    lower.includes('platform nasıl') ||
    lower.includes('traderpath nedir') ||
    lower.includes('what is traderpath') ||
    lower.includes('how does traderpath') ||
    lower.includes('özellikleri') ||
    lower.includes('features') ||
    lower.includes('sistem nedir') ||
    lower.includes('sistem nasıl') ||
    lower.includes('analiz sistemi') ||
    lower.includes('analysis system') ||
    (lower.includes('anlat') && (lower.includes('platform') || lower.includes('sistem'))) ||
    (lower.includes('explain') && (lower.includes('platform') || lower.includes('system'))) ||
    (lower.includes('hakkında') && (lower.includes('platform') || lower.includes('traderpath'))) ||
    (lower.includes('about') && (lower.includes('platform') || lower.includes('traderpath')))
  ) {
    return { intent: 'PLATFORM_INFO' };
  }

  // Conversational intent - greetings, thanks, general chat
  if (
    lower === 'merhaba' ||
    lower === 'selam' ||
    lower === 'hello' ||
    lower === 'hi' ||
    lower === 'hey' ||
    lower.includes('teşekkür') ||
    lower.includes('thank') ||
    lower.includes('sağol') ||
    lower.includes('eyvallah') ||
    lower === 'ok' ||
    lower === 'tamam' ||
    lower === 'anladım' ||
    lower === 'okay' ||
    lower.includes('günaydın') ||
    lower.includes('good morning') ||
    lower.includes('iyi akşamlar') ||
    lower.includes('good evening') ||
    lower.includes('sesli yanıt') ||
    lower.includes('voice response') ||
    lower.includes('sesli konuş') ||
    lower.includes('speak to me')
  ) {
    return { intent: 'CONVERSATIONAL' };
  }

  // TOP_COINS_SCAN intent - start paid scan (300 credits) - CHECK FIRST (paid feature priority)
  if (
    lower.includes('taramayı başlat') ||
    lower.includes('tarama başlat') ||
    lower.includes('scan now') ||
    lower.includes('start scan') ||
    lower.includes('30 coin tara') ||
    lower.includes('top 30 tara') ||
    lower.includes('scan top 30') ||
    lower.includes('scan 30') ||
    lower.includes('taramaya başla') ||
    lower.includes('highest probability') ||
    lower.includes('en yüksek olasılık') ||
    lower.includes('en yüksek ihtimal') ||
    (lower.includes('give me') && lower.includes('top') && lower.includes('coin')) ||
    (lower.includes('ver bana') && lower.includes('coin')) ||
    (lower.includes('söyle') && lower.includes('coin'))
  ) {
    return { intent: 'TOP_COINS_SCAN' };
  }

  // TOP_COINS_BY_SCORE intent - show cached top coins (free)
  if (
    lower.includes('en yüksek skor') ||
    lower.includes('en yüksek puan') ||
    lower.includes('highest score') ||
    lower.includes('top score') ||
    lower.includes('güvenilir coin') ||
    lower.includes('reliable coin') ||
    lower.includes('en iyi coin') ||
    lower.includes('best coin') ||
    lower.includes('hangi coin') ||
    lower.includes('which coin') ||
    lower.includes('önerebilir') ||
    lower.includes('recommend') ||
    lower.includes('trade yapayım') ||
    lower.includes('işlem yapayım') ||
    lower.includes('ne almalı') ||
    lower.includes('what should i buy') ||
    lower.includes('en güvenilir') ||
    lower.includes('most reliable') ||
    (lower.includes('top') && lower.includes('coin') && !lower.includes('analiz')) ||
    (lower.includes('ilk') && (lower.includes('coin') || lower.includes('kripto'))) ||
    (lower.includes('listele') && (lower.includes('en iyi') || lower.includes('güvenilir')))
  ) {
    // Extract count if specified
    const countMatch = lower.match(/(\d+)/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 5;
    return { intent: 'TOP_COINS_BY_SCORE', symbol: String(Math.min(20, Math.max(1, count))) };
  }

  // Help intent - expanded patterns
  if (
    lower === 'help' ||
    lower === '?' ||
    lower.includes('yardım') ||
    lower === 'nasıl kullanılır' ||
    lower.includes('ne yapabilirsin') ||
    lower.includes('what can you do') ||
    lower.includes('komutlar') ||
    lower.includes('commands') ||
    lower.includes('neler yapabilirsin') ||
    lower.includes('how to use')
  ) {
    return { intent: 'HELP' };
  }

  // Status intent
  if (
    lower === 'status' ||
    lower === 'credits' ||
    lower === 'balance' ||
    lower.includes('my status') ||
    lower.includes('my credits') ||
    lower.includes('kredi') ||
    lower.includes('bakiye') ||
    lower.includes('durumum')
  ) {
    return { intent: 'STATUS' };
  }

  // Profitability/Performance intent (user's own performance)
  if (
    (lower.includes('karlılık') && !lower.includes('platform')) ||
    (lower.includes('karlilik') && !lower.includes('platform')) ||
    (lower.includes('performans') && (lower.includes('benim') || lower.includes('my'))) ||
    lower.includes('kazanç') ||
    lower.includes('kazanc') ||
    (lower.includes('profit') && !lower.includes('platform')) ||
    lower.includes('profitability') ||
    (lower.includes('performance') && lower.includes('my')) ||
    (lower.includes('win rate') && !lower.includes('platform')) ||
    (lower.includes('başarı') && !lower.includes('platform')) ||
    (lower.includes('basari') && !lower.includes('platform')) ||
    lower.includes('report my') ||
    lower.includes('how am i doing') ||
    lower.includes('nasıl gidiyorum') ||
    lower.includes('trade geçmişi') ||
    lower.includes('trade history')
  ) {
    return { intent: 'PROFITABILITY' };
  }

  // Platform stats intent
  if (
    lower.includes('platform') ||
    lower.includes('genel başarı') ||
    lower.includes('overall') ||
    lower.includes('toplam başarı') ||
    lower.includes('platform accuracy') ||
    lower.includes('site istatistik') ||
    lower.includes('herkes') ||
    lower.includes('everyone') ||
    lower.includes('tüm kullanıcı') ||
    lower.includes('all users')
  ) {
    return { intent: 'PLATFORM_STATS' };
  }

  // Monthly/Weekly performance intent
  // Note: 'chart' and 'grafik' removed - they should trigger CHART_VIEW instead
  if (
    lower.includes('aylık') ||
    lower.includes('haftalık') ||
    lower.includes('monthly') ||
    lower.includes('weekly') ||
    lower.includes('son 30') ||
    lower.includes('son 7') ||
    lower.includes('last 30') ||
    lower.includes('last 7') ||
    lower.includes('this month') ||
    lower.includes('bu ay') ||
    (lower.includes('trend') && lower.includes('perform'))
  ) {
    return { intent: 'MONTHLY_PERFORMANCE' };
  }

  // Recent analyses intent
  if (
    lower.includes('son analiz') ||
    lower.includes('recent analys') ||
    lower.includes('last analys') ||
    lower.includes('analizlerim') ||
    lower.includes('my analyses') ||
    lower.includes('geçmiş analiz') ||
    lower.includes('past analys') ||
    lower.includes('analiz listesi') ||
    lower.includes('analysis list')
  ) {
    return { intent: 'RECENT_ANALYSES' };
  }

  // Alert set intent
  if (
    (lower.includes('alarm') && (lower.includes('kur') || lower.includes('set') || lower.includes('ekle') || lower.includes('add') || lower.includes('oluştur') || lower.includes('create'))) ||
    (lower.includes('alert') && (lower.includes('set') || lower.includes('add') || lower.includes('create'))) ||
    lower.includes('bildir') ||
    lower.includes('notify') ||
    lower.includes('haber ver') ||
    (lower.includes('olunca') || lower.includes('ulaşınca') || lower.includes('when') || lower.includes('reaches'))
  ) {
    return { intent: 'ALERT_SET' };
  }

  // Alert list intent
  if (
    (lower.includes('alarm') && (lower.includes('listele') || lower.includes('göster') || lower.includes('neler') || lower.includes('list') || lower.includes('show'))) ||
    (lower.includes('alert') && (lower.includes('list') || lower.includes('show') || lower.includes('my'))) ||
    lower.includes('alarmlarım') ||
    lower.includes('my alerts')
  ) {
    return { intent: 'ALERT_LIST' };
  }

  // Scheduled analysis list intent
  if (
    (lower.includes('schedule') && (lower.includes('list') || lower.includes('show') || lower.includes('my'))) ||
    (lower.includes('zamanlanmış') && (lower.includes('listele') || lower.includes('göster'))) ||
    lower.includes('otomatik analiz') ||
    lower.includes('scheduled report') ||
    lower.includes('zamanlanmış raporlar') ||
    lower.includes('my schedules')
  ) {
    return { intent: 'SCHEDULE_LIST' };
  }

  // Scheduled analysis create intent
  if (
    (lower.includes('schedule') && (lower.includes('create') || lower.includes('add') || lower.includes('set'))) ||
    (lower.includes('zamanlan') && (lower.includes('ekle') || lower.includes('kur') || lower.includes('oluştur'))) ||
    lower.includes('otomatik analiz kur') ||
    lower.includes('auto analyze') ||
    lower.includes('schedule analysis')
  ) {
    // Try to extract coin from message
    let scheduleCoin: string | null = null;
    for (const [alias, symbol] of Object.entries(ASSET_ALIASES)) {
      if (lower.includes(alias)) {
        scheduleCoin = symbol;
        break;
      }
    }
    if (!scheduleCoin) {
      // Strip USDT/BUSD suffixes for better matching
      const cleanedMessage = lower
        .replace(/usdt/gi, ' ')
        .replace(/busd/gi, ' ')
        .replace(/perp/gi, ' ')
        .replace(/\/usdt/gi, ' ')
        .replace(/\/busd/gi, ' ');

      for (const coin of SUPPORTED_ASSETS) {
        const coinRegex = new RegExp(`\\b${coin}\\b`, 'i');
        if (coinRegex.test(cleanedMessage) || coinRegex.test(lower)) {
          scheduleCoin = coin;
          break;
        }
      }
    }
    return { intent: 'SCHEDULE_CREATE', symbol: scheduleCoin?.toUpperCase() };
  }

  // Scheduled analysis delete intent
  if (
    (lower.includes('schedule') && (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel'))) ||
    (lower.includes('zamanlanmış') && (lower.includes('sil') || lower.includes('iptal') || lower.includes('kaldır'))) ||
    lower.includes('otomatik analizi kaldır')
  ) {
    return { intent: 'SCHEDULE_DELETE' };
  }

  // Chart view intent - show trade plan on chart
  if (
    lower.includes('grafik') ||
    lower.includes('chart') ||
    lower.includes('candlestick') ||
    lower.includes('mum grafiği') ||
    lower.includes('mum grafik') ||
    lower.includes('tradingview') ||
    lower.includes('trading view') ||
    (lower.includes('işlem planı') && (lower.includes('göster') || lower.includes('görselleştir'))) ||
    (lower.includes('trade plan') && lower.includes('show')) ||
    lower.includes('görselleştir') ||
    lower.includes('visualize') ||
    lower.includes('show on chart') ||
    lower.includes('grafikte göster')
  ) {
    // Try to detect which analysis to show (latest by default, or specific coin)
    let chartSymbol: string | null = null;

    // Check for coin in the chart request
    for (const [alias, symbol] of Object.entries(ASSET_ALIASES)) {
      if (lower.includes(alias)) {
        chartSymbol = symbol;
        break;
      }
    }
    if (!chartSymbol) {
      // Strip USDT/BUSD suffixes for better matching
      const cleanedMessage = lower
        .replace(/usdt/gi, ' ')
        .replace(/busd/gi, ' ')
        .replace(/perp/gi, ' ')
        .replace(/\/usdt/gi, ' ')
        .replace(/\/busd/gi, ' ');

      for (const coin of SUPPORTED_ASSETS) {
        const coinRegex = new RegExp(`\\b${coin}\\b`, 'i');
        if (coinRegex.test(cleanedMessage) || coinRegex.test(lower)) {
          chartSymbol = coin;
          break;
        }
      }
    }

    return { intent: 'CHART_VIEW', symbol: chartSymbol?.toUpperCase() };
  }

  // Check for coin aliases first
  let detectedCoin: string | null = null;

  for (const [alias, symbol] of Object.entries(ASSET_ALIASES)) {
    if (lower.includes(alias)) {
      detectedCoin = symbol;
      break;
    }
  }

  // Check for coin symbols (handle USDT/BUSD/PERP suffixes)
  if (!detectedCoin) {
    // First, try to strip common trading pair suffixes
    const cleanedMessage = lower
      .replace(/usdt/gi, ' ')
      .replace(/busd/gi, ' ')
      .replace(/perp/gi, ' ')
      .replace(/\/usdt/gi, ' ')
      .replace(/\/busd/gi, ' ');

    for (const coin of SUPPORTED_ASSETS) {
      // Match coin symbol with word boundaries in cleaned message
      const coinRegex = new RegExp(`\\b${coin}\\b`, 'i');
      if (coinRegex.test(cleanedMessage) || coinRegex.test(lower)) {
        detectedCoin = coin;
        break;
      }
    }
  }

  // Analysis intent - coin detected
  if (detectedCoin) {
    // Check if user explicitly requested analysis (e.g., "analiz yap", "analyze", "analiz et")
    const hasAnalysisAction = /\b(analiz|analyze|analysis|check|kontrol|incele)\b/i.test(lower) ||
      lower.includes('analiz yap') || lower.includes('analiz et') || lower.includes('nasıl') ||
      lower.includes('durumu') || lower.includes('how is');

    // Detect interval - check if user explicitly specified
    let interval = ''; // empty means not specified
    let intervalExplicit = false;

    if (lower.includes('15m') || lower.includes('15 min') || lower.includes('15 dakika')) {
      interval = '15m';
      intervalExplicit = true;
    } else if (lower.includes('1h') || lower.includes('1 hour') || lower.includes('saatlik') || lower.includes('1 saat')) {
      interval = '1h';
      intervalExplicit = true;
    } else if (lower.includes('4h') || lower.includes('4 hour') || lower.includes('4 saat')) {
      interval = '4h';
      intervalExplicit = true;
    } else if (lower.includes('1d') || lower.includes('daily') || lower.includes('günlük') || lower.includes('gün')) {
      interval = '1d';
      intervalExplicit = true;
    } else if (lower.includes('1w') || lower.includes('weekly') || lower.includes('haftalık')) {
      interval = '1W';
      intervalExplicit = true;
    } else if (lower.includes('scalp') || lower.includes('skalp') || lower.includes('skalpıng') || lower.includes('hızlı')) {
      interval = '15m';
      intervalExplicit = true;
    } else if (lower.includes('swing') || lower.includes('uzun vadeli') || lower.includes('long term') || lower.includes('yatırım')) {
      interval = '1d';
      intervalExplicit = true;
    } else if (lower.includes('day trade') || lower.includes('daytrade') || lower.includes('intraday') || lower.includes('gün içi') || lower.includes('günlük işlem')) {
      interval = '4h';
      intervalExplicit = true;
    } else if (lower.includes('kısa vadeli') || lower.includes('short term') || lower.includes('bugün')) {
      interval = '1h';
      intervalExplicit = true;
    }

    // If user explicitly asked for analysis (e.g., "analiz yap", "analyze"), use default 4h
    const shouldRunDirectly = intervalExplicit || hasAnalysisAction;

    console.log(`[Concierge] Detected: symbol=${detectedCoin}, interval=${interval || 'NOT_SPECIFIED'}, explicit=${intervalExplicit}, analysisAction=${hasAnalysisAction}, direct=${shouldRunDirectly}, message="${lower}"`);

    return {
      intent: shouldRunDirectly ? 'ANALYSIS' : 'ANALYSIS_NEEDS_CLARIFICATION',
      symbol: detectedCoin.toUpperCase(),
      interval: interval || '4h', // fallback for later use
      intervalExplicit,
    };
  }

  // Expert question intent - detect expert type
  const technicalKeywords = ['rsi', 'macd', 'bollinger', 'ema', 'sma', 'indicator', 'indikatör', 'teknik'];
  const riskKeywords = ['risk', 'leverage', 'margin', 'stop loss', 'position size', 'kaldıraç'];
  const whaleKeywords = ['whale', 'balina', 'big player', 'institution', 'order book', 'emir defteri'];
  const securityKeywords = ['security', 'güvenlik', 'hack', 'scam', 'rug pull', 'audit'];

  let expertType = 'aria'; // default: technical expert

  if (technicalKeywords.some(k => lower.includes(k))) {
    expertType = 'aria';
  } else if (riskKeywords.some(k => lower.includes(k))) {
    expertType = 'nexus';
  } else if (whaleKeywords.some(k => lower.includes(k))) {
    expertType = 'oracle';
  } else if (securityKeywords.some(k => lower.includes(k))) {
    expertType = 'sentinel';
  }

  // Check if it's a question
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'explain', 'ne', 'nasıl', 'neden', 'açıkla', 'anlat', 'nedir'];
  if (questionWords.some(w => lower.includes(w)) || lower.endsWith('?')) {
    return { intent: 'EXPERT_ASK', expertType };
  }

  // Unknown intent
  return { intent: 'UNKNOWN' };
}

// Gemini-based intelligent intent detection (fallback for complex queries)
async function detectIntentWithGemini(message: string): Promise<{
  intent: string;
  symbol?: string;
  interval?: string;
  expertType?: string;
  targetPrice?: number;
  direction?: string;
  market?: string;
  language?: string;
}> {
  try {
    const prompt = INTENT_DETECTION_PROMPT.replace('{MESSAGE}', message);

    const response = await callGeminiWithRetry(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent classification
          maxOutputTokens: 500,
        },
      },
      2, // max retries
      'concierge_intent_detection'
    );

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[Concierge] Gemini response not JSON:', responseText);
      return { intent: 'UNKNOWN' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[Concierge] Gemini parsed intent:', parsed);

    return {
      intent: parsed.intent || 'UNKNOWN',
      symbol: parsed.entities?.symbol?.toUpperCase(),
      interval: parsed.entities?.interval || '4h',
      expertType: parsed.entities?.expertType,
      targetPrice: parsed.entities?.targetPrice,
      direction: parsed.entities?.direction,
      market: parsed.entities?.market,
      language: parsed.language,
    };
  } catch (error) {
    console.error('[Concierge] Gemini intent detection failed:', error);
    return { intent: 'UNKNOWN' };
  }
}

// Get trade type from interval
function getTradeType(interval: string): 'scalping' | 'dayTrade' | 'swing' {
  switch (interval) {
    case '5m':
    case '15m':
      return 'scalping';
    case '1d':
    case '1W':
      return 'swing';
    default:
      return 'dayTrade';
  }
}

class ConciergeService {
  /**
   * Smart language detection from message content
   * Returns the detected language code
   */
  private detectLanguageFromMessage(message: string): string {
    const lower = message.toLowerCase();

    // Turkish indicators (comprehensive list)
    const turkishWords = [
      'merhaba', 'selam', 'nasıl', 'nedir', 'için', 'göster', 'analiz',
      'işlem', 'grafik', 'fiyat', 'yardım', 'teşekkür', 'sağol', 'tamam',
      'evet', 'hayır', 'lütfen', 'istiyorum', 'yapabilir', 'misin', 'musun',
      'neler', 'hangi', 'kaç', 'kredi', 'bakiye', 'durum', 'scalping',
      'hızlı', 'uzun', 'vadeli', 'kısa', 'alarm', 'bildir', 'söyle',
      'anlat', 'açıkla', 'özetle', 'platform', 'sistem', 'ne', 'var',
      'yok', 'olur', 'olmaz', 'güzel', 'iyi', 'kötü', 'risk', 'plan',
      'hedef', 'giriş', 'çıkış', 'sat', 'al', 'bekle', 'kaçın',
      'güncel', 'şu', 'bu', 'o', 've', 'veya', 'ile', 'gibi', 'daha',
      'çok', 'az', 'fazla', 'yüksek', 'düşük', 'değer', 'piyasa',
      'geçmiş', 'gelecek', 'bugün', 'yarın', 'dün', 'hafta', 'ay',
      'saat', 'dakika', 'saniye', 'haber', 'bilgi', 'sonuç', 'rapor'
    ];

    // Turkish character indicators
    const turkishChars = ['ş', 'ğ', 'ü', 'ö', 'ç', 'ı', 'İ'];

    // Check for Turkish characters first (strong indicator)
    if (turkishChars.some(char => lower.includes(char))) {
      return 'tr';
    }

    // Count Turkish word matches
    const turkishMatches = turkishWords.filter(word => lower.includes(word)).length;
    if (turkishMatches >= 1) {
      return 'tr';
    }

    // Default to English
    return 'en';
  }

  async processMessage(request: ConciergeRequest): Promise<ConciergeResponse> {
    const { message, userId, language = 'en' } = request;

    try {
      // Get credit balance (returns object with balance property)
      const creditBalanceObj = await creditService.getBalance(userId);
      const creditBalance = creditBalanceObj.balance;

      // All responses are in English — platform is English-first
      // eslint-disable-next-line prefer-const
      let detectedLanguage = 'en';

      console.log(`[Concierge] Message: "${message.substring(0, 50)}...", Detected language: ${detectedLanguage}`);

      // Initialize intent detection variables
      let intent = 'UNKNOWN';
      let symbol: string | undefined;
      let interval: string | undefined;
      let expertType: string | undefined;
      let targetPrice: number | undefined;
      let direction: string | undefined;
      let market: string | undefined;

      // PRIMARY: Use Gemini AI for intelligent intent detection
      // Cost: ~$0.0002 per request (~$5/month for 1000 daily requests)
      // Benefits: Better understanding of natural language, handles complex queries
      console.log('[Concierge] Using Gemini AI for intent detection...');
      const startTime = Date.now();

      try {
        const geminiResult = await detectIntentWithGemini(message);
        const duration = Date.now() - startTime;
        console.log(`[Concierge] Gemini detected: intent=${geminiResult.intent}, symbol=${geminiResult.symbol}, interval=${geminiResult.interval}, language=${geminiResult.language} (${duration}ms)`);

        if (geminiResult.intent !== 'UNKNOWN') {
          intent = geminiResult.intent;
          symbol = geminiResult.symbol;
          interval = geminiResult.interval;
          expertType = geminiResult.expertType;
          targetPrice = geminiResult.targetPrice;
          direction = geminiResult.direction;
          market = geminiResult.market;
          // Language detection from Gemini intentionally skipped — all responses are English
        }
      } catch (error) {
        console.error('[Concierge] Gemini intent detection failed:', error);
      }

      // FALLBACK: Use rule-based detection if Gemini fails or returns UNKNOWN
      if (intent === 'UNKNOWN') {
        console.log('[Concierge] Gemini returned UNKNOWN, trying rule-based fallback...');
        const ruleResult = detectIntent(message);
        intent = ruleResult.intent;
        symbol = ruleResult.symbol || symbol;
        interval = ruleResult.interval || interval;
        expertType = ruleResult.expertType || expertType;
        market = ruleResult.market || market;
      }

      // Handle different intents - ALL handlers use detectedLanguage
      switch (intent) {
        // ===== CAPITAL FLOW INTENTS =====
        case 'CAPITAL_FLOW_SUMMARY':
          return await this.handleCapitalFlowSummary(detectedLanguage, creditBalance);

        case 'CAPITAL_FLOW_LIQUIDITY':
          return await this.handleCapitalFlowLiquidity(detectedLanguage, creditBalance);

        case 'CAPITAL_FLOW_MARKETS':
          return await this.handleCapitalFlowMarkets(detectedLanguage, creditBalance);

        case 'CAPITAL_FLOW_SECTORS':
          return await this.handleCapitalFlowSectors(market || 'crypto', detectedLanguage, creditBalance);

        case 'CAPITAL_FLOW_RECOMMENDATION':
          return await this.handleCapitalFlowRecommendation(detectedLanguage, creditBalance, symbol);

        // ===== PLATFORM INTENTS =====
        case 'PLATFORM_INFO':
          return this.handlePlatformInfo(detectedLanguage, creditBalance);

        case 'CONVERSATIONAL':
          return await this.handleConversational(message, detectedLanguage, creditBalance, userId);

        case 'HELP':
          return this.handleHelp(detectedLanguage, creditBalance);

        case 'STATUS':
          return await this.handleStatus(userId, creditBalance, detectedLanguage);

        case 'PROFITABILITY':
          return await this.handleProfitability(userId, creditBalance, detectedLanguage);

        case 'PLATFORM_STATS':
          return await this.handlePlatformStats(creditBalance, detectedLanguage);

        case 'MONTHLY_PERFORMANCE':
          return await this.handleMonthlyPerformance(userId, creditBalance, detectedLanguage);

        case 'RECENT_ANALYSES':
          return await this.handleRecentAnalyses(userId, creditBalance, detectedLanguage);

        case 'ALERT_SET':
          return await this.handleAlertSet(userId, message, creditBalance, detectedLanguage);

        case 'ALERT_LIST':
          return await this.handleAlertList(userId, creditBalance, detectedLanguage);

        case 'CHART_VIEW':
          return await this.handleChartView(userId, symbol, creditBalance, detectedLanguage);

        case 'SCHEDULE_LIST':
          return await this.handleScheduleList(userId, creditBalance, detectedLanguage);

        case 'SCHEDULE_CREATE':
          return await this.handleScheduleCreate(userId, symbol, message, creditBalance, detectedLanguage);

        case 'SCHEDULE_DELETE':
          return await this.handleScheduleDelete(userId, message, creditBalance, detectedLanguage);

        case 'TOP_COINS_BY_SCORE':
          return await this.handleTopCoinsByScore(symbol ? parseInt(symbol, 10) : 5, creditBalance, detectedLanguage);

        case 'TOP_COINS_SCAN':
          return await this.handleTopCoinsScan(userId, creditBalance, detectedLanguage);

        case 'SCAN_CONFIRM':
          // User confirmed the scan - trigger it
          return await this.handleScanConfirm(userId, creditBalance, detectedLanguage);

        case 'SCAN_DECLINE':
          // User declined the scan
          return {
            success: true,
            intent: 'SCAN_DECLINE',
            message: detectedLanguage === 'tr'
              ? '👍 Tamam, taramayı iptal ettim. Başka bir konuda yardımcı olabilir miyim?'
              : '👍 Okay, scan cancelled. Is there anything else I can help you with?',
            creditsSpent: 0,
            creditsRemaining: creditBalance,
            detectedLanguage,
          };

        case 'ANALYSIS':
          return await this.handleAnalysis(userId, symbol!, interval || '4h', detectedLanguage, creditBalance);

        case 'MLIS_ANALYSIS':
          // MLIS is now integrated as Step 8 of the classic analysis flow
          return await this.handleAnalysis(userId, symbol!, interval || '4h', detectedLanguage, creditBalance);

        case 'ANALYSIS_NEEDS_CLARIFICATION':
          return this.handleAnalysisClarification(symbol!, detectedLanguage, creditBalance);

        case 'EXPERT_ASK':
          return await this.handleExpertQuestion(userId, message, detectedLanguage, creditBalance, expertType);

        default:
          // Route unknown intents to AI Experts for intelligent response
          return await this.handleUnknown(userId, message, detectedLanguage, creditBalance);
      }
    } catch (error) {
      console.error('Concierge service error:', error);
      const creditBalanceObj = await creditService.getBalance(userId).catch(() => ({ balance: 0 }));
      const creditBalance = creditBalanceObj.balance;

      return {
        success: false,
        intent: 'ERROR',
        message: language === 'tr'
          ? 'Bir hata oluştu. Lütfen tekrar deneyin.'
          : 'An error occurred. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===== MULTI-LANGUAGE TRANSLATION HELPER =====

  /**
   * Translates message to target language if not English
   * Uses Google Translate API (primary) with Gemini fallback
   * Supports 18 languages: en, tr, es, de, fr, pt, ru, zh, ja, ko, ar, it, nl, pl, vi, th, id, hi
   */
  private async translateIfNeeded(message: string, targetLanguage: string): Promise<string> {
    // No translation needed for English
    if (targetLanguage === 'en' || !targetLanguage) {
      return message;
    }

    // Check if language is supported
    if (!SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]) {
      console.warn(`[Concierge] Unsupported language: ${targetLanguage}, falling back to English`);
      return message;
    }

    try {
      const translated = await translationService.translate(message, targetLanguage);
      return translated;
    } catch (error) {
      console.error(`[Concierge] Translation error for language ${targetLanguage}:`, error);
      return message; // Return original English message on error
    }
  }

  // ===== CAPITAL FLOW HANDLERS =====

  private async handleCapitalFlowSummary(language: string, creditBalance: number): Promise<ConciergeResponse> {
    try {
      const summary = await capitalFlowService.getCapitalFlowSummary();

      // Format global liquidity (English base)
      const liquidity = summary.globalLiquidity;
      const liquidityText = `📊 LAYER 1: GLOBAL LIQUIDITY

Fed Balance Sheet: $${(liquidity.fedBalanceSheet.value / 1e12).toFixed(2)}T (${liquidity.fedBalanceSheet.change30d > 0 ? '+' : ''}${liquidity.fedBalanceSheet.change30d.toFixed(1)}% 30D)
→ Status: ${liquidity.fedBalanceSheet.trend === 'expanding' ? 'Expanding ✅' : liquidity.fedBalanceSheet.trend === 'contracting' ? 'Contracting ⚠️' : 'Stable'}

M2 Money Supply: $${(liquidity.m2MoneySupply.value / 1e12).toFixed(2)}T (YoY: ${liquidity.m2MoneySupply.yoyGrowth > 0 ? '+' : ''}${liquidity.m2MoneySupply.yoyGrowth.toFixed(1)}%)

DXY (Dollar): ${liquidity.dxy.value.toFixed(2)} (${liquidity.dxy.trend === 'weakening' ? 'Weakening → Risk-On ✅' : liquidity.dxy.trend === 'strengthening' ? 'Strengthening → Risk-Off ⚠️' : 'Stable'})

VIX (Fear): ${liquidity.vix.value.toFixed(1)} (${liquidity.vix.level === 'complacent' ? 'Low → Calm Market' : liquidity.vix.level === 'fear' ? 'Elevated → Caution' : liquidity.vix.level === 'extreme_fear' ? 'High → Panic ⚠️' : 'Neutral'})

Yield Curve (10Y-2Y): ${liquidity.yieldCurve.spread10y2y.toFixed(2)}bp ${liquidity.yieldCurve.inverted ? '⚠️ INVERTED (Recession signal)' : '✅ Normal'}`;

      // Format market flows (English base)
      const marketsText = summary.markets.map(m => {
        const phaseEmoji = m.phase === 'early' ? '🟢' : m.phase === 'mid' ? '🟡' : m.phase === 'late' ? '🟠' : '🔴';
        const flowSign = m.flow7d > 0 ? '+' : '';
        return `${m.market.toUpperCase()}: ${flowSign}${m.flow7d.toFixed(1)}% 7D | ${phaseEmoji} ${m.phase.toUpperCase()} phase (${m.daysInPhase}D)`;
      }).join('\n');

      // Format recommendation (English base)
      const rec = summary.recommendation;
      const recText = `🎯 RECOMMENDATION: ${rec.primaryMarket.toUpperCase()} market (${rec.confidence}% confidence)
Action: ${rec.action === 'analyze' ? '✅ ANALYZE' : rec.action === 'wait' ? '⏳ WAIT' : '⛔ AVOID'}
${rec.reason}`;

      const biasText = `\n📈 Liquidity Bias: ${summary.liquidityBias === 'risk_on' ? 'RISK-ON ✅' : summary.liquidityBias === 'risk_off' ? 'RISK-OFF ⚠️' : 'NEUTRAL'}`;

      // Build English message
      const messageEn = `═══════════════════════════════════
CAPITAL FLOW RADAR 🌐
"Where money flows, potential exists"
═══════════════════════════════════

${liquidityText}
${biasText}

═══════════════════════════════════
📊 LAYER 2: MARKET FLOW
═══════════════════════════════════
${marketsText}

═══════════════════════════════════
${recText}
═══════════════════════════════════

💡 For more details:
• "Global liquidity status" - Layer 1 detail
• "Which market is leading?" - Layer 2 detail
• "${rec.primaryMarket} sectors" - Layer 3 detail`;

      // Translate to target language if needed (supports 18 languages)
      const message = await this.translateIfNeeded(messageEn, language);

      return {
        success: true,
        intent: 'CAPITAL_FLOW_SUMMARY',
        message,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Capital flow summary error:', error);
      const errorMessage = await this.translateIfNeeded(
        'Could not fetch capital flow data. Please try again.',
        language
      );
      return {
        success: false,
        intent: 'CAPITAL_FLOW_SUMMARY',
        message: errorMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleCapitalFlowLiquidity(language: string, creditBalance: number): Promise<ConciergeResponse> {
    try {
      const liquidity = await capitalFlowService.getGlobalLiquidity();

      // Build English message
      const messageEn = `═══════════════════════════════════
📊 LAYER 1: GLOBAL LIQUIDITY
═══════════════════════════════════

🏦 FED BALANCE SHEET
Value: $${(liquidity.fedBalanceSheet.value / 1e12).toFixed(2)} Trillion
30D Change: ${liquidity.fedBalanceSheet.change30d > 0 ? '+' : ''}${liquidity.fedBalanceSheet.change30d.toFixed(2)}%
Trend: ${liquidity.fedBalanceSheet.trend === 'expanding' ? '📈 EXPANDING (Liquidity increasing)' : liquidity.fedBalanceSheet.trend === 'contracting' ? '📉 CONTRACTING (Liquidity decreasing)' : '➡️ STABLE'}

💵 M2 MONEY SUPPLY
Value: $${(liquidity.m2MoneySupply.value / 1e12).toFixed(2)} Trillion
30D Change: ${liquidity.m2MoneySupply.change30d > 0 ? '+' : ''}${liquidity.m2MoneySupply.change30d.toFixed(2)}%
YoY Growth: ${liquidity.m2MoneySupply.yoyGrowth > 0 ? '+' : ''}${liquidity.m2MoneySupply.yoyGrowth.toFixed(2)}%

💱 DXY (DOLLAR INDEX)
Value: ${liquidity.dxy.value.toFixed(2)}
7D Change: ${liquidity.dxy.change7d > 0 ? '+' : ''}${liquidity.dxy.change7d.toFixed(2)}%
Trend: ${liquidity.dxy.trend === 'weakening' ? '📉 WEAKENING → Bullish for risk assets ✅' : liquidity.dxy.trend === 'strengthening' ? '📈 STRENGTHENING → Bearish for risk assets ⚠️' : '➡️ STABLE'}

😱 VIX (FEAR INDEX)
Value: ${liquidity.vix.value.toFixed(2)}
Level: ${liquidity.vix.level === 'complacent' ? '🟢 LOW (Calm market, complacency)' : liquidity.vix.level === 'fear' ? '🟡 ELEVATED (Rising concern)' : liquidity.vix.level === 'extreme_fear' ? '🔴 HIGH (Panic mode)' : '⚪ NEUTRAL'}

📈 YIELD CURVE (10Y-2Y)
Spread: ${liquidity.yieldCurve.spread10y2y.toFixed(2)} basis points
Status: ${liquidity.yieldCurve.inverted ? '⚠️ INVERTED - Recession signal!' : '✅ NORMAL CURVE'}
Interpretation: ${liquidity.yieldCurve.interpretation}

═══════════════════════════════════
📌 CONCLUSION
═══════════════════════════════════
${liquidity.fedBalanceSheet.trend === 'expanding' && liquidity.dxy.trend === 'weakening' ? '✅ RISK-ON environment: Favorable for risk assets (crypto, stocks)' : liquidity.fedBalanceSheet.trend === 'contracting' || liquidity.dxy.trend === 'strengthening' ? '⚠️ RISK-OFF environment: Safe havens (bonds, gold) may be preferred' : '➡️ MIXED signals: Cautious approach recommended'}`;

      // Translate to target language if needed (supports 18 languages)
      const message = await this.translateIfNeeded(messageEn, language);

      return {
        success: true,
        intent: 'CAPITAL_FLOW_LIQUIDITY',
        message,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Capital flow liquidity error:', error);
      const errorMessage = await this.translateIfNeeded(
        'Could not fetch liquidity data. Please try again.',
        language
      );
      return {
        success: false,
        intent: 'CAPITAL_FLOW_LIQUIDITY',
        message: errorMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleCapitalFlowMarkets(language: string, creditBalance: number): Promise<ConciergeResponse> {
    try {
      const markets = await capitalFlowService.getAllMarketFlows();

      // Build English market cards
      const marketCards = markets.map(m => {
        const phaseEmoji = m.phase === 'early' ? '🟢' : m.phase === 'mid' ? '🟡' : m.phase === 'late' ? '🟠' : '🔴';
        const rotationEmoji = m.rotationSignal === 'entering' ? '📥' : m.rotationSignal === 'exiting' ? '📤' : '➡️';
        const flow7dSign = m.flow7d > 0 ? '+' : '';
        const flow30dSign = m.flow30d > 0 ? '+' : '';

        return `═══════════════════════════════════
${m.market.toUpperCase()} MARKET
═══════════════════════════════════
📊 Flow (7D): ${flow7dSign}${m.flow7d.toFixed(2)}%
📊 Flow (30D): ${flow30dSign}${m.flow30d.toFixed(2)}%
🚀 Velocity: ${m.flowVelocity > 0 ? 'Accelerating ↑' : m.flowVelocity < 0 ? 'Decelerating ↓' : 'Stable'}

${phaseEmoji} Phase: ${m.phase.toUpperCase()} (${m.daysInPhase} days)
${rotationEmoji} Rotation: ${m.rotationSignal === 'entering' ? 'CAPITAL ENTERING' : m.rotationSignal === 'exiting' ? 'CAPITAL EXITING' : 'STABLE'}

${m.phase === 'early' ? '✅ OPTIMAL ENTRY TIMING' : m.phase === 'mid' ? '⚠️ CAN ENTER (carefully)' : m.phase === 'late' ? '⛔ NEW ENTRY NOT RECOMMENDED' : '🚫 NEVER ENTER'}`;
      });

      // Find best market
      const bestMarket = markets.reduce((best, m) =>
        m.flow7d > best.flow7d && (m.phase === 'early' || m.phase === 'mid') ? m : best
      , markets[0]);

      // Build English message
      const messageEn = `═══════════════════════════════════
📊 LAYER 2: MARKET FLOW
"Where is money going?"
═══════════════════════════════════

${marketCards.join('\n\n')}

═══════════════════════════════════
🎯 BEST OPPORTUNITY: ${bestMarket.market.toUpperCase()}
${bestMarket.flow7d > 0 ? `+${bestMarket.flow7d.toFixed(2)}% weekly inflow` : 'Relatively strong'} | ${bestMarket.phase.toUpperCase()} phase
═══════════════════════════════════`;

      // Translate to target language if needed (supports 18 languages)
      const message = await this.translateIfNeeded(messageEn, language);

      return {
        success: true,
        intent: 'CAPITAL_FLOW_MARKETS',
        message,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Capital flow markets error:', error);
      const errorMessage = await this.translateIfNeeded(
        'Could not fetch market flow data. Please try again.',
        language
      );
      return {
        success: false,
        intent: 'CAPITAL_FLOW_MARKETS',
        message: errorMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleCapitalFlowSectors(market: string, language: string, creditBalance: number): Promise<ConciergeResponse> {
    try {
      const marketFlow = await capitalFlowService.getMarketFlow(market as 'crypto' | 'stocks' | 'bonds' | 'metals');

      if (!marketFlow.sectors || marketFlow.sectors.length === 0) {
        const noDataMessage = await this.translateIfNeeded(
          `No sector data available for ${market.toUpperCase()} market.`,
          language
        );
        return {
          success: true,
          intent: 'CAPITAL_FLOW_SECTORS',
          message: noDataMessage,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          detectedLanguage: language,
        };
      }

      // Build English sector cards
      const sectorCards = marketFlow.sectors
        .sort((a, b) => b.flow7d - a.flow7d)
        .map((s, i) => {
          const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
          const flowSign = s.flow7d > 0 ? '+' : '';
          return `${rankEmoji} ${s.name}: ${flowSign}${s.flow7d.toFixed(2)}% (7D) | 30D: ${s.flow30d > 0 ? '+' : ''}${s.flow30d.toFixed(2)}% | Dom: ${s.dominance.toFixed(1)}%`;
        });

      const topSector = marketFlow.sectors.sort((a, b) => b.flow7d - a.flow7d)[0];

      // Build English message
      const messageEn = `═══════════════════════════════════
📊 LAYER 3: ${market.toUpperCase()} SECTOR FLOW
═══════════════════════════════════

${sectorCards.join('\n')}

═══════════════════════════════════
🎯 STRONGEST SECTOR: ${topSector.name}
${topSector.flow7d > 0 ? `+${topSector.flow7d.toFixed(2)}% weekly inflow` : 'Relatively strong'}
═══════════════════════════════════

💡 Next step: Analyze assets in this sector
Example: "Analyze ${topSector.topAssets?.[0] || 'BTC'}"`;

      // Translate to target language if needed (supports 18 languages)
      const message = await this.translateIfNeeded(messageEn, language);

      return {
        success: true,
        intent: 'CAPITAL_FLOW_SECTORS',
        message,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Capital flow sectors error:', error);
      const errorMessage = await this.translateIfNeeded(
        'Could not fetch sector data. Please try again.',
        language
      );
      return {
        success: false,
        intent: 'CAPITAL_FLOW_SECTORS',
        message: errorMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleCapitalFlowRecommendation(language: string, creditBalance: number, assetHint?: string): Promise<ConciergeResponse> {
    try {
      // Get full summary to access market flows
      const summary = await capitalFlowService.getCapitalFlowSummary();
      const recommendation = summary.recommendation;

      // Find markets with positive and negative flows
      const sortedMarkets = [...summary.markets].sort((a, b) => b.flow30d - a.flow30d);
      const inflowMarket = sortedMarkets[0]; // Highest positive flow
      const outflowMarket = sortedMarkets[sortedMarkets.length - 1]; // Lowest/negative flow

      // Market name translations
      const marketNamesTr: Record<string, string> = {
        crypto: 'Kripto',
        stocks: 'Hisseler',
        bonds: 'Bonolar',
        metals: 'Metaller'
      };

      // If asset hint is provided, generate a dynamic response based on actual data
      if (assetHint) {
        // Determine asset market and names
        let assetMarket = 'crypto';
        let assetNameTr = assetHint;
        let assetNameEn = assetHint;
        let analysisSymbol = assetHint;
        let assetEmojiIcon = '🪙';
        let marketNameTr = 'Kripto';
        let marketNameEn = 'Crypto';

        if (assetHint === 'GOLD' || assetHint === 'SILVER') {
          assetMarket = 'metals';
          assetNameTr = assetHint === 'GOLD' ? 'Altın' : 'Gümüş';
          assetNameEn = assetHint === 'GOLD' ? 'Gold' : 'Silver';
          analysisSymbol = assetHint === 'GOLD' ? 'GLD' : 'SLV';
          assetEmojiIcon = '🥇';
          marketNameTr = 'Metal';
          marketNameEn = 'Metals';
        } else if (assetHint === 'STOCKS' || assetHint === 'SPY' || assetHint === 'QQQ' || assetHint === 'AAPL' || assetHint === 'MSFT' || assetHint === 'GOOGL' || assetHint === 'TSLA') {
          assetMarket = 'stocks';
          assetNameTr = assetHint === 'STOCKS' ? 'Hisse Senetleri' : assetHint;
          assetNameEn = assetHint === 'STOCKS' ? 'Stocks' : assetHint;
          analysisSymbol = assetHint === 'STOCKS' ? 'SPY' : assetHint;
          assetEmojiIcon = '📈';
          marketNameTr = 'Hisse';
          marketNameEn = 'Stocks';
        } else if (assetHint === 'BONDS' || assetHint === 'TLT' || assetHint === 'IEF' || assetHint === 'BND') {
          assetMarket = 'bonds';
          assetNameTr = assetHint === 'BONDS' ? 'Tahviller' : assetHint;
          assetNameEn = assetHint === 'BONDS' ? 'Bonds' : assetHint;
          analysisSymbol = assetHint === 'BONDS' ? 'TLT' : assetHint;
          assetEmojiIcon = '📊';
          marketNameTr = 'Tahvil';
          marketNameEn = 'Bonds';
        }

        // Get actual flow data for the asset's market
        const assetMarketFlow = summary.markets.find(m => m.market === assetMarket);
        const flow30d = assetMarketFlow?.flow30d ?? 0;
        const flowVelocity = assetMarketFlow?.flowVelocity ?? 0;
        const phase = assetMarketFlow?.phase ?? 'mid';
        const rotationSignal = assetMarketFlow?.rotationSignal ?? 'stable';

        // Get inflow market data
        const inflowFlow30d = inflowMarket?.flow30d ?? 0;
        const inflowMarketNameTr = marketNamesTr[inflowMarket?.market || 'bonds'] || 'Bonolar';
        const inflowMarketNameEn = inflowMarket?.market ? inflowMarket.market.charAt(0).toUpperCase() + inflowMarket.market.slice(1) : 'Bonds';

        // Generate dynamic response based on actual data
        const organicMessage = this.generateDataDrivenAssetResponse({
          language,
          assetNameTr,
          assetNameEn,
          assetEmojiIcon,
          analysisSymbol,
          marketNameTr,
          marketNameEn,
          flow30d,
          flowVelocity,
          phase,
          rotationSignal,
          inflowMarketNameTr,
          inflowMarketNameEn,
          inflowFlow30d,
        });

        return {
          success: true,
          intent: 'CAPITAL_FLOW_RECOMMENDATION',
          message: organicMessage,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          detectedLanguage: language,
        };
      }

      // Determine next steps based on action (English base)
      let nextSteps: string;
      if (recommendation.action === 'analyze') {
        nextSteps = `1. "${recommendation.primaryMarket} sectors" - Sector analysis
2. Select an asset from strong sector
3. "Analyze BTC" or "BTC mlis pro" - Asset analysis`;
      } else if (recommendation.action === 'wait') {
        nextSteps = `Wait for now:
• Liquidity conditions uncertain
• Clear direction signal pending
• Monitor with "Where is money flowing?"`;
      } else {
        nextSteps = `Risk management advised:
• Reduce positions
• Tighten stop-losses
• Consider safe havens (gold, bonds)`;
      }

      // Build action emoji, confidence bar, and asset advice
      const actionEmoji = recommendation.action === 'analyze' ? '✅' : recommendation.action === 'wait' ? '⏳' : '⛔';
      const confidencePercent = Math.min(100, Math.max(0, recommendation.confidence));
      const filledBars = Math.round(confidencePercent / 10);
      const confidenceBar = '█'.repeat(filledBars) + '░'.repeat(10 - filledBars);

      // Generate asset-specific advice if we have suggested assets
      let assetAdvice = '';
      if (recommendation.suggestedAssets && recommendation.suggestedAssets.length > 0) {
        const assetList = recommendation.suggestedAssets
          .slice(0, 3)
          .map(a => `• ${a.symbol} (${a.name}) - ${a.reason}`)
          .join('\n');
        assetAdvice = language === 'tr'
          ? `\n\n📌 ÖNERİLEN VARLIKLAR:\n${assetList}`
          : `\n\n📌 SUGGESTED ASSETS:\n${assetList}`;
      }

      // Build English message
      const messageEn = `🎯 AI RECOMMENDATION
"Where money flows, potential exists"

📊 RECOMMENDED MARKET: ${recommendation.primaryMarket.toUpperCase()}

${actionEmoji} ACTION: ${recommendation.action === 'analyze' ? 'ANALYZE' : recommendation.action === 'wait' ? 'WAIT' : 'AVOID'}

📈 CONFIDENCE: ${recommendation.confidence}%
[${confidenceBar}]

💡 REASONING:
${recommendation.reason}

📌 NEXT STEPS:
${nextSteps}`;

      // Translate main message to target language if needed
      let message = await this.translateIfNeeded(messageEn, language);

      // Add asset-specific advice (already localized)
      if (assetAdvice) {
        message += assetAdvice;
      }

      return {
        success: true,
        intent: 'CAPITAL_FLOW_RECOMMENDATION',
        message,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Capital flow recommendation error:', error);

      // If we have an asset hint, provide a helpful fallback response
      if (assetHint) {
        // Determine asset details for fallback
        let assetNameEn = assetHint;
        let assetNameTr = assetHint;
        let analysisSymbol = assetHint;

        if (assetHint === 'GOLD') {
          assetNameEn = 'Gold';
          assetNameTr = 'Altın';
          analysisSymbol = 'GLD';
        } else if (assetHint === 'SILVER') {
          assetNameEn = 'Silver';
          assetNameTr = 'Gümüş';
          analysisSymbol = 'SLV';
        } else if (assetHint === 'STOCKS') {
          assetNameEn = 'Stocks';
          assetNameTr = 'Hisse Senetleri';
          analysisSymbol = 'SPY';
        } else if (assetHint === 'BONDS') {
          assetNameEn = 'Bonds';
          assetNameTr = 'Tahviller';
          analysisSymbol = 'TLT';
        }

        const fallbackMessage = language === 'tr'
          ? `🔍 ${assetNameTr} Hakkında

Capital Flow verileri şu an yüklenemiyor, ancak yine de analiz yapabilirsiniz.

📌 Detaylı analiz ve İşlem Planı için:
• "${analysisSymbol} analiz" veya "${analysisSymbol} mlis pro" yazın

Analiz maliyeti: 25 kredi`
          : `🔍 About ${assetNameEn}

Capital Flow data is currently unavailable, but you can still run an analysis.

📌 For detailed analysis and Trade Plan:
• Type "${analysisSymbol} analysis" or "${analysisSymbol} mlis pro"

Analysis cost: 25 credits`;

        return {
          success: true,
          intent: 'CAPITAL_FLOW_RECOMMENDATION',
          message: fallbackMessage,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          detectedLanguage: language,
        };
      }

      // Generic error response
      const errorMessage = language === 'tr'
        ? `Capital Flow verileri şu an yüklenemiyor.

Şunları deneyebilirsiniz:
• "BTC analiz" - Teknik analiz
• "Para nereye akıyor?" - Capital Flow özeti
• "yardım" - Tüm komutlar`
        : `Capital Flow data is currently unavailable.

You can try:
• "BTC analysis" - Technical analysis
• "Where is money flowing?" - Capital Flow summary
• "help" - All commands`;

      return {
        success: false,
        intent: 'CAPITAL_FLOW_RECOMMENDATION',
        message: errorMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generates a dynamic, data-driven response for asset recommendations.
   * Uses actual Capital Flow metrics to construct unique sentences.
   */
  private generateDataDrivenAssetResponse(params: {
    language: string;
    assetNameTr: string;
    assetNameEn: string;
    assetEmojiIcon: string;
    analysisSymbol: string;
    marketNameTr: string;
    marketNameEn: string;
    flow30d: number;
    flowVelocity: number;
    phase: string;
    rotationSignal: string;
    inflowMarketNameTr: string;
    inflowMarketNameEn: string;
    inflowFlow30d: number;
  }): string {
    const {
      language, assetNameTr, assetNameEn, assetEmojiIcon, analysisSymbol,
      marketNameTr, marketNameEn, flow30d, flowVelocity, phase, rotationSignal,
      inflowMarketNameTr, inflowMarketNameEn, inflowFlow30d
    } = params;

    const isTurkish = language === 'tr';
    const assetName = isTurkish ? assetNameTr : assetNameEn;
    const marketName = isTurkish ? marketNameTr : marketNameEn;
    const inflowMarketName = isTurkish ? inflowMarketNameTr : inflowMarketNameEn;

    // Determine market condition based on actual data
    const isOutflow = flow30d < 0;
    const isStrongOutflow = flow30d < -5;
    const isAccelerating = flowVelocity > 1;
    const isDecelerating = flowVelocity < -1;
    const isExitPhase = phase === 'exit' || phase === 'late';
    const isExiting = rotationSignal === 'exiting';

    // Build dynamic insight based on actual numbers
    let flowInsight = '';
    let recommendation = '';
    let actionHint = '';

    if (isTurkish) {
      // Turkish - Dynamic flow description with actual data
      if (isOutflow) {
        const outflowPercent = Math.abs(flow30d).toFixed(1);
        const inflowPercent = inflowFlow30d.toFixed(1);

        if (isStrongOutflow) {
          flowInsight = `Son 30 günde ${marketName} piyasasından %${outflowPercent} sermaye çıkışı var. ${inflowMarketName} ise %${inflowPercent} giriş alıyor.`;
        } else {
          flowInsight = `${marketName} piyasasında %${outflowPercent} negatif akış görülüyor, para ${inflowMarketName}'a yöneliyor.`;
        }

        if (isDecelerating) {
          flowInsight += ` Çıkış hızlanıyor.`;
        }

        if (isExitPhase) {
          recommendation = `Faz: ${phase.toUpperCase()}. Bu aşamada yeni pozisyon riskli.`;
        } else {
          recommendation = `Mevcut koşullarda ${assetName.toLowerCase()} için işlem önermiyorum.`;
        }

        actionHint = `SHORT için detaylı analiz istersen "${analysisSymbol} analiz" yaz.`;
      } else {
        const inflowPercent = flow30d.toFixed(1);

        if (phase === 'early') {
          flowInsight = `${marketName} piyasasına %${inflowPercent} giriş var ve henüz ERKEN fazda.`;
          recommendation = `Giriş için uygun zamanlama olabilir.`;
        } else if (phase === 'mid') {
          flowInsight = `${marketName} %${inflowPercent} pozitif akışta, ORTA faz.`;
          recommendation = `Dikkatli pozisyon alınabilir.`;
        } else {
          flowInsight = `${marketName} hala pozitif (%${inflowPercent}) ama ${phase.toUpperCase()} fazda.`;
          recommendation = `Geç kalmış olabilirsin, dikkatli ol.`;
        }

        if (isAccelerating) {
          flowInsight += ` Momentum güçleniyor.`;
        }

        actionHint = `Detaylı analiz için "${analysisSymbol} analiz" yaz.`;
      }

      return `${assetEmojiIcon} ${assetName.toUpperCase()}

${flowInsight}

${recommendation}

📌 ${actionHint}`;

    } else {
      // English - Dynamic flow description with actual data
      if (isOutflow) {
        const outflowPercent = Math.abs(flow30d).toFixed(1);
        const inflowPercent = inflowFlow30d.toFixed(1);

        if (isStrongOutflow) {
          flowInsight = `${marketName} market shows ${outflowPercent}% capital outflow over 30 days. ${inflowMarketName} is receiving +${inflowPercent}%.`;
        } else {
          flowInsight = `${marketName} has ${outflowPercent}% negative flow, capital rotating to ${inflowMarketName}.`;
        }

        if (isDecelerating) {
          flowInsight += ` Outflow accelerating.`;
        }

        if (isExitPhase) {
          recommendation = `Phase: ${phase.toUpperCase()}. New positions are risky at this stage.`;
        } else {
          recommendation = `I wouldn't recommend ${assetName.toLowerCase()} positions currently.`;
        }

        actionHint = `For SHORT analysis, type "${analysisSymbol} analysis".`;
      } else {
        const inflowPercent = flow30d.toFixed(1);

        if (phase === 'early') {
          flowInsight = `${marketName} showing +${inflowPercent}% inflow, EARLY phase.`;
          recommendation = `Could be good timing for entry.`;
        } else if (phase === 'mid') {
          flowInsight = `${marketName} at +${inflowPercent}% flow, MID phase.`;
          recommendation = `Cautious positioning possible.`;
        } else {
          flowInsight = `${marketName} still positive (+${inflowPercent}%) but in ${phase.toUpperCase()} phase.`;
          recommendation = `May be late, proceed with caution.`;
        }

        if (isAccelerating) {
          flowInsight += ` Momentum strengthening.`;
        }

        actionHint = `For detailed analysis, type "${analysisSymbol} analysis".`;
      }

      return `${assetEmojiIcon} ${assetName.toUpperCase()}

${flowInsight}

${recommendation}

📌 ${actionHint}`;
    }
  }

  // ===== PLATFORM HANDLERS =====

  private handleHelp(language: string, creditBalance: number): ConciergeResponse {
    const lang = language === 'tr' ? 'tr' : 'en';
    const templates = RESPONSE_TEMPLATES[lang];

    return {
      success: true,
      intent: 'HELP',
      message: templates.HELP_TEXT,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private handlePlatformInfo(language: string, creditBalance: number): ConciergeResponse {
    const lang = language === 'tr' ? 'tr' : 'en';
    const templates = RESPONSE_TEMPLATES[lang];

    return {
      success: true,
      intent: 'PLATFORM_INFO',
      message: templates.PLATFORM_INFO,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleConversational(
    message: string,
    language: string,
    creditBalance: number,
    userId?: string
  ): Promise<ConciergeResponse> {
    const lower = message.toLowerCase();

    // Detect the type of conversational message
    let responseText: string;
    let detectedLanguage = 'en'; // All responses in English

    // Language switch requests - detect from message content
    // Multi-language support: Users can request any supported language
    const languageSwitchPatterns: Record<string, { patterns: string[], response: string }> = {
      'tr': {
        patterns: ['türkçe söyle', 'türkçe konuş', 'türkçe yanıtla', 'turkish please', 'speak turkish', 'in turkish'],
        response: `Tabii, Türkçe konuşabilirim! 🇹🇷\n\nSize nasıl yardımcı olabilirim?\n\n• Coin analizi: "BTC analiz et"\n• Grafik: "BTC grafiği göster"\n• Teknik sorular: "RSI nedir?"\n\nNe yapmak istersiniz?`
      },
      'en': {
        patterns: ['ingilizce söyle', 'ingilizce konuş', 'english please', 'speak english', 'in english'],
        response: `Sure, I can speak English! 🇬🇧\n\nHow can I help you?\n\n• Coin analysis: "Analyze BTC"\n• Charts: "Show BTC chart"\n• Technical questions: "What is RSI?"\n\nWhat would you like to do?`
      },
      'es': {
        patterns: ['español por favor', 'habla español', 'en español', 'spanish please', 'speak spanish'],
        response: `¡Claro, puedo hablar español! 🇪🇸\n\n¿Cómo puedo ayudarte?\n\n• Análisis de monedas: "Analiza BTC"\n• Gráficos: "Muestra gráfico de ETH"\n• Preguntas técnicas: "¿Qué es RSI?"\n\n¿Qué te gustaría hacer?`
      },
      'de': {
        patterns: ['deutsch bitte', 'sprich deutsch', 'auf deutsch', 'german please', 'speak german'],
        response: `Natürlich, ich kann Deutsch sprechen! 🇩🇪\n\nWie kann ich Ihnen helfen?\n\n• Münzanalyse: "Analysiere BTC"\n• Charts: "Zeige BTC-Chart"\n• Technische Fragen: "Was ist RSI?"\n\nWas möchten Sie tun?`
      },
      'fr': {
        patterns: ['français s\'il vous plaît', 'parle français', 'en français', 'french please', 'speak french'],
        response: `Bien sûr, je peux parler français! 🇫🇷\n\nComment puis-je vous aider?\n\n• Analyse de cryptos: "Analyse BTC"\n• Graphiques: "Montre graphique ETH"\n• Questions techniques: "C'est quoi RSI?"\n\nQue souhaitez-vous faire?`
      },
      'ar': {
        patterns: ['بالعربي', 'تكلم عربي', 'arabic please', 'speak arabic', 'in arabic'],
        response: `بالطبع، يمكنني التحدث بالعربية! 🇸🇦\n\nكيف يمكنني مساعدتك؟\n\n• تحليل العملات: "حلل BTC"\n• الرسوم البيانية: "أظهر رسم ETH"\n• أسئلة تقنية: "ما هو RSI؟"\n\nماذا تريد أن تفعل؟`
      },
      'ru': {
        patterns: ['по-русски', 'говори по-русски', 'на русском', 'russian please', 'speak russian'],
        response: `Конечно, я могу говорить по-русски! 🇷🇺\n\nКак я могу помочь?\n\n• Анализ монет: "Проанализируй BTC"\n• Графики: "Покажи график ETH"\n• Технические вопросы: "Что такое RSI?"\n\nЧто бы вы хотели сделать?`
      },
      'zh': {
        patterns: ['说中文', '用中文', '中文回答', 'chinese please', 'speak chinese', 'in chinese'],
        response: `当然，我可以说中文！🇨🇳\n\n我能帮你什么？\n\n• 分析币种："分析BTC"\n• 图表："显示ETH图表"\n• 技术问题："RSI是什么？"\n\n您想做什么？`
      },
      'ja': {
        patterns: ['日本語で', '日本語でお願い', 'japanese please', 'speak japanese', 'in japanese'],
        response: `はい、日本語で対応できます！🇯🇵\n\nご用件は何ですか？\n\n• コイン分析：「BTC分析」\n• チャート：「ETHチャート表示」\n• 技術的質問：「RSIとは？」\n\n何をしますか？`
      },
      'ko': {
        patterns: ['한국어로', '한국어로 말해', 'korean please', 'speak korean', 'in korean'],
        response: `네, 한국어로 대화할 수 있습니다! 🇰🇷\n\n무엇을 도와드릴까요?\n\n• 코인 분석: "BTC 분석"\n• 차트: "ETH 차트 보여줘"\n• 기술 질문: "RSI가 뭐야?"\n\n무엇을 하시겠습니까?`
      },
      'pt': {
        patterns: ['português por favor', 'fala português', 'em português', 'portuguese please', 'speak portuguese'],
        response: `Claro, posso falar português! 🇧🇷\n\nComo posso ajudar?\n\n• Análise de moedas: "Analise BTC"\n• Gráficos: "Mostre gráfico ETH"\n• Perguntas técnicas: "O que é RSI?"\n\nO que você gostaria de fazer?`
      },
      'it': {
        patterns: ['italiano per favore', 'parla italiano', 'in italiano', 'italian please', 'speak italian'],
        response: `Certo, posso parlare italiano! 🇮🇹\n\nCome posso aiutarti?\n\n• Analisi monete: "Analizza BTC"\n• Grafici: "Mostra grafico ETH"\n• Domande tecniche: "Cos'è RSI?"\n\nCosa vorresti fare?`
      },
      'nl': {
        patterns: ['nederlands alstublieft', 'spreek nederlands', 'in het nederlands', 'dutch please', 'speak dutch'],
        response: `Natuurlijk, ik kan Nederlands spreken! 🇳🇱\n\nHoe kan ik helpen?\n\n• Muntanalyse: "Analyseer BTC"\n• Grafieken: "Toon ETH grafiek"\n• Technische vragen: "Wat is RSI?"\n\nWat wilt u doen?`
      },
      'pl': {
        patterns: ['po polsku', 'mów po polsku', 'polish please', 'speak polish', 'in polish'],
        response: `Oczywiście, mogę mówić po polsku! 🇵🇱\n\nJak mogę pomóc?\n\n• Analiza monet: "Przeanalizuj BTC"\n• Wykresy: "Pokaż wykres ETH"\n• Pytania techniczne: "Co to RSI?"\n\nCo chciałbyś zrobić?`
      },
      'hi': {
        patterns: ['हिंदी में', 'हिंदी में बोलो', 'hindi please', 'speak hindi', 'in hindi'],
        response: `बिल्कुल, मैं हिंदी में बात कर सकता हूं! 🇮🇳\n\nमैं कैसे मदद कर सकता हूं?\n\n• कॉइन विश्लेषण: "BTC विश्लेषण करो"\n• चार्ट: "ETH चार्ट दिखाओ"\n• तकनीकी सवाल: "RSI क्या है?"\n\nआप क्या करना चाहेंगे?`
      },
      'vi': {
        patterns: ['tiếng việt', 'nói tiếng việt', 'vietnamese please', 'speak vietnamese', 'in vietnamese'],
        response: `Được, tôi có thể nói tiếng Việt! 🇻🇳\n\nTôi có thể giúp gì?\n\n• Phân tích coin: "Phân tích BTC"\n• Biểu đồ: "Hiện biểu đồ ETH"\n• Câu hỏi kỹ thuật: "RSI là gì?"\n\nBạn muốn làm gì?`
      },
      'th': {
        patterns: ['ภาษาไทย', 'พูดภาษาไทย', 'thai please', 'speak thai', 'in thai'],
        response: `ได้ครับ ผมพูดภาษาไทยได้! 🇹🇭\n\nผมช่วยอะไรได้บ้าง?\n\n• วิเคราะห์เหรียญ: "วิเคราะห์ BTC"\n• กราฟ: "แสดงกราฟ ETH"\n• คำถามเทคนิค: "RSI คืออะไร?"\n\nคุณต้องการทำอะไร?`
      },
      'id': {
        patterns: ['bahasa indonesia', 'berbicara indonesia', 'indonesian please', 'speak indonesian', 'in indonesian'],
        response: `Tentu, saya bisa berbicara Bahasa Indonesia! 🇮🇩\n\nBagaimana saya bisa membantu?\n\n• Analisis koin: "Analisis BTC"\n• Grafik: "Tampilkan grafik ETH"\n• Pertanyaan teknis: "Apa itu RSI?"\n\nApa yang ingin Anda lakukan?`
      },
      'fa': {
        patterns: ['فارسی', 'به فارسی', 'persian please', 'speak persian', 'in persian', 'farsi please'],
        response: `بله، من می‌توانم فارسی صحبت کنم! 🇮🇷\n\nچطور می‌توانم کمک کنم؟\n\n• تحلیل ارز: "BTC را تحلیل کن"\n• نمودار: "نمودار ETH را نشان بده"\n• سوالات فنی: "RSI چیست?"\n\nچه کاری می‌خواهید انجام دهید?`
      },
      'he': {
        patterns: ['בעברית', 'דבר עברית', 'hebrew please', 'speak hebrew', 'in hebrew'],
        response: `בטח, אני יכול לדבר עברית! 🇮🇱\n\nאיך אני יכול לעזור?\n\n• ניתוח מטבעות: "נתח BTC"\n• גרפים: "הצג גרף ETH"\n• שאלות טכניות: "מה זה RSI?"\n\nמה תרצה לעשות?`
      },
    };

    // Check for language switch request
    for (const [langCode, config] of Object.entries(languageSwitchPatterns)) {
      if (config.patterns.some(pattern => lower.includes(pattern))) {
        detectedLanguage = langCode;
        responseText = config.response;
        return {
          success: true,
          intent: 'CONVERSATIONAL',
          message: responseText,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          detectedLanguage,
        };
      }
    }
    // Greetings
    if (
      lower.includes('merhaba') ||
      lower.includes('selam') ||
      lower.includes('hello') ||
      lower.includes('hi') ||
      lower.includes('hey') ||
      lower.includes('günaydın') ||
      lower.includes('good morning') ||
      lower.includes('iyi akşamlar') ||
      lower.includes('good evening')
    ) {
      // Detect language from greeting
      if (lower.includes('merhaba') || lower.includes('selam') || lower.includes('günaydın') || lower.includes('iyi akşamlar')) {
      }
      responseText = `Hello! I'm TraderPath AI Concierge. How can I help you?

I can:
• Analyze coins (e.g., "Analyze BTC")
• Show charts (e.g., "Show ETH chart")
• Answer technical questions (e.g., "What is RSI?")
• Set price alerts
• And more...

What would you like to do?`;
    }
    // Thanks
    else if (
      lower.includes('teşekkür') ||
      lower.includes('thank') ||
      lower.includes('sağol') ||
      lower.includes('eyvallah')
    ) {
      responseText = `You're welcome! Is there anything else I can help you with? Feel free to run another analysis or ask questions.`;
    }
    // Acknowledgment
    else if (
      lower === 'ok' ||
      lower === 'tamam' ||
      lower === 'anladım' ||
      lower === 'okay'
    ) {
      responseText = `Great! I'm here if you need anything else. Would you like me to analyze a coin?`;
    }
    // Voice preference request
    else if (
      lower.includes('sesli yanıt') ||
      lower.includes('voice response') ||
      lower.includes('sesli konuş') ||
      lower.includes('speak to me')
    ) {
      responseText = `Voice response is enabled! If your browser's audio output is on, you can hear my responses spoken aloud.

What would you like to do now? For example, say "Analyze BTC" to start an analysis.`;
    }
    // Default conversational response - route to AI Experts for intelligent answers
    else {
      // Check if it looks like a question that needs expert response
      const questionIndicators = ['?', 'what', 'how', 'why', 'when', 'which', 'explain', 'ne', 'nasıl', 'neden', 'nedir', 'açıkla', 'anlat'];
      const isQuestion = questionIndicators.some(q => lower.includes(q));

      // If we have userId and it looks like a question, route to AI Expert
      if (userId && isQuestion) {
        try {
          const expertType = this.detectExpertForQuestion(message);

          const languageInstruction = '\n\n[Be helpful and provide useful trading insights.]';

          const response = await aiExpertService.chat({
            expertId: expertType as 'aria' | 'nexus' | 'oracle' | 'sentinel',
            message: message + languageInstruction,
            userId,
          });

          if (response.response) {
            const expertInfo: Record<string, { emoji: string; name: string }> = {
              aria: { emoji: '🔬', name: 'Technical Expert' },
              nexus: { emoji: '⚖️', name: 'Risk Expert' },
              oracle: { emoji: '🐋', name: 'Whale Tracker' },
              sentinel: { emoji: '🛡️', name: 'Security Expert' },
            };
            const expert = expertInfo[expertType] || expertInfo.aria;

            return {
              success: true,
              intent: 'EXPERT_RESPONSE',
              message: `${expert.emoji} ${expert.name}\n\n${response.response}`,
              creditsSpent: 0,
              creditsRemaining: creditBalance,
            };
          }
        } catch (error) {
          console.error('[Concierge] AI Expert in conversational failed:', error);
          // Fall through to static response
        }
      }

      // Static fallback
      responseText = `I understand. I can help you with:

• Coin analysis: "Analyze BTC" or "How is ETH?"
• Chart viewing: "Show BTC chart"
• Technical questions: "What is RSI?" or "How does MACD work?"
• Account status: "my credits" or "my recent analyses"

Which would you like to do?`;
    }

    return {
      success: true,
      intent: 'CONVERSATIONAL',
      message: responseText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleStatus(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get recent analyses count
    const recentAnalyses = await prisma.analysis.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Get total analyses
    const totalAnalyses = await prisma.analysis.count({
      where: { userId },
    });

    // Get average score
    const avgScoreResult = await prisma.analysis.aggregate({
      where: { userId },
      _avg: { totalScore: true },
    });
    const avgScore = avgScoreResult._avg.totalScore
      ? Number(avgScoreResult._avg.totalScore).toFixed(1)
      : 'N/A';

    const statusText = language === 'tr'
      ? `Hesap Durumunuz

Krediler: ${creditBalance}
Son 7 Gün Analiz: ${recentAnalyses}
Toplam Analiz: ${totalAnalyses}
Ortalama Skor: ${avgScore}/10

Daha fazla krediye mi ihtiyacınız var? Fiyatlandırma sayfasını ziyaret edin.`
      : `Your Account Status

Credits: ${creditBalance}
Analyses (7 days): ${recentAnalyses}
Total Analyses: ${totalAnalyses}
Average Score: ${avgScore}/10

Need more credits? Visit the pricing page.`;

    return {
      success: true,
      intent: 'STATUS',
      message: statusText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleProfitability(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get analyses with outcomes
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      select: {
        outcome: true,
        symbol: true,
        totalScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (analyses.length === 0) {
      return {
        success: true,
        intent: 'PROFITABILITY',
        message: language === 'tr'
          ? 'Henüz analiz yapmadınız. "BTC nasıl?" diyerek ilk analizinizi yapabilirsiniz.'
          : 'You have no analyses yet. Try "How is BTC?" to make your first analysis.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Calculate statistics
    const tpHits = analyses.filter(a => a.outcome === 'TP_HIT').length;
    const slHits = analyses.filter(a => a.outcome === 'SL_HIT').length;
    const pending = analyses.filter(a => a.outcome === 'PENDING' || !a.outcome).length;
    const expired = analyses.filter(a => a.outcome === 'EXPIRED').length;
    const totalCompleted = tpHits + slHits;
    const winRate = totalCompleted > 0 ? ((tpHits / totalCompleted) * 100).toFixed(1) : 'N/A';

    // Get best performing symbols (by win count)
    const symbolStats: Record<string, { wins: number; losses: number }> = {};
    for (const analysis of analyses) {
      if (!analysis.symbol) continue;
      if (!symbolStats[analysis.symbol]) {
        symbolStats[analysis.symbol] = { wins: 0, losses: 0 };
      }
      if (analysis.outcome === 'TP_HIT') {
        symbolStats[analysis.symbol].wins++;
      } else if (analysis.outcome === 'SL_HIT') {
        symbolStats[analysis.symbol].losses++;
      }
    }

    // Sort by wins
    const sortedSymbols = Object.entries(symbolStats)
      .filter(([, stats]) => stats.wins + stats.losses > 0)
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 3);

    const bestSymbols = sortedSymbols.length > 0
      ? sortedSymbols.map(([sym, stats]) => `${sym}: ${stats.wins}W/${stats.losses}L`).join(', ')
      : 'N/A';

    // Recent performance (last 10)
    const recent10 = analyses.slice(0, 10);
    const recentWins = recent10.filter(a => a.outcome === 'TP_HIT').length;
    const recentLosses = recent10.filter(a => a.outcome === 'SL_HIT').length;

    // Average score
    const avgScore = analyses.reduce((sum, a) => sum + (Number(a.totalScore) || 0), 0) / analyses.length;

    const profitText = language === 'tr'
      ? `Karlılık Raporu

Toplam Analiz: ${analyses.length}
Kazanç (TP Hit): ${tpHits}
Kayıp (SL Hit): ${slHits}
Bekleyen: ${pending}
Süresi Dolan: ${expired}

Başarı Oranı: %${winRate}
Ortalama Skor: ${avgScore.toFixed(1)}/10

En İyi Coinler: ${bestSymbols}

Son 10 Analiz: ${recentWins}W / ${recentLosses}L

${Number(winRate) >= 60 ? 'Harika gidiyorsunuz!' : Number(winRate) >= 40 ? 'Fena değil, gelişmeye devam!' : 'Risk yönetimine dikkat edin.'}`
      : `Profitability Report

Total Analyses: ${analyses.length}
Wins (TP Hit): ${tpHits}
Losses (SL Hit): ${slHits}
Pending: ${pending}
Expired: ${expired}

Win Rate: ${winRate}%
Average Score: ${avgScore.toFixed(1)}/10

Best Coins: ${bestSymbols}

Last 10 Analyses: ${recentWins}W / ${recentLosses}L

${Number(winRate) >= 60 ? 'Great job! Keep it up!' : Number(winRate) >= 40 ? 'Not bad, keep improving!' : 'Focus on risk management.'}`;

    return {
      success: true,
      intent: 'PROFITABILITY',
      message: profitText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handlePlatformStats(creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get all platform analyses
    const allAnalyses = await prisma.analysis.findMany({
      select: {
        outcome: true,
        symbol: true,
        totalScore: true,
      },
    });

    const totalAnalyses = allAnalyses.length;
    const tpHits = allAnalyses.filter(a => a.outcome === 'TP_HIT').length;
    const slHits = allAnalyses.filter(a => a.outcome === 'SL_HIT').length;
    const totalCompleted = tpHits + slHits;
    const platformWinRate = totalCompleted > 0 ? ((tpHits / totalCompleted) * 100).toFixed(1) : 'N/A';

    // Average score
    const avgScore = allAnalyses.length > 0
      ? (allAnalyses.reduce((sum, a) => sum + (Number(a.totalScore) || 0), 0) / allAnalyses.length).toFixed(1)
      : 'N/A';

    // Best performing coins platform-wide
    const symbolStats: Record<string, { wins: number; losses: number; total: number }> = {};
    for (const analysis of allAnalyses) {
      if (!analysis.symbol) continue;
      if (!symbolStats[analysis.symbol]) {
        symbolStats[analysis.symbol] = { wins: 0, losses: 0, total: 0 };
      }
      symbolStats[analysis.symbol].total++;
      if (analysis.outcome === 'TP_HIT') {
        symbolStats[analysis.symbol].wins++;
      } else if (analysis.outcome === 'SL_HIT') {
        symbolStats[analysis.symbol].losses++;
      }
    }

    // Sort by win rate (min 5 analyses)
    const topCoins = Object.entries(symbolStats)
      .filter(([, stats]) => stats.wins + stats.losses >= 5)
      .map(([sym, stats]) => ({
        symbol: sym,
        winRate: stats.wins + stats.losses > 0 ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0,
        total: stats.total,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);

    const topCoinsText = topCoins.length > 0
      ? topCoins.map((c, i) => `${i + 1}. ${c.symbol} - %${c.winRate.toFixed(0)} (${c.total} analiz)`).join('\n')
      : 'N/A';

    // User count
    const userCount = await prisma.user.count();

    const platformText = language === 'tr'
      ? `Platform İstatistikleri
━━━━━━━━━━━━━━━━━━━━━
Toplam Kullanıcı: ${userCount.toLocaleString()}
Toplam Analiz: ${totalAnalyses.toLocaleString()}
Tamamlanan: ${totalCompleted.toLocaleString()}

Platform Başarı Oranı: %${platformWinRate}
Ortalama Skor: ${avgScore}/10

En Başarılı Coinler:
${topCoinsText}

TraderPath ile akıllı trade!`
      : `Platform Statistics
━━━━━━━━━━━━━━━━━━━━━
Total Users: ${userCount.toLocaleString()}
Total Analyses: ${totalAnalyses.toLocaleString()}
Completed: ${totalCompleted.toLocaleString()}

Platform Win Rate: ${platformWinRate}%
Average Score: ${avgScore}/10

Top Performing Coins:
${topCoinsText}

Trade smart with TraderPath!`;

    return {
      success: true,
      intent: 'PLATFORM_STATS',
      message: platformText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleMonthlyPerformance(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get analyses for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const analyses = await prisma.analysis.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        outcome: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (analyses.length === 0) {
      return {
        success: true,
        intent: 'MONTHLY_PERFORMANCE',
        message: language === 'tr'
          ? 'Son 30 günde analiz bulunamadı.'
          : 'No analyses found in the last 30 days.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Group by week
    const weeks: { wins: number; losses: number; start: Date }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekAnalyses = analyses.filter(a => a.createdAt >= weekStart && a.createdAt < weekEnd);
      weeks.unshift({
        wins: weekAnalyses.filter(a => a.outcome === 'TP_HIT').length,
        losses: weekAnalyses.filter(a => a.outcome === 'SL_HIT').length,
        start: weekStart,
      });
    }

    // Create visual bars
    const createBar = (wins: number, losses: number): string => {
      const total = wins + losses;
      if (total === 0) return '░░░░░░░░░░';
      const winBlocks = Math.round((wins / total) * 10);
      return '█'.repeat(winBlocks) + '░'.repeat(10 - winBlocks);
    };

    const weekLabels = language === 'tr'
      ? ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4']
      : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    const weekLines = weeks.map((w, i) => {
      const total = w.wins + w.losses;
      const rate = total > 0 ? ((w.wins / total) * 100).toFixed(0) : '0';
      return `${weekLabels[i]}: ${createBar(w.wins, w.losses)} ${w.wins}W/${w.losses}L (%${rate})`;
    }).join('\n');

    // Calculate trend
    const firstHalf = weeks.slice(0, 2);
    const secondHalf = weeks.slice(2, 4);
    const firstWinRate = firstHalf.reduce((s, w) => s + w.wins, 0) / Math.max(firstHalf.reduce((s, w) => s + w.wins + w.losses, 0), 1);
    const secondWinRate = secondHalf.reduce((s, w) => s + w.wins, 0) / Math.max(secondHalf.reduce((s, w) => s + w.wins + w.losses, 0), 1);

    let trendText: string;
    if (secondWinRate > firstWinRate + 0.1) {
      trendText = language === 'tr' ? 'Trend: ↑ İyileşiyor' : 'Trend: ↑ Improving';
    } else if (secondWinRate < firstWinRate - 0.1) {
      trendText = language === 'tr' ? 'Trend: ↓ Düşüşte' : 'Trend: ↓ Declining';
    } else {
      trendText = language === 'tr' ? 'Trend: → Stabil' : 'Trend: → Stable';
    }

    const monthlyText = language === 'tr'
      ? `Son 30 Gün Performansı
━━━━━━━━━━━━━━━━━━━━━
${weekLines}

${trendText}

Toplam: ${analyses.length} analiz`
      : `Last 30 Days Performance
━━━━━━━━━━━━━━━━━━━━━
${weekLines}

${trendText}

Total: ${analyses.length} analyses`;

    return {
      success: true,
      intent: 'MONTHLY_PERFORMANCE',
      message: monthlyText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleRecentAnalyses(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      select: {
        id: true,
        symbol: true,
        outcome: true,
        totalScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (analyses.length === 0) {
      return {
        success: true,
        intent: 'RECENT_ANALYSES',
        message: language === 'tr'
          ? 'Henüz analiz yapmadınız. "BTC nasıl?" diyerek başlayın!'
          : 'No analyses yet. Try "How is BTC?" to start!',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const outcomeEmoji = (outcome: string | null): string => {
      switch (outcome) {
        case 'TP_HIT': return '✓';
        case 'SL_HIT': return '✗';
        case 'PENDING': return '◌';
        default: return '·';
      }
    };

    const analysisList = analyses.map(a => {
      const date = new Date(a.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric' });
      const score = a.totalScore ? Number(a.totalScore).toFixed(1) : '-';
      return `${outcomeEmoji(a.outcome)} ${a.symbol} | ${score}/10 | ${date}`;
    }).join('\n');

    const recentText = language === 'tr'
      ? `Son 10 Analiziniz
━━━━━━━━━━━━━━━━━━━━━
${analysisList}

✓ = TP Hit, ✗ = SL Hit, ◌ = Bekliyor

Detaylar için /analyze/details/{id} sayfasını ziyaret edin.`
      : `Your Last 10 Analyses
━━━━━━━━━━━━━━━━━━━━━
${analysisList}

✓ = TP Hit, ✗ = SL Hit, ◌ = Pending

Visit /analyze/details/{id} for details.`;

    return {
      success: true,
      intent: 'RECENT_ANALYSES',
      message: recentText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleAlertSet(userId: string, message: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Parse alert from message
    // Examples: "BTC 70000 olunca haber ver", "ETH reaches 4000 notify me"
    const lower = message.toLowerCase();

    // Find coin
    let alertCoin: string | null = null;
    for (const coin of SUPPORTED_ASSETS) {
      if (lower.includes(coin)) {
        alertCoin = coin.toUpperCase();
        break;
      }
    }

    // Find price
    const priceMatch = message.match(/\d+[\d,.]*/);
    const alertPrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;

    if (!alertCoin || !alertPrice) {
      return {
        success: true,
        intent: 'ALERT_SET',
        message: language === 'tr'
          ? `Alarm kurmak için coin ve fiyat belirtin.

Örnek: "BTC 70000 olunca haber ver"
Örnek: "ETH 4000 ulaşınca bildir"`
          : `Please specify coin and price for alert.

Example: "BTC reaches 70000 notify me"
Example: "Alert me when ETH hits 4000"`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Create alert
    try {
      await prisma.priceAlert.create({
        data: {
          userId,
          symbol: alertCoin,
          targetPrice: alertPrice,
          direction: 'ABOVE', // Could detect ABOVE/BELOW from message
          isActive: true,
        },
      });

      return {
        success: true,
        intent: 'ALERT_SET',
        message: language === 'tr'
          ? `Alarm kuruldu!

Coin: ${alertCoin}
Hedef Fiyat: $${alertPrice.toLocaleString()}

${alertCoin} bu fiyata ulaştığında bildirim alacaksınız.`
          : `Alert set!

Coin: ${alertCoin}
Target Price: $${alertPrice.toLocaleString()}

You'll be notified when ${alertCoin} reaches this price.`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    } catch {
      return {
        success: false,
        intent: 'ALERT_SET',
        message: language === 'tr'
          ? 'Alarm kurulurken hata oluştu. Lütfen tekrar deneyin.'
          : 'Error setting alert. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'Failed to create alert',
      };
    }
  }

  private async handleAlertList(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (alerts.length === 0) {
      return {
        success: true,
        intent: 'ALERT_LIST',
        message: language === 'tr'
          ? 'Aktif alarmınız yok. "BTC 70000 olunca haber ver" diyerek alarm kurabilirsiniz.'
          : 'No active alerts. Try "BTC reaches 70000 notify me" to set one.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const alertList = alerts.map(a => {
      const directionArrow = a.direction === 'ABOVE' ? '↑' : '↓';
      return `${directionArrow} ${a.symbol} @ $${Number(a.targetPrice).toLocaleString()}`;
    }).join('\n');

    const alertText = language === 'tr'
      ? `Aktif Alarmlarınız
━━━━━━━━━━━━━━━━━━━━━
${alertList}

Toplam: ${alerts.length} alarm aktif`
      : `Your Active Alerts
━━━━━━━━━━━━━━━━━━━━━
${alertList}

Total: ${alerts.length} alerts active`;

    return {
      success: true,
      intent: 'ALERT_LIST',
      message: alertText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleChartView(
    userId: string,
    symbol: string | undefined,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    // Find the user's most recent analysis (or specific coin if provided)
    const whereClause = symbol
      ? { userId, symbol: symbol.toUpperCase() }
      : { userId };

    const analysis = await prisma.analysis.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        symbol: true,
        interval: true,
        step5Result: true, // Trade plan is in step5
        step7Result: true,
        createdAt: true,
      },
    });

    if (!analysis) {
      return {
        success: true,
        intent: 'CHART_VIEW',
        message: language === 'tr'
          ? symbol
            ? `${symbol} için analiz bulunamadı. Grafik görmek için önce "${symbol} analiz" diyerek analiz yapmalısınız.`
            : 'Henüz analiz yapmadınız. Grafik görmek için önce "BTC analiz" diyerek analiz yapın.'
          : symbol
            ? `No analysis found for ${symbol}. To see the chart, first run an analysis by saying "${symbol} analysis".`
            : 'No analyses yet. To see a chart, first run an analysis by saying "BTC analysis".',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Parse step5Result for trade plan (correct location)
    let tradePlan: TradePlan | undefined;
    let verdict = 'WAIT';
    let score = 5;
    let hasTradePlan = false;

    try {
      // Get verdict and score from step7
      const step7 = typeof analysis.step7Result === 'string'
        ? JSON.parse(analysis.step7Result)
        : analysis.step7Result;

      verdict = step7?.verdict || 'WAIT';
      score = step7?.overallScore || 5;

      // Get trade plan from step5
      const step5 = typeof analysis.step5Result === 'string'
        ? JSON.parse(analysis.step5Result)
        : analysis.step5Result;

      if (step5 && step5.averageEntry && step5.stopLoss && step5.takeProfits) {
        hasTradePlan = true;
        tradePlan = {
          entry: Number(step5.averageEntry) || 0,
          stopLoss: Number(step5.stopLoss?.price) || 0,
          takeProfit1: Number(step5.takeProfits?.[0]?.price) || 0,
          takeProfit2: step5.takeProfits?.[1]?.price ? Number(step5.takeProfits[1].price) : undefined,
          direction: step5.direction || 'long',
        };
      }
    } catch {
      // Ignore parse errors, use defaults
    }

    // Fetch OHLCV candles from Binance
    const binanceSymbol = `${analysis.symbol}USDT`;
    const interval = analysis.interval || '4h';
    const candleLimit = 100;

    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${candleLimit}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch candles');
      }

      const klines = await response.json();

      const candles: ChartCandle[] = klines.map((k: (string | number)[]) => ({
        time: Number(k[0]),
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      }));

      const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

      // Build message - clearly indicate if no trade plan
      let chartMessage: string;

      if (hasTradePlan && tradePlan) {
        chartMessage = language === 'tr'
          ? `${analysis.symbol} ${interval.toUpperCase()} Grafiği

Karar: ${verdict}
Skor: ${score}/10

İşlem Planı:
• Entry: $${tradePlan.entry.toLocaleString()}
• Stop Loss: $${tradePlan.stopLoss.toLocaleString()}
• Take Profit 1: $${tradePlan.takeProfit1.toLocaleString()}
${tradePlan.takeProfit2 ? `• Take Profit 2: $${tradePlan.takeProfit2.toLocaleString()}` : ''}
• Yön: ${tradePlan.direction === 'long' ? 'LONG' : 'SHORT'}

Güncel Fiyat: $${currentPrice.toLocaleString()}`
          : `${analysis.symbol} ${interval.toUpperCase()} Chart

Verdict: ${verdict}
Score: ${score}/10

Trade Plan:
• Entry: $${tradePlan.entry.toLocaleString()}
• Stop Loss: $${tradePlan.stopLoss.toLocaleString()}
• Take Profit 1: $${tradePlan.takeProfit1.toLocaleString()}
${tradePlan.takeProfit2 ? `• Take Profit 2: $${tradePlan.takeProfit2.toLocaleString()}` : ''}
• Direction: ${tradePlan.direction === 'long' ? 'LONG' : 'SHORT'}

Current Price: $${currentPrice.toLocaleString()}`;
      } else {
        // No trade plan - explain why
        chartMessage = language === 'tr'
          ? `${analysis.symbol} ${interval.toUpperCase()} Grafiği

Karar: ${verdict}
Skor: ${score}/10

İşlem planı oluşturulmadı. Muhtemel nedenler:
• Verdict: ${verdict} (${verdict === 'WAIT' || verdict === 'AVOID' ? 'işlem önerilmedi' : ''})
• Piyasa koşulları uygun değil
• Risk seviyesi yüksek

Güncel Fiyat: $${currentPrice.toLocaleString()}

Not: Sadece GO veya CONDITIONAL_GO verdictlerinde işlem planı oluşturulur.`
          : `${analysis.symbol} ${interval.toUpperCase()} Chart

Verdict: ${verdict}
Score: ${score}/10

No trade plan was generated. Possible reasons:
• Verdict: ${verdict} (${verdict === 'WAIT' || verdict === 'AVOID' ? 'trade not recommended' : ''})
• Market conditions not favorable
• Risk level too high

Current Price: $${currentPrice.toLocaleString()}

Note: Trade plans are only generated for GO or CONDITIONAL_GO verdicts.`;
      }

      return {
        success: true,
        intent: 'CHART_VIEW',
        message: chartMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        analysisId: analysis.id,
        verdict,
        score,
        chartData: {
          symbol: analysis.symbol,
          interval,
          candles,
          tradePlan: hasTradePlan ? tradePlan : undefined,
          currentPrice,
        },
      };
    } catch (error) {
      console.error('Chart data fetch error:', error);
      return {
        success: false,
        intent: 'CHART_VIEW',
        message: language === 'tr'
          ? 'Grafik verileri alınırken hata oluştu. Lütfen tekrar deneyin.'
          : 'Error fetching chart data. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'Failed to fetch chart data',
      };
    }
  }

  private async handleScheduleList(
    userId: string,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const schedules = await prisma.scheduledReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (schedules.length === 0) {
      return {
        success: true,
        intent: 'SCHEDULE_LIST',
        message: language === 'tr'
          ? `Henüz zamanlanmış analiziniz yok.

Yeni bir zamanlanmış analiz kurmak için:
"BTC için günlük analiz kur"
"ETH 4h haftalık otomatik analiz"

Veya /scheduled sayfasını ziyaret edin.`
          : `You don't have any scheduled analyses yet.

To create a new one:
"Schedule daily BTC analysis"
"Auto analyze ETH 4h weekly"

Or visit the /scheduled page.`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const frequencyText = (freq: string, lang: string) => {
      const map: Record<string, Record<string, string>> = {
        DAILY: { tr: 'Günlük', en: 'Daily' },
        WEEKLY: { tr: 'Haftalık', en: 'Weekly' },
        MONTHLY: { tr: 'Aylık', en: 'Monthly' },
      };
      return map[freq]?.[lang] || freq;
    };

    const scheduleList = schedules.map((s, idx) => {
      const status = s.isActive ? '✓' : '○';
      return `${idx + 1}. ${status} ${s.symbol} ${s.interval?.toUpperCase() || '4H'} - ${frequencyText(s.frequency, language)}`;
    }).join('\n');

    const listText = language === 'tr'
      ? `Zamanlanmış Analizleriniz
━━━━━━━━━━━━━━━━━━━━━
${scheduleList}

✓ = Aktif, ○ = Pasif
Toplam: ${schedules.length} zamanlanmış analiz

Yönetmek için /scheduled sayfasını ziyaret edin.`
      : `Your Scheduled Analyses
━━━━━━━━━━━━━━━━━━━━━
${scheduleList}

✓ = Active, ○ = Inactive
Total: ${schedules.length} scheduled analyses

Visit /scheduled to manage them.`;

    return {
      success: true,
      intent: 'SCHEDULE_LIST',
      message: listText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleScheduleCreate(
    userId: string,
    symbol: string | undefined,
    message: string,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    if (!symbol) {
      return {
        success: true,
        intent: 'SCHEDULE_CREATE',
        message: language === 'tr'
          ? `Zamanlanmış analiz kurmak için bir coin belirtin.

Örnek:
"BTC için günlük analiz kur"
"ETH 4h haftalık otomatik analiz"
"SOL 1h günlük schedule"

Veya /scheduled sayfasından detaylı ayar yapabilirsiniz.`
          : `Please specify a coin to schedule analysis for.

Example:
"Schedule daily BTC analysis"
"Auto analyze ETH 4h weekly"
"Schedule SOL 1h daily"

Or visit /scheduled for detailed settings.`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const lower = message.toLowerCase();

    // Detect interval
    let interval = '4h';
    if (lower.includes('15m') || lower.includes('scalp')) interval = '15m';
    else if (lower.includes('1h') || lower.includes('saatlik')) interval = '1h';
    else if (lower.includes('1d') || lower.includes('günlük') || lower.includes('daily')) interval = '1d';

    // Detect frequency
    let frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY';
    if (lower.includes('haftalık') || lower.includes('weekly')) frequency = 'WEEKLY';
    else if (lower.includes('aylık') || lower.includes('monthly')) frequency = 'MONTHLY';

    // Check existing count
    const existingCount = await prisma.scheduledReport.count({
      where: { userId },
    });

    if (existingCount >= 3) {
      return {
        success: false,
        intent: 'SCHEDULE_CREATE',
        message: language === 'tr'
          ? 'Maksimum 3 zamanlanmış analiz sınırına ulaştınız. Mevcut bir tanesini silip yenisini ekleyebilirsiniz.'
          : 'You have reached the maximum of 3 scheduled analyses. Delete one to add a new one.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Create the schedule
    try {
      // Calculate next run time based on frequency
      const now = new Date();
      const nextRun = new Date(now);
      nextRun.setUTCHours(9, 0, 0, 0); // 9 AM UTC
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1); // Next day if already past 9 AM
      }

      await prisma.scheduledReport.create({
        data: {
          user: { connect: { id: userId } },
          symbol: symbol.toUpperCase(),
          interval,
          frequency,
          scheduleHour: 9, // Default to 9 AM UTC
          nextRunAt: nextRun,
          deliverEmail: true,
          isActive: true,
        },
      });

      return {
        success: true,
        intent: 'SCHEDULE_CREATE',
        message: language === 'tr'
          ? `Zamanlanmış analiz kuruldu!

Coin: ${symbol.toUpperCase()}
Interval: ${interval.toUpperCase()}
Frekans: ${frequency === 'DAILY' ? 'Günlük' : frequency === 'WEEKLY' ? 'Haftalık' : 'Aylık'}
Saat: 09:00 UTC

Her analiz 25 kredi harcar. /scheduled sayfasından detayları düzenleyebilirsiniz.`
          : `Scheduled analysis created!

Coin: ${symbol.toUpperCase()}
Interval: ${interval.toUpperCase()}
Frequency: ${frequency}
Time: 09:00 UTC

Each analysis costs 25 credits. Visit /scheduled to edit details.`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    } catch (error) {
      console.error('Schedule create error:', error);
      return {
        success: false,
        intent: 'SCHEDULE_CREATE',
        message: language === 'tr'
          ? 'Zamanlanmış analiz kurulurken hata oluştu. Lütfen /scheduled sayfasını kullanın.'
          : 'Error creating scheduled analysis. Please use the /scheduled page.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'Failed to create schedule',
      };
    }
  }

  private async handleScheduleDelete(
    userId: string,
    message: string,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    // Get user's schedules to help with deletion
    const schedules = await prisma.scheduledReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (schedules.length === 0) {
      return {
        success: true,
        intent: 'SCHEDULE_DELETE',
        message: language === 'tr'
          ? 'Silinecek zamanlanmış analiz bulunamadı.'
          : 'No scheduled analyses found to delete.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Try to detect which coin to delete from message
    const lower = message.toLowerCase();
    let targetCoin: string | null = null;

    for (const coin of SUPPORTED_ASSETS) {
      const coinRegex = new RegExp(`\\b${coin}\\b`, 'i');
      if (coinRegex.test(lower)) {
        targetCoin = coin.toUpperCase();
        break;
      }
    }

    if (targetCoin) {
      // Delete schedule for this coin
      const toDelete = schedules.find(s => s.symbol === targetCoin);
      if (toDelete) {
        await prisma.scheduledReport.delete({
          where: { id: toDelete.id },
        });

        return {
          success: true,
          intent: 'SCHEDULE_DELETE',
          message: language === 'tr'
            ? `${targetCoin} için zamanlanmış analiz silindi.`
            : `Scheduled analysis for ${targetCoin} deleted.`,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
        };
      }
    }

    // No specific coin found, show list
    const scheduleList = schedules.map((s, idx) =>
      `${idx + 1}. ${s.symbol} ${s.interval?.toUpperCase() || '4H'}`
    ).join('\n');

    return {
      success: true,
      intent: 'SCHEDULE_DELETE',
      message: language === 'tr'
        ? `Hangi zamanlanmış analizi silmek istiyorsunuz?

${scheduleList}

Örnek: "BTC schedule sil"
Veya /scheduled sayfasından silebilirsiniz.`
        : `Which scheduled analysis do you want to delete?

${scheduleList}

Example: "Delete BTC schedule"
Or visit /scheduled to delete.`,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleTopCoinsByScore(
    limit: number,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const SCAN_COST = 300; // Discounted from 750 (30 × 25) - 60% off

    try {
      // Check if there's recent scan data in cache
      const cacheStats = await coinScoreCacheService.getCacheStats();
      const coins = await coinScoreCacheService.getTopCoinsByScore(limit, 'reliabilityScore');

      // If cache has data and is not too old (less than 24 hours), show it
      const cacheAgeHours = cacheStats.lastScanAt
        ? (Date.now() - new Date(cacheStats.lastScanAt).getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (coins.length > 0 && cacheAgeHours < 24) {
        // Show cached results
        const coinListStr = coins.map((coin, index) => {
          const verdictEmoji = coin.verdict === 'GO' ? '🟢' : coin.verdict === 'CONDITIONAL_GO' ? '🟡' : coin.verdict === 'WAIT' ? '🟠' : '🔴';
          const directionStr = coin.direction ? (coin.direction === 'LONG' ? '↑' : '↓') : '-';
          const changeStr = coin.priceChange24h >= 0 ? `+${coin.priceChange24h.toFixed(1)}%` : `${coin.priceChange24h.toFixed(1)}%`;

          return language === 'tr'
            ? `${index + 1}. ${verdictEmoji} **${coin.symbol}** - Skor: ${coin.reliabilityScore}/100 ${directionStr}\n   Fiyat: $${coin.price.toLocaleString()} (${changeStr})`
            : `${index + 1}. ${verdictEmoji} **${coin.symbol}** - Score: ${coin.reliabilityScore}/100 ${directionStr}\n   Price: $${coin.price.toLocaleString()} (${changeStr})`;
        }).join('\n\n');

        const lastScanStr = cacheStats.lastScanAt
          ? new Date(cacheStats.lastScanAt).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')
          : (language === 'tr' ? 'Bilinmiyor' : 'Unknown');

        const headerText = language === 'tr'
          ? `📊 **En Yüksek Güvenilirlik Skoruna Sahip ${coins.length} Coin:**`
          : `📊 **Top ${coins.length} Coins by Reliability Score:**`;

        const footerText = language === 'tr'
          ? `\n\n_Son tarama: ${lastScanStr}_\n💡 Güncel tarama için "top 30 coin tara" yazın (${SCAN_COST} kredi)`
          : `\n\n_Last scan: ${lastScanStr}_\n💡 For fresh scan type "scan top 30 coins" (${SCAN_COST} credits)`;

        return {
          success: true,
          intent: 'TOP_COINS_BY_SCORE',
          message: `${headerText}\n\n${coinListStr}${footerText}`,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          detectedLanguage: language,
        };
      }

      // No cache or too old - ask for confirmation
      const offerMessage = language === 'tr'
        ? `📊 **Top 30 Coin Taraması**

Sizin için hacim olarak ilk 30 coini analiz edip, analiz doğruluk skoruna göre sıralayabilirim.

💰 Bunun için sizden **300 kredi** tahsil etmem gerekiyor.

⏱️ Tarama yaklaşık 3-5 dakika sürer, tamamlandığında sizi ilgili sayfaya yönlendireceğim.

**Onaylıyor musunuz?** (Evet / Hayır)`
        : `📊 **Top 30 Coins Scan**

I can analyze the top 30 coins by volume and rank them by reliability score.

💰 This will cost **300 credits**.

⏱️ Scan takes approximately 3-5 minutes. I will redirect you to the results page when complete.

**Do you confirm?** (Yes / No)`;

      return {
        success: true,
        intent: 'TOP_COINS_BY_SCORE',
        message: offerMessage,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Top coins by score error:', error);
      return {
        success: false,
        intent: 'TOP_COINS_BY_SCORE',
        message: language === 'tr'
          ? 'Top coin listesi alınırken hata oluştu. Lütfen tekrar deneyin.'
          : 'Error fetching top coins list. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle top coins scan request (paid feature - 300 credits)
   */
  private async handleTopCoinsScan(
    userId: string,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const SCAN_COST = 300;

    // Check credits
    if (creditBalance < SCAN_COST) {
      return {
        success: false,
        intent: 'TOP_COINS_SCAN',
        message: language === 'tr'
          ? `Yetersiz kredi. Top 30 coin taraması için ${SCAN_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `Insufficient credits. Top 30 coins scan requires ${SCAN_COST} credits, you have: ${creditBalance}`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    try {
      // Charge credits
      const chargeResult = await creditService.charge(userId, SCAN_COST, 'top_coins_scan', {
        description: 'Top 30 coins analysis scan',
      });

      if (!chargeResult.success) {
        return {
          success: false,
          intent: 'TOP_COINS_SCAN',
          message: language === 'tr'
            ? 'Kredi çekimi başarısız oldu. Lütfen tekrar deneyin.'
            : 'Credit charge failed. Please try again.',
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          error: 'CHARGE_FAILED',
        };
      }

      // Start scanning message
      const startMessage = language === 'tr'
        ? `🔄 **Top 30 Coin Taraması Başlatıldı**

${SCAN_COST} kredi çekildi.
Tarama arka planda devam ediyor...

⏱️ Bu işlem 3-5 dakika sürebilir.
Tamamlandığında sonuçları görmek için "top coins" yazın.`
        : `🔄 **Top 30 Coins Scan Started**

${SCAN_COST} credits charged.
Scanning in background...

⏱️ This may take 3-5 minutes.
Type "top coins" to see results when complete.`;

      // Start scan in background (don't await)
      coinScoreCacheService.scanAllCoins('4h').then(result => {
        console.log(`[Concierge] Top coins scan complete: ${result.success} success, ${result.failed} failed`);
      }).catch(err => {
        console.error('[Concierge] Top coins scan error:', err);
      });

      return {
        success: true,
        intent: 'TOP_COINS_SCAN',
        message: startMessage,
        creditsSpent: SCAN_COST,
        creditsRemaining: chargeResult.newBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Top coins scan error:', error);
      return {
        success: false,
        intent: 'TOP_COINS_SCAN',
        message: language === 'tr'
          ? 'Tarama başlatılamadı. Lütfen tekrar deneyin.'
          : 'Failed to start scan. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle scan confirmation - user confirmed they want to pay 300 credits
   */
  private async handleScanConfirm(
    userId: string,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const SCAN_COST = 300;

    // Check credits
    if (creditBalance < SCAN_COST) {
      return {
        success: false,
        intent: 'SCAN_CONFIRM',
        message: language === 'tr'
          ? `Yetersiz kredi. Top 30 coin taraması için ${SCAN_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `Insufficient credits. Top 30 coins scan requires ${SCAN_COST} credits, you have: ${creditBalance}`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    try {
      // Charge credits
      const chargeResult = await creditService.charge(userId, SCAN_COST, 'top_coins_scan', {
        description: 'Top 30 coins analysis scan',
      });

      if (!chargeResult.success) {
        return {
          success: false,
          intent: 'SCAN_CONFIRM',
          message: language === 'tr'
            ? 'Kredi çekimi başarısız oldu. Lütfen tekrar deneyin.'
            : 'Credit charge failed. Please try again.',
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          error: 'CHARGE_FAILED',
        };
      }

      // Confirmation message
      const confirmMessage = language === 'tr'
        ? `✅ **${SCAN_COST} kredi tahsil edildi.**

🔄 Analizi başlatıyorum... Tamamlandığında sizi ilgili sayfaya yönlendireceğim.

⏱️ Bu işlem 3-5 dakika sürebilir.`
        : `✅ **${SCAN_COST} credits charged.**

🔄 Starting analysis... I will redirect you to the results page when complete.

⏱️ This may take 3-5 minutes.`;

      // Start scan in background (don't await)
      coinScoreCacheService.scanAllCoins('4h').then(result => {
        console.log(`[Concierge] Top coins scan complete: ${result.success} success, ${result.failed} failed`);
      }).catch(err => {
        console.error('[Concierge] Top coins scan error:', err);
      });

      return {
        success: true,
        intent: 'SCAN_CONFIRM',
        message: confirmMessage,
        creditsSpent: SCAN_COST,
        creditsRemaining: chargeResult.newBalance,
        detectedLanguage: language,
      };
    } catch (error) {
      console.error('[Concierge] Scan confirm error:', error);
      return {
        success: false,
        intent: 'SCAN_CONFIRM',
        message: language === 'tr'
          ? 'Tarama başlatılamadı. Lütfen tekrar deneyin.'
          : 'Failed to start scan. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleAnalysis(
    userId: string,
    symbol: string,
    interval: string,
    language: string,
    creditBalance: number
  ): Promise<ConciergeResponse> {
    const ANALYSIS_COST = 25;
    const upperSymbol = symbol.toUpperCase();
    const isTurkish = language === 'tr';

    // Check for existing recent analysis (within 4 hours) before spending credits
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const existingAnalysis = await prisma.analysis.findFirst({
        where: {
          userId,
          symbol: upperSymbol,
          interval,
          createdAt: { gte: fourHoursAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingAnalysis) {
        const verdictResult = existingAnalysis.step7Result as Record<string, any> || {};
        const tradePlanResult = existingAnalysis.step5Result as Record<string, any> || {};
        const verdict = verdictResult.verdict?.toUpperCase() || 'WAIT';
        const score = existingAnalysis.totalScore || verdictResult.overallScore || 5;
        const direction = tradePlanResult?.direction || undefined;
        const synthesis = this.generateNaturalResponse(upperSymbol, interval, verdict, score, language);

        let tradePlan: any | undefined;
        if (tradePlanResult) {
          tradePlan = {
            averageEntry: tradePlanResult.averageEntry,
            stopLoss: tradePlanResult.stopLoss,
            takeProfits: tradePlanResult.takeProfits,
            direction: tradePlanResult.direction || direction,
            riskReward: tradePlanResult.riskReward,
          };
        }

        const verdictLabel = verdict === 'GO' ? 'GO'
          : verdict === 'AVOID' ? (isTurkish ? 'KACIN' : 'AVOID')
          : verdict === 'CONDITIONAL_GO' ? (isTurkish ? 'SARTLI' : 'COND')
          : (isTurkish ? 'BEKLE' : 'WAIT');

        const timeAgo = Math.round((Date.now() - existingAnalysis.createdAt.getTime()) / 60000);
        const timeLabel = isTurkish
          ? `${timeAgo} dakika once yapildi`
          : `from ${timeAgo} minutes ago`;

        const analysisMessage = isTurkish
          ? `${upperSymbol} ${interval.toUpperCase()} Analizi (mevcut — ${timeLabel})

Karar: ${verdictLabel}
Skor: ${score}/10

${synthesis}`
          : `${upperSymbol} ${interval.toUpperCase()} Analysis (existing — ${timeLabel})

Verdict: ${verdictLabel}
Score: ${score}/10

${synthesis}`;

        console.log(`[Concierge] Returning existing analysis ${existingAnalysis.id} for ${upperSymbol} ${interval} (${timeAgo}min ago)`);

        return {
          success: true,
          intent: 'ANALYSIS',
          message: analysisMessage,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          analysisId: existingAnalysis.id,
          verdict,
          score,
          direction,
          tradePlan,
          voltranSynthesis: synthesis,
          detectedLanguage: language,
        };
      }
    } catch (error) {
      console.error('[Concierge] Error checking existing analysis:', error);
      // Continue to create new analysis
    }

    // Check credits
    if (creditBalance < ANALYSIS_COST) {
      return {
        success: false,
        intent: 'ANALYSIS',
        message: isTurkish
          ? `Yetersiz kredi. Analiz için ${ANALYSIS_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `Insufficient credits. Analysis requires ${ANALYSIS_COST} credits, you have: ${creditBalance}`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    try {
      // Direct 7-Step analysis (without Expert Panel - saves ~$0.0015 per analysis)
      const tradeType = getTradeType(interval);

      console.log(`[Concierge] Direct analysis request: symbol=${upperSymbol}, interval=${interval}, tradeType=${tradeType}, language=${language}`);

      // Charge credits first
      const chargeResult = await creditService.charge(
        userId,
        ANALYSIS_COST,
        'concierge_analysis',
        { symbol: upperSymbol, interval, tradeType }
      );

      if (!chargeResult.success) {
        return {
          success: false,
          intent: 'ANALYSIS',
          message: isTurkish
            ? 'Kredi çekimi başarısız. Yetersiz bakiye olabilir.'
            : 'Credit charge failed. Insufficient balance.',
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          error: 'CREDIT_CHARGE_FAILED',
        };
      }

      // Run 7-Step analysis directly (NO Expert Panel)
      const [marketPulse, assetScan, safetyCheck, timing, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(upperSymbol, tradeType),
        analysisEngine.safetyCheck(upperSymbol, tradeType),
        analysisEngine.timingAnalysis(upperSymbol, tradeType),
        analysisEngine.trapCheck(upperSymbol, tradeType),
      ]);

      // Generate preliminary verdict
      const preliminaryVerdict = analysisEngine.preliminaryVerdict(upperSymbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        trapCheck,
      });

      // Generate trade plan
      const tradePlanResult = await analysisEngine.integratedTradePlan(
        upperSymbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        10000 // Default account size
      );

      // Generate final verdict
      const verdictResult = await analysisEngine.getFinalVerdict(
        upperSymbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        tradePlanResult,
        tradeType
      );

      // Save analysis to database (without expert comments)
      const savedAnalysis = await prisma.analysis.create({
        data: {
          userId,
          symbol: upperSymbol,
          interval: interval,
          stepsCompleted: [1, 2, 3, 4, 5, 6, 7],
          step1Result: marketPulse as object,
          step2Result: assetScan as object,
          step3Result: safetyCheck as object,
          step4Result: timing as object,
          step5Result: tradePlanResult as object || null,
          step6Result: trapCheck as object,
          step7Result: verdictResult as object,
          totalScore: verdictResult.overallScore,
          creditsSpent: ANALYSIS_COST,
        },
      });

      // Trade type completion bonus
      const tradeTypeBonus = tradeType === 'scalping' ? 3 : tradeType === 'dayTrade' ? 2 : 1;
      await creditService.add(
        userId,
        tradeTypeBonus,
        'BONUS',
        'trade_type_completion_bonus',
        { tradeType, symbol: upperSymbol, analysisId: savedAnalysis.id }
      );

      // Build response
      const verdict = verdictResult.verdict?.toUpperCase() || 'WAIT';
      const score = verdictResult.overallScore || 5;
      const direction = tradePlanResult?.direction || undefined;

      const synthesis = this.generateNaturalResponse(upperSymbol, interval, verdict, score, language);

      // Build trade plan for response
      let tradePlan: any | undefined;
      if (tradePlanResult) {
        tradePlan = {
          averageEntry: tradePlanResult.averageEntry,
          stopLoss: tradePlanResult.stopLoss,
          takeProfits: tradePlanResult.takeProfits,
          direction: tradePlanResult.direction || direction,
          riskReward: tradePlanResult.riskReward,
        };
      }

      // Localized labels
      const verdictLabel = verdict === 'GO' ? 'GO'
        : verdict === 'AVOID' ? (isTurkish ? 'KAÇIN' : 'AVOID')
        : verdict === 'CONDITIONAL_GO' ? (isTurkish ? 'ŞARTLI' : 'COND')
        : (isTurkish ? 'BEKLE' : 'WAIT');

      const analysisMessage = isTurkish
        ? `${upperSymbol} ${interval.toUpperCase()} Analizi

Karar: ${verdictLabel}
Skor: ${score}/10

${synthesis}`
        : `${upperSymbol} ${interval.toUpperCase()} Analysis

Verdict: ${verdictLabel}
Score: ${score}/10

${synthesis}`;

      return {
        success: true,
        intent: 'ANALYSIS',
        message: analysisMessage,
        creditsSpent: ANALYSIS_COST,
        creditsRemaining: chargeResult.newBalance - tradeTypeBonus,
        analysisId: savedAnalysis.id,
        verdict: verdict,
        score: score,
        direction: direction,
        tradePlan: tradePlan,
        voltranSynthesis: synthesis,
        detectedLanguage: language,
      };

    } catch (error) {
      console.error('Analysis error:', error);

      // Refund credits on failure
      try {
        await creditService.add(userId, ANALYSIS_COST, 'BONUS', 'concierge_analysis_refund', {
          symbol: upperSymbol,
          reason: 'analysis_failed',
          error: String(error),
        });
      } catch (refundError) {
        logger.error({ error: refundError }, 'Failed to refund credits after analysis error');
      }

      return {
        success: false,
        intent: 'ANALYSIS',
        message: isTurkish
          ? 'Analiz sırasında hata oluştu. Krediniz iade edildi.'
          : 'Error during analysis. Credits have been refunded.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  /**
   * Handle MLIS Pro analysis request
   * Multi-Layer Intelligence System analysis
   */
  private async handleMLISAnalysis(
    userId: string,
    symbol: string,
    interval: string,
    language: string,
    creditBalance: number
  ): Promise<ConciergeResponse> {
    const ANALYSIS_COST = 25;
    const upperSymbol = symbol.toUpperCase();
    const isTurkish = language === 'tr';

    // Check credits
    if (creditBalance < ANALYSIS_COST) {
      return {
        success: false,
        intent: 'MLIS_ANALYSIS',
        message: isTurkish
          ? `Yetersiz kredi. MLIS Pro analizi için ${ANALYSIS_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `Insufficient credits. MLIS Pro analysis requires ${ANALYSIS_COST} credits, you have: ${creditBalance}`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    try {
      // Import MLIS service dynamically to avoid circular imports
      const { analyzeMLIS } = await import('../analysis/services/mlis.service');

      console.log(`[Concierge] MLIS Analysis request: symbol=${upperSymbol}, interval=${interval}, language=${language}`);

      // Run MLIS analysis
      const mlisResult = await analyzeMLIS(upperSymbol, interval);

      // Charge credits
      await creditService.charge(userId, ANALYSIS_COST, 'mlis_analysis', {
        symbol: upperSymbol,
        interval,
      });

      // Save to database with MLIS method
      const savedAnalysis = await prisma.analysis.create({
        data: {
          userId,
          symbol: upperSymbol,
          interval: interval,
          method: 'mlis_pro', // MLIS Pro method
          stepsCompleted: [1, 2, 3, 4, 5], // MLIS has 5 layers, not 7
          step1Result: {
            mlis: true,
            layer: 'technical',
            score: mlisResult.layers.technical.score,
            signals: mlisResult.layers.technical.signals
          } as object,
          step2Result: {
            mlis: true,
            layer: 'momentum',
            score: mlisResult.layers.momentum.score,
            signals: mlisResult.layers.momentum.signals
          } as object,
          step3Result: {
            mlis: true,
            layer: 'volatility',
            score: mlisResult.layers.volatility.score,
            signals: mlisResult.layers.volatility.signals
          } as object,
          step4Result: {
            mlis: true,
            layer: 'volume',
            score: mlisResult.layers.volume.score,
            signals: mlisResult.layers.volume.signals
          } as object,
          step5Result: {
            mlis: true,
            layer: 'verdict',
            overallScore: mlisResult.overallScore,
            confidence: mlisResult.confidence,
            recommendation: mlisResult.recommendation,
            direction: mlisResult.direction,
            riskLevel: mlisResult.riskLevel,
            keySignals: mlisResult.keySignals,
            riskFactors: mlisResult.riskFactors,
            verdict: mlisResult.recommendation === 'STRONG_BUY' || mlisResult.recommendation === 'BUY' ? 'go' :
                     mlisResult.recommendation === 'HOLD' ? 'wait' : 'avoid',
          } as object,
          totalScore: mlisResult.overallScore / 10,
          creditsSpent: ANALYSIS_COST,
        },
      });

      // Build response message
      const recommendationLabel = {
        'STRONG_BUY': isTurkish ? 'GÜÇLÜ AL' : 'STRONG BUY',
        'BUY': isTurkish ? 'AL' : 'BUY',
        'HOLD': isTurkish ? 'TUT/BEKLE' : 'HOLD',
        'SELL': isTurkish ? 'SAT' : 'SELL',
        'STRONG_SELL': isTurkish ? 'GÜÇLÜ SAT' : 'STRONG SELL',
      }[mlisResult.recommendation] || mlisResult.recommendation;

      const directionEmoji = mlisResult.direction === 'LONG' ? '🟢' : mlisResult.direction === 'SHORT' ? '🔴' : '⚪';

      const analysisMessage = isTurkish
        ? `🧠 ${upperSymbol} MLIS Pro Analizi (${interval.toUpperCase()})

${directionEmoji} Tavsiye: ${recommendationLabel}
📊 Skor: ${mlisResult.overallScore}/100
🎯 Güven: ${mlisResult.confidence}%
⚡ Yön: ${mlisResult.direction}
⚠️ Risk: ${mlisResult.riskLevel}

📈 Katman Skorları:
• Teknik: ${mlisResult.layers.technical.score}/100
• Momentum: ${mlisResult.layers.momentum.score}/100
• Volatilite: ${mlisResult.layers.volatility.score}/100
• Hacim: ${mlisResult.layers.volume.score}/100

🔑 Temel Sinyaller:
${mlisResult.keySignals.slice(0, 3).map(s => `• ${s}`).join('\n')}`

        : `🧠 ${upperSymbol} MLIS Pro Analysis (${interval.toUpperCase()})

${directionEmoji} Recommendation: ${recommendationLabel}
📊 Score: ${mlisResult.overallScore}/100
🎯 Confidence: ${mlisResult.confidence}%
⚡ Direction: ${mlisResult.direction}
⚠️ Risk: ${mlisResult.riskLevel}

📈 Layer Scores:
• Technical: ${mlisResult.layers.technical.score}/100
• Momentum: ${mlisResult.layers.momentum.score}/100
• Volatility: ${mlisResult.layers.volatility.score}/100
• Volume: ${mlisResult.layers.volume.score}/100

🔑 Key Signals:
${mlisResult.keySignals.slice(0, 3).map(s => `• ${s}`).join('\n')}`;

      const newBalance = creditBalance - ANALYSIS_COST;

      return {
        success: true,
        intent: 'MLIS_ANALYSIS',
        message: analysisMessage,
        creditsSpent: ANALYSIS_COST,
        creditsRemaining: newBalance,
        analysisId: savedAnalysis.id,
        verdict: mlisResult.recommendation === 'STRONG_BUY' || mlisResult.recommendation === 'BUY' ? 'go' :
                 mlisResult.recommendation === 'HOLD' ? 'wait' : 'avoid',
        score: mlisResult.overallScore / 10,
        direction: mlisResult.direction,  // LONG or SHORT
        detectedLanguage: language,
        mlisResult: {
          recommendation: mlisResult.recommendation,
          direction: mlisResult.direction,
          confidence: mlisResult.confidence,
          riskLevel: mlisResult.riskLevel,
          layers: mlisResult.layers,
          keySignals: mlisResult.keySignals,
          riskFactors: mlisResult.riskFactors,
        },
      };

    } catch (error) {
      console.error('MLIS Analysis error:', error);
      return {
        success: false,
        intent: 'MLIS_ANALYSIS',
        message: isTurkish
          ? 'MLIS analizi sırasında hata oluştu. Lütfen tekrar deneyin.'
          : 'Error during MLIS analysis. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'MLIS Analysis failed',
      };
    }
  }

  private async handleExpertQuestion(
    userId: string,
    question: string,
    language: string,
    creditBalance: number,
    expertType: string = 'aria'
  ): Promise<ConciergeResponse> {
    try {
      // Expert emojis and names
      const expertInfo: Record<string, { emoji: string; name: string }> = {
        aria: { emoji: 'ARIA', name: 'Technical Expert' },
        nexus: { emoji: 'NEXUS', name: 'Risk Expert' },
        oracle: { emoji: 'ORACLE', name: 'Whale Tracker' },
        sentinel: { emoji: 'SENTINEL', name: 'Security Expert' },
      };

      const expert = expertInfo[expertType] || expertInfo.aria;

      // All responses in English
      const languageInstruction = '';

      // Use AI Expert for question with language context
      const response = await aiExpertService.chat({
        expertId: expertType as 'aria' | 'nexus' | 'oracle' | 'sentinel',
        message: question + languageInstruction,
        userId,
      });

      // The chat response has 'response' field, not 'reply'
      const aiResponse = response.response || 'I couldn\'t generate a response.';

      const formattedReply = `${expert.emoji} ${expert.name}

${aiResponse}`;

      return {
        success: true,
        intent: 'EXPERT_ASK',
        message: formattedReply,
        creditsSpent: 0, // Expert questions are free for now
        creditsRemaining: creditBalance,
      };
    } catch (error) {
      console.error('Expert question error:', error);
      return {
        success: false,
        intent: 'EXPERT_ASK',
        message: language === 'tr'
          ? 'Sorunuz cevaplanamadı. Lütfen tekrar deneyin.'
          : 'Could not answer your question. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Question failed',
      };
    }
  }

  /**
   * Ask user for clarification about their trading style
   * Triggered when coin is detected but timeframe is not specified
   */
  private handleAnalysisClarification(
    symbol: string,
    language: string,
    creditBalance: number
  ): ConciergeResponse {
    // Multi-language clarification messages
    const clarificationMessages: Record<string, string> = {
      'tr': `${symbol} analizi için yatırım tarzınızı anlamam gerekiyor:

🏃 **Scalping/Hızlı Trade** - Dakikalar içinde alım-satım
   → "hızlı" veya "scalp" deyin

📊 **Gün İçi Trade** - Aynı gün içinde al-sat
   → "gün içi" veya "intraday" deyin

📈 **Uzun Vadeli/Swing** - Günler-haftalar tutma
   → "uzun vadeli" veya "swing" deyin

Hangisi size uygun?`,

      'en': `To analyze ${symbol}, I need to understand your trading style:

🏃 **Scalping** - Quick trades within minutes
   → Say "scalp" or "quick"

📊 **Day Trading** - Buy and sell same day
   → Say "day trade" or "intraday"

📈 **Swing Trading** - Hold for days to weeks
   → Say "swing" or "long term"

Which one fits your style?`,

      'es': `Para analizar ${symbol}, necesito entender tu estilo de trading:

🏃 **Scalping** - Operaciones rápidas en minutos
📊 **Day Trading** - Comprar y vender el mismo día
📈 **Swing Trading** - Mantener días a semanas

¿Cuál es tu estilo? (scalp/day trade/swing)`,

      'de': `Um ${symbol} zu analysieren, muss ich Ihren Trading-Stil verstehen:

🏃 **Scalping** - Schnelle Trades in Minuten
📊 **Day Trading** - Kauf und Verkauf am selben Tag
📈 **Swing Trading** - Tage bis Wochen halten

Was ist Ihr Stil? (scalp/day trade/swing)`,

      'fr': `Pour analyser ${symbol}, je dois comprendre votre style de trading:

🏃 **Scalping** - Trades rapides en minutes
📊 **Day Trading** - Acheter et vendre le même jour
📈 **Swing Trading** - Garder des jours à des semaines

Quel est votre style? (scalp/day trade/swing)`,

      'ar': `لتحليل ${symbol}، أحتاج لفهم أسلوب تداولك:

🏃 **سكالبينج** - صفقات سريعة في دقائق
📊 **تداول يومي** - شراء وبيع في نفس اليوم
📈 **سوينج** - الاحتفاظ لأيام إلى أسابيع

ما هو أسلوبك؟ (scalp/day trade/swing)`,

      'ru': `Для анализа ${symbol} мне нужно понять ваш стиль торговли:

🏃 **Скальпинг** - Быстрые сделки за минуты
📊 **Дейтрейдинг** - Покупка и продажа в тот же день
📈 **Свинг** - Удержание дни-недели

Какой ваш стиль? (scalp/day trade/swing)`,

      'zh': `分析${symbol}之前，我需要了解你的交易风格：

🏃 **短线交易** - 几分钟内快速交易
📊 **日内交易** - 当天买卖
📈 **波段交易** - 持有数天到数周

你的风格是什么？(scalp/day trade/swing)`,

      'ja': `${symbol}を分析するには、取引スタイルを理解する必要があります：

🏃 **スキャルピング** - 数分以内の高速取引
📊 **デイトレード** - 同日中の売買
📈 **スイング** - 数日〜数週間保有

あなたのスタイルは？(scalp/day trade/swing)`,

      'ko': `${symbol}를 분석하려면 거래 스타일을 이해해야 합니다:

🏃 **스캘핑** - 몇 분 안에 빠른 거래
📊 **데이 트레이딩** - 같은 날 매수/매도
📈 **스윙** - 며칠에서 몇 주 보유

어떤 스타일인가요? (scalp/day trade/swing)`,
    };

    const message = clarificationMessages[language] || clarificationMessages['en'];

    return {
      success: true,
      intent: 'ANALYSIS_NEEDS_CLARIFICATION',
      message,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  /**
   * Handle unknown intents by routing to AI Experts
   * This provides intelligent responses instead of generic "I don't understand" messages
   */
  private async handleUnknown(
    userId: string,
    message: string,
    language: string,
    creditBalance: number
  ): Promise<ConciergeResponse> {
    try {
      // Determine the best expert based on the question content
      const expertType = this.detectExpertForQuestion(message);

      console.log(`[Concierge] Routing unknown intent to ${expertType.toUpperCase()} expert`);

      // Add context about what the user might want
      const contextPrompt = `User asked: "${message}"\n\nPlease respond helpfully. If the question is about trading, provide insights and advice. If about the platform, explain TraderPath features.\n\n[Be helpful and conversational. If the question is about trading, provide useful insights.]`;

      // Use AI Expert for intelligent response
      const response = await aiExpertService.chat({
        expertId: expertType as 'aria' | 'nexus' | 'oracle' | 'sentinel',
        message: contextPrompt,
        userId,
      });

      const aiResponse = response.response || 'Sorry, I couldn\'t generate a response. Please try asking differently.';

      // Get expert info for formatting
      const expertInfo: Record<string, { emoji: string; name: string }> = {
        aria: { emoji: '🔬', name: 'Technical Expert' },
        nexus: { emoji: '⚖️', name: 'Risk Expert' },
        oracle: { emoji: '🐋', name: 'Whale Tracker' },
        sentinel: { emoji: '🛡️', name: 'Security Expert' },
      };

      const expert = expertInfo[expertType] || expertInfo.aria;

      return {
        success: true,
        intent: 'EXPERT_RESPONSE',
        message: `${expert.emoji} ${expert.name}\n\n${aiResponse}`,
        creditsSpent: 0, // Free for general questions
        creditsRemaining: creditBalance,
      };
    } catch (error) {
      console.error('[Concierge] AI Expert fallback failed:', error);

      // Return static template as last resort
      const templates = RESPONSE_TEMPLATES.en;

      return {
        success: true,
        intent: 'UNKNOWN',
        message: templates.UNKNOWN_INTENT,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }
  }

  /**
   * Detect which expert is best suited for a question
   */
  private detectExpertForQuestion(question: string): string {
    const lower = question.toLowerCase();

    // ARIA - Technical analysis keywords
    const technicalKeywords = [
      'rsi', 'macd', 'ema', 'sma', 'bollinger', 'indicator', 'indikatör',
      'teknik', 'technical', 'trend', 'support', 'destek', 'resistance', 'direnç',
      'pattern', 'formasyon', 'fibonacci', 'momentum', 'volume', 'hacim',
      'chart', 'grafik', 'candlestick', 'mum', 'analysis', 'analiz',
      'oversold', 'overbought', 'aşırı alım', 'aşırı satım', 'divergence', 'uyumsuzluk'
    ];

    // NEXUS - Risk management keywords
    const riskKeywords = [
      'risk', 'stop', 'loss', 'zarar', 'position', 'pozisyon', 'size', 'boyut',
      'leverage', 'kaldıraç', 'margin', 'marjin', 'liquidation', 'tasfiye',
      'portfolio', 'portföy', 'diversif', 'çeşitlendir', 'hedge', 'koruma',
      'capital', 'sermaye', 'management', 'yönetim', 'r:r', 'risk/reward'
    ];

    // ORACLE - Whale/market movement keywords
    const whaleKeywords = [
      'whale', 'balina', 'big', 'büyük', 'order', 'emir', 'volume', 'hacim',
      'institutional', 'kurumsal', 'manipulation', 'manipülasyon', 'pump', 'dump',
      'accumulation', 'biriktirme', 'distribution', 'dağıtım', 'smart money',
      'flow', 'akış', 'liquidation', 'tasfiye', 'open interest', 'funding'
    ];

    // SENTINEL - Security keywords
    const securityKeywords = [
      'scam', 'dolandırıcı', 'rug', 'fake', 'sahte', 'audit', 'denetim',
      'security', 'güvenlik', 'hack', 'exploit', 'vulnerability', 'zafiyet',
      'safe', 'güvenli', 'trust', 'güven', 'contract', 'sözleşme', 'token',
      'suspicious', 'şüpheli', 'warning', 'uyarı', 'fraud', 'sahtekarlık'
    ];

    // Check for matches (order matters - more specific first)
    if (securityKeywords.some(kw => lower.includes(kw))) return 'sentinel';
    if (whaleKeywords.some(kw => lower.includes(kw))) return 'oracle';
    if (riskKeywords.some(kw => lower.includes(kw))) return 'nexus';
    if (technicalKeywords.some(kw => lower.includes(kw))) return 'aria';

    // Default to ARIA for general trading questions
    return 'aria';
  }

  /**
   * Generate a natural language response for concierge - proper language support
   */
  private generateNaturalResponse(
    symbol: string,
    interval: string,
    verdict: string,
    score: number,
    language: string
  ): string {
    const isTurkish = language === 'tr';

    // Determine trade type from interval - with Turkish translations
    const tradeType = interval === '15m' || interval === '5m'
      ? (isTurkish ? 'kısa vadeli işlem (scalping)' : 'scalping')
      : interval === '1d' || interval === '1W'
        ? (isTurkish ? 'uzun vadeli işlem (swing trade)' : 'swing trade')
        : (isTurkish ? 'gün içi işlem (day trade)' : 'day trade');

    // Score interpretation with more detail
    const scoreQuality = score >= 8
      ? (isTurkish ? 'Teknik göstergeler güçlü sinyaller veriyor.' : 'Technical indicators show strong signals.')
      : score >= 6
        ? (isTurkish ? 'Teknik göstergeler orta düzeyde sinyaller veriyor.' : 'Technical indicators show moderate signals.')
        : score >= 4
          ? (isTurkish ? 'Teknik göstergeler zayıf sinyaller veriyor.' : 'Technical indicators show weak signals.')
          : (isTurkish ? 'Teknik göstergeler çok zayıf sinyaller veriyor.' : 'Technical indicators show very weak signals.');

    // Verdict-based response - improved Turkish
    switch (verdict) {
      case 'GO':
        return isTurkish
          ? `${symbol} için ${tradeType} yapılabilir. ${scoreQuality} Piyasa koşulları uygun görünüyor. Detaylı analiz için aşağıdaki butona tıklayın.`
          : `${symbol} shows a favorable setup for ${tradeType}. ${scoreQuality} Market conditions appear favorable. Click below for detailed analysis.`;

      case 'CONDITIONAL_GO':
      case 'COND':
        return isTurkish
          ? `${symbol} için ${tradeType} şartlı olarak yapılabilir. ${scoreQuality} Belirli koşullar altında işleme girilebilir ancak risk yönetimine dikkat edilmeli.`
          : `${symbol} shows a conditional setup for ${tradeType}. ${scoreQuality} Entry possible under certain conditions. Pay attention to risk management.`;

      case 'WAIT':
        return isTurkish
          ? `${symbol} için şu an ${tradeType} önerilmiyor. ${scoreQuality} Daha net sinyaller için beklemek daha güvenli olabilir.`
          : `${symbol} is not recommended for ${tradeType} at this time. ${scoreQuality} Waiting for clearer signals may be safer.`;

      case 'AVOID':
        return isTurkish
          ? `${symbol} için ${tradeType} yapılmaması önerilir. ${scoreQuality} Piyasa koşulları riskli görünüyor, bu işlemden uzak durmanız tavsiye edilir.`
          : `Avoid ${tradeType} for ${symbol}. ${scoreQuality} Market conditions appear risky. Stay away from this trade.`;

      default:
        return isTurkish
          ? `${symbol} analizi tamamlandı. ${scoreQuality} Detaylar için analiz sayfasını ziyaret edin.`
          : `${symbol} analysis completed. ${scoreQuality} Visit the analysis page for details.`;
    }
  }
}

export const conciergeService = new ConciergeService();
