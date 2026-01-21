import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { aiExpertService } from '../ai-expert/ai-expert.service';
import { detectIntent } from './intent-detector';
import { synthesizeResponse, synthesizeHelp, synthesizeError } from './response-synthesizer';
import {
  ConciergeRequest,
  ConciergeResponse,
  IntentDetectionResult,
  QuickAnalysisResult,
  StatusResult,
  AlertSetResult,
  ExpertAskResult,
  VerdictType,
} from './types';

// Default interval when user doesn't specify
const DEFAULT_INTERVAL = '4h';

// Map verdict string to VerdictType
function mapVerdict(verdict: string): VerdictType {
  const upper = verdict?.toUpperCase() || '';
  if (upper.includes('CONDITIONAL') || upper === 'COND') return 'CONDITIONAL_GO';
  if (upper === 'GO' || upper.includes('BUY') || upper.includes('LONG')) return 'GO';
  if (upper === 'AVOID' || upper.includes('AVOID')) return 'AVOID';
  return 'WAIT';
}

// Map interval to trade type for AI Expert Panel
function getTradeTypeFromInterval(interval: string): 'scalping' | 'dayTrade' | 'swing' {
  switch (interval) {
    case '5m':
    case '15m':
      return 'scalping';
    case '30m':
    case '1h':
    case '2h':
    case '4h':
      return 'dayTrade';
    case '1d':
    case '1W':
      return 'swing';
    default:
      return 'dayTrade';
  }
}

// Map question to appropriate expert
function detectExpertForQuestion(question: string): 'aria' | 'nexus' | 'oracle' | 'sentinel' {
  const lower = question.toLowerCase();

  // Technical analysis keywords -> ARIA
  if (lower.includes('rsi') || lower.includes('macd') || lower.includes('indicator') ||
      lower.includes('chart') || lower.includes('pattern') || lower.includes('trend') ||
      lower.includes('support') || lower.includes('resistance') || lower.includes('fibonacci') ||
      lower.includes('bollinger') || lower.includes('ema') || lower.includes('sma')) {
    return 'aria';
  }

  // Risk management keywords -> NEXUS
  if (lower.includes('risk') || lower.includes('position size') || lower.includes('stop loss') ||
      lower.includes('take profit') || lower.includes('portfolio') || lower.includes('leverage') ||
      lower.includes('drawdown') || lower.includes('capital') || lower.includes('risk reward')) {
    return 'nexus';
  }

  // Whale/on-chain keywords -> ORACLE
  if (lower.includes('whale') || lower.includes('exchange flow') || lower.includes('on-chain') ||
      lower.includes('accumulation') || lower.includes('distribution') || lower.includes('smart money') ||
      lower.includes('institutional') || lower.includes('order flow')) {
    return 'oracle';
  }

  // Security/scam keywords -> SENTINEL
  if (lower.includes('scam') || lower.includes('honeypot') || lower.includes('rug pull') ||
      lower.includes('safe') || lower.includes('security') || lower.includes('manipulation') ||
      lower.includes('pump') || lower.includes('dump') || lower.includes('liquidity lock')) {
    return 'sentinel';
  }

  // Default to ARIA for general questions
  return 'aria';
}

