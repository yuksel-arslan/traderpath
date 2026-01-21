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

const INTENT_DETECTION_PROMPT = `You are an intent classifier for a crypto trading analysis platform called TraderPath.

Analyze the user message and extract:
1. Intent type (one of: QUICK_ANALYSIS, SPECIFIC_ANALYSIS, MULTI_ANALYSIS, EXPERT_ASK, ALERT_SET, ALERT_LIST, STATUS, HELP, UNKNOWN)
2. Entities (symbol, interval, tradeType, targetPrice, direction, count, expertId)
3. Detected language (tr, en, es, de, fr, etc.)

INTENT DEFINITIONS:
- QUICK_ANALYSIS: User wants a quick analysis of a specific coin (e.g., "BTC nasıl?", "Should I buy ETH?", "BTC'ye gireyim mi?")
- SPECIFIC_ANALYSIS: User wants analysis with specific timeframe/trade type (e.g., "BTC scalp analizi", "ETH 4h analysis")
- MULTI_ANALYSIS: User wants to analyze multiple coins (e.g., "Top 5 coin analiz", "Favori coinlerim nasıl?")
- EXPERT_ASK: User asking educational/technical questions (e.g., "RSI nedir?", "What is MACD?", "Destek direnç nasıl bulunur?")
- ALERT_SET: User wants to set a price alert (e.g., "BTC 70K olunca haber ver", "Alert me when ETH hits 4000")
- ALERT_LIST: User wants to see their alerts (e.g., "Alarmlarım neler?", "Show my alerts")
- STATUS: User asking about their account/history (e.g., "Son analizlerim", "Kredim ne kadar?", "Portföyüm")
- HELP: User asking what the bot can do (e.g., "Ne yapabilirsin?", "Yardım", "Help")
- UNKNOWN: Cannot determine intent

ENTITY EXTRACTION:
- symbol: Extract crypto symbol (BTC, ETH, SOL, etc.) - normalize to uppercase
- interval: Extract timeframe (5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W)
- tradeType: Extract trade type (scalping, dayTrade, swing)
- targetPrice: Extract price for alerts (number only)
- direction: For alerts - "above" or "below" the target price
- count: For multi-analysis - how many coins to analyze
- expertId: Which expert to ask (aria, nexus, oracle, sentinel)

Respond ONLY with valid JSON in this exact format:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.95,
  "entities": {
    "symbol": "BTC",
    "interval": "4h",
    "tradeType": "dayTrade"
  },
  "language": "tr"
}

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
