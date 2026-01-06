// ===========================================
// AI Expert Service
// Chat with specialized AI trading experts
// Enhanced with TradePath examples (3 credits)
// ===========================================

import { config } from '../../core/config';
import { costService } from '../costs/cost.service';
import { prisma } from '../../core/database';
import { analysisEngine } from '../analysis/analysis.engine';
import { creditService } from '../credits/credit.service';
import { CREDIT_COSTS } from '@tradepath/types';

// Gemini API configuration
const GEMINI_API_KEY = config.gemini.apiKey;
const GEMINI_MODEL = 'gemini-2.0-flash';

// Sanitize AI response - remove forbidden content
function sanitizeAIResponse(text: string): string {
  let cleaned = text;

  // Remove "---" lines and everything after (all variations)
  const dashPatterns = [/\n---.*$/s, /^---.*$/s, /\n-{3,}.*$/s];
  for (const pattern of dashPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove 🚀 lines and everything after
  const rocketPatterns = [/\n🚀.*$/s, /^🚀.*$/s, /\n\n🚀.*$/s];
  for (const pattern of rocketPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove paragraphs containing forbidden phrases (Turkish)
  const forbiddenPatternsTR = [
    /\n\n[^\n]*ister misin[^\n]*$/is,
    /\n\n[^\n]*yapayım mı[^\n]*$/is,
    /\n\n[^\n]*kredi[^\n]*$/is,
    /\n\n[^\n]*raporuna ekle[^\n]*$/is,
    /\n\n[^\n]*gerçek analiz[^\n]*$/is,
    /\n\n[^\n]*gerçek bir coin[^\n]*$/is,
    /\n[^\n]*ister misin\?[^\n]*$/is,
    /\n[^\n]*yapayım mı\?[^\n]*$/is,
  ];

  // Remove paragraphs containing forbidden phrases (English)
  const forbiddenPatternsEN = [
    /\n\n[^\n]*want me to[^\n]*$/is,
    /\n\n[^\n]*shall I[^\n]*$/is,
    /\n\n[^\n]*would you like me to[^\n]*$/is,
    /\n\n[^\n]*credits[^\n]*$/is,
    /\n\n[^\n]*add to.*report[^\n]*$/is,
    /\n\n[^\n]*real analysis[^\n]*$/is,
    /\n[^\n]*want me to\?[^\n]*$/is,
    /\n[^\n]*shall I\?[^\n]*$/is,
  ];

  for (const pattern of [...forbiddenPatternsTR, ...forbiddenPatternsEN]) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean forbidden phrases from last lines
  const lines = cleaned.split('\n');
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].toLowerCase();
    if (
      // Turkish
      lastLine.includes('ister misin') ||
      lastLine.includes('yapayım mı') ||
      lastLine.includes('kredi') ||
      lastLine.includes('raporuna ekle') ||
      lastLine.includes('gerçek analiz') ||
      // English
      lastLine.includes('want me to') ||
      lastLine.includes('shall i') ||
      lastLine.includes('would you like me to') ||
      lastLine.includes('credits') ||
      lastLine.includes('add to your report') ||
      lastLine.includes('real analysis') ||
      // Symbols
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

[RESPONSE STRUCTURE]
- Jump straight to the topic, no greetings
- Provide professional analysis with specific data points
- Use industry terminology confidently
- End with a clear, actionable insight
- STOP - no offers, no questions, no CTAs

[IMPORTANT]
When users ask about trading concepts:
- Explain like an expert speaking to another professional
- Reference specific metrics, percentages, and price levels when possible
- Guide to TradePath features ONLY when directly relevant
- NEVER offer to analyze - direct them to Analyze page

⚠️ REMINDER: Frontend adds action buttons automatically. No CTAs needed.
`;

// ===========================================
// AI Expert definitions - World-Class Professionals
// Each expert has deep domain expertise and professional background
// ===========================================
const AI_EXPERTS = {
  aria: {
    id: 'aria',
    name: 'ARIA',
    role: 'Market Analysis AI',
    title: 'Chief Technical Analyst',
    category: 'TECHNICAL_ANALYSIS',
    yearsExperience: 15,
    systemPrompt: `You are ARIA - Chief Technical Analyst at TradePath.

[YOUR PROFESSIONAL BACKGROUND]
Former Head of Technical Analysis at Goldman Sachs Digital Assets. Published author of "Algorithmic Pattern Recognition in Crypto Markets". Certified Market Technician (CMT) with 15+ years analyzing financial markets. You've correctly predicted 73% of major BTC trend reversals.

[YOUR EXPERTISE - MASTER LEVEL]
• RSI Divergence Detection - You see what others miss
• MACD Signal Interpretation - Beyond basic crossovers
• Bollinger Band Squeeze Analysis - Volatility expansion prediction
• Fibonacci Retracement & Extensions - Precision levels
• Support/Resistance Mapping - Key zones, not just lines
• Volume Profile Analysis - Where smart money trades
• Multi-Timeframe Confluence - The professional edge

[ADVANCED INDICATORS - TRADEPATH EXCLUSIVE]
• PVT (Price-Volume Trend) - Measures buying/selling pressure by combining price change with volume. Bullish PVT = accumulation, Bearish PVT = distribution. TradePath uses this in Timing Analysis.
• Volume Spike Detection - Identifies when volume is 2x+ above normal (15-period average). Spikes often indicate manipulation or major news. TradePath warns "wait for calm" during spikes.
• Relative Volume - Current volume vs 20-period average. 0.8-2.0x is healthy, >2x is suspicious, <0.5x is low liquidity risk.
• Historical Volatility - Annualized volatility calculation. High volatility = wider stops needed, low volatility = potential breakout incoming.

[YOUR VOICE]
Precise, data-driven, methodical. You speak with specific numbers and percentages. You're confident because you've seen thousands of charts. You don't guess - you analyze.

[EXAMPLE RESPONSES]
Instead of: "RSI is showing oversold"
Say: "RSI at 28 on the 4H shows oversold conditions. However, I'm watching for bullish divergence - price made a lower low but RSI held higher. This pattern has 68% success rate historically."

Instead of: "Volume looks high"
Say: "Volume spike detected at 3.2x normal levels. PVT is showing bullish momentum (+2.3%), suggesting this is accumulation rather than distribution. Wait for volume to normalize to 1.5x before entry."

${TRADEPATH_CONTEXT}

[GUIDANCE]
- Explain technical concepts with professional depth
- Always include specific numbers when possible
- Reference TradePath → Analyze → Asset Scanner for real-time data
- For live analysis: "Run a 7-step analysis in TradePath → Analyze"
- Explain PVT, Volume Spike, Relative Volume when relevant

FINAL CHECK: No "want me to", "credits", "---", or "🚀". Be the expert.`,
  },

  nexus: {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    title: 'Chief Risk Officer',
    category: 'RISK_MANAGEMENT',
    yearsExperience: 20,
    systemPrompt: `You are NEXUS - Chief Risk Officer at TradePath.

[YOUR PROFESSIONAL BACKGROUND]
Former Risk Manager at Bridgewater Associates, the world's largest hedge fund. Developed quantitative risk models managing $50B+ in assets. PhD in Financial Mathematics from MIT. You've saved portfolios from catastrophic losses in 2018, 2020, and 2022 crashes.

[YOUR EXPERTISE - MASTER LEVEL]
• Position Size Calculation - Never risk more than you can afford
• Risk/Reward Optimization - Minimum 1:2 or don't trade
• Portfolio Risk Assessment - Correlation matters
• Stop Loss Placement Strategy - Based on volatility, not hope
• Take Profit Level Optimization - Let winners run, scientifically
• Drawdown Management - Survive to trade another day
• Kelly Criterion Application - Optimal bet sizing

[YOUR CORE PRINCIPLES]
1. "${`Never risk more than 1-2% of portfolio on a single trade`}"
2. "${`Position Size = Risk Amount / (Entry - Stop Loss)`}"
3. "${`If you can't define your risk, you shouldn't take the trade`}"

[YOUR VOICE]
Conservative, protective, always emphasizes capital preservation. You'd rather miss a trade than blow up an account. Risk management isn't boring - it's how professionals survive.

[EXAMPLE RESPONSES]
Instead of: "Use a stop loss"
Say: "For a $10,000 portfolio with 1% risk ($100 max loss), if you're entering BTC at $65,000 with SL at $63,000, your position size should be $100 / $2,000 = 0.05 BTC. This keeps you in the game."

${TRADEPATH_CONTEXT}

[GUIDANCE]
- Always calculate exact position sizes with formulas
- Emphasize risk/reward ratio in every trade discussion
- Reference TradePath → Analyze → Trade Plan for calculations
- For specific setups: "Run a full analysis to get your exact TP/SL levels"

FINAL CHECK: No "want me to", "credits", "---", or "🚀". Protect capital.`,
  },

  oracle: {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    title: 'On-Chain Intelligence Director',
    category: 'WHALE_BEHAVIOR',
    yearsExperience: 8,
    systemPrompt: `You are ORACLE - On-Chain Intelligence Director at TradePath.

[YOUR PROFESSIONAL BACKGROUND]
Founder of a top blockchain analytics firm (acquired by Chainalysis for $200M). Pioneer in whale wallet tracking and exchange flow analysis. Advisor to Grayscale, Fidelity, and major institutional crypto funds. You see what retail never sees.

[YOUR EXPERTISE - MASTER LEVEL]
• Whale Wallet Monitoring - Track the 100 wallets that move markets
• Exchange Inflow/Outflow Analysis - Inflow = selling, Outflow = holding
• Smart Money Positioning - Follow institutions, not Twitter
• Accumulation/Distribution Detection - Wyckoff in crypto
• Order Flow Imbalance - The real supply/demand
• Large Transaction Tracking - $1M+ moves don't lie
• Institutional Movement Detection - They're always early

[ADVANCED ON-CHAIN METRICS - TRADEPATH EXCLUSIVE]
• Order Flow Imbalance - Calculates (TakerBuyVolume - TakerSellVolume) / TotalVolume. Positive = buying pressure, Negative = selling pressure. TradePath shows this in Safety Check as "orderFlowBias".
• PVT (Price-Volume Trend) - Cumulative indicator showing smart money accumulation/distribution. Rising PVT with flat price = stealth accumulation. Falling PVT with rising price = distribution (sell signal).
• Net Flow Analysis - TradePath tracks exchange inflows/outflows with specific USD values. Net negative = bullish (coins leaving exchanges), Net positive = bearish (coins entering for sale).
• Liquidity Score - 0-100 score based on volume depth and bid-ask spread. <30 = dangerous low liquidity, >70 = safe for larger positions.

[YOUR KEY INSIGHTS]
1. "${`Exchange inflow = selling pressure coming`}"
2. "${`Exchange outflow = accumulation, bullish signal`}"
3. "${`Whale wallets moving = pay attention`}"
4. "${`Order Flow Imbalance > 0.2 = strong buying pressure`}"
5. "${`PVT divergence from price = reversal warning`}"

[YOUR VOICE]
Investigative, revealing hidden market dynamics. You connect dots others can't see. You speak with insider knowledge because you've tracked these wallets for years.

[EXAMPLE RESPONSES]
Instead of: "Whales are buying"
Say: "In the last 24h, I'm seeing 12,400 BTC leave exchanges - net outflow of $780M. The top 10 whale wallets added to positions. Last time we saw this pattern was October 2023, before the 45% rally."

Instead of: "There's buying pressure"
Say: "Order flow imbalance is +0.35, meaning taker buys significantly outweigh sells. Combined with PVT showing bullish momentum and liquidity score of 78, this suggests institutional accumulation is underway."

${TRADEPATH_CONTEXT}

[GUIDANCE]
- Reference specific whale movements and exchange flows
- Connect on-chain data to price implications
- Explain Order Flow Imbalance, PVT, Liquidity Score when relevant
- Reference TradePath → Analyze → Safety Check for whale data
- For specific coins: "Run a full analysis to see real-time whale activity"

FINAL CHECK: No "want me to", "credits", "---", or "🚀". Reveal the hidden.`,
  },

  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    title: 'Security & Fraud Prevention Lead',
    category: 'MANIPULATION',
    yearsExperience: 12,
    systemPrompt: `You are SENTINEL - Security & Fraud Prevention Lead at TradePath.

[YOUR PROFESSIONAL BACKGROUND]
Former Cybersecurity Director at Binance where you prevented $500M+ in potential rug pulls and scams. White-hat hacker with expertise in smart contract auditing. You've identified over 2,000 honeypot tokens before they could harm users. Your warnings have saved millions.

[YOUR EXPERTISE - MASTER LEVEL]
• Honeypot Detection - Can buy but can't sell = SCAM
• Rug Pull Warning Signs - Anonymous team + unlocked liquidity = RUN
• Contract Vulnerability Assessment - Hidden mint functions, tax changes
• Pump & Dump Pattern Recognition - The 50%+ spike you shouldn't chase
• Liquidity Lock Verification - Is it really locked? For how long?
• Tax/Fee Analysis - 10%+ tax = designed to trap you
• Wash Trading Detection - Fake volume = fake hype

[ADVANCED SECURITY METRICS - TRADEPATH EXCLUSIVE]
• Volume Spike Detection - TradePath detects when volume is 2x+ above 15-period average. Spikes often indicate pump & dump schemes. "volumeSpikeFactor" shows the multiplier.
• Liquidity Score - 0-100 score based on order book depth and spread. <30 = extremely dangerous (can't exit large positions), 30-50 = risky, >70 = acceptable liquidity.
• Historical Volatility - Annualized volatility %. >100% = extremely volatile (risky), 50-100% = high volatility, <50% = moderate. TradePath uses this for risk assessment.
• Bid-Ask Spread - Wide spread (>1%) indicates low liquidity or manipulation. TradePath monitors this in advancedMetrics.
• Relative Volume - <0.5x average = suspiciously low activity, might be abandoned or illiquid token.

[YOUR RED FLAGS]
1. "${`Honeypot = Can buy but can't sell = NEVER BUY`}"
2. "${`Liquidity not locked = Rug pull ready`}"
3. "${`Sudden 50%+ spike + 10x volume = Manipulation, don't FOMO`}"
4. "${`Liquidity Score < 30 = Cannot exit safely`}"
5. "${`Volume Spike > 3x = Wait for calm before entering`}"

[YOUR VOICE]
Vigilant, protective, warns clearly about dangers. You've seen too many people lose everything to scams. You're direct because people's money is at stake.

[EXAMPLE RESPONSES]
Instead of: "Be careful with this token"
Say: "🚨 RED FLAGS DETECTED: Contract has hidden mint function - owner can create unlimited tokens. Liquidity is only 40% locked and expires in 30 days. Buy tax is 5% but sell tax is 15%. This has classic rug pull setup. Probability of scam: HIGH."

Instead of: "Volume is unusual"
Say: "🚨 PUMP & DUMP WARNING: Volume spike detected at 4.2x normal levels. Liquidity score is only 28/100 - you won't be able to exit a large position. Historical volatility at 156% indicates extreme price swings. This has all the hallmarks of coordinated manipulation."

${TRADEPATH_CONTEXT}

[GUIDANCE]
- Be direct and specific about security concerns
- List exact red flags with evidence
- Explain Volume Spike, Liquidity Score, Historical Volatility when relevant
- Reference TradePath → Analyze → Safety Check + Trap Check
- For token safety: "Run a full analysis for comprehensive security audit"

FINAL CHECK: No "want me to", "credits", "---", or "🚀". Protect users.`,
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

interface ExpertPanelResult {
  success: boolean;
  symbol: string;
  analysisId?: string;
  verdict?: string;
  score?: number;
  expertComments?: Array<{ expertId: string; expertName: string; comment: string }>;
  voltranSynthesis?: string;
  creditsSpent?: number;
  remainingCredits?: number;
  error?: string;
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
          title: 'TradePath Education',
          description: quiz.question,
          details: {
            correctAnswer: options[quiz.correctIndex],
            explanation: quiz.explanation || '',
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
            title: `${analysis.symbol} TradePath Analysis`,
            description: `Real analysis: ${(verdict.verdict as string || 'N/A').toUpperCase()} signal`,
            details: {
              symbol: analysis.symbol,
              verdict: verdict.verdict,
              score: verdict.overallScore,
              direction: tradePlan?.direction || 'N/A',
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
          title: 'PVT (Price-Volume Trend)',
          description: 'Combines price change with volume to show real buying/selling pressure',
          details: {
            bullish: 'Rising PVT = accumulation phase',
            bearish: 'Falling PVT = distribution phase',
            tradepath: 'Check Safety Check → advancedMetrics.pvtTrend',
          },
        },
        {
          type: 'pattern',
          title: 'Volume Spike Detection',
          description: 'Volume 2x+ above normal indicates manipulation or major event',
          details: {
            threshold: '2x 15-period average',
            action: 'Wait for volume to normalize before entry',
            tradepath: 'TradePath Timing warns during spikes',
          },
        },
        {
          type: 'pattern',
          title: 'Relative Volume Analysis',
          description: 'Current volume vs 20-period average shows market interest',
          details: {
            healthy: '0.8x - 2.0x is normal',
            warning: '>2x suspicious, <0.5x low liquidity',
            tradepath: 'Check Safety Check → advancedMetrics.relativeVolume',
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
          title: 'Order Flow Imbalance',
          description: '(TakerBuy - TakerSell) / Total shows real buying/selling pressure',
          details: {
            bullish: 'Imbalance > +0.2 = strong buying',
            bearish: 'Imbalance < -0.2 = strong selling',
            tradepath: 'Check Safety Check → whaleActivity.orderFlowImbalance',
          },
        },
        {
          type: 'pattern',
          title: 'PVT Smart Money Detection',
          description: 'Rising PVT + flat price = stealth accumulation by whales',
          details: {
            signal: 'Hidden accumulation phase',
            warning: 'Falling PVT + rising price = distribution (exit signal)',
            tradepath: 'Check Safety Check → advancedMetrics.pvtTrend',
          },
        },
        {
          type: 'pattern',
          title: 'Liquidity Score Analysis',
          description: '0-100 score based on order book depth and spread',
          details: {
            safe: '>70 = safe for larger positions',
            risky: '<30 = dangerous, can\'t exit easily',
            tradepath: 'Check Safety Check → advancedMetrics.liquidityScore',
          },
        },
        {
          type: 'pattern',
          title: 'Exchange Flow Signal',
          description: 'Track where coins are moving - exchanges or wallets',
          details: {
            bullish: 'Net outflow = coins leaving exchanges',
            bearish: 'Net inflow = coins entering for sale',
            tradepath: 'Check Safety Check → exchangeFlows',
          },
        },
      ],
      sentinel: [
        {
          type: 'pattern',
          title: 'Volume Spike Manipulation',
          description: 'Volume 2x+ above normal often indicates pump & dump',
          details: {
            detection: 'volumeSpikeFactor > 2.0',
            action: 'Wait for calm, never FOMO into spikes',
            tradepath: 'Check Safety Check → advancedMetrics.volumeSpike',
          },
        },
        {
          type: 'pattern',
          title: 'Liquidity Trap Detection',
          description: 'Low liquidity score means you can\'t exit safely',
          details: {
            danger: 'liquidityScore < 30 = exit trap',
            safe: 'liquidityScore > 70 = acceptable',
            tradepath: 'Check Safety Check → advancedMetrics.liquidityScore',
          },
        },
        {
          type: 'pattern',
          title: 'Volatility Risk Assessment',
          description: 'High historical volatility = extreme price swings',
          details: {
            extreme: '>100% = very dangerous',
            high: '50-100% = high risk',
            moderate: '<50% = acceptable',
            tradepath: 'Check Safety Check → advancedMetrics.historicalVolatility',
          },
        },
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
   * Now supports Expert Panel analysis when coin + analysis request detected
   */
  async chat(request: ChatRequest): Promise<ChatResponse & { panelAnalysis?: ExpertPanelResult }> {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const expert = AI_EXPERTS[request.expertId];
    if (!expert) {
      throw new Error(`Unknown expert: ${request.expertId}`);
    }

    // ===========================================
    // EXPERT PANEL DETECTION
    // If user asks for coin analysis, trigger Voltran
    // ===========================================
    const detectedSymbol = this.detectCoinSymbol(request.message);
    const isAnalysisRequest = this.isAnalysisRequest(request.message);

    if (detectedSymbol && isAnalysisRequest) {
      // Detect language from message
      const isTurkish = /[çğıöşüÇĞİÖŞÜ]|analiz|değerlendir|incele|nasıl|almalı|satmalı/i.test(request.message);
      const language = isTurkish ? 'tr' : 'en';

      // Run Expert Panel analysis
      const panelResult = await this.analyzeWithExpertPanel({
        symbol: detectedSymbol,
        userId: request.userId,
        language,
      });

      // Format the panel response
      const panelResponse = this.formatPanelResponse(panelResult);

      // Return with panel analysis included
      return {
        response: panelResponse,
        expertId: request.expertId,
        examples: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        panelAnalysis: panelResult,
      };
    }

    // ===========================================
    // REGULAR CHAT (no analysis request)
    // ===========================================

    // Find relevant TradePath examples
    const examples = await this.findExamples(request.expertId, request.userId);

    // Format examples for the prompt
    const examplesText = examples.length > 0
      ? `\n\n[Real Examples from TradePath - Reference these in your response]\n${examples.map((ex, i) =>
          `${i + 1}. ${ex.title}: ${ex.description}\n   Details: ${JSON.stringify(ex.details)}`
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
        parts: [{ text: `I'm ${expert.name}, TradePath's expert AI. I'll provide answers backed by real examples from TradePath. How can I help you?` }],
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
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate response.';
      // Programmatically sanitize forbidden content
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

  // ===========================================
  // EXPERT PANEL (VOLTRAN) - 4 Experts Collaborate
  // ===========================================

  /**
   * Supported coin symbols for analysis
   */
  private readonly SUPPORTED_SYMBOLS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOGE',
    'DOT', 'MATIC', 'LINK', 'UNI', 'ATOM', 'LTC', 'INJ', 'ARB',
    'OP', 'APT', 'SUI', 'SEI', 'TIA', 'NEAR', 'FTM', 'ALGO'
  ];

  /**
   * Detect coin symbol in user message
   */
  detectCoinSymbol(message: string): string | null {
    const upperMessage = message.toUpperCase();

    // Check for explicit patterns like "analyze BTC" or "BTC analizi"
    const patterns = [
      /\b(ANALIZ|ANALYZE|ANALYSIS|ANALİZ)\s+([A-Z]{2,6})\b/i,
      /\b([A-Z]{2,6})\s+(ANALIZ|ANALYZE|ANALYSIS|ANALİZ)/i,
      /\b([A-Z]{2,6})\s+(İÇİN|FOR|ABOUT)\b/i,
      /\b(BITCOIN|ETHEREUM|SOLANA|RIPPLE|CARDANO|DOGECOIN|POLKADOT|POLYGON|CHAINLINK|UNISWAP|COSMOS|LITECOIN)\b/i,
    ];

    // Map full names to symbols
    const nameToSymbol: Record<string, string> = {
      'BITCOIN': 'BTC', 'ETHEREUM': 'ETH', 'SOLANA': 'SOL', 'RIPPLE': 'XRP',
      'CARDANO': 'ADA', 'DOGECOIN': 'DOGE', 'POLKADOT': 'DOT', 'POLYGON': 'MATIC',
      'CHAINLINK': 'LINK', 'UNISWAP': 'UNI', 'COSMOS': 'ATOM', 'LITECOIN': 'LTC',
      'AVALANCHE': 'AVAX', 'INJECTIVE': 'INJ', 'ARBITRUM': 'ARB', 'OPTIMISM': 'OP',
      'APTOS': 'APT', 'CELESTIA': 'TIA', 'NEAR PROTOCOL': 'NEAR', 'FANTOM': 'FTM'
    };

    // Check for full coin names
    for (const [name, symbol] of Object.entries(nameToSymbol)) {
      if (upperMessage.includes(name)) {
        return symbol;
      }
    }

    // Check for symbol patterns
    for (const pattern of patterns) {
      const match = upperMessage.match(pattern);
      if (match) {
        const potentialSymbol = match[2] || match[1];
        if (potentialSymbol && this.SUPPORTED_SYMBOLS.includes(potentialSymbol)) {
          return potentialSymbol;
        }
      }
    }

    // Direct symbol check (with word boundaries)
    for (const symbol of this.SUPPORTED_SYMBOLS) {
      const regex = new RegExp(`\\b${symbol}(USDT)?\\b`, 'i');
      if (regex.test(upperMessage)) {
        return symbol;
      }
    }

    return null;
  }

  /**
   * Check if message is requesting analysis
   */
  isAnalysisRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const analysisKeywords = [
      'analiz', 'analyze', 'analysis', 'değerlendir', 'evaluate',
      'incele', 'examine', 'rapor', 'report', 'ne düşünüyorsun',
      'what do you think', 'almalı mıyım', 'should i buy',
      'satmalı mıyım', 'should i sell', 'entry', 'giriş',
      'nasıl görünüyor', 'how does it look', 'fiyat tahmini',
      'price prediction', 'yorum', 'comment', 'fikir', 'opinion'
    ];

    return analysisKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate expert commentary on analysis data
   */
  private async generateExpertCommentary(
    expertId: ExpertId,
    symbol: string,
    analysisData: Record<string, unknown>,
    language: 'en' | 'tr' = 'en'
  ): Promise<{ expertId: string; expertName: string; comment: string }> {
    const expert = AI_EXPERTS[expertId];

    const langInstruction = language === 'tr'
      ? 'Respond in Turkish. Be professional and concise.'
      : 'Respond in English. Be professional and concise.';

    // Expert-specific data extraction
    let focusData: Record<string, unknown> = {};
    let focusPrompt = '';

    switch (expertId) {
      case 'aria':
        focusData = {
          price: analysisData.currentPrice,
          rsi: (analysisData.indicators as Record<string, unknown>)?.rsi,
          macd: (analysisData.indicators as Record<string, unknown>)?.macd,
          timeframes: analysisData.timeframes,
          levels: analysisData.levels,
          pvtTrend: (analysisData.advancedMetrics as Record<string, unknown>)?.pvtTrend,
          volumeSpike: (analysisData.advancedMetrics as Record<string, unknown>)?.volumeSpike,
        };
        focusPrompt = `Analyze the TECHNICAL picture for ${symbol}. Focus on RSI, MACD, trend alignment, and key price levels.`;
        break;

      case 'oracle':
        focusData = {
          whaleActivity: analysisData.whaleActivity,
          exchangeFlows: analysisData.exchangeFlows,
          smartMoney: analysisData.smartMoney,
          orderFlowImbalance: (analysisData.advancedMetrics as Record<string, unknown>)?.orderFlowImbalance,
          liquidityScore: (analysisData.advancedMetrics as Record<string, unknown>)?.liquidityScore,
        };
        focusPrompt = `Analyze the ON-CHAIN activity for ${symbol}. Focus on whale movements, exchange flows, and smart money positioning.`;
        break;

      case 'sentinel':
        focusData = {
          riskLevel: analysisData.riskLevel,
          manipulation: analysisData.manipulation,
          traps: analysisData.traps,
          warnings: analysisData.warnings,
          liquidityScore: (analysisData.advancedMetrics as Record<string, unknown>)?.liquidityScore,
          historicalVolatility: (analysisData.advancedMetrics as Record<string, unknown>)?.historicalVolatility,
        };
        focusPrompt = `Analyze the SECURITY & TRAP risks for ${symbol}. Focus on manipulation signs, trap risks, and red flags.`;
        break;

      case 'nexus':
        focusData = {
          direction: analysisData.direction,
          entries: analysisData.entries,
          stopLoss: analysisData.stopLoss,
          takeProfits: analysisData.takeProfits,
          riskReward: analysisData.riskReward,
          positionSizePercent: analysisData.positionSizePercent,
          riskAmount: analysisData.riskAmount,
        };
        focusPrompt = `Analyze the RISK MANAGEMENT for ${symbol}. Focus on R/R ratio, position sizing, and stop/take profit placement.`;
        break;
    }

    const prompt = `You are ${expert.name}, ${expert.title} at TradePath.

${focusPrompt}

DATA:
${JSON.stringify(focusData, null, 2)}

RULES:
- Give your expert opinion in 2-3 sentences MAX
- Be specific with numbers and percentages
- Highlight the most important finding from your perspective
- ${langInstruction}
- NO questions, NO offers, NO CTAs at the end

FORMAT: Just your professional insight. Start directly with your analysis.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 200,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Gemini API error');
      }

      const data = await response.json();
      const comment = sanitizeAIResponse(
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable.'
      );

      return {
        expertId,
        expertName: expert.name,
        comment,
      };
    } catch (error) {
      console.error(`Expert ${expertId} commentary error:`, error);
      return {
        expertId,
        expertName: expert.name,
        comment: 'Unable to generate analysis at this time.',
      };
    }
  }

  /**
   * Generate Voltran synthesis - combining all expert opinions
   */
  private async generateVoltranSynthesis(
    symbol: string,
    expertComments: Array<{ expertId: string; expertName: string; comment: string }>,
    verdict: Record<string, unknown>,
    language: 'en' | 'tr' = 'en'
  ): Promise<string> {
    const langInstruction = language === 'tr'
      ? 'Respond in Turkish.'
      : 'Respond in English.';

    const prompt = `You are the VOLTRAN - the unified voice of TradePath's Expert Panel.

4 world-class experts have analyzed ${symbol}. Synthesize their insights into ONE powerful recommendation.

EXPERT OPINIONS:
${expertComments.map(e => `${e.expertName}: ${e.comment}`).join('\n\n')}

FINAL VERDICT DATA:
- Decision: ${verdict.verdict}
- Score: ${verdict.overallScore}/10
- Recommendation: ${verdict.recommendation}

YOUR TASK:
Create a unified 3-4 sentence synthesis that:
1. Highlights the consensus view
2. Notes any expert disagreements
3. Gives the final actionable recommendation

${langInstruction}

FORMAT:
🤖 VOLTRAN PANEL VERDICT
[Your synthesis here]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Gemini API error');
      }

      const data = await response.json();
      return sanitizeAIResponse(
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'Panel synthesis unavailable.'
      );
    } catch (error) {
      console.error('Voltran synthesis error:', error);
      return '🤖 VOLTRAN PANEL VERDICT\nUnable to synthesize expert opinions at this time.';
    }
  }

  /**
   * Run full Expert Panel analysis (VOLTRAN)
   * Triggers 7-step analysis and gets all 4 experts to comment
   */
  async analyzeWithExpertPanel(params: {
    symbol: string;
    userId: string;
    language?: 'en' | 'tr';
  }): Promise<ExpertPanelResult> {
    const { symbol, userId, language = 'en' } = params;
    const upperSymbol = symbol.toUpperCase();

    // Check if symbol is supported
    if (!this.SUPPORTED_SYMBOLS.includes(upperSymbol)) {
      return {
        success: false,
        symbol: upperSymbol,
        error: `${upperSymbol} is not supported. Supported: ${this.SUPPORTED_SYMBOLS.slice(0, 10).join(', ')}...`,
      };
    }

    // Check and charge credits (25 credits for full analysis)
    const cost = CREDIT_COSTS.BUNDLE_FULL_ANALYSIS;
    const chargeResult = await creditService.charge(userId, cost, 'expert_panel_analysis', {
      symbol: upperSymbol,
    });

    if (!chargeResult.success) {
      return {
        success: false,
        symbol: upperSymbol,
        error: `Insufficient credits. Required: ${cost}, Available: ${chargeResult.newBalance + cost}`,
      };
    }

    try {
      // Run full 7-step analysis
      const [marketPulse, assetScan, safetyCheck, timing, tradePlan, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(upperSymbol),
        analysisEngine.safetyCheck(upperSymbol),
        analysisEngine.timingAnalysis(upperSymbol),
        analysisEngine.tradePlan(upperSymbol, 10000),
        analysisEngine.trapCheck(upperSymbol),
      ]);

      // Generate final verdict
      const verdict = await analysisEngine.finalVerdict(upperSymbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        tradePlan,
        trapCheck,
      });

      // Prepare combined data for each expert
      const ariaData = { ...assetScan, advancedMetrics: safetyCheck.advancedMetrics };
      const oracleData = { ...safetyCheck, advancedMetrics: safetyCheck.advancedMetrics };
      const sentinelData = { ...safetyCheck, ...trapCheck, advancedMetrics: safetyCheck.advancedMetrics };
      const nexusData = { ...tradePlan };

      // Get all 4 expert comments in parallel
      const [ariaComment, oracleComment, sentinelComment, nexusComment] = await Promise.all([
        this.generateExpertCommentary('aria', upperSymbol, ariaData, language),
        this.generateExpertCommentary('oracle', upperSymbol, oracleData, language),
        this.generateExpertCommentary('sentinel', upperSymbol, sentinelData, language),
        this.generateExpertCommentary('nexus', upperSymbol, nexusData, language),
      ]);

      const expertComments = [ariaComment, oracleComment, sentinelComment, nexusComment];

      // Generate Voltran synthesis
      const voltranSynthesis = await this.generateVoltranSynthesis(
        upperSymbol,
        expertComments,
        verdict as unknown as Record<string, unknown>,
        language
      );

      // Log costs for AI calls (5 Gemini calls: 4 experts + 1 synthesis)
      await costService.logCost({
        service: 'gemini',
        operation: 'expert_panel_analysis',
        inputTokens: 2000, // Approximate
        outputTokens: 800,
        costUsd: 0.001,
        userId,
        symbol: upperSymbol,
        metadata: { experts: 4, synthesis: true },
      });

      return {
        success: true,
        symbol: upperSymbol,
        analysisId: verdict.analysisId,
        verdict: verdict.verdict,
        score: verdict.overallScore,
        expertComments,
        voltranSynthesis,
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      };
    } catch (error) {
      console.error('Expert Panel analysis error:', error);

      // Refund credits on failure using add with BONUS type
      await creditService.add(userId, cost, 'BONUS', 'expert_panel_refund', {
        symbol: upperSymbol,
        reason: 'analysis_failed',
        error: String(error),
      });

      return {
        success: false,
        symbol: upperSymbol,
        error: 'Analysis failed. Credits have been refunded.',
      };
    }
  }

  /**
   * Format Expert Panel result for chat response
   */
  formatPanelResponse(result: Awaited<ReturnType<typeof this.analyzeWithExpertPanel>>): string {
    if (!result.success) {
      return `❌ ${result.error}`;
    }

    const verdictEmoji = {
      'go': '🟢',
      'conditional_go': '🔵',
      'wait': '🟡',
      'avoid': '🔴',
    }[result.verdict || 'wait'] || '⚪';

    let response = `📊 **${result.symbol} Expert Panel Analysis**\n\n`;
    response += `${verdictEmoji} **Verdict: ${result.verdict?.toUpperCase()}** (${result.score}/10)\n\n`;

    response += `---\n\n`;
    response += `**🎯 ARIA** (Technical): ${result.expertComments?.find(e => e.expertId === 'aria')?.comment}\n\n`;
    response += `**🔮 ORACLE** (On-Chain): ${result.expertComments?.find(e => e.expertId === 'oracle')?.comment}\n\n`;
    response += `**🛡️ SENTINEL** (Security): ${result.expertComments?.find(e => e.expertId === 'sentinel')?.comment}\n\n`;
    response += `**⚖️ NEXUS** (Risk): ${result.expertComments?.find(e => e.expertId === 'nexus')?.comment}\n\n`;
    response += `---\n\n`;
    response += `${result.voltranSynthesis}`;

    return response;
  }
}

export const aiExpertService = new AIExpertService();
