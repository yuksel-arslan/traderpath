import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { analysisEngine } from '../analysis/analysis.engine';
import { getTradeTypeFromInterval, TradeType } from '../analysis/config/trade-config';
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
import { callGeminiWithRetry } from '../../core/gemini';

// Default interval when user doesn't specify
const DEFAULT_INTERVAL = '4h';

// Map interval to trade type
function resolveTradeType(interval: string): TradeType {
  return getTradeTypeFromInterval(interval as '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1W');
}

// Map verdict string to VerdictType
function mapVerdict(verdict: string): VerdictType {
  const upper = verdict?.toUpperCase() || '';
  if (upper.includes('CONDITIONAL') || upper === 'COND') return 'CONDITIONAL_GO';
  if (upper === 'GO' || upper.includes('BUY') || upper.includes('LONG')) return 'GO';
  if (upper === 'AVOID' || upper.includes('AVOID')) return 'AVOID';
  return 'WAIT';
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
        return this.handleAnalysis(userId, entities, creditBalance, language);

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
   * Handle quick/specific analysis
   */
  private async handleAnalysis(
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

    // Get cost
    const cost = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');

    // Check credits
    if (creditBalance < cost) {
      const { message, suggestions } = synthesizeError(
        language === 'tr'
          ? `Yetersiz kredi. Mevcut: ${creditBalance}, Gerekli: ${cost}`
          : `Insufficient credits. Available: ${creditBalance}, Required: ${cost}`,
        language
      );
      return {
        success: false,
        intent: 'QUICK_ANALYSIS',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    // Determine interval and trade type
    const interval = entities.interval || DEFAULT_INTERVAL;
    const tradeType: TradeType = (entities.tradeType as TradeType) || resolveTradeType(interval);

    // Charge credits
    const chargeResult = await creditService.charge(userId, cost, 'concierge_analysis', {
      symbol,
      interval,
      tradeType,
    });

    if (!chargeResult.success) {
      const { message, suggestions } = synthesizeError(
        language === 'tr' ? 'Kredi çekilemedi.' : 'Failed to charge credits.',
        language
      );
      return {
        success: false,
        intent: 'QUICK_ANALYSIS',
        message,
        suggestions,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'CHARGE_FAILED',
      };
    }

    try {
      // Run full analysis
      const [marketPulse, assetScan, safetyCheck, timing, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(symbol, tradeType),
        analysisEngine.safetyCheck(symbol, tradeType),
        analysisEngine.timingAnalysis(symbol, tradeType),
        analysisEngine.trapCheck(symbol, tradeType),
      ]);

      // Preliminary verdict
      const preliminaryVerdict = analysisEngine.preliminaryVerdict(symbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        trapCheck,
      });

      // Trade plan
      const tradePlan = await analysisEngine.integratedTradePlan(
        symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        1000 // Default account size
      );

      // Final verdict
      const verdict = await analysisEngine.getFinalVerdict(
        symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        tradePlan,
        tradeType
      );

      // Save to database
      const savedAnalysis = await prisma.analysis.create({
        data: {
          userId,
          symbol,
          interval,
          stepsCompleted: [1, 2, 3, 4, 5, 6, 7],
          step1Result: marketPulse as object,
          step2Result: assetScan as object,
          step3Result: safetyCheck as object,
          step4Result: timing as object,
          step5Result: tradePlan as object || null,
          step6Result: trapCheck as object,
          step7Result: { ...verdict, preliminaryVerdict } as object,
          totalScore: verdict.overallScore,
          creditsSpent: cost,
        },
      });

      // Apply trade type bonus
      const tradeTypeBonus = tradeType === 'scalping' ? 3 : tradeType === 'dayTrade' ? 2 : 1;
      await creditService.add(userId, tradeTypeBonus, 'BONUS', 'trade_type_completion_bonus', {
        tradeType,
        symbol,
      });

      // Build result
      const analysisResult: QuickAnalysisResult = {
        symbol,
        interval,
        tradeType,
        verdict: mapVerdict(verdict.verdict || preliminaryVerdict.verdict),
        score: verdict.overallScore,
        direction: tradePlan?.direction || preliminaryVerdict.direction || 'long',
        entry: tradePlan?.averageEntry || assetScan.currentPrice,
        stopLoss: tradePlan?.stopLoss?.price || 0,
        takeProfit1: tradePlan?.takeProfits?.[0]?.price || 0,
        takeProfit2: tradePlan?.takeProfits?.[1]?.price,
        takeProfit3: tradePlan?.takeProfits?.[2]?.price,
        riskReward: tradePlan?.riskReward || 0,
        reasoning: verdict.recommendation || verdict.aiSummary || '',
        analysisId: savedAnalysis.id,
        creditsSpent: cost - tradeTypeBonus,
      };

      const { message, suggestions } = synthesizeResponse({
        language,
        intent: 'QUICK_ANALYSIS',
        data: analysisResult,
      });

      const newBalance = await creditService.getBalance(userId);

      return {
        success: true,
        intent: 'QUICK_ANALYSIS',
        message,
        data: analysisResult,
        suggestions,
        creditsSpent: cost - tradeTypeBonus,
        creditsRemaining: newBalance,
      };
    } catch (error) {
      // Refund on failure
      await creditService.add(userId, cost, 'BONUS', 'concierge_analysis_refund', {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Handle multi-coin analysis
   */
  private async handleMultiAnalysis(
    userId: string,
    entities: IntentDetectionResult['entities'],
    creditBalance: number,
    language: string
  ): Promise<ConciergeResponse> {
    // Get user's preferred coins or top coins
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

    // If no preferred coins, use defaults
    if (coins.length === 0) {
      coins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'].slice(0, count);
    }

    // Check if enough credits for all analyses
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

    // Run analyses sequentially to avoid rate limits
    const results: QuickAnalysisResult[] = [];
    let totalSpent = 0;

    for (const symbol of coins) {
      const result = await this.handleAnalysis(
        userId,
        { symbol, interval: DEFAULT_INTERVAL },
        creditBalance - totalSpent,
        language
      );

      if (result.success && result.data && !('error' in result.data)) {
        results.push(result.data as QuickAnalysisResult);
        totalSpent += result.creditsSpent;
      }

      // Small delay between analyses
      await new Promise((resolve) => setTimeout(resolve, 500));
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
   * Handle expert questions
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

    // Check if user has free questions remaining (we'll check against last analysis)
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
      // Use Gemini to answer the question
      const expertPrompt = `You are ARIA, a friendly crypto trading expert assistant for TraderPath platform.
Answer the following trading/crypto question in a helpful, educational way.
Keep your answer concise (2-3 paragraphs max).
If the question is in Turkish, answer in Turkish. If in English, answer in English.
Use simple language that beginners can understand.

Question: ${question}`;

      const geminiResponse = await callGeminiWithRetry(
        {
          contents: [{ parts: [{ text: expertPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        },
        3,
        'concierge_expert'
      );

      const answer = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, şu anda yanıt oluşturamıyorum.';

      const result: ExpertAskResult = {
        expertId: entities.expertId || 'aria',
        expertName: 'ARIA',
        answer,
        creditsSpent: actualCost,
      };

      const { message, suggestions } = synthesizeResponse({
        language,
        intent: 'EXPERT_ASK',
        data: result,
      });

      const newBalance = await creditService.getBalance(userId);

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
