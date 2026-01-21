import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { aiExpertService } from '../ai-expert/ai-expert.service';

interface ConciergeRequest {
  message: string;
  userId: string;
  language?: string;
}

interface ConciergeResponse {
  success: boolean;
  intent: string;
  message: string;
  creditsSpent: number;
  creditsRemaining: number;
  error?: string;
  // Analysis-specific fields
  analysisId?: string;
  verdict?: string;
  score?: number;
  voltranSynthesis?: string;
}

// Expanded coin list - 50+ popular coins
const SUPPORTED_COINS = [
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
  'vet', 'hbar', 'qnt', 'inj', 'ldo', 'rune', 'grt', 'fil', 'theta', 'icp'
];

// Coin name aliases for natural language
const COIN_ALIASES: Record<string, string> = {
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
};

// Intent detection with advanced pattern matching
function detectIntent(message: string): {
  intent: string;
  symbol?: string;
  interval?: string;
  expertType?: string;
} {
  const lower = message.toLowerCase().trim();

  // Help intent
  if (lower === 'help' || lower === '?' || lower.includes('yardım') || lower === 'nasıl kullanılır') {
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

  // Check for coin aliases first
  let detectedCoin: string | null = null;

  for (const [alias, symbol] of Object.entries(COIN_ALIASES)) {
    if (lower.includes(alias)) {
      detectedCoin = symbol;
      break;
    }
  }

  // Check for coin symbols
  if (!detectedCoin) {
    for (const coin of SUPPORTED_COINS) {
      // Match coin symbol with word boundaries
      const coinRegex = new RegExp(`\\b${coin}\\b`, 'i');
      if (coinRegex.test(lower)) {
        detectedCoin = coin;
        break;
      }
    }
  }

  // Analysis intent - coin detected
  if (detectedCoin) {
    // Detect interval
    let interval = '4h'; // default

    if (lower.includes('15m') || lower.includes('15 min') || lower.includes('15 dakika')) {
      interval = '15m';
    } else if (lower.includes('1h') || lower.includes('1 hour') || lower.includes('saatlik') || lower.includes('1 saat')) {
      interval = '1h';
    } else if (lower.includes('4h') || lower.includes('4 hour') || lower.includes('4 saat')) {
      interval = '4h';
    } else if (lower.includes('1d') || lower.includes('daily') || lower.includes('günlük') || lower.includes('gün')) {
      interval = '1d';
    } else if (lower.includes('1w') || lower.includes('weekly') || lower.includes('haftalık')) {
      interval = '1W';
    } else if (lower.includes('scalp')) {
      interval = '15m';
    } else if (lower.includes('swing')) {
      interval = '1d';
    }

    return {
      intent: 'ANALYSIS',
      symbol: detectedCoin.toUpperCase(),
      interval,
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
  async processMessage(request: ConciergeRequest): Promise<ConciergeResponse> {
    const { message, userId, language = 'en' } = request;

    try {
      // Get credit balance
      const creditBalance = await creditService.getBalance(userId);

      // Detect intent
      const { intent, symbol, interval, expertType } = detectIntent(message);

      // Handle different intents
      switch (intent) {
        case 'HELP':
          return this.handleHelp(language, creditBalance);

        case 'STATUS':
          return await this.handleStatus(userId, creditBalance, language);

        case 'ANALYSIS':
          return await this.handleAnalysis(userId, symbol!, interval!, language, creditBalance);

        case 'EXPERT_ASK':
          return await this.handleExpertQuestion(userId, message, language, creditBalance, expertType);

        default:
          return this.handleUnknown(language, creditBalance);
      }
    } catch (error) {
      console.error('Concierge service error:', error);
      const creditBalance = await creditService.getBalance(userId).catch(() => 0);

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

  private handleHelp(language: string, creditBalance: number): ConciergeResponse {
    const helpText = language === 'tr'
      ? `AI Concierge'e Hoş Geldiniz!

Yapabileceklerim:

HIZLI ANALİZ (15 kredi)
• "BTC nasıl?" - Hızlı analiz
• "ETH 4h analiz" - Belirli timeframe
• "SOL scalp" - Scalping analizi

UZMAN SORULARI (ücretsiz)
• "RSI nedir?" - Teknik analiz
• "Risk yönetimi nasıl yapılır?" - Risk
• "Balina aktivitesi ne demek?" - Whale

DURUM
• "status" - Kredi bakiyeniz

50+ desteklenen coin: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK, ARB, OP, APT, SUI, SEI ve daha fazlası.`
      : `Welcome to AI Concierge!

What I can do:

QUICK ANALYSIS (15 credits)
• "How is BTC?" - Quick analysis
• "ETH 4h analysis" - Specific timeframe
• "SOL scalp" - Scalping analysis

EXPERT QUESTIONS (free)
• "What is RSI?" - Technical analysis
• "How to manage risk?" - Risk management
• "What is whale activity?" - Whale tracking

STATUS
• "status" - Check your credits

50+ supported coins: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK, ARB, OP, APT, SUI, SEI and more.`;

    return {
      success: true,
      intent: 'HELP',
      message: helpText,
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

  private async handleAnalysis(
    userId: string,
    symbol: string,
    interval: string,
    language: string,
    creditBalance: number
  ): Promise<ConciergeResponse> {
    const ANALYSIS_COST = 15;

    // Check credits
    if (creditBalance < ANALYSIS_COST) {
      return {
        success: false,
        intent: 'ANALYSIS',
        message: language === 'tr'
          ? `Yetersiz kredi. Analiz için ${ANALYSIS_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `Insufficient credits. Analysis requires ${ANALYSIS_COST} credits, you have: ${creditBalance}`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    try {
      // Use AI Expert Panel for analysis
      const tradeType = getTradeType(interval);

      const panelResult = await aiExpertService.analyzeWithExpertPanel({
        symbol,
        userId,
        language: language === 'tr' ? 'tr' : 'en',
        tradeType,
      });

      if (!panelResult.success) {
        return {
          success: false,
          intent: 'ANALYSIS',
          message: language === 'tr'
            ? `Analiz başarısız: ${panelResult.error || 'Bilinmeyen hata'}`
            : `Analysis failed: ${panelResult.error || 'Unknown error'}`,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          error: panelResult.error,
        };
      }

      // Build response message
      const verdict = panelResult.verdict?.toUpperCase() || 'WAIT';
      const score = panelResult.score || 5;
      const synthesis = panelResult.voltranSynthesis || 'Analysis completed.';

      const verdictLabel = verdict === 'GO' ? 'GO' : verdict === 'AVOID' ? 'AVOID' : verdict === 'CONDITIONAL_GO' ? 'COND' : 'WAIT';

      const analysisMessage = `${symbol} ${interval.toUpperCase()} Analysis

Verdict: ${verdictLabel}
Score: ${score}/10

${synthesis}`;

      return {
        success: true,
        intent: 'ANALYSIS',
        message: analysisMessage,
        creditsSpent: panelResult.creditsSpent || ANALYSIS_COST,
        creditsRemaining: panelResult.remainingCredits ?? (creditBalance - ANALYSIS_COST),
        // Analysis-specific data
        analysisId: panelResult.analysisId,
        verdict: verdict,
        score: score,
        voltranSynthesis: synthesis,
      };

    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        intent: 'ANALYSIS',
        message: language === 'tr'
          ? 'Analiz sırasında hata oluştu. Lütfen tekrar deneyin.'
          : 'Error during analysis. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Analysis failed',
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

      // Use AI Expert for question
      const response = await aiExpertService.chat({
        expertId: expertType,
        message: question,
        userId,
      });

      const formattedReply = `${expert.emoji} ${expert.name}

${response.reply || 'I couldn\'t generate a response.'}`;

      return {
        success: true,
        intent: 'EXPERT_ASK',
        message: formattedReply,
        creditsSpent: response.creditsSpent || 0,
        creditsRemaining: response.creditsRemaining ?? creditBalance,
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

  private handleUnknown(language: string, creditBalance: number): ConciergeResponse {
    const unknownText = language === 'tr'
      ? `Anlamadım. Şunları deneyebilirsiniz:

• "BTC nasıl?" - Hızlı analiz
• "RSI nedir?" - Uzman sorusu
• "help" - Tüm komutlar`
      : `I didn't understand. Try:

• "How is BTC?" - Quick analysis
• "What is RSI?" - Expert question
• "help" - All commands`;

    return {
      success: true,
      intent: 'UNKNOWN',
      message: unknownText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }
}

export const conciergeService = new ConciergeService();
