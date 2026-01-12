// ===========================================
// Expert AI Service
// Provides AI-powered answers with real examples from TraderPath
// ===========================================

import { prisma } from '../../core/database';
import { config } from '../../core/config';
import { costService } from '../costs/cost.service';

// Topic categories for question classification
type TopicCategory =
  | 'TECHNICAL_ANALYSIS'
  | 'WHALE_BEHAVIOR'
  | 'RISK_MANAGEMENT'
  | 'MARKET_STRUCTURE'
  | 'MANIPULATION'
  | 'PSYCHOLOGY'
  | 'TRADE_PLAN'
  | 'ENTRY_EXIT'
  | 'GENERAL';

interface ExampleData {
  type: 'analysis' | 'quiz' | 'pattern';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

interface ExpertResponse {
  answer: string;
  examples: ExampleData[];
  relatedTopics: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Keywords for topic classification
const TOPIC_KEYWORDS: Record<TopicCategory, string[]> = {
  TECHNICAL_ANALYSIS: [
    'rsi', 'macd', 'bollinger', 'moving average', 'ma', 'ema', 'sma',
    'trend', 'support', 'resistance', 'indicator',
    'technical', 'chart', 'fibonacci', 'fib', 'pivot', 'atr', 'volume'
  ],
  WHALE_BEHAVIOR: [
    'whale', 'big buyer', 'big seller', 'accumulation',
    'distribution', 'smart money', 'exchange flow', 'inflow', 'outflow'
  ],
  RISK_MANAGEMENT: [
    'risk', 'stop loss', 'position size', 'risk/reward', 'capital', 'loss',
    'management', 'portfolio', 'diversification'
  ],
  MARKET_STRUCTURE: [
    'btc dominance', 'dominance', 'market cap', 'fear greed', 'bull', 'bear',
    'market cycle', 'trend', 'regime', 'altcoin season'
  ],
  MANIPULATION: [
    'manipulation', 'pump', 'dump', 'spoofing', 'wash trading', 'fake volume',
    'iceberg', 'layering', 'front running', 'scam'
  ],
  PSYCHOLOGY: [
    'fomo', 'fud', 'fear', 'greed', 'panic', 'patience', 'discipline',
    'emotion', 'psychology', 'mental'
  ],
  TRADE_PLAN: [
    'trade plan', 'strategy', 'entry', 'exit', 'take profit', 'target',
    'dca', 'average', 'trailing'
  ],
  ENTRY_EXIT: [
    'when', 'entry', 'exit', 'timing', 'buy', 'sell', 'wait', 'now', 'optimal', 'best'
  ],
  GENERAL: []
};

export class ExpertService {
  /**
   * Classify the topic of a question
   */
  private classifyTopic(question: string): TopicCategory {
    const lowerQuestion = question.toLowerCase();

    let bestMatch: TopicCategory = 'GENERAL';
    let bestScore = 0;

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (topic === 'GENERAL') continue;

      const score = keywords.filter(kw => lowerQuestion.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = topic as TopicCategory;
      }
    }

    return bestMatch;
  }

