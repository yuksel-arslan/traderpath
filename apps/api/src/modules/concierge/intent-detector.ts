import { callGeminiWithRetry } from '../../core/gemini';
import {
  IntentType,
  IntentDetectionResult,
  ExtractedEntities,
  COIN_ALIASES,
  TIMEFRAME_ALIASES,
  TRADE_TYPE_ALIASES,
  EXPERT_ALIASES,
} from './types';

const INTENT_DETECTION_PROMPT = `You are an intent classifier for TraderPath, a crypto trading analysis platform.

IMPORTANT RULES:
1. If user mentions ANY crypto coin/token (BTC, ETH, ETHUSDT, Bitcoin, Ethereum, etc.), it's ALWAYS an analysis request
2. Strip trading pair suffixes: ETHUSDT → ETH, BTCUSDT → BTC
3. Turkish phrases like "durumu", "özetle", "nasıl", "ne durumda" = analysis request
4. Educational questions WITHOUT coin mention = EXPERT_ASK
5. Educational questions WITH coin mention = QUICK_ANALYSIS (not EXPERT_ASK)

INTENT TYPES:
- QUICK_ANALYSIS: Coin mentioned + wants status/analysis
  Examples: "BTC nasıl?", "ETHUSDT durumu", "ETH'ye gireyim mi?", "Ethereum'un durumunu özetle", "SOL ne durumda?", "BTC analiz"
- SPECIFIC_ANALYSIS: Coin + specific timeframe/trade type
  Examples: "BTC 4h analizi", "ETH scalp", "SOL 1d swing"
- MLIS_ANALYSIS: Coin + MLIS/Pro/Multi-layer analysis request
  Examples: "BTC mlis", "ETH mlis pro", "SOL multi-layer analiz", "BTC çoklu katman", "mlis ile analiz et"
- MULTI_ANALYSIS: Multiple coins or "top X"
  Examples: "Top 5 coin", "BTC ETH SOL analiz et", "En iyi 3 coin"
- EXPERT_ASK: Educational question WITHOUT specific coin
  Examples: "RSI nedir?", "Scalping nasıl yapılır?", "Destek direnç nedir?"
- ALERT_SET: Set price alert
  Examples: "BTC 70K olunca haber ver", "ETH 4000 üstüne çıkarsa bildir"
- ALERT_LIST: List alerts
  Examples: "Alarmlarım", "My alerts"
- STATUS: Account/history info
  Examples: "Son analizlerim", "Kredim", "Portföyüm"
- HELP: How to use
  Examples: "Ne yapabilirsin?", "Yardım", "Help"
- CHART_VIEW: Show chart
  Examples: "BTC grafiği", "Chart göster", "Mum grafiği"
- SCHEDULE_LIST/SCHEDULE_CREATE/SCHEDULE_DELETE: Scheduled analysis management

ENTITY EXTRACTION:
- symbol: Crypto symbol (uppercase, strip USDT/BUSD suffix)
- interval: 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W
- tradeType: scalping, dayTrade, swing

Respond with JSON only:
{"intent": "INTENT_TYPE", "confidence": 0.95, "entities": {"symbol": "ETH"}, "language": "tr"}

User message: "{MESSAGE}"`;

export async function detectIntent(message: string): Promise<IntentDetectionResult> {
  const normalizedMessage = message.trim().toLowerCase();

  // First, try rule-based detection for common patterns
  const ruleBasedResult = detectIntentByRules(normalizedMessage, message);
  if (ruleBasedResult && ruleBasedResult.confidence >= 0.9) {
    return ruleBasedResult;
  }

  // Fall back to Gemini for complex/ambiguous queries
  try {
    const prompt = INTENT_DETECTION_PROMPT.replace('{MESSAGE}', message);
    const geminiResponse = await callGeminiWithRetry(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent classification
          maxOutputTokens: 500,
        },
      },
      3,
      'concierge_intent_detection'
    );

    const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseGeminiResponse(responseText, message);
    return parsed;
  } catch (error) {
    console.error('Gemini intent detection failed:', error);
    // Return rule-based result or unknown
    return ruleBasedResult || {
      intent: 'UNKNOWN',
      confidence: 0,
      entities: {},
      originalMessage: message,
      language: detectLanguage(message),
    };
  }
}