export class ConciergeService {
  /**
   * Main entry point for concierge chat
   */
  async processMessage(request: ConciergeRequest): Promise<ConciergeResponse> {
    const { message, userId, language } = request;

    // Get current credit balance
    const creditBalance = await creditService.getBalance(userId);

    try {
      // Step 1: Detect intent
      const intentResult = await detectIntent(message);
      const detectedLanguage = language || intentResult.language;

      // Step 2: Execute based on intent
      const result = await this.executeIntent(
        intentResult,
        userId,
        creditBalance,
        detectedLanguage
      );

      return result;
    } catch (error) {
      console.error('Concierge error:', error);

      const { message: errorMessage, suggestions } = synthesizeError(
        'An error occurred. Please try again.',
        language || 'en'
      );

      return {
        success: false,
        intent: 'UNKNOWN',
        message: errorMessage,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeIntent(
    intentResult: IntentDetectionResult,
    userId: string,
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const { intent, entities } = intentResult;

    switch (intent) {
      case 'QUICK_ANALYSIS':
      case 'SPECIFIC_ANALYSIS':
        return this.handleAnalysisWithExpertPanel(userId, entities, creditBalance, language);

      case 'MULTI_ANALYSIS':
        return this.handleMultiAnalysis(userId, entities, creditBalance, language);

      case 'EXPERT_ASK':
        return this.handleExpertAsk(userId, intentResult.originalMessage, entities, creditBalance, language);

      case 'ALERT_SET':
        return this.handleAlertSet(userId, entities, creditBalance, language);

      case 'ALERT_LIST':
      case 'STATUS':
        return this.handleStatus(userId, language);

      case 'HELP':
        return this.handleHelp(language, creditBalance);

      default:
        return this.handleUnknown(language, creditBalance);
    }
  }

  /**
   * Handle analysis using AI Expert Panel (VOLTRAN)
   * This leverages all 4 experts for comprehensive analysis
   */
  private async handleAnalysisWithExpertPanel(
    userId: string,
    entities: IntentDetectionResult['entities'],
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const symbol = entities.symbol;
    if (!symbol) {
      const { message, suggestions } = synthesizeError(
        language === 'tr'
          ? 'Hangi coin için analiz yapmamı istersin? Örnek: "BTC nasıl?"'
          : 'Which coin should I analyze? Example: "How is BTC?"',
        language
      );
      return {
        success: false,
        intent: 'QUICK_ANALYSIS',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Determine trade type from interval
    const interval = entities.interval || DEFAULT_INTERVAL;
    const tradeType = getTradeTypeFromInterval(interval);

    // Use AI Expert Panel (VOLTRAN) for analysis
    // This runs all 7 steps + gets all 4 expert comments + synthesis
    const panelResult = await aiExpertService.analyzeWithExpertPanel({
      symbol,
      userId,
      language: language === 'tr' ? 'tr' : 'en',
      tradeType,
    });

    if (!panelResult.success) {
      const { message, suggestions } = synthesizeError(
        panelResult.error || 'Analysis failed',
        language
      );
      return {
        success: false,
        intent: 'QUICK_ANALYSIS',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: panelResult.error,
      };
    }

    // Get the saved analysis data for trade plan details
    const savedAnalysis = panelResult.analysisId
      ? await prisma.analysis.findUnique({
          where: { id: panelResult.analysisId },
          select: {
            id: true,
            symbol: true,
            interval: true,
            step5Result: true,
            step2Result: true,
          },
        })
      : null;

    const tradePlan = savedAnalysis?.step5Result as Record<string, unknown> | null;
    const assetScan = savedAnalysis?.step2Result as Record<string, unknown> | null;

    // Build result for frontend
    const analysisResult: QuickAnalysisResult = {
      symbol: panelResult.symbol,
      interval,
      tradeType,
      verdict: mapVerdict(panelResult.verdict || 'wait'),
      score: (panelResult.score || 5) * 10, // Convert 0-10 to 0-100
      direction: (tradePlan?.direction as 'long' | 'short') || 'long',
      entry: (tradePlan?.averageEntry as number) || (assetScan?.currentPrice as number) || 0,
      stopLoss: ((tradePlan?.stopLoss as Record<string, number>)?.price) || 0,
      takeProfit1: ((tradePlan?.takeProfits as Array<{ price: number }>)?.[0]?.price) || 0,
      takeProfit2: ((tradePlan?.takeProfits as Array<{ price: number }>)?.[1]?.price),
      takeProfit3: ((tradePlan?.takeProfits as Array<{ price: number }>)?.[2]?.price),
      riskReward: (tradePlan?.riskReward as number) || 0,
      reasoning: panelResult.voltranSynthesis || '',
      analysisId: panelResult.analysisId || '',
      creditsSpent: panelResult.creditsSpent || 0,
    };

    // Build expert panel message
    let expertMessage = '';
    if (panelResult.expertComments) {
      const expertEmojis: Record<string, string> = {
        aria: '📊',
        oracle: '🐋',
        sentinel: '🛡️',
        nexus: '⚖️',
      };

      expertMessage = panelResult.expertComments
        .map((e) => `${expertEmojis[e.expertId] || ''} **${e.expertName}**: ${e.comment}`)
        .join('\n\n');
    }

    const verdictEmoji = {
      GO: '🟢',
      CONDITIONAL_GO: '🟡',
      WAIT: '🟠',
      AVOID: '🔴',
    }[analysisResult.verdict] || '⚪';

    const finalMessage = `${verdictEmoji} **${panelResult.symbol} ${panelResult.verdict?.toUpperCase()}** (Score: ${analysisResult.score}/100)

${expertMessage}

---
**VOLTRAN Synthesis**: ${panelResult.voltranSynthesis}`;

    const newBalance = panelResult.remainingCredits ?? (await creditService.getBalance(userId));

    const suggestions = language === 'tr'
      ? ['Detayları göster', 'Başka coin analiz et', 'Alarm kur']
      : ['Show details', 'Analyze another coin', 'Set alert'];

    return {
      success: true,
      intent: 'QUICK_ANALYSIS',
      message: finalMessage,
      data: analysisResult,
      suggestions,
      creditsSpent: panelResult.creditsSpent || 0,
      creditsRemaining: newBalance,
    };
  }

  /**
   * Handle multi-coin analysis using Expert Panel
   */
  private async handleMultiAnalysis(
    userId: string,
    entities: IntentDetectionResult['entities'],
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const count = entities.count || 5;
    let coins: string[] = [];

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCoins: true },
      });
      coins = user?.preferredCoins?.slice(0, count) || [];
    } catch {
      // Column might not exist in database yet
    }

    if (coins.length === 0) {
      coins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'].slice(0, count);
    }

    // Check credits
    const costPerAnalysis = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');
    const totalCost = costPerAnalysis * coins.length;

    if (creditBalance < totalCost) {
      const maxCoins = Math.floor(creditBalance / costPerAnalysis);
      const { message, suggestions } = synthesizeError(
        language === 'tr'
          ? `${coins.length} coin için ${totalCost} kredi gerekli. Mevcut: ${creditBalance}. En fazla ${maxCoins} coin analiz edebilirsin.`
          : `${coins.length} coins require ${totalCost} credits. Available: ${creditBalance}. You can analyze up to ${maxCoins} coins.`,
        language
      );
      return {
        success: false,
        intent: 'MULTI_ANALYSIS',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    // Run analyses sequentially
    const results: QuickAnalysisResult[] = [];
    let totalSpent = 0;

    for (const symbol of coins) {
      const result = await this.handleAnalysisWithExpertPanel(
        userId,
        { symbol, interval: DEFAULT_INTERVAL },
        creditBalance - totalSpent,
        language
      );

      if (result.success && result.data && !('error' in result.data)) {
        results.push(result.data as QuickAnalysisResult);
        totalSpent += result.creditsSpent;
      }

      // Small delay between analyses to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (results.length === 0) {
      const { message, suggestions } = synthesizeError(
        language === 'tr' ? 'Hiçbir analiz tamamlanamadı.' : 'No analyses could be completed.',
        language
      );
      return {
        success: false,
        intent: 'MULTI_ANALYSIS',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const { message, suggestions } = synthesizeResponse({
      language,
      intent: 'MULTI_ANALYSIS',
      data: results,
    });

    const newBalance = await creditService.getBalance(userId);

    return {
      success: true,
      intent: 'MULTI_ANALYSIS',
      message,
      data: results,
      suggestions,
      creditsSpent: totalSpent,
      creditsRemaining: newBalance,
    };
  }

  /**
   * Handle expert questions using AI Expert chat
   * Routes to appropriate expert based on question topic
   */
  private async handleExpertAsk(
    userId: string,
    question: string,
    entities: IntentDetectionResult['entities'],
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    // Expert questions cost 5 credits (or free if within limit)
    const cost = 5;

    // Check if user has free questions remaining
    const lastAnalysis = await prisma.analysis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, aiExpertQuestionsUsed: true },
    });

    const freeQuestionsRemaining = lastAnalysis
      ? 3 - (lastAnalysis.aiExpertQuestionsUsed || 0)
      : 0;

    const actualCost = freeQuestionsRemaining > 0 ? 0 : cost;

    if (actualCost > 0 && creditBalance < actualCost) {
      const { message, suggestions } = synthesizeError(
        language === 'tr'
          ? `Expert sorusu için ${cost} kredi gerekli. Mevcut: ${creditBalance}`
          : `Expert question requires ${cost} credits. Available: ${creditBalance}`,
        language
      );
      return {
        success: false,
        intent: 'EXPERT_ASK',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    // Charge if not free
    if (actualCost > 0) {
      await creditService.charge(userId, actualCost, 'concierge_expert_question', {
        question: question.substring(0, 100),
      });
    }

    // Increment used count if using free quota
    if (freeQuestionsRemaining > 0 && lastAnalysis) {
      await prisma.analysis.update({
        where: { id: lastAnalysis.id },
        data: { aiExpertQuestionsUsed: (lastAnalysis.aiExpertQuestionsUsed || 0) + 1 },
      });
    }

    try {
      // Detect which expert should answer this question
      const expertId = entities.expertId || detectExpertForQuestion(question);

      // Use AI Expert service chat
      const chatResponse = await aiExpertService.chat({
        expertId: expertId as 'aria' | 'nexus' | 'oracle' | 'sentinel',
        message: question,
        userId,
      });

      const expert = aiExpertService.getExpert(expertId);

      const result: ExpertAskResult = {
        expertId,
        expertName: expert?.name || 'ARIA',
        answer: chatResponse.response,
        creditsSpent: actualCost,
      };

      const expertEmoji = {
        aria: '📊',
        nexus: '⚖️',
        oracle: '🐋',
        sentinel: '🛡️',
      }[expertId] || '🤖';

      const message = `${expertEmoji} **${result.expertName}**\n\n${result.answer}`;

      const newBalance = await creditService.getBalance(userId);

      const suggestions = language === 'tr'
        ? ['Başka soru sor', 'Analiz yap', 'Yardım']
        : ['Ask another question', 'Run analysis', 'Help'];

      return {
        success: true,
        intent: 'EXPERT_ASK',
        message,
        data: result,
        suggestions,
        creditsSpent: actualCost,
        creditsRemaining: newBalance,
      };
    } catch (error) {
      // Refund on failure
      if (actualCost > 0) {
        await creditService.add(userId, actualCost, 'BONUS', 'concierge_expert_refund', {
          question: question.substring(0, 100),
        });
      }
      throw error;
    }
  }

  /**
   * Handle alert creation
   */
  private async handleAlertSet(
    userId: string,
    entities: IntentDetectionResult['entities'],
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    const { symbol, targetPrice, direction } = entities;

    if (!symbol || !targetPrice) {
      const { message, suggestions } = synthesizeError(
        language === 'tr'
          ? 'Alarm için coin ve hedef fiyat belirt. Örnek: "BTC 70K olunca haber ver"'
          : 'Specify coin and target price for alert. Example: "Alert me when BTC hits 70K"',
        language
      );
      return {
        success: false,
        intent: 'ALERT_SET',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Alerts cost 1 credit
    const cost = 1;
    if (creditBalance < cost) {
      const { message, suggestions } = synthesizeError(
        language === 'tr'
          ? `Alarm için ${cost} kredi gerekli. Mevcut: ${creditBalance}`
          : `Alert requires ${cost} credit. Available: ${creditBalance}`,
        language
      );
      return {
        success: false,
        intent: 'ALERT_SET',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    // Charge credits
    await creditService.charge(userId, cost, 'concierge_alert', {
      symbol,
      targetPrice,
    });

    try {
      // Create alert
      const alert = await prisma.priceAlert.create({
        data: {
          userId,
          symbol,
          targetPrice,
          direction: direction === 'below' ? 'BELOW' : 'ABOVE',
          alertType: 'CUSTOM',
          channels: ['browser'],
          isActive: true,
          creditsSpent: cost,
        },
      });

      const result: AlertSetResult = {
        alertId: alert.id,
        symbol,
        targetPrice,
        direction: direction || 'above',
        creditsSpent: cost,
      };

      const { message, suggestions } = synthesizeResponse({
        language,
        intent: 'ALERT_SET',
        data: result,
      });

      const newBalance = await creditService.getBalance(userId);

      return {
        success: true,
        intent: 'ALERT_SET',
        message,
        data: result,
        suggestions,
        creditsSpent: cost,
        creditsRemaining: newBalance,
      };
    } catch (error) {
      // Refund on failure
      await creditService.add(userId, cost, 'BONUS', 'concierge_alert_refund', {
        symbol,
        targetPrice,
      });
      throw error;
    }
  }

  /**
   * Handle status/history queries
   */
  private async handleStatus(
    userId: string,
    language: string
  ): Promise<ConciergeResponse> {
    // Get recent analyses
    const recentAnalyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        symbol: true,
        totalScore: true,
        step7Result: true,
        createdAt: true,
      },
    });

    // Get active alerts count
    const activeAlerts = await prisma.priceAlert.count({
      where: { userId, isActive: true },
    });

    // Get credit balance
    const creditBalance = await creditService.getBalance(userId);

    const result: StatusResult = {
      recentAnalyses: recentAnalyses.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        verdict: mapVerdict((a.step7Result as { verdict?: string })?.verdict || 'wait'),
        score: Number(a.totalScore) || 0,
        createdAt: a.createdAt,
      })),
      activeAlerts,
      creditBalance,
    };

    const { message, suggestions } = synthesizeResponse({
      language,
      intent: 'STATUS',
      data: result,
    });

    return {
      success: true,
      intent: 'STATUS',
      message,
      data: result,
      suggestions,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  /**
   * Handle help requests
   */
  private async handleHelp(
    language: string,
    creditBalance: number
  ): Promise<ConciergeResponse> {
    const { message, suggestions } = synthesizeHelp(language);

    return {
      success: true,
      intent: 'HELP',
      message,
      suggestions,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  /**
   * Handle unknown intents
   */
  private handleUnknown(
    language: string,
    creditBalance: number
  ): ConciergeResponse {
    const { message, suggestions } = synthesizeError(
      language === 'tr'
        ? 'Anlayamadım. "Yardım" yazarak ne yapabileceğimi görebilirsin.'
        : 'I didn\'t understand. Type "help" to see what I can do.',
      language
    );

    return {
      success: false,
      intent: 'UNKNOWN',
      message,
      suggestions,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }
}

export const conciergeService = new ConciergeService();