  /**
   * Find relevant examples from TraderPath based on question topic
   */
  async findExamples(question: string, userId?: string): Promise<ExampleData[]> {
    const topic = this.classifyTopic(question);
    const examples: ExampleData[] = [];

    // Valid QuizCategory values in Prisma schema
    const validQuizCategories = ['TECHNICAL_ANALYSIS', 'WHALE_BEHAVIOR', 'RISK_MANAGEMENT', 'MARKET_STRUCTURE', 'MANIPULATION', 'PSYCHOLOGY'];
    const quizCategory = validQuizCategories.includes(topic) ? topic : undefined;

    try {
      // 1. Get relevant quiz questions as educational examples
      const quizzes = await prisma.quiz.findMany({
        where: {
          category: quizCategory as any,
          isActive: true,
        },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      for (const quiz of quizzes) {
        const options = quiz.options as string[];
        examples.push({
          type: 'quiz',
          title: 'Educational Example',
          description: quiz.question,
          details: {
            correctAnswer: options[quiz.correctIndex],
            explanation: quiz.explanation || '',
            category: quiz.category,
          },
        });
      }

      // 2. Get user's recent analyses as real trading examples
      if (userId) {
        const recentAnalyses = await prisma.analysis.findMany({
          where: {
            userId,
            step7Result: { not: null }, // Only completed analyses
          },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            symbol: true,
            step2Result: true, // Asset scan
            step3Result: true, // Safety check
            step5Result: true, // Trade plan
            step7Result: true, // Verdict
            createdAt: true,
          },
        });

        for (const analysis of recentAnalyses) {
          const verdict = analysis.step7Result as Record<string, unknown> | null;
          const tradePlan = analysis.step5Result as Record<string, unknown> | null;
          const safety = analysis.step3Result as Record<string, unknown> | null;

          if (verdict) {
            examples.push({
              type: 'analysis',
              title: `${analysis.symbol} Analysis`,
              description: `Real analysis example: ${(verdict.verdict as string || 'N/A').toUpperCase()} signal`,
              details: {
                symbol: analysis.symbol,
                verdict: verdict.verdict,
                score: verdict.overallScore,
                direction: tradePlan?.direction || 'N/A',
                riskLevel: safety?.riskLevel || 'N/A',
                date: analysis.createdAt,
              },
            });
          }
        }
      }

      // 3. Add pattern examples based on topic
      const patternExamples = this.getPatternExamples(topic);
      examples.push(...patternExamples);

    } catch (error) {
      console.error('Error finding examples:', error);
    }

    return examples.slice(0, 5); // Return max 5 examples
  }

  /**
   * Get pattern examples for educational purposes
   */
  private getPatternExamples(topic: TopicCategory): ExampleData[] {
    const patterns: Record<TopicCategory, ExampleData[]> = {
      TECHNICAL_ANALYSIS: [
        {
          type: 'pattern',
          title: 'RSI Oversold Example',
          description: 'When RSI drops below 30, potential buy opportunity',
          details: {
            indicator: 'RSI',
            condition: 'RSI < 30',
            action: 'Consider buying opportunity',
            note: 'Not sufficient alone, confirm with trend and volume',
          },
        },
        {
          type: 'pattern',
          title: 'MACD Crossover Example',
          description: 'When MACD line crosses above signal line, buy signal',
          details: {
            indicator: 'MACD',
            condition: 'MACD > Signal',
            action: 'Bullish momentum',
            note: 'When histogram turns positive, strength is increasing',
          },
        },
      ],
      WHALE_BEHAVIOR: [
        {
          type: 'pattern',
          title: 'Whale Accumulation Example',
          description: 'Large exchange outflows indicate accumulation',
          details: {
            signal: 'Exchange Outflow',
            meaning: 'Large investors moving to cold wallets',
            action: 'Could be bullish signal',
            note: 'Net outflow > $100M is strong signal',
          },
        },
      ],
      MANIPULATION: [
        {
          type: 'pattern',
          title: 'Pump & Dump Detection',
          description: 'Sudden price spike + high volume = caution!',
          details: {
            warning: 'Price +20% increase + 5x normal volume',
            risk: 'High pump & dump probability',
            action: 'Avoid FOMO, wait and observe',
            note: 'Especially watch low market cap coins',
          },
        },
      ],
      RISK_MANAGEMENT: [
        {
          type: 'pattern',
          title: 'Position Sizing Example',
          description: '1% rule: Maximum 1% risk per trade',
          details: {
            example: '$10,000 portfolio = $100 maximum risk',
            stopLoss: '5% stop loss = $2,000 position',
            note: 'Risk/Reward should be at least 1:2',
          },
        },
      ],
      TRADE_PLAN: [
        {
          type: 'pattern',
          title: 'DCA Entry Strategy',
          description: 'Gradual buying to reduce average cost',
          details: {
            entry1: '40% - First entry (current price)',
            entry2: '30% - Second entry (3-5% drop)',
            entry3: '30% - Third entry (7-10% drop)',
            note: 'Set stop loss based on average entry',
          },
        },
      ],
      MARKET_STRUCTURE: [
        {
          type: 'pattern',
          title: 'BTC Dominance Effect',
          description: 'When BTC dominance rises, altcoins usually fall',
          details: {
            scenario1: 'BTC dominance ↑ + BTC price ↑ = Altcoin selling',
            scenario2: 'BTC dominance ↓ + BTC price ↑ = Altcoin season',
            action: 'Follow dominance trend',
          },
        },
      ],
      PSYCHOLOGY: [
        {
          type: 'pattern',
          title: 'FOMO Control',
          description: 'Don\'t chase pumping coins, stick to your plan',
          details: {
            rule: 'Buy on red candles, not green candles',
            mindset: 'Missed trades don\'t matter, capital protection does',
            tip: 'Not trading is also a strategy',
          },
        },
      ],
      ENTRY_EXIT: [
        {
          type: 'pattern',
          title: 'Optimal Entry Timing',
          description: 'Buy near support, sell near resistance',
          details: {
            entry: 'Price near support and RSI < 40',
            exit: 'Price near resistance or RSI > 70',
            confirmation: 'Confirm with volume increase',
          },
        },
      ],
      GENERAL: [],
    };

    return patterns[topic] || [];
  }

  /**
   * Generate expert answer using Gemini AI
   */
  async generateAnswer(
    question: string,
    examples: ExampleData[],
    userId?: string
  ): Promise<ExpertResponse> {
    const topic = this.classifyTopic(question);
    const startTime = Date.now();

    // Format examples for the prompt
    const examplesText = examples.map((ex, i) => {
      const detailsStr = Object.entries(ex.details)
        .map(([k, v]) => `  - ${k}: ${JSON.stringify(v)}`)
        .join('\n');
      return `Example ${i + 1} (${ex.type}): ${ex.title}\n${ex.description}\n${detailsStr}`;
    }).join('\n\n');

    const prompt = `You are TraderPath's expert trading educator. You help users learn about crypto trading.

USER QUESTION:
${question}

DETECTED TOPIC: ${topic}

REAL EXAMPLES FROM TraderPath:
${examplesText || 'No relevant examples yet'}

IMPORTANT INSTRUCTIONS:
1. Answer in ENGLISH (professional but understandable language)
2. If examples are available, include them in your answer and reference them like "As we see in TraderPath..."
3. Give practical and actionable advice
4. Warn about risks but don't create excessive fear
5. Keep your answer 3-5 paragraphs
6. Always include "This is not financial advice" disclaimer

RESPONSE FORMAT:
- First, answer the question directly
- Then, explain with examples
- Finally, give practical advice`;

    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      return {
        answer: 'Expert AI is currently unavailable. Please try again later.',
        examples,
        relatedTopics: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', response.statusText);
        return {
          answer: 'Expert AI could not generate a response. Please try again.',
          examples,
          relatedTopics: [],
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        };
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate response';

      // Extract token usage
      const usageMetadata = data.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount || Math.ceil(prompt.length / 4);
      const outputTokens = usageMetadata.candidatesTokenCount || Math.ceil(answer.length / 4);

      // Calculate cost
      const costUsd = costService.calculateGeminiCost(inputTokens, outputTokens);
      const durationMs = Date.now() - startTime;

      // Log cost
      costService.logCost({
        service: 'gemini',
        operation: 'expert_question',
        inputTokens,
        outputTokens,
        costUsd,
        userId,
        durationMs,
        metadata: { topic, questionLength: question.length },
      }).catch(err => console.error('Failed to log cost:', err));

      // Get related topics
      const relatedTopics = this.getRelatedTopics(topic);

      return {
        answer,
        examples,
        relatedTopics,
        inputTokens,
        outputTokens,
        costUsd,
      };
    } catch (error) {
      console.error('Expert AI error:', error);
      return {
        answer: 'An error occurred. Please try again.',
        examples,
        relatedTopics: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }
  }

  /**
   * Get related topics for further learning
   */
  private getRelatedTopics(topic: TopicCategory): string[] {
    const relatedMap: Record<TopicCategory, string[]> = {
      TECHNICAL_ANALYSIS: ['Support/Resistance Levels', 'RSI Strategies', 'Trend Analysis'],
      WHALE_BEHAVIOR: ['Exchange Flow Analysis', 'Smart Money Tracking', 'Order Book Reading'],
      RISK_MANAGEMENT: ['Position Sizing', 'Stop Loss Strategies', 'Portfolio Diversification'],
      MARKET_STRUCTURE: ['BTC Dominance', 'Altcoin Seasons', 'Market Cycles'],
      MANIPULATION: ['Pump & Dump Detection', 'Wash Trading', 'Spoofing'],
      PSYCHOLOGY: ['FOMO Control', 'Discipline', 'Trading Plan'],
      TRADE_PLAN: ['Entry Strategies', 'Take Profit Setting', 'DCA Method'],
      ENTRY_EXIT: ['Timing', 'Volume Analysis', 'Momentum Trading'],
      GENERAL: ['Technical Analysis Basics', 'Risk Management', 'Psychology'],
    };

    return relatedMap[topic] || relatedMap.GENERAL;
  }

  /**
   * Main method: Ask the expert
   */
  async askExpert(question: string, userId?: string): Promise<ExpertResponse> {
    // Find relevant examples
    const examples = await this.findExamples(question, userId);

    // Generate answer
    const response = await this.generateAnswer(question, examples, userId);

    return response;
  }
}

export const expertService = new ExpertService();