function detectIntentByRules(
  normalizedMessage: string,
  originalMessage: string
): IntentDetectionResult | null {
  const entities: ExtractedEntities = {};
  let intent: IntentType = 'UNKNOWN';
  let confidence = 0;

  // Extract coin symbol
  const symbol = extractSymbol(normalizedMessage);
  if (symbol) {
    entities.symbol = symbol;
  }

  // Extract timeframe
  const interval = extractTimeframe(normalizedMessage);
  if (interval) {
    entities.interval = interval;
  }

  // Extract trade type
  const tradeType = extractTradeType(normalizedMessage);
  if (tradeType) {
    entities.tradeType = tradeType;
  }

  // HELP patterns
  const helpPatterns = [
    /ne yapabilirsin/i,
    /neler yapabilirsin/i,
    /yardım/i,
    /help/i,
    /what can you do/i,
    /komutlar/i,
    /commands/i,
    /nasıl kullanırım/i,
    /how to use/i,
  ];
  if (helpPatterns.some((p) => p.test(normalizedMessage))) {
    intent = 'HELP';
    confidence = 0.95;
  }

  // STATUS patterns
  const statusPatterns = [
    /son analiz/i,
    /recent analys/i,
    /analizlerim/i,
    /my analys/i,
    /kredi/i,
    /credit/i,
    /bakiye/i,
    /balance/i,
    /portföy/i,
    /portfolio/i,
    /geçmiş/i,
    /history/i,
  ];
  if (statusPatterns.some((p) => p.test(normalizedMessage))) {
    intent = 'STATUS';
    confidence = 0.9;
  }

  // ALERT_LIST patterns
  const alertListPatterns = [
    /alarm(lar)?ım/i,
    /my alert/i,
    /show alert/i,
    /list alert/i,
    /aktif alarm/i,
    /active alert/i,
  ];
  if (alertListPatterns.some((p) => p.test(normalizedMessage))) {
    intent = 'ALERT_LIST';
    confidence = 0.9;
  }

  // ALERT_SET patterns
  const alertSetPatterns = [
    /(\d+[\d,.]*).*?(olunca|olduğunda|ulaşınca|ulaştığında)/i,
    /alert.*?(\d+[\d,.]*)/i,
    /notify.*?(\d+[\d,.]*)/i,
    /haber ver.*?(\d+[\d,.]*)/i,
    /(\d+[\d,.]*).*?(haber|bildir|alert)/i,
  ];
  for (const pattern of alertSetPatterns) {
    const match = normalizedMessage.match(pattern);
    if (match && symbol) {
      intent = 'ALERT_SET';
      confidence = 0.85;
      // Extract price
      const priceMatch = normalizedMessage.match(/(\d+[\d,.]*)\s*(k|K|bin)?/);
      if (priceMatch) {
        let price = parseFloat(priceMatch[1].replace(',', ''));
        if (priceMatch[2]?.toLowerCase() === 'k' || priceMatch[2] === 'bin') {
          price *= 1000;
        }
        entities.targetPrice = price;
      }
      // Determine direction
      entities.direction = normalizedMessage.includes('altı') ||
        normalizedMessage.includes('below') ||
        normalizedMessage.includes('düşerse')
        ? 'below'
        : 'above';
      break;
    }
  }

  // CHART_VIEW patterns
  const chartPatterns = [
    /chart/i,
    /grafik/i,
    /grafiği/i,
    /mum/i,
    /candlestick/i,
    /show.*chart/i,
    /göster.*grafik/i,
    /chart.*göster/i,
    /grafik.*göster/i,
    /tradingview/i,
  ];
  if (chartPatterns.some((p) => p.test(normalizedMessage))) {
    intent = 'CHART_VIEW';
    confidence = 0.95;
    // Symbol is already extracted above
  }

  // EXPERT_ASK patterns (educational questions)
  const expertPatterns = [
    /nedir\??$/i,
    /ne demek/i,
    /nasıl (çalışır|hesaplanır|bulunur|kullanılır)/i,
    /what is/i,
    /how (does|do|to)/i,
    /explain/i,
    /açıkla/i,
    /anlat/i,
    /(rsi|macd|bollinger|fibonacci|destek|direnç|support|resistance)/i,
  ];
  if (expertPatterns.some((p) => p.test(normalizedMessage)) && !symbol) {
    intent = 'EXPERT_ASK';
    confidence = 0.85;
    // Try to detect which expert
    const expertId = extractExpertId(normalizedMessage);
    if (expertId) {
      entities.expertId = expertId;
    }
  }

  // MULTI_ANALYSIS patterns
  const multiPatterns = [
    /top\s*(\d+)/i,
    /en iyi\s*(\d+)/i,
    /(\d+)\s*coin/i,
    /favori/i,
    /favorite/i,
    /hepsi/i,
    /tüm coin/i,
    /all coin/i,
  ];
  for (const pattern of multiPatterns) {
    const match = normalizedMessage.match(pattern);
    if (match) {
      intent = 'MULTI_ANALYSIS';
      confidence = 0.85;
      entities.count = match[1] ? parseInt(match[1]) : 5;
      break;
    }
  }

  // MLIS_ANALYSIS patterns (symbol + MLIS keywords)
  const mlisPatterns = [
    /mlis/i,
    /mlis pro/i,
    /multi.?layer/i,
    /çoklu.?katman/i,
    /5.?layer/i,
    /beş.?katman/i,
    /pro analiz/i,
    /pro analysis/i,
    /gelişmiş analiz/i,
    /advanced analysis/i,
  ];
  if (symbol && mlisPatterns.some((p) => p.test(normalizedMessage)) && intent === 'UNKNOWN') {
    intent = 'MLIS_ANALYSIS';
    confidence = 0.95;
  }

  // SPECIFIC_ANALYSIS patterns (symbol + timeframe or trade type)
  if (symbol && (interval || tradeType) && intent === 'UNKNOWN') {
    intent = 'SPECIFIC_ANALYSIS';
    confidence = 0.9;
  }

  // QUICK_ANALYSIS patterns (just asking about a coin)
  const quickAnalysisPatterns = [
    /nasıl\??$/i,
    /ne durumda/i,
    /durumu/i,
    /özetle/i,
    /özet/i,
    /how('s| is)/i,
    /gireyim mi/i,
    /should i (buy|enter|trade)/i,
    /alayım mı/i,
    /satayım mı/i,
    /long mu/i,
    /short mu/i,
    /analiz/i,
    /analysis/i,
    /analiz et/i,
    /analyze/i,
    /incele/i,
    /bak/i,
    /kontrol/i,
    /check/i,
    /summarize/i,
    /summary/i,
  ];
  if (symbol && intent === 'UNKNOWN') {
    if (quickAnalysisPatterns.some((p) => p.test(normalizedMessage))) {
      intent = 'QUICK_ANALYSIS';
      confidence = 0.9;
    } else {
      // Just a symbol mentioned, assume quick analysis
      intent = 'QUICK_ANALYSIS';
      confidence = 0.7;
    }
  }

  if (intent === 'UNKNOWN') {
    return null;
  }

  return {
    intent,
    confidence,
    entities,
    originalMessage,
    language: detectLanguage(originalMessage),
  };
}

function extractSymbol(message: string): string | undefined {
  // Valid coin symbols
  const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'AVAX', 'LINK', 'SUI', 'ARB', 'OP', 'APT', 'NEAR', 'ATOM', 'DOT', 'LTC', 'TRX', 'UNI', 'AAVE', 'MKR', 'INJ', 'RENDER', 'PEPE', 'SHIB', 'BONK', 'WIF', 'FLOKI', 'FET', 'RNDR', 'TAO', 'WLD', 'JASMY', 'OCEAN', 'AGIX'];

  // Helper to strip trading pair suffixes (USDT, BUSD, USDC, etc.)
  const stripPairSuffix = (s: string): string => {
    return s.replace(/(usdt|busd|usdc|perp|usd)$/i, '');
  };

  // Check direct matches first
  const words = message.split(/\s+/);
  for (const word of words) {
    // Clean and strip suffixes
    let cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    cleanWord = stripPairSuffix(cleanWord);

    if (COIN_ALIASES[cleanWord]) {
      return COIN_ALIASES[cleanWord];
    }

    // Check if it's already a valid symbol (uppercase)
    const upper = cleanWord.toUpperCase();
    if (VALID_SYMBOLS.includes(upper)) {
      return upper;
    }
  }

  // Check for embedded symbols (e.g., "BTC'ye", "ETH'e", "Ethereum'um")
  const symbolMatch = message.match(/\b([A-Za-z]{2,10})(?:'[a-zığüşöç]+)?\b/gi);
  if (symbolMatch) {
    for (const match of symbolMatch) {
      // Clean: remove apostrophe and Turkish suffixes
      let cleanMatch = match.replace(/'[a-zığüşöç]+$/i, '').toLowerCase();
      cleanMatch = stripPairSuffix(cleanMatch);

      if (COIN_ALIASES[cleanMatch]) {
        return COIN_ALIASES[cleanMatch];
      }

      // Check if it's already a valid symbol (uppercase)
      const upper = cleanMatch.toUpperCase();
      if (VALID_SYMBOLS.includes(upper)) {
        return upper;
      }
    }
  }

  return undefined;
}

function extractTimeframe(message: string): string | undefined {
  // Direct timeframe patterns
  const patterns = [
    /(\d+)\s*(m|min|minute|dakika|dk)\b/i,
    /(\d+)\s*(h|hour|saat|saatlik)\b/i,
    /(\d+)\s*(d|day|gün|günlük)\b/i,
    /(\d+)\s*(w|week|hafta|haftalık)\b/i,
    /\b(5m|15m|30m|1h|2h|4h|1d|1w)\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        const num = match[1];
        const unit = match[2].toLowerCase();
        if (unit.startsWith('m') || unit.startsWith('d')) {
          return `${num}m`;
        }
        if (unit.startsWith('h') || unit.startsWith('s')) {
          return `${num}h`;
        }
        if (unit === 'd' || unit.startsWith('day') || unit.startsWith('gün')) {
          return `${num}d`;
        }
        if (unit === 'w' || unit.startsWith('week') || unit.startsWith('hafta')) {
          return `${num}W`;
        }
      } else if (match[1]) {
        // Direct match like "4h"
        return match[1].toLowerCase().replace('w', 'W');
      }
    }
  }

  // Check for Turkish keywords
  if (/saatlik/i.test(message)) return '1h';
  if (/günlük/i.test(message)) return '1d';
  if (/haftalık/i.test(message)) return '1W';

  return undefined;
}

function extractTradeType(message: string): string | undefined {
  const words = message.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (TRADE_TYPE_ALIASES[word]) {
      return TRADE_TYPE_ALIASES[word];
    }
  }

  // Check for multi-word patterns
  for (const [pattern, tradeType] of Object.entries(TRADE_TYPE_ALIASES)) {
    if (message.toLowerCase().includes(pattern)) {
      return tradeType;
    }
  }

  return undefined;
}

