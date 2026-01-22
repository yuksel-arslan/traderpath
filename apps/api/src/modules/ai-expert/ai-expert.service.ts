// ===========================================
// AI Expert Service
// Chat with specialized AI trading experts
// Enhanced with TraderPath examples (3 credits)
// ===========================================

import { config } from '../../core/config';
import { costService } from '../costs/cost.service';
import { prisma } from '../../core/database';
import { analysisEngine } from '../analysis/analysis.engine';
import { creditService } from '../credits/credit.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { getTradingKnowledgeForAI } from './trading-knowledge-base';
import { callGeminiWithRetry } from '../../core/gemini';

// Gemini API configuration (for API key check)
const GEMINI_API_KEY = config.gemini.apiKey;

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

// TraderPath system knowledge (shared across all experts)
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
- Guide to TraderPath features ONLY when directly relevant
- NEVER offer to analyze - direct them to Analyze page

⚠️ REMINDER: Frontend adds action buttons automatically. No CTAs needed.

${getTradingKnowledgeForAI()}
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
    systemPrompt: `You are ARIA - Chief Technical Analyst at TraderPath.

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
• PVT (Price-Volume Trend) - Measures buying/selling pressure by combining price change with volume. Bullish PVT = accumulation, Bearish PVT = distribution. TraderPath uses this in Timing Analysis.
• Volume Spike Detection - Identifies when volume is 2x+ above normal (15-period average). Spikes often indicate manipulation or major news. TraderPath warns "wait for calm" during spikes.
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
- Reference TraderPath → Analyze → Asset Scanner for real-time data
- For live analysis: "Run a 7-step analysis in TraderPath → Analyze"
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
    systemPrompt: `You are NEXUS - Chief Risk Officer at TraderPath.

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
- Reference TraderPath → Analyze → Trade Plan for calculations
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
    systemPrompt: `You are ORACLE - On-Chain Intelligence Director at TraderPath.

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
• Order Flow Imbalance - Calculates (TakerBuyVolume - TakerSellVolume) / TotalVolume. Positive = buying pressure, Negative = selling pressure. TraderPath shows this in Safety Check as "orderFlowBias".
• PVT (Price-Volume Trend) - Cumulative indicator showing smart money accumulation/distribution. Rising PVT with flat price = stealth accumulation. Falling PVT with rising price = distribution (sell signal).
• Net Flow Analysis - TraderPath tracks exchange inflows/outflows with specific USD values. Net negative = bullish (coins leaving exchanges), Net positive = bearish (coins entering for sale).
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
- Reference TraderPath → Analyze → Safety Check for whale data
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
    systemPrompt: `You are SENTINEL - Security & Fraud Prevention Lead at TraderPath.

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
• Volume Spike Detection - TraderPath detects when volume is 2x+ above 15-period average. Spikes often indicate pump & dump schemes. "volumeSpikeFactor" shows the multiplier.
• Liquidity Score - 0-100 score based on order book depth and spread. <30 = extremely dangerous (can't exit large positions), 30-50 = risky, >70 = acceptable liquidity.
• Historical Volatility - Annualized volatility %. >100% = extremely volatile (risky), 50-100% = high volatility, <50% = moderate. TraderPath uses this for risk assessment.
• Bid-Ask Spread - Wide spread (>1%) indicates low liquidity or manipulation. TraderPath monitors this in advancedMetrics.
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
- Reference TraderPath → Analyze → Safety Check + Trap Check
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
   * Find relevant TraderPath examples based on expert category
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
          title: 'TraderPath Education',
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
            title: `${analysis.symbol} TraderPath Analysis`,
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
            tradepath: 'TraderPath Timing warns during spikes',
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
            check: 'TraderPath Safety Check → contractSecurity.isHoneypot',
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
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-2',
          question: 'How do I read MACD signals?',
          category: 'education',
          stage1Preview: 'MACD is a powerful indicator for detecting trend changes...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-3',
          question: 'What does a Bollinger Band squeeze mean?',
          category: 'education',
          stage1Preview: 'When bands contract, a big move is approaching...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-4',
          question: 'How to identify support and resistance levels?',
          category: 'education',
          stage1Preview: 'Support/resistance are price levels frequently tested by price...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-5',
          question: 'Why is multi-timeframe analysis important?',
          category: 'education',
          stage1Preview: 'Trend alignment across timeframes increases reliability...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-6',
          question: 'How to identify trend reversals?',
          category: 'strategy',
          stage1Preview: 'MA crossovers, divergences and volume changes signal reversals...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-7',
          question: 'How to tell a breakout from a fake-out?',
          category: 'strategy',
          stage1Preview: 'Real breakouts are confirmed by volume increase and candle close...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-8',
          question: 'What are the best entry signals?',
          category: 'strategy',
          stage1Preview: 'Optimal entries combine RSI, support levels, and trend alignment...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-9',
          question: 'How does BTC dominance affect altcoins?',
          category: 'practical',
          stage1Preview: 'BTC dominance impacts altcoin performance inversely...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'aria-10',
          question: 'What does divergence indicate?',
          category: 'practical',
          stage1Preview: 'Divergence shows momentum weakening before price reverses...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
      ],
      nexus: [
        {
          id: 'nexus-1',
          question: 'How to calculate position size?',
          category: 'education',
          stage1Preview: 'Position size = Risk amount / (Entry - Stop Loss)...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-2',
          question: 'Why is risk/reward ratio important?',
          category: 'education',
          stage1Preview: 'Every trade should have potential profit at least 2x the risk...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-3',
          question: 'Where should I place my stop loss?',
          category: 'education',
          stage1Preview: 'Stop loss should be below support levels or based on volatility...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-4',
          question: 'What is DCA strategy?',
          category: 'education',
          stage1Preview: 'Dollar Cost Averaging spreads risk across multiple entries...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-5',
          question: 'How to diversify a crypto portfolio?',
          category: 'education',
          stage1Preview: 'Select assets with low correlation to reduce overall risk...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-6',
          question: 'How much should I risk per trade?',
          category: 'strategy',
          stage1Preview: 'Maximum 1-2% portfolio risk per single trade is recommended...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-7',
          question: 'How to set take profit targets?',
          category: 'strategy',
          stage1Preview: 'Use resistance levels and Fibonacci extensions for targets...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-8',
          question: 'When should I scale into a position?',
          category: 'strategy',
          stage1Preview: 'Pyramiding strategy adds to winning positions only...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-9',
          question: 'Best strategy for $1000 capital?',
          category: 'practical',
          stage1Preview: 'Small capital suits swing trading with strict risk management...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'nexus-10',
          question: 'How many positions should I have open?',
          category: 'practical',
          stage1Preview: 'Based on portfolio size, 3-10 positions recommended...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
      ],
      oracle: [
        {
          id: 'oracle-1',
          question: 'How to detect whale accumulation?',
          category: 'education',
          stage1Preview: 'Large wallet withdrawals from exchanges = accumulation signal...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-2',
          question: 'Why is exchange flow important?',
          category: 'education',
          stage1Preview: 'Inflow = selling pressure, Outflow = buying signal...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-3',
          question: 'What is smart money?',
          category: 'education',
          stage1Preview: 'Institutional investors and experienced traders\' positions...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-4',
          question: 'How to read order flow imbalance?',
          category: 'education',
          stage1Preview: 'More buy orders than sell orders = bullish signal...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-5',
          question: 'What does negative net flow mean?',
          category: 'education',
          stage1Preview: 'Net outflow from exchanges = supply decreasing = potential rise...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-6',
          question: 'What are big players doing?',
          category: 'strategy',
          stage1Preview: 'Whale activity can predict market direction early...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-7',
          question: 'How to spot accumulation patterns?',
          category: 'strategy',
          stage1Preview: 'Rising OBV with low volatility indicates accumulation...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-8',
          question: 'Is there whale dump risk?',
          category: 'strategy',
          stage1Preview: 'Large wallet transfers to exchanges = dump risk...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-9',
          question: 'Which coins are whales accumulating?',
          category: 'practical',
          stage1Preview: 'Track via exchange outflow metrics...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'oracle-10',
          question: 'How to track institutional buying?',
          category: 'practical',
          stage1Preview: 'Monitor OTC deals and large wallet transfers...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
      ],
      sentinel: [
        {
          id: 'sentinel-1',
          question: 'What is a honeypot token?',
          category: 'education',
          stage1Preview: 'Scam tokens where you can buy but cannot sell...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-2',
          question: 'How to identify a rug pull?',
          category: 'education',
          stage1Preview: 'Unlocked liquidity, anonymous team, unrealistic promises...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-3',
          question: 'Why is liquidity lock important?',
          category: 'education',
          stage1Preview: 'Locked liquidity prevents developers from running away...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-4',
          question: 'What is mint function risk?',
          category: 'education',
          stage1Preview: 'If owner can mint unlimited tokens = infinite inflation...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-5',
          question: 'What does verified contract mean?',
          category: 'education',
          stage1Preview: 'Source code is visible = transparency, hidden = danger...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-6',
          question: 'How to check if a token is safe?',
          category: 'strategy',
          stage1Preview: 'Comprehensive check: honeypot, lock, mint, tax...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-7',
          question: 'How to spot pump & dump schemes?',
          category: 'strategy',
          stage1Preview: 'Sudden price and volume spikes indicate manipulation...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-8',
          question: 'What are common red flags in crypto projects?',
          category: 'strategy',
          stage1Preview: 'Team, tokenomics, and contract analysis reveals red flags...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-9',
          question: 'What is buy/sell tax?',
          category: 'practical',
          stage1Preview: 'High tax rates eat into your profits...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
          creditCost: 3,
        },
        {
          id: 'sentinel-10',
          question: 'How to detect wash trading?',
          category: 'practical',
          stage1Preview: 'Fake volume misleads real demand perception...',
          stage2Action: 'Run full analysis in TraderPath → Analyze',
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
      // Always use English for expert panel analysis
      const language = 'en';

      // Detect trade type from message
      const tradeType = this.detectTradeType(request.message);

      // Run Expert Panel analysis with detected trade type
      const panelResult = await this.analyzeWithExpertPanel({
        symbol: detectedSymbol,
        userId: request.userId,
        language,
        tradeType,
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

    // Find relevant TraderPath examples
    const examples = await this.findExamples(request.expertId, request.userId);

    // Format examples for the prompt
    const examplesText = examples.length > 0
      ? `\n\n[Real Examples from TraderPath - Reference these in your response]\n${examples.map((ex, i) =>
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
        parts: [{ text: `I'm ${expert.name}, TraderPath's expert AI. I'll provide answers backed by real examples from TraderPath. How can I help you?` }],
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
      // Use retry-enabled Gemini API call
      const data = await callGeminiWithRetry(
        {
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
        },
        3, // maxRetries - balanced for speed vs reliability
        `ai_expert_chat_${request.expertId}`
      );

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
        data: { reportData: reportData as object },
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

    // PRIORITY 1: Check for "FULL X ANALYSIS REPORT" pattern (from analysis context)
    // This is the most reliable - it's explicitly set by the frontend
    const fullAnalysisMatch = upperMessage.match(/FULL\s+([A-Z]{2,6})\s+ANALYSIS\s+REPORT/);
    if (fullAnalysisMatch && this.SUPPORTED_SYMBOLS.includes(fullAnalysisMatch[1])) {
      return fullAnalysisMatch[1];
    }

    // PRIORITY 2: Check for explicit patterns like "analyze ETH" or "ETH analizi"
    // But EXCLUDE "BTC" if it appears in context like "BTC Dominance"
    const patterns = [
      /\b(ANALIZ|ANALYZE|ANALYSIS|ANALİZ)\s+([A-Z]{2,6})\b/i,
      /\b([A-Z]{2,6})\s+(ANALIZ|ANALYZE|ANALYSIS|ANALİZ)/i,
      /\b([A-Z]{2,6})\s+(İÇİN|FOR|ABOUT)\b/i,
    ];

    // Map full names to symbols
    const nameToSymbol: Record<string, string> = {
      'BITCOIN': 'BTC', 'ETHEREUM': 'ETH', 'SOLANA': 'SOL', 'RIPPLE': 'XRP',
      'CARDANO': 'ADA', 'DOGECOIN': 'DOGE', 'POLKADOT': 'DOT', 'POLYGON': 'MATIC',
      'CHAINLINK': 'LINK', 'UNISWAP': 'UNI', 'COSMOS': 'ATOM', 'LITECOIN': 'LTC',
      'AVALANCHE': 'AVAX', 'INJECTIVE': 'INJ', 'ARBITRUM': 'ARB', 'OPTIMISM': 'OP',
      'APTOS': 'APT', 'CELESTIA': 'TIA', 'NEAR PROTOCOL': 'NEAR', 'FANTOM': 'FTM'
    };

    // Check for full coin names (but not in "BTC Dominance" context)
    for (const [name, symbol] of Object.entries(nameToSymbol)) {
      // Skip BITCOIN if it only appears in "BTC Dominance" context
      if (name === 'BITCOIN' && upperMessage.includes('BTC DOMINANCE') && !upperMessage.includes('BITCOIN')) {
        continue;
      }
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

    // PRIORITY 3: Direct symbol check - but skip BTC if it only appears in "BTC Dominance" context
    for (const symbol of this.SUPPORTED_SYMBOLS) {
      // Special handling for BTC - don't match if only in "BTC Dominance" or "BTC Dom" context
      if (symbol === 'BTC') {
        // Check if BTC appears in a trading context (not just market data)
        const btcTradingPatterns = [
          /\bBTC(USDT)?\s+(ANALIZ|ANALYZE|FOR|İÇİN)/i,
          /\b(ANALIZ|ANALYZE)\s+BTC/i,
          /\bFULL\s+BTC\s+ANALYSIS/i,
          /\bBTC\/USDT\s+ANALYSIS/i,
        ];
        const isBtcTradingContext = btcTradingPatterns.some(p => p.test(upperMessage));
        if (!isBtcTradingContext) {
          continue; // Skip BTC, it's probably just "BTC Dominance" mention
        }
      }

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
   * Detect trade type from user message
   */
  detectTradeType(message: string): 'scalping' | 'dayTrade' | 'swing' {
    const lowerMessage = message.toLowerCase();

    // Scalping keywords
    const scalpingKeywords = [
      'scalp', 'scalping', 'skalp', 'skalpingl', 'quick', 'hızlı',
      '1m', '5m', '15m', '1 minute', '5 minute', '15 minute',
      '1 dakika', '5 dakika', '15 dakika', 'kısa vadeli', 'short term',
      'fast trade', 'hızlı işlem'
    ];

    // Swing keywords
    const swingKeywords = [
      'swing', 'uzun vade', 'long term', 'günlük', 'haftalık',
      'daily', 'weekly', '1d', '1w', '4h', '1 day', '1 week',
      'hold', 'tutmak', 'beklemek', 'patience', 'sabır',
      'medium term', 'orta vade'
    ];

    // Check for scalping
    if (scalpingKeywords.some(kw => lowerMessage.includes(kw))) {
      return 'scalping';
    }

    // Check for swing
    if (swingKeywords.some(kw => lowerMessage.includes(kw))) {
      return 'swing';
    }

    // Default to day trade
    return 'dayTrade';
  }

  /**
   * Generate expert commentary on analysis data
   */
  private async generateExpertCommentary(
    expertId: ExpertId,
    symbol: string,
    analysisData: Record<string, unknown>,
    language: string = 'en',
    tradeType: 'scalping' | 'dayTrade' | 'swing' = 'dayTrade'
  ): Promise<{ expertId: string; expertName: string; comment: string }> {
    const expert = AI_EXPERTS[expertId];

    // Multi-language support for expert commentary
    const languageNames: Record<string, string> = {
      'en': 'English',
      'tr': 'Turkish (Türkçe)',
      'es': 'Spanish (Español)',
      'de': 'German (Deutsch)',
      'fr': 'French (Français)',
      'ar': 'Arabic (العربية)',
      'ru': 'Russian (Русский)',
      'zh': 'Chinese (中文)',
      'ja': 'Japanese (日本語)',
      'ko': 'Korean (한국어)',
      'pt': 'Portuguese (Português)',
      'it': 'Italian (Italiano)',
      'nl': 'Dutch (Nederlands)',
      'pl': 'Polish (Polski)',
      'hi': 'Hindi (हिन्दी)',
      'vi': 'Vietnamese (Tiếng Việt)',
      'th': 'Thai (ภาษาไทย)',
      'id': 'Indonesian (Bahasa Indonesia)',
      'fa': 'Persian (فارسی)',
      'he': 'Hebrew (עברית)',
    };
    const langName = languageNames[language] || 'English';
    const langInstruction = `Respond in ${langName}. Be professional and concise.`;

    // Trade type context for the AI
    const tradeTypeContext = {
      scalping: {
        label: 'SCALPING',
        timeframes: '1-15 minute',
        holdTime: 'seconds to minutes',
        focus: 'quick momentum moves, tight stops, fast entries/exits',
      },
      dayTrade: {
        label: 'DAY TRADE',
        timeframes: '15min-4h',
        holdTime: 'hours (same day)',
        focus: 'intraday trends, key levels, volume confirmation',
      },
      swing: {
        label: 'SWING TRADE',
        timeframes: '4h-1d',
        holdTime: 'days to weeks',
        focus: 'major trends, support/resistance zones, patience',
      },
    };
    const tradeCtx = tradeTypeContext[tradeType];

    // Expert-specific data extraction
    let focusData: Record<string, unknown> = {};
    let focusPrompt = '';

    // ALWAYS include symbol AND tradeType in data to prevent AI confusion
    const baseData = {
      symbol,
      analysisFor: symbol,
      tradeType: tradeCtx.label,
      timeframes: tradeCtx.timeframes,
      expectedHoldTime: tradeCtx.holdTime,
    };

    // Extract indicator summary for cleaner AI prompt
    const indicatorDetails = analysisData.indicatorDetails as Record<string, unknown> | undefined;
    const indicatorSummary = indicatorDetails?.summary as Record<string, unknown> | undefined;
    const trendIndicators = indicatorDetails?.trend as Record<string, unknown> | undefined;
    const momentumIndicators = indicatorDetails?.momentum as Record<string, unknown> | undefined;
    const volumeIndicators = indicatorDetails?.volume as Record<string, unknown> | undefined;
    const volatilityIndicators = indicatorDetails?.volatility as Record<string, unknown> | undefined;
    const divergences = indicatorDetails?.divergences as unknown[] | undefined;

    switch (expertId) {
      case 'aria':
        // Build comprehensive indicator snapshot for ARIA
        const indicatorSnapshot: Record<string, unknown> = {
          // Summary statistics (40+ indicators analyzed)
          totalIndicators: indicatorSummary?.totalIndicatorsUsed || 0,
          bullishCount: indicatorSummary?.bullishIndicators || 0,
          bearishCount: indicatorSummary?.bearishIndicators || 0,
          neutralCount: indicatorSummary?.neutralIndicators || 0,
          overallSignal: indicatorSummary?.overallSignal || 'neutral',
          signalConfidence: indicatorSummary?.signalConfidence || 0,
          leadingIndicatorsSignal: indicatorSummary?.leadingIndicatorsSignal || 'neutral',
          // Key trend indicators
          trendSignals: trendIndicators ? Object.entries(trendIndicators).map(([k, v]) => ({
            name: (v as Record<string, unknown>)?.name || k,
            signal: (v as Record<string, unknown>)?.signal,
            interpretation: (v as Record<string, unknown>)?.interpretation,
          })).slice(0, 5) : [],
          // Key momentum indicators
          momentumSignals: momentumIndicators ? Object.entries(momentumIndicators).map(([k, v]) => ({
            name: (v as Record<string, unknown>)?.name || k,
            value: (v as Record<string, unknown>)?.value,
            signal: (v as Record<string, unknown>)?.signal,
            interpretation: (v as Record<string, unknown>)?.interpretation,
          })).slice(0, 5) : [],
          // Volume analysis
          volumeSignals: volumeIndicators ? Object.entries(volumeIndicators).map(([k, v]) => ({
            name: (v as Record<string, unknown>)?.name || k,
            signal: (v as Record<string, unknown>)?.signal,
            interpretation: (v as Record<string, unknown>)?.interpretation,
          })).slice(0, 3) : [],
          // Divergences detected
          divergences: divergences?.slice(0, 3) || [],
        };

        focusData = {
          ...baseData,
          currentPrice: analysisData.currentPrice,
          timeframes: analysisData.timeframes,
          levels: analysisData.levels,
          // Structured indicator analysis instead of raw dump
          indicatorAnalysis: indicatorSnapshot,
        };
        focusPrompt = `You are analyzing ${symbol} for ${tradeCtx.label} using ${indicatorSnapshot.totalIndicators || '40+'} technical indicators.

INDICATOR SUMMARY:
- Bullish signals: ${indicatorSnapshot.bullishCount}
- Bearish signals: ${indicatorSnapshot.bearishCount}
- Overall signal: ${indicatorSnapshot.overallSignal} (${indicatorSnapshot.signalConfidence}% confidence)
- Leading indicators: ${indicatorSnapshot.leadingIndicatorsSignal}

Reference specific indicators from the data. Focus on ${tradeCtx.focus}. NOT Bitcoin - specifically ${symbol}.`;
        break;

      case 'oracle':
        focusData = {
          ...baseData,
          whaleActivity: analysisData.whaleActivity,
          exchangeFlows: analysisData.exchangeFlows,
          smartMoney: analysisData.smartMoney,
          orderFlowImbalance: (analysisData.advancedMetrics as Record<string, unknown>)?.orderFlowImbalance,
          liquidityScore: (analysisData.advancedMetrics as Record<string, unknown>)?.liquidityScore,
          indicatorDetails: analysisData.indicatorDetails,
        };
        focusPrompt = `You are analyzing ${symbol} whale activity for ${tradeCtx.label}. For ${tradeCtx.holdTime} holds, focus on short-term flow patterns. NOT Bitcoin analysis - specifically ${symbol}.`;
        break;

      case 'sentinel':
        focusData = {
          ...baseData,
          riskLevel: analysisData.riskLevel,
          manipulation: analysisData.manipulation,
          traps: analysisData.traps,
          warnings: analysisData.warnings,
          liquidityScore: (analysisData.advancedMetrics as Record<string, unknown>)?.liquidityScore,
          historicalVolatility: (analysisData.advancedMetrics as Record<string, unknown>)?.historicalVolatility,
          indicatorDetails: analysisData.indicatorDetails,
        };
        focusPrompt = `You are analyzing ${symbol} risks for ${tradeCtx.label}. For ${tradeCtx.holdTime} trades, assess manipulation and trap risks. NOT Bitcoin analysis - specifically ${symbol}.`;
        break;

      case 'nexus':
        focusData = {
          ...baseData,
          direction: analysisData.direction,
          entries: analysisData.entries,
          stopLoss: analysisData.stopLoss,
          takeProfits: analysisData.takeProfits,
          riskReward: analysisData.riskReward,
          positionSizePercent: analysisData.positionSizePercent,
          riskAmount: analysisData.riskAmount,
        };
        focusPrompt = `You are analyzing ${symbol} trade plan for ${tradeCtx.label}. For ${tradeCtx.holdTime} holds with ${tradeCtx.timeframes} timeframes, assess R/R and position sizing. NOT Bitcoin analysis - specifically ${symbol}.`;
        break;
    }

    // Dynamic output length based on expert type
    const isARIA = expertId === 'aria';
    const maxSentences = isARIA ? '3-4' : '2-3';
    const maxTokens = isARIA ? 350 : 250;

    const prompt = `You are ${expert.name}, ${expert.title} at TraderPath.

⚠️ CRITICAL CONTEXT:
- Asset: ${symbol} (NOT Bitcoin, NOT BTC - specifically ${symbol})
- Trade Type: ${tradeCtx.label}
- Timeframes: ${tradeCtx.timeframes}
- Hold Time: ${tradeCtx.holdTime}
- Focus: ${tradeCtx.focus}

${focusPrompt}

${symbol} ${tradeCtx.label} DATA:
${JSON.stringify(focusData, null, 2)}

RULES:
- Give your expert opinion in ${maxSentences} sentences
- ${isARIA ? 'CITE SPECIFIC INDICATORS by name (e.g., "RSI at 72", "MACD bullish crossover")' : 'Be specific with numbers and percentages'}
- Tailor advice to ${tradeCtx.label} style (${tradeCtx.holdTime} holds)
- ONLY discuss ${symbol}, never mention other coins
- ${langInstruction}
- NO questions, NO offers, NO CTAs at the end

FORMAT: Just your professional ${tradeCtx.label} insight about ${symbol}. Start directly with your analysis.`;

    try {
      // Use retry-enabled Gemini API call
      const data = await callGeminiWithRetry(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: maxTokens,
          },
        },
        3, // maxRetries - balanced for speed vs reliability
        `expert_commentary_${expertId}`
      );

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
    language: string = 'en',
    tradeType: 'scalping' | 'dayTrade' | 'swing' = 'dayTrade'
  ): Promise<string> {
    // Multi-language support for synthesis
    const languageNames: Record<string, string> = {
      'en': 'English',
      'tr': 'Turkish (Türkçe)',
      'es': 'Spanish (Español)',
      'de': 'German (Deutsch)',
      'fr': 'French (Français)',
      'ar': 'Arabic (العربية)',
      'ru': 'Russian (Русский)',
      'zh': 'Chinese (中文)',
      'ja': 'Japanese (日本語)',
      'ko': 'Korean (한국어)',
      'pt': 'Portuguese (Português)',
      'it': 'Italian (Italiano)',
      'nl': 'Dutch (Nederlands)',
      'pl': 'Polish (Polski)',
      'hi': 'Hindi (हिन्दी)',
      'vi': 'Vietnamese (Tiếng Việt)',
      'th': 'Thai (ภาษาไทย)',
      'id': 'Indonesian (Bahasa Indonesia)',
      'fa': 'Persian (فارسی)',
      'he': 'Hebrew (עברית)',
    };
    const langName = languageNames[language] || 'English';
    const langInstruction = language === 'tr'
      ? `⚠️ ZORUNLU: Yanıtını tamamen TÜRKÇE olarak yaz. Profesyonel ve özlü ol. İngilizce kelime kullanma.`
      : language !== 'en'
        ? `⚠️ IMPORTANT: Write your entire response in ${langName}. Be professional and concise.`
        : `Be professional and concise. Write in English.`;

    // Trade type context
    const tradeTypeContext = {
      scalping: { label: 'SCALPING', holdTime: 'seconds to minutes' },
      dayTrade: { label: 'DAY TRADE', holdTime: 'hours (same day)' },
      swing: { label: 'SWING TRADE', holdTime: 'days to weeks' },
    };
    const tradeCtx = tradeTypeContext[tradeType];

    const prompt = `You are the VOLTRAN - the unified voice of TraderPath's Expert Panel.

⚠️ CRITICAL CONTEXT:
- Asset: ${symbol} (NOT Bitcoin, NOT BTC - specifically ${symbol})
- Trade Type: ${tradeCtx.label}
- Hold Time: ${tradeCtx.holdTime}

4 world-class experts have analyzed ${symbol} for ${tradeCtx.label}. Synthesize their insights into ONE powerful recommendation.

${symbol} ${tradeCtx.label} EXPERT OPINIONS:
${expertComments.map(e => `${e.expertName}: ${e.comment}`).join('\n\n')}

${symbol} ${tradeCtx.label} FINAL VERDICT DATA:
- Decision: ${verdict.verdict}
- Score: ${verdict.overallScore}/10
- Recommendation: ${verdict.recommendation}

YOUR TASK:
Create a unified 3-4 sentence synthesis for ${symbol} ${tradeCtx.label} that:
1. Highlights the consensus view about ${symbol} for ${tradeCtx.holdTime} trades
2. Notes any expert disagreements about ${symbol}
3. Gives the final actionable ${tradeCtx.label} recommendation for ${symbol}

${langInstruction}
ONLY discuss ${symbol}, never mention other coins.

FORMAT: Just your professional ${tradeCtx.label} synthesis about ${symbol}. Start directly with your unified recommendation.`;

    try {
      // Use retry-enabled Gemini API call with higher token limit for complete responses
      const data = await callGeminiWithRetry(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600, // Increased from 300 to ensure complete responses
          },
        },
        3, // maxRetries - balanced for speed vs reliability
        'voltran_synthesis'
      );

      return sanitizeAIResponse(
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'Panel synthesis unavailable.'
      );
    } catch (error) {
      console.error('Voltran synthesis error:', error);
      return 'Unable to synthesize expert opinions at this time.';
    }
  }

  /**
   * Run full Expert Panel analysis (VOLTRAN)
   * Triggers 7-step analysis and gets all 4 experts to comment
   */
  async analyzeWithExpertPanel(params: {
    symbol: string;
    userId: string;
    language?: string;
    tradeType?: 'scalping' | 'dayTrade' | 'swing';
    interval?: string;
  }): Promise<ExpertPanelResult> {
    const { symbol, userId, language = 'en', tradeType = 'dayTrade', interval = '4h' } = params;
    const upperSymbol = symbol.toUpperCase();

    console.log(`[AIExpert] analyzeWithExpertPanel called: symbol=${upperSymbol}, tradeType=${tradeType}, interval=${interval}, language=${language}`);

    // Check if symbol is supported
    if (!this.SUPPORTED_SYMBOLS.includes(upperSymbol)) {
      return {
        success: false,
        symbol: upperSymbol,
        error: `${upperSymbol} is not supported. Supported: ${this.SUPPORTED_SYMBOLS.slice(0, 10).join(', ')}...`,
      };
    }

    // Check and charge credits (dynamic cost for full analysis)
    const cost = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');
    const chargeResult = await creditService.charge(userId, cost, 'expert_panel_analysis', {
      symbol: upperSymbol,
      tradeType,
    });

    if (!chargeResult.success) {
      return {
        success: false,
        symbol: upperSymbol,
        error: `Insufficient credits. Required: ${cost}, Available: ${chargeResult.newBalance + cost}`,
      };
    }

    // Trade type labels for prompts
    const tradeTypeLabels = {
      scalping: 'SCALPING (1-15 minute timeframes, quick trades)',
      dayTrade: 'DAY TRADE (15min-4h timeframes, intraday)',
      swing: 'SWING TRADE (4h-1d timeframes, multi-day holds)',
    };
    const tradeTypeLabel = tradeTypeLabels[tradeType];

    try {
      // Run full 7-step analysis with trade type
      const [marketPulse, assetScan, safetyCheck, timing, tradePlan, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(upperSymbol, tradeType),
        analysisEngine.safetyCheck(upperSymbol, tradeType),
        analysisEngine.timingAnalysis(upperSymbol, tradeType),
        analysisEngine.tradePlan(upperSymbol, 10000, tradeType),
        analysisEngine.trapCheck(upperSymbol, tradeType),
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

      // Prepare combined data for each expert - include tradeType context
      const ariaData = { ...assetScan, advancedMetrics: safetyCheck.advancedMetrics, tradeType, tradeTypeLabel };
      const oracleData = { ...safetyCheck, advancedMetrics: safetyCheck.advancedMetrics, tradeType, tradeTypeLabel };
      const sentinelData = { ...safetyCheck, ...trapCheck, advancedMetrics: safetyCheck.advancedMetrics, tradeType, tradeTypeLabel };
      const nexusData = { ...tradePlan, tradeType, tradeTypeLabel };

      // Get all 4 expert comments sequentially to avoid rate limits
      // Small delay between calls to prevent API throttling
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const ariaComment = await this.generateExpertCommentary('aria', upperSymbol, ariaData, language, tradeType);
      await delay(500); // 500ms between calls

      const oracleComment = await this.generateExpertCommentary('oracle', upperSymbol, oracleData, language, tradeType);
      await delay(500);

      const sentinelComment = await this.generateExpertCommentary('sentinel', upperSymbol, sentinelData, language, tradeType);
      await delay(500);

      const nexusComment = await this.generateExpertCommentary('nexus', upperSymbol, nexusData, language, tradeType);
      await delay(500); // Delay before Voltran synthesis

      const expertComments = [ariaComment, oracleComment, sentinelComment, nexusComment];

      // Generate Voltran synthesis with trade type context
      const voltranSynthesis = await this.generateVoltranSynthesis(
        upperSymbol,
        expertComments,
        verdict as unknown as Record<string, unknown>,
        language,
        tradeType
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
        metadata: { experts: 4, synthesis: true, tradeType },
      });

      // Save analysis to database (same as normal analysis flow)
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
          step5Result: tradePlan as object || null,
          step6Result: trapCheck as object,
          step7Result: { ...verdict, expertComments, voltranSynthesis } as object,
          totalScore: verdict.overallScore,
          creditsSpent: cost,
        },
      });

      // Trade type completion bonus (same as normal analysis flow)
      const tradeTypeBonus = tradeType === 'scalping' ? 3 : tradeType === 'dayTrade' ? 2 : 1;
      await creditService.add(
        userId,
        tradeTypeBonus,
        'BONUS',
        'trade_type_completion_bonus',
        {
          tradeType,
          symbol: upperSymbol,
          analysisId: savedAnalysis.id,
        }
      );

      return {
        success: true,
        symbol: upperSymbol,
        analysisId: savedAnalysis.id,
        verdict: verdict.verdict,
        score: verdict.overallScore,
        expertComments,
        voltranSynthesis,
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance - tradeTypeBonus, // Account for bonus
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
   * Icons are rendered by the frontend based on expert ID markers
   */
  formatPanelResponse(result: Awaited<ReturnType<typeof this.analyzeWithExpertPanel>>): string {
    if (!result.success) {
      return `[ERROR] ${result.error}`;
    }

    const verdictLabel = {
      'go': '[GO]',
      'conditional_go': '[CONDITIONAL GO]',
      'wait': '[WAIT]',
      'avoid': '[AVOID]',
    }[result.verdict || 'wait'] || '[PENDING]';

    let response = `[PANEL_HEADER] ${result.symbol} Expert Panel Analysis\n\n`;
    response += `${verdictLabel} Verdict: ${result.verdict?.toUpperCase()} (${result.score}/10)\n\n`;

    response += `---\n\n`;
    response += `[EXPERT:ARIA] ${result.expertComments?.find(e => e.expertId === 'aria')?.comment}\n\n`;
    response += `[EXPERT:ORACLE] ${result.expertComments?.find(e => e.expertId === 'oracle')?.comment}\n\n`;
    response += `[EXPERT:SENTINEL] ${result.expertComments?.find(e => e.expertId === 'sentinel')?.comment}\n\n`;
    response += `[EXPERT:NEXUS] ${result.expertComments?.find(e => e.expertId === 'nexus')?.comment}\n\n`;
    response += `---\n\n`;
    response += `[VOLTRAN] ${result.voltranSynthesis?.replace(/🤖 VOLTRAN PANEL VERDICT\n?/g, '')}`;

    return response;
  }
}

export const aiExpertService = new AIExpertService();
