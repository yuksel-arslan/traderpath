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
}

// Simple intent detection based on keywords
function detectIntent(message: string): { intent: string; symbol?: string; interval?: string } {
  const lower = message.toLowerCase();

  // Help intent
  if (lower.includes('help') || lower.includes('yardım') || lower === '?') {
    return { intent: 'HELP' };
  }

  // Status intent
  if (lower.includes('status') || lower.includes('credit') || lower.includes('balance') ||
      lower.includes('durum') || lower.includes('kredi') || lower.includes('bakiye')) {
    return { intent: 'STATUS' };
  }

  // Analysis intent - detect coin symbol
  const coinPatterns = [
    'btc', 'eth', 'sol', 'bnb', 'xrp', 'ada', 'doge', 'avax', 'dot', 'link',
    'matic', 'uni', 'atom', 'ltc', 'near', 'apt', 'arb', 'op', 'sui', 'sei'
  ];

  for (const coin of coinPatterns) {
    if (lower.includes(coin)) {
      // Detect interval
      let interval = '4h'; // default
      if (lower.includes('1h') || lower.includes('saatlik')) interval = '1h';
      if (lower.includes('4h') || lower.includes('4 saat')) interval = '4h';
      if (lower.includes('1d') || lower.includes('günlük') || lower.includes('daily')) interval = '1d';
      if (lower.includes('15m') || lower.includes('15 dakika')) interval = '15m';

      return {
        intent: 'ANALYSIS',
        symbol: coin.toUpperCase(),
        interval
      };
    }
  }

  // Expert question intent
  if (lower.includes('what is') || lower.includes('nedir') || lower.includes('nasıl') ||
      lower.includes('how') || lower.includes('explain') || lower.includes('açıkla')) {
    return { intent: 'EXPERT_ASK' };
  }

  // Default to help
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
      const { intent, symbol, interval } = detectIntent(message);

      // Handle different intents
      switch (intent) {
        case 'HELP':
          return this.handleHelp(language, creditBalance);

        case 'STATUS':
          return await this.handleStatus(userId, creditBalance);

        case 'ANALYSIS':
          return await this.handleAnalysis(userId, symbol!, interval!, language, creditBalance);

        case 'EXPERT_ASK':
          return await this.handleExpertQuestion(userId, message, language, creditBalance);

        default:
          return {
            success: true,
            intent: 'UNKNOWN',
            message: language === 'tr'
              ? 'Anlamadım. "BTC nasıl?" veya "help" yazabilirsiniz.'
              : 'I didn\'t understand. Try "How is BTC?" or "help".',
            creditsSpent: 0,
            creditsRemaining: creditBalance,
          };
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
      ? `🤖 AI Concierge'e Hoş Geldiniz!

Yapabileceklerim:
• "BTC nasıl?" - Hızlı analiz (15 kredi)
• "ETH 4h analiz" - Belirli timeframe analizi
• "RSI nedir?" - Uzman sorusu (ücretsiz)
• "status" - Kredi bakiyeniz

Desteklenen coinler: BTC, ETH, SOL, BNB, XRP, ADA, DOGE ve daha fazlası.`
      : `🤖 Welcome to AI Concierge!

I can help you with:
• "How is BTC?" - Quick analysis (15 credits)
• "ETH 4h analysis" - Specific timeframe
• "What is RSI?" - Expert question (free)
• "status" - Check your credits

Supported coins: BTC, ETH, SOL, BNB, XRP, ADA, DOGE and more.`;

    return {
      success: true,
      intent: 'HELP',
      message: helpText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleStatus(userId: string, creditBalance: number): Promise<ConciergeResponse> {
    // Get recent analyses count
    const recentAnalyses = await prisma.analysis.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
    });

    return {
      success: true,
      intent: 'STATUS',
      message: `📊 Your Status:

💰 Credits: ${creditBalance}
📈 Analyses (7 days): ${recentAnalyses}

Need more credits? Visit the pricing page.`,
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
          ? `❌ Yetersiz kredi. Analiz için ${ANALYSIS_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `❌ Insufficient credits. Analysis requires ${ANALYSIS_COST} credits, you have: ${creditBalance}`,
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
            ? `❌ Analiz başarısız: ${panelResult.error || 'Bilinmeyen hata'}`
            : `❌ Analysis failed: ${panelResult.error || 'Unknown error'}`,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          error: panelResult.error,
        };
      }

      // Build response message
      const verdict = panelResult.verdict?.toUpperCase() || 'WAIT';
      const score = panelResult.score || 5;
      const synthesis = panelResult.voltranSynthesis || 'Analysis completed.';

      const emoji = verdict === 'GO' ? '🟢' : verdict === 'AVOID' ? '🔴' : '🟡';

      const analysisMessage = `${emoji} ${symbol} ${interval} Analysis

📊 Verdict: ${verdict}
⭐ Score: ${score}/10

${synthesis}

${panelResult.analysisId ? `📄 Details: /analyze/details/${panelResult.analysisId}` : ''}`;

      return {
        success: true,
        intent: 'ANALYSIS',
        message: analysisMessage,
        creditsSpent: panelResult.creditsSpent || ANALYSIS_COST,
        creditsRemaining: panelResult.creditsRemaining ?? (creditBalance - ANALYSIS_COST),
      };

    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        intent: 'ANALYSIS',
        message: language === 'tr'
          ? '❌ Analiz sırasında hata oluştu. Lütfen tekrar deneyin.'
          : '❌ Error during analysis. Please try again.',
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
    creditBalance: number
  ): Promise<ConciergeResponse> {
    try {
      // Use ARIA (technical expert) for questions
      const response = await aiExpertService.chat({
        expertId: 'aria',
        message: question,
        userId,
      });

      return {
        success: true,
        intent: 'EXPERT_ASK',
        message: response.reply || 'I couldn\'t generate a response.',
        creditsSpent: response.creditsSpent || 0,
        creditsRemaining: response.creditsRemaining ?? creditBalance,
      };
    } catch (error) {
      console.error('Expert question error:', error);
      return {
        success: false,
        intent: 'EXPERT_ASK',
        message: language === 'tr'
          ? '❌ Sorunuz cevaplanamadı. Lütfen tekrar deneyin.'
          : '❌ Could not answer your question. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Question failed',
      };
    }
  }
}

export const conciergeService = new ConciergeService();
