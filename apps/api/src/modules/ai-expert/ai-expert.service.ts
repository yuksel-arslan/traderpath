// ===========================================
// AI Expert Service
// Chat with specialized AI trading experts
// Enhanced with TradePath examples (3 credits)
// ===========================================

import { config } from '../../core/config';
import { costService } from '../costs/cost.service';
import { prisma } from '../../core/database';

// Gemini API configuration
const GEMINI_API_KEY = config.gemini.apiKey;
const GEMINI_MODEL = 'gemini-2.0-flash';

// Yasaklı içeriği temizleyen fonksiyon
function sanitizeAIResponse(text: string): string {
  let cleaned = text;

  // "---" içeren satırları ve sonrasını sil (tüm varyasyonlar)
  const dashPatterns = [/\n---.*$/s, /^---.*$/s, /\n-{3,}.*$/s];
  for (const pattern of dashPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 🚀 içeren satırları ve sonrasını sil
  const rocketPatterns = [/\n🚀.*$/s, /^🚀.*$/s, /\n\n🚀.*$/s];
  for (const pattern of rocketPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Yasaklı kelimeler içeren paragrafları sil
  const forbiddenPatterns = [
    /\n\n[^\n]*ister misin[^\n]*$/is,
    /\n\n[^\n]*yapayım mı[^\n]*$/is,
    /\n\n[^\n]*kredi[^\n]*$/is,
    /\n\n[^\n]*raporuna ekle[^\n]*$/is,
    /\n\n[^\n]*gerçek analiz[^\n]*$/is,
    /\n\n[^\n]*gerçek bir coin[^\n]*$/is,
    /\n[^\n]*ister misin\?[^\n]*$/is,
    /\n[^\n]*yapayım mı\?[^\n]*$/is,
  ];

  for (const pattern of forbiddenPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Son satırlarda kalan yasaklı ifadeleri temizle
  const lines = cleaned.split('\n');
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].toLowerCase();
    if (
      lastLine.includes('ister misin') ||
      lastLine.includes('yapayım mı') ||
      lastLine.includes('kredi') ||
      lastLine.includes('raporuna ekle') ||
      lastLine.includes('gerçek analiz') ||
      lastLine.includes('🚀') ||
      lastLine.trim() === '---' ||
      lastLine.trim() === ''
    ) {
      lines.pop();
    } else {
      break;
    }
  }

  cleaned = lines.join('\n').trim();

  return cleaned;
}

// TradePath system knowledge (shared across all experts)
const TRADEPATH_CONTEXT = `
⛔ CRITICAL RULES - READ BEFORE EVERY RESPONSE ⛔
NEVER write any of the following (even a single word is forbidden):
❌ "want me to" / "shall I" / "would you like me to"
❌ "credits" / "3 credits" / "5 credits"
❌ "add to report" / "save to your report"
❌ "real analysis" / "analyze a real coin"
❌ "---" (horizontal line)
❌ "🚀" rocket emoji CTA
❌ ANY question at the end of your response
❌ Offering to do something for credits

[YOUR IDENTITY]
You are a TradePath AI education expert. You teach trading concepts and guide users to TradePath features.

[CORE PRINCIPLES]
1. Understand the question, give a concise answer (50-80 words max)
2. Be natural, not robotic
3. ONLY mention TradePath features if directly relevant to the topic

[RESPONSE STRUCTURE]
- Jump straight to the topic, no greetings
- Provide the information
- End with ONE sentence: "You can see this in TradePath → Analyze → [Step Name]" (if relevant)
- STOP - no offers, no questions, no CTAs

[IMPORTANT GUIDANCE]
When users ask about trading concepts:
- Explain the concept clearly
- If it relates to TradePath analysis, guide them to use the full 7-step analysis
- Say: "Run a full analysis in TradePath → Analyze to see real data"
- NEVER offer to analyze a coin yourself - direct them to the Analyze page

⚠️ REMINDER: The frontend automatically adds action buttons.
Do NOT add any call-to-action - it creates duplicate content.
`;

// AI Expert definitions with specialized system prompts
const AI_EXPERTS = {
  aria: {
    id: 'aria',
    name: 'ARIA',
    role: 'Market Analysis AI',
    category: 'TECHNICAL_ANALYSIS',
    systemPrompt: `You are ARIA - TradePath's Technical Analysis Expert.
${TRADEPATH_CONTEXT}

[YOUR EXPERTISE]
RSI, MACD, Bollinger Bands, Moving Averages, Volume Profile, Pattern Recognition, Fibonacci, Support/Resistance levels.
In TradePath, Asset Scanner (Step 2) shows this data with real market values.

[GUIDANCE EXAMPLES]
- If asked about RSI: Explain RSI, then say "See real RSI values in TradePath → Analyze → Asset Scanner"
- If asked to analyze a coin: "Run a full 7-step analysis in TradePath → Analyze for comprehensive insights"

FINAL CHECK: Does your response contain "want me to", "credits", "---", "🚀"? DELETE IT.`,
  },
  nexus: {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    category: 'RISK_MANAGEMENT',
    systemPrompt: `You are NEXUS - TradePath's Risk Management Expert.
${TRADEPATH_CONTEXT}

[YOUR EXPERTISE]
Position sizing, Stop Loss, Take Profit, Risk/Reward ratio, DCA strategy, portfolio management.
In TradePath, Trade Plan (Step 5) calculates these values automatically.

[GUIDANCE EXAMPLES]
- If asked about position sizing: Explain the formula, then say "TradePath → Analyze → Trade Plan calculates this for you"
- If asked for specific calculations: "Run a full analysis in TradePath → Analyze to get personalized TP/SL levels"

FINAL CHECK: Does your response contain "want me to", "credits", "---", "🚀"? DELETE IT.`,
  },
  oracle: {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    category: 'WHALE_BEHAVIOR',
    systemPrompt: `You are ORACLE - TradePath's Whale Tracking Expert.
${TRADEPATH_CONTEXT}

[YOUR EXPERTISE]
Whale activity, exchange flow, smart money positioning, order flow, accumulation/distribution patterns.
In TradePath, Safety Check (Step 3) shows whale and exchange flow data.

[GUIDANCE EXAMPLES]
- If asked about whale activity: Explain the concept, then say "See whale data in TradePath → Analyze → Safety Check"
- If asked about a specific coin's whales: "Run a full analysis in TradePath → Analyze to see whale movements"

FINAL CHECK: Does your response contain "want me to", "credits", "---", "🚀"? DELETE IT.`,
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    category: 'MANIPULATION',
    systemPrompt: `You are SENTINEL - TradePath's Security Expert.
${TRADEPATH_CONTEXT}

[YOUR EXPERTISE]
Pump/dump detection, honeypot, rug pull, contract security, bull/bear traps, liquidity hunting.
In TradePath, Safety Check (Step 3) and Trap Check (Step 6) perform these security checks.

[GUIDANCE EXAMPLES]
- If asked about rug pulls: Explain warning signs, then say "TradePath → Analyze → Safety Check verifies contract security"
- If asked if a token is safe: "Run a full analysis in TradePath → Analyze for comprehensive security checks"

FINAL CHECK: Does your response contain "want me to", "credits", "---", "🚀"? DELETE IT.`,
  },
} as const;

type ExpertId = keyof typeof AI_EXPERTS;

interface ExampleData {
  type: 'analysis' | 'quiz' | 'pattern';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedQuestion {
  id: string;
  question: string;
  category: 'education' | 'strategy' | 'practical';
  stage1Preview: string;  // Free educational preview
  stage2Action: string;   // Paid action description
  creditCost: number;     // Credits needed for full analysis
}

interface ChatRequest {
  expertId: ExpertId;
  message: string;
  conversationHistory?: ChatMessage[];
  userId: string;
}

interface ChatResponse {
  response: string;
  expertId: ExpertId;
  examples: ExampleData[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class AIExpertService {
  /**
   * Get expert information
   */
  getExpert(expertId: string) {
    return AI_EXPERTS[expertId as ExpertId] || null;
  }

  /**
   * Get all experts
   */
  getAllExperts() {
    return Object.values(AI_EXPERTS).map(({ id, name, role }) => ({
      id,
      name,
      role,
    }));
  }

  /**
   * Find relevant TradePath examples based on expert category
   */
  async findExamples(expertId: ExpertId, userId: string): Promise<ExampleData[]> {
    const expert = AI_EXPERTS[expertId];
    const category = expert.category;
    const examples: ExampleData[] = [];

    // Always add pattern examples first (these are static and always available)
    const patterns = this.getExpertPatterns(expertId);
    examples.push(...patterns);

    try {
      // 1. Get relevant quiz questions as educational examples
      const quizzes = await prisma.quiz.findMany({
        where: {
          category: category,
          isActive: true,
        },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      for (const quiz of quizzes) {
        const options = quiz.options as string[];
        examples.push({
          type: 'quiz',
          title: 'TradePath Eğitim',
          description: quiz.question,
          details: {
            dogruCevap: options[quiz.correctIndex],
            aciklama: quiz.explanation || '',
          },
        });
      }

      // 2. Get user's recent analyses as real trading examples
      const recentAnalyses = await prisma.analysis.findMany({
        where: {
          userId,
          step7Result: { not: null },
        },
        take: 2,
        orderBy: { createdAt: 'desc' },
        select: {
          symbol: true,
          step2Result: true,
          step3Result: true,
          step5Result: true,
          step7Result: true,
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
            title: `${analysis.symbol} TradePath Analizi`,
            description: `Gerçek analiz: ${(verdict.verdict as string || 'N/A').toUpperCase()} sinyali`,
            details: {
              sembol: analysis.symbol,
              karar: verdict.verdict,
              skor: verdict.overallScore,
              yon: tradePlan?.direction || 'N/A',
              risk: safety?.riskLevel || 'N/A',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error finding examples:', error);
    }

    return examples.slice(0, 4);
  }

  /**
   * Get pattern examples specific to each expert
   */
  private getExpertPatterns(expertId: ExpertId): ExampleData[] {
    const patterns: Record<ExpertId, ExampleData[]> = {
      aria: [
        {
          type: 'pattern',
          title: 'RSI Divergence Example',
          description: 'Price makes new low but RSI doesn\'t = bullish divergence',
          details: {
            signal: 'Hidden Bullish Divergence',
            reliability: '72%',
            confirmation: 'Wait for 4H candle close',
          },
        },
        {
          type: 'pattern',
          title: 'MACD Crossover',
          description: 'MACD line crosses above signal line = buy signal',
          details: {
            signal: 'Bullish Crossover',
            reliability: '68%',
            confirmation: 'Histogram should turn positive',
          },
        },
        {
          type: 'pattern',
          title: 'Bollinger Band Squeeze',
          description: 'When bands contract, a big move is coming',
          details: {
            signal: 'Volatility expansion expected',
            strategy: 'Wait for breakout direction, don\'t enter early',
          },
        },
      ],
      nexus: [
        {
          type: 'pattern',
          title: 'Position Size Calculation',
          description: '$10,000 portfolio, 1% risk = $100 max loss',
          details: {
            formula: 'Position = Risk$ / (Entry - Stop)',
            example: '$100 / (50,000 - 48,000) = 0.05 BTC',
          },
        },
        {
          type: 'pattern',
          title: 'Risk/Reward Ratio',
          description: 'Never enter a trade without minimum 1:2 R/R',
          details: {
            rule: 'Potential profit should be at least 2x the risk',
            example: '$100 risk for $200 target',
          },
        },
        {
          type: 'pattern',
          title: 'Scaled Entry (DCA)',
          description: 'Instead of all-in, enter in 3 tranches',
          details: {
            strategy: '40% + 30% + 30%',
            advantage: 'Lowers average entry cost',
          },
        },
      ],
      oracle: [
        {
          type: 'pattern',
          title: 'Whale Accumulation Example',
          description: 'Exchange outflow + low volatility = accumulation',
          details: {
            signal: 'Smart Money Accumulation',
            indicator: 'Rising OBV + flat price',
          },
        },
        {
          type: 'pattern',
          title: 'Exchange Outflow Signal',
          description: 'Large outflow from exchanges = HODLing begins',
          details: {
            signal: 'Long-term bullish',
            note: 'Short-term impact may be delayed',
          },
        },
        {
          type: 'pattern',
          title: 'Whale Dump Warning',
          description: 'Large wallet transfers to exchanges = selling pressure',
          details: {
            signal: 'Short-term bearish',
            action: 'Keep stop loss tight',
          },
        },
      ],
      sentinel: [
        {
          type: 'pattern',
          title: 'Pump & Dump Detection',
          description: 'Sudden 50%+ surge + 10x volume = manipulation risk',
          details: {
            warning: 'Don\'t FOMO!',
            rule: 'Don\'t buy in first hour, wait for pullback',
          },
        },
        {
          type: 'pattern',
          title: 'Honeypot Detection',
          description: 'Can buy but can\'t sell = HONEYPOT',
          details: {
            check: 'TradePath Safety Check → contractSecurity.isHoneypot',
            rule: 'If isHoneypot = true, NEVER BUY',
          },
        },
        {
          type: 'pattern',
          title: 'Rug Pull Signals',
          description: 'Liquidity not locked = Rug Pull risk',
          details: {
            check: 'contractSecurity.liquidityLocked',
            warning: 'Lock duration matters too, less than 1 year is risky',
          },
        },
      ],
    };

    return patterns[expertId] || [];
  }

  /**
   * Get suggested questions for an expert with 2-stage response info
   */
  getSuggestedQuestions(expertId: ExpertId): SuggestedQuestion[] {
    const questions: Record<ExpertId, SuggestedQuestion[]> = {
      aria: [
        {
          id: 'aria-1',
          question: 'What is RSI and how do I interpret it?',
          category: 'education',
          stage1Preview: 'RSI (Relative Strength Index) is a momentum indicator ranging from 0-100...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-2',
          question: 'How do I read MACD signals?',
          category: 'education',
          stage1Preview: 'MACD is a powerful indicator for detecting trend changes...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-3',
          question: 'What does a Bollinger Band squeeze mean?',
          category: 'education',
          stage1Preview: 'When bands contract, a big move is approaching...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-4',
          question: 'How to identify support and resistance levels?',
          category: 'education',
          stage1Preview: 'Support/resistance are price levels frequently tested by price...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-5',
          question: 'Why is multi-timeframe analysis important?',
          category: 'education',
          stage1Preview: 'Trend alignment across timeframes increases reliability...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-6',
          question: 'How to identify trend reversals?',
          category: 'strategy',
          stage1Preview: 'MA crossovers, divergences and volume changes signal reversals...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-7',
          question: 'How to tell a breakout from a fake-out?',
          category: 'strategy',
          stage1Preview: 'Real breakouts are confirmed by volume increase and candle close...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-8',
          question: 'What are the best entry signals?',
          category: 'strategy',
          stage1Preview: 'Optimal entries combine RSI, support levels, and trend alignment...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-9',
          question: 'How does BTC dominance affect altcoins?',
          category: 'practical',
          stage1Preview: 'BTC dominance impacts altcoin performance inversely...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-10',
          question: 'What does divergence indicate?',
          category: 'practical',
          stage1Preview: 'Divergence shows momentum weakening before price reverses...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
      ],
      nexus: [
        {
          id: 'nexus-1',
          question: 'How to calculate position size?',
          category: 'education',
          stage1Preview: 'Position size = Risk amount / (Entry - Stop Loss)...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-2',
          question: 'Why is risk/reward ratio important?',
          category: 'education',
          stage1Preview: 'Every trade should have potential profit at least 2x the risk...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-3',
          question: 'Where should I place my stop loss?',
          category: 'education',
          stage1Preview: 'Stop loss should be below support levels or based on volatility...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-4',
          question: 'What is DCA strategy?',
          category: 'education',
          stage1Preview: 'Dollar Cost Averaging spreads risk across multiple entries...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-5',
          question: 'How to diversify a crypto portfolio?',
          category: 'education',
          stage1Preview: 'Select assets with low correlation to reduce overall risk...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-6',
          question: 'How much should I risk per trade?',
          category: 'strategy',
          stage1Preview: 'Maximum 1-2% portfolio risk per single trade is recommended...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-7',
          question: 'How to set take profit targets?',
          category: 'strategy',
          stage1Preview: 'Use resistance levels and Fibonacci extensions for targets...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-8',
          question: 'When should I scale into a position?',
          category: 'strategy',
          stage1Preview: 'Pyramiding strategy adds to winning positions only...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-9',
          question: 'Best strategy for $1000 capital?',
          category: 'practical',
          stage1Preview: 'Small capital suits swing trading with strict risk management...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-10',
          question: 'How many positions should I have open?',
          category: 'practical',
          stage1Preview: 'Based on portfolio size, 3-10 positions recommended...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
      ],
      oracle: [
        {
          id: 'oracle-1',
          question: 'How to detect whale accumulation?',
          category: 'education',
          stage1Preview: 'Large wallet withdrawals from exchanges = accumulation signal...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-2',
          question: 'Why is exchange flow important?',
          category: 'education',
          stage1Preview: 'Inflow = selling pressure, Outflow = buying signal...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-3',
          question: 'What is smart money?',
          category: 'education',
          stage1Preview: 'Institutional investors and experienced traders\' positions...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-4',
          question: 'How to read order flow imbalance?',
          category: 'education',
          stage1Preview: 'More buy orders than sell orders = bullish signal...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-5',
          question: 'What does negative net flow mean?',
          category: 'education',
          stage1Preview: 'Net outflow from exchanges = supply decreasing = potential rise...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-6',
          question: 'What are big players doing?',
          category: 'strategy',
          stage1Preview: 'Whale activity can predict market direction early...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-7',
          question: 'How to spot accumulation patterns?',
          category: 'strategy',
          stage1Preview: 'Rising OBV with low volatility indicates accumulation...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-8',
          question: 'Is there whale dump risk?',
          category: 'strategy',
          stage1Preview: 'Large wallet transfers to exchanges = dump risk...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-9',
          question: 'Which coins are whales accumulating?',
          category: 'practical',
          stage1Preview: 'Track via exchange outflow metrics...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-10',
          question: 'How to track institutional buying?',
          category: 'practical',
          stage1Preview: 'Monitor OTC deals and large wallet transfers...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
      ],
      sentinel: [
        {
          id: 'sentinel-1',
          question: 'What is a honeypot token?',
          category: 'education',
          stage1Preview: 'Scam tokens where you can buy but cannot sell...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-2',
          question: 'How to identify a rug pull?',
          category: 'education',
          stage1Preview: 'Unlocked liquidity, anonymous team, unrealistic promises...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-3',
          question: 'Why is liquidity lock important?',
          category: 'education',
          stage1Preview: 'Locked liquidity prevents developers from running away...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-4',
          question: 'What is mint function risk?',
          category: 'education',
          stage1Preview: 'If owner can mint unlimited tokens = infinite inflation...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-5',
          question: 'What does verified contract mean?',
          category: 'education',
          stage1Preview: 'Source code is visible = transparency, hidden = danger...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-6',
          question: 'How to check if a token is safe?',
          category: 'strategy',
          stage1Preview: 'Comprehensive check: honeypot, lock, mint, tax...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-7',
          question: 'How to spot pump & dump schemes?',
          category: 'strategy',
          stage1Preview: 'Sudden price and volume spikes indicate manipulation...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-8',
          question: 'What are common red flags in crypto projects?',
          category: 'strategy',
          stage1Preview: 'Team, tokenomics, and contract analysis reveals red flags...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-9',
          question: 'What is buy/sell tax?',
          category: 'practical',
          stage1Preview: 'High tax rates eat into your profits...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-10',
          question: 'How to detect wash trading?',
          category: 'practical',
          stage1Preview: 'Fake volume misleads real demand perception...',
          stage2Action: 'Run full analysis in TradePath → Analyze',
          creditCost: 3,
        },
      ],
    };

    return questions[expertId] || [];
  }

  /**
   * Get all suggested questions for all experts
   */
  getAllSuggestedQuestions(): Record<ExpertId, SuggestedQuestion[]> {
    return {
      aria: this.getSuggestedQuestions('aria'),
      nexus: this.getSuggestedQuestions('nexus'),
      oracle: this.getSuggestedQuestions('oracle'),
      sentinel: this.getSuggestedQuestions('sentinel'),
    };
  }

  /**
   * Chat with an AI expert - Enhanced with examples
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const expert = AI_EXPERTS[request.expertId];
    if (!expert) {
      throw new Error(`Unknown expert: ${request.expertId}`);
    }

    // Find relevant TradePath examples
    const examples = await this.findExamples(request.expertId, request.userId);

    // Format examples for the prompt
    const examplesText = examples.length > 0
      ? `\n\n[TradePath'ten Gerçek Örnekler - Yanıtında bunlara referans ver]\n${examples.map((ex, i) =>
          `${i + 1}. ${ex.title}: ${ex.description}\n   Detay: ${JSON.stringify(ex.details)}`
        ).join('\n')}`
      : '';

    // Build conversation with enhanced system prompt
    const enhancedSystemPrompt = expert.systemPrompt + examplesText;

    const messages = [
      {
        role: 'user' as const,
        parts: [{ text: enhancedSystemPrompt }],
      },
      {
        role: 'model' as const,
        parts: [{ text: `Ben ${expert.name}, TradePath'in uzman AI'siyim. Size TradePath'teki gerçek örneklerle desteklenmiş yanıtlar vereceğim. Nasıl yardımcı olabilirim?` }],
      },
    ];

    // Add conversation history
    if (request.conversationHistory?.length) {
      for (const msg of request.conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      parts: [{ text: request.message }],
    });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              temperature: 0.8,
              topP: 0.92,
              topK: 40,
              maxOutputTokens: 800,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt oluşturulamadı.';
      // Yasaklı içeriği programatik olarak temizle
      const responseText = sanitizeAIResponse(rawText);

      // Extract token usage
      const usageMetadata = data.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount || 0;
      const outputTokens = usageMetadata.candidatesTokenCount || 0;
      const costUsd = costService.calculateGeminiCost(inputTokens, outputTokens);

      // Log cost
      await costService.logCost({
        service: 'gemini',
        operation: `ai_expert_${request.expertId}`,
        inputTokens,
        outputTokens,
        costUsd,
        userId: request.userId,
        metadata: {
          expertId: request.expertId,
          expertName: expert.name,
          examplesCount: examples.length,
        },
      });

      return {
        response: responseText,
        expertId: request.expertId,
        examples,
        inputTokens,
        outputTokens,
        costUsd,
      };
    } catch (error) {
      console.error('AI Expert chat error:', error);
      throw error;
    }
  }

  /**
   * Add expert insight to an existing report or create a new one
   */
  async addToReport(params: {
    userId: string;
    symbol: string;
    expertId: ExpertId;
    insight: string;
    reportId?: string;
  }): Promise<{
    reportId: string;
    isNew: boolean;
    symbol: string;
  }> {
    const expert = AI_EXPERTS[params.expertId];

    // Format the expert insight
    const expertInsight = {
      expertId: params.expertId,
      expertName: expert.name,
      expertRole: expert.role,
      insight: params.insight,
      addedAt: new Date().toISOString(),
    };

    if (params.reportId) {
      // Add to existing report
      const existingReport = await prisma.report.findFirst({
        where: { id: params.reportId, userId: params.userId },
      });

      if (!existingReport) {
        throw new Error('Report not found');
      }

      // Update report data with expert insight
      const reportData = existingReport.reportData as Record<string, unknown>;
      const expertInsights = (reportData.expertInsights || []) as unknown[];
      expertInsights.push(expertInsight);
      reportData.expertInsights = expertInsights;

      await prisma.report.update({
        where: { id: params.reportId },
        data: { reportData },
      });

      return {
        reportId: params.reportId,
        isNew: false,
        symbol: existingReport.symbol,
      };
    } else {
      // Create new report with expert insight
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

      const newReport = await prisma.report.create({
        data: {
          userId: params.userId,
          symbol: params.symbol.toUpperCase(),
          reportData: {
            type: 'expert_analysis',
            symbol: params.symbol.toUpperCase(),
            expertInsights: [expertInsight],
            createdAt: new Date().toISOString(),
          },
          verdict: 'expert_analysis',
          score: 0, // Expert analysis doesn't have a score
          expiresAt,
        },
      });

      return {
        reportId: newReport.id,
        isNew: true,
        symbol: newReport.symbol,
      };
    }
  }

  /**
   * Get expert insight summary for a symbol
   */
  async getExpertSummary(params: {
    userId: string;
    symbol: string;
  }): Promise<{
    symbol: string;
    experts: Array<{
      expertId: string;
      expertName: string;
      insight: string;
      addedAt: string;
    }>;
    reportId?: string;
  }> {
    // Find latest report for this symbol
    const report = await prisma.report.findFirst({
      where: {
        userId: params.userId,
        symbol: params.symbol.toUpperCase(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) {
      return {
        symbol: params.symbol.toUpperCase(),
        experts: [],
      };
    }

    const reportData = report.reportData as Record<string, unknown>;
    const expertInsights = (reportData.expertInsights || []) as Array<{
      expertId: string;
      expertName: string;
      insight: string;
      addedAt: string;
    }>;

    return {
      symbol: params.symbol.toUpperCase(),
      experts: expertInsights,
      reportId: report.id,
    };
  }
}

export const aiExpertService = new AIExpertService();