function extractExpertId(message: string): string | undefined {
  const words = message.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (EXPERT_ALIASES[word]) {
      return EXPERT_ALIASES[word];
    }
  }
  return undefined;
}

function detectLanguage(message: string): string {
  // Turkish-specific characters and words
  const turkishIndicators = /[şğüıöçŞĞÜİÖÇ]|nasıl|nedir|mı\b|mi\b|mu\b|mü\b|olunca|gireyim|analiz/i;
  if (turkishIndicators.test(message)) {
    return 'tr';
  }

  // Spanish indicators
  const spanishIndicators = /[ñáéíóú]|¿|cómo|qué|análisis/i;
  if (spanishIndicators.test(message)) {
    return 'es';
  }

  // German indicators
  const germanIndicators = /[äöüß]|wie|analyse/i;
  if (germanIndicators.test(message)) {
    return 'de';
  }

  // Default to English
  return 'en';
}

function parseGeminiResponse(response: string, originalMessage: string): IntentDetectionResult {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      intent: parsed.intent || 'UNKNOWN',
      confidence: parsed.confidence || 0.5,
      entities: parsed.entities || {},
      originalMessage,
      language: parsed.language || detectLanguage(originalMessage),
    };
  } catch {
    console.error('Failed to parse Gemini response:', response);
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      entities: {},
      originalMessage,
      language: detectLanguage(originalMessage),
    };
  }
}
