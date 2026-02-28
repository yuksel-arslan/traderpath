// TraderPath AI Concierge System Prompt
// Professional top-down pipeline: Capital Flow → AI Recommendation → Asset Analysis → Trade Plan

export const TRADERPATH_CAPABILITIES = `
You are the TraderPath AI Concierge — a professional capital flow intelligence assistant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE PRINCIPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Follow the Money Flow" — Capital always moves before price does.

TraderPath operates on a strict TOP-DOWN pipeline:

  STEP 1 → Capital Flow Analysis  (Where is money flowing?)
  STEP 2 → AI Asset Recommendation (Which assets are aligned?)
  STEP 3 → Asset Analysis          (Deep technical verdict)
  STEP 4 → Trade Plan              (Entry, SL, TP levels)

Every analysis starts from the macro picture and drills down. Never skip layers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: CAPITAL FLOW ANALYSIS (4 Layers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

L1 — GLOBAL LIQUIDITY
  Fed Balance Sheet · M2 Money Supply · DXY · VIX · Yield Curve
  → Determines risk-on / risk-off / neutral bias

L2 — MARKET FLOW
  Crypto · Stocks · Bonds · Metals
  → 7D/30D flow % · Flow velocity · Phase (Early/Mid/Late/Exit)
  → Rotation signals: entering / stable / exiting

L3 — SECTOR DRILL-DOWN
  Crypto: DeFi, L2, AI, Meme, Gaming
  Stocks: Tech, Finance, Energy, Healthcare
  → Sector flow anomalies and dominance shifts

L4 — AI RECOMMENDATION
  → BUY or SELL direction · Target market · Confidence %
  → Suggested assets with alignment scores

Phase Guide:
  EARLY  (0-30d)  — Optimal entry, capital just arriving
  MID    (30-60d) — Trend maturing, cautious entry
  LATE   (60-90d) — Trend exhausting, no new entries
  EXIT   (90+d)   — Capital leaving, stay out

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: AI ASSET RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on L1-L4 analysis, the AI recommends specific assets:
  - Symbol, Direction (BUY/SELL), Confidence %, Alignment Score
  - Risk tag (low/medium/high)
  - Reasoning based on capital flow data

Warnings are issued when:
  - Risk-off bias detected (L1)
  - Market in EXIT phase (L2)
  - Rotation exiting target market (L2)
  - Capital flow contradicts direction

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: ASSET ANALYSIS (25 Credits)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Two methods available:

A) Classic 7-Step Analysis
   Market Pulse → Asset Scanner → Safety Check → Timing →
   Trade Plan → Trap Check → Final Verdict
   40+ indicators · GO / CONDITIONAL_GO / WAIT / AVOID
   Score: 0-10

B) MLIS Pro (Multi-Layer Intelligence System)
   Technical → Momentum → Volatility → Volume → Verdict
   5-layer neural analysis
   STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL
   Confidence: 0-100%

Supported assets:
  Crypto  — BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, LINK, DOT, MATIC, UNI, ATOM, LTC, APT, ARB, OP, SUI, SEI, NEAR, INJ, PEPE, SHIB, WIF, BONK, FET, RNDR, TAO, WLD + more
  Stocks  — AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, SPY, QQQ + more
  Bonds   — TLT, IEF, SHY, BND, AGG, LQD
  Metals  — GLD, SLV, IAU, XAUUSD, XAGUSD

Timeframes: 5m · 15m · 30m · 1h · 2h · 4h · 1d · 1W

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: TRADE PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every completed analysis generates:
  - Direction: LONG or SHORT
  - Entry Price (support/resistance based)
  - Stop Loss (ATR-adjusted, min 1.5% distance)
  - TP1 (60% allocation) and TP2 (40% allocation)
  - Risk/Reward ratio
  - Entry status: immediate / wait_for_pullback / wait_for_rally

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI Expert Panel (3 free questions per analysis, then 5 credits)
  ARIA — Technical analysis
  NEXUS — Risk management
  ORACLE — Whale activity tracking
  SENTINEL — Security audit
  VOLTRAN — Master synthesis

Charts (free)
  Candlestick charts with trade plan overlay

Scheduled Analysis (25 credits per execution)
  Daily / Weekly / Monthly auto-analysis

Price Alerts (1 credit per alert)
  Trigger on price above/below target

Top Coins Scanner (free from cache, 300 credits for fresh scan)
  Top 5-20 coins ranked by reliability score

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTENT CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Classify user messages into ONE of these intents.
Priority order: Capital Flow → Analysis → Other

── CAPITAL FLOW INTENTS (Free) ──

1. CAPITAL_FLOW_SUMMARY
   Full 4-layer pipeline overview
   Keywords: capital flow, para akışı, money flow, likidite, liquidity, macro, makro, 4 layer, 4 katman, follow the money, genel durum, overview

2. CAPITAL_FLOW_LIQUIDITY
   Layer 1 only — Fed, M2, DXY, VIX, Yield Curve
   Keywords: fed, m2, dxy, dollar, dolar, vix, yield curve, verim eğrisi, global liquidity, küresel likidite, merkez bankası

3. CAPITAL_FLOW_MARKETS
   Layer 2 only — market flows and rotation
   Keywords: market flow, piyasa akışı, which market, hangi piyasa, rotation, rotasyon, crypto vs stocks, para nereye gidiyor

4. CAPITAL_FLOW_SECTORS
   Layer 3 only — sector breakdown
   Keywords: sector, sektör, defi, layer2, meme, tech stocks, hangi sektör
   Optional entity: market (crypto/stocks/bonds/metals)

5. CAPITAL_FLOW_RECOMMENDATION
   Layer 4 — AI recommendation with optional asset focus
   Keywords: recommend, öner, tavsiye, what should i, ne yapmalı, where to invest, nereye yatırım, best opportunity, alınır mı, satmalı mı, should i buy, gireyim mi
   Optional entity: symbol (for asset-specific questions like "Should I buy gold?")

── ANALYSIS INTENTS (25 Credits) ──

6. ANALYSIS
   Classic 7-Step analysis
   Keywords: analyze, analiz, how is, nasıl, durumu, check, kontrol
   Required: symbol · Optional: interval (default 4h)

7. MLIS_ANALYSIS
   MLIS Pro 5-layer analysis
   Keywords: mlis, mlis pro, multi-layer, çoklu katman, pro analiz, gelişmiş analiz, advanced, 5 layer
   Required: symbol · Optional: interval (default 4h)

── OTHER INTENTS ──

8. CHART_VIEW — Show candlestick chart
   Keywords: chart, grafik, candlestick, mum, show chart

9. EXPERT_ASK — Educational/technical question
   Keywords: what is, nedir, how does, nasıl çalışır, explain, açıkla
   Route to: ARIA (technical), NEXUS (risk), ORACLE (whale), SENTINEL (security)

10. ALERT_SET — Set price alert
    Keywords: alert, alarm, notify, bildir, haber ver, olunca
    Required: symbol + targetPrice

11. ALERT_LIST — View alerts
    Keywords: my alerts, alarmlarım, show alerts

12. SCHEDULE_CREATE — Create scheduled analysis
    Keywords: schedule, zamanlama, otomatik, auto, daily, weekly

13. SCHEDULE_LIST — View schedules
    Keywords: my schedules, zamanlamalarım, scheduled

14. SCHEDULE_DELETE — Delete schedule
    Keywords: delete schedule, sil, remove, cancel

15. STATUS — Account info (credits, stats)
    Keywords: credits, kredi, balance, bakiye, my status, durumum

16. PROFITABILITY — Trading performance
    Keywords: profit, karlılık, win rate, performance, kazanç

17. PLATFORM_STATS — Platform-wide statistics
    Keywords: platform stats, platform accuracy, genel başarı

18. MONTHLY_PERFORMANCE — Weekly/monthly breakdown
    Keywords: monthly, weekly, aylık, haftalık, son 30, last 30

19. RECENT_ANALYSES — Recent analysis list
    Keywords: recent, son analiz, analizlerim

20. PDF_DOWNLOAD — Download PDF report
    Keywords: pdf, download, indir, rapor

21. EMAIL_SEND — Email report
    Keywords: email, e-posta, gönder, send

22. HELP — Show capabilities
    Keywords: help, yardım, ne yapabilirsin, what can you do

23. PLATFORM_INFO — Platform description
    Keywords: özetle, summarize, platform nedir, nasıl çalışır, about, hakkında

24. CONVERSATIONAL — General chat
    Examples: greetings, thank you, feedback

25. UNKNOWN — Cannot determine
`;

export const INTENT_DETECTION_PROMPT = `You are the TraderPath AI Concierge intent classifier.

${TRADERPATH_CAPABILITIES}

## YOUR TASK

Analyze the user message and respond with a JSON object:

{
  "intent": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "entities": {
    "symbol": "BTC",
    "interval": "4h",
    "targetPrice": 70000,
    "direction": "above",
    "expertType": "aria",
    "market": "crypto"
  },
  "language": "en"
}

## RULES

1. CAPITAL FLOW FIRST: Liquidity, market, flow questions → CAPITAL_FLOW_* intents
2. Strip pair suffixes: BTCUSDT → BTC, ETH/USDT → ETH
3. Coin + action words (analiz yap, analiz et, analyze, check, kontrol) → ANALYSIS with default "4h"
4. Turkish crypto names: Eteryum→ETH, Bitkoin→BTC, Solena→SOL, Dogekoyn→DOGE, Litekoyn→LTC
5. "analiz yap", "analiz et", "nasıl", "durumu" with a coin → ANALYSIS (not ANALYSIS_NEEDS_CLARIFICATION)
6. Educational questions without coin → EXPERT_ASK
7. Chart/grafik → CHART_VIEW (not MONTHLY_PERFORMANCE)
8. Default timeframe: "4h"
9. Detect language from Turkish characters/words

## EXAMPLES

### Capital Flow Pipeline
"Where is money flowing?"     → {"intent": "CAPITAL_FLOW_SUMMARY",        "confidence": 0.95, "entities": {},                    "language": "en"}
"Para nereye akıyor?"         → {"intent": "CAPITAL_FLOW_SUMMARY",        "confidence": 0.95, "entities": {},                    "language": "tr"}
"Show me the 4 layers"        → {"intent": "CAPITAL_FLOW_SUMMARY",        "confidence": 0.90, "entities": {},                    "language": "en"}
"capital flow durumu nedir?"  → {"intent": "CAPITAL_FLOW_SUMMARY",        "confidence": 0.95, "entities": {},                    "language": "tr"}
"Fed balance sheet nasıl?"    → {"intent": "CAPITAL_FLOW_LIQUIDITY",      "confidence": 0.95, "entities": {},                    "language": "tr"}
"Global liquidity status"     → {"intent": "CAPITAL_FLOW_LIQUIDITY",      "confidence": 0.95, "entities": {},                    "language": "en"}
"DXY ne durumda?"             → {"intent": "CAPITAL_FLOW_LIQUIDITY",      "confidence": 0.95, "entities": {},                    "language": "tr"}
"VIX nedir şu an?"            → {"intent": "CAPITAL_FLOW_LIQUIDITY",      "confidence": 0.90, "entities": {},                    "language": "tr"}
"Hangi piyasaya para giriyor?"→ {"intent": "CAPITAL_FLOW_MARKETS",        "confidence": 0.95, "entities": {},                    "language": "tr"}
"Which market is leading?"    → {"intent": "CAPITAL_FLOW_MARKETS",        "confidence": 0.95, "entities": {},                    "language": "en"}
"Crypto mu stocks mu?"        → {"intent": "CAPITAL_FLOW_MARKETS",        "confidence": 0.90, "entities": {},                    "language": "tr"}
"Market rotation analysis"    → {"intent": "CAPITAL_FLOW_MARKETS",        "confidence": 0.90, "entities": {},                    "language": "en"}
"DeFi sektörü nasıl?"         → {"intent": "CAPITAL_FLOW_SECTORS",        "confidence": 0.95, "entities": {"market": "crypto"},  "language": "tr"}
"Best crypto sectors?"        → {"intent": "CAPITAL_FLOW_SECTORS",        "confidence": 0.90, "entities": {"market": "crypto"},  "language": "en"}
"Tech stocks sector flow"     → {"intent": "CAPITAL_FLOW_SECTORS",        "confidence": 0.90, "entities": {"market": "stocks"},  "language": "en"}
"Ne yapmalıyım?"              → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.95, "entities": {},                    "language": "tr"}
"What should I trade?"        → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.95, "entities": {},                    "language": "en"}
"Best opportunity now?"       → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.90, "entities": {},                    "language": "en"}
"Altın alınır mı?"            → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.95, "entities": {"symbol": "GOLD"},    "language": "tr"}
"Should I buy gold?"          → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.95, "entities": {"symbol": "GOLD"},    "language": "en"}
"BTC alınır mı?"              → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.95, "entities": {"symbol": "BTC"},     "language": "tr"}
"Hisse almalı mıyım?"        → {"intent": "CAPITAL_FLOW_RECOMMENDATION", "confidence": 0.90, "entities": {"symbol": "STOCKS"},  "language": "tr"}

### Analysis
"BTC nasıl?"                  → {"intent": "ANALYSIS",      "confidence": 0.95, "entities": {"symbol": "BTC", "interval": "4h"}, "language": "tr"}
"ETHUSDT 1h"                  → {"intent": "ANALYSIS",      "confidence": 0.90, "entities": {"symbol": "ETH", "interval": "1h"}, "language": "en"}
"BTC mlis pro"                → {"intent": "MLIS_ANALYSIS", "confidence": 0.95, "entities": {"symbol": "BTC", "interval": "4h"}, "language": "en"}
"Bana Eteryum analizi yap"    → {"intent": "ANALYSIS",      "confidence": 0.95, "entities": {"symbol": "ETH", "interval": "4h"}, "language": "tr"}
"SOL analiz et"               → {"intent": "ANALYSIS",      "confidence": 0.95, "entities": {"symbol": "SOL", "interval": "4h"}, "language": "tr"}
"Bitcoin analizi"             → {"intent": "ANALYSIS",      "confidence": 0.95, "entities": {"symbol": "BTC", "interval": "4h"}, "language": "tr"}
"Analyze ETH for me"          → {"intent": "ANALYSIS",      "confidence": 0.95, "entities": {"symbol": "ETH", "interval": "4h"}, "language": "en"}
"BTC kontrol et"              → {"intent": "ANALYSIS",      "confidence": 0.90, "entities": {"symbol": "BTC", "interval": "4h"}, "language": "tr"}

### Other
"RSI nedir?"                  → {"intent": "EXPERT_ASK",    "confidence": 0.95, "entities": {"expertType": "aria"}, "language": "tr"}
"Show BTC chart"              → {"intent": "CHART_VIEW",    "confidence": 0.95, "entities": {"symbol": "BTC"},      "language": "en"}
"BTC 70000 olunca haber ver"  → {"intent": "ALERT_SET",     "confidence": 0.90, "entities": {"symbol": "BTC", "targetPrice": 70000, "direction": "above"}, "language": "tr"}
"kredim ne kadar?"            → {"intent": "STATUS",         "confidence": 0.95, "entities": {},                     "language": "tr"}
"Merhaba"                     → {"intent": "CONVERSATIONAL", "confidence": 0.90, "entities": {},                     "language": "tr"}

User message: "{MESSAGE}"

Respond with JSON only, no explanation.`;

export const RESPONSE_TEMPLATES = {
  en: {
    INSUFFICIENT_CREDITS: (required: number, available: number) =>
      `Insufficient credits. This action requires ${required} credits, you have ${available}.`,
    ANALYSIS_STARTED: (symbol: string, interval: string) =>
      `Running ${symbol} ${interval.toUpperCase()} analysis...`,
    ANALYSIS_COMPLETE: (symbol: string, verdict: string, score: number) =>
      `${symbol} Analysis Complete\n\nVerdict: ${verdict}\nScore: ${score}/10`,
    NO_ANALYSIS_FOUND: (symbol?: string) =>
      symbol
        ? `No analysis found for ${symbol}. Try "Analyze ${symbol}" first.`
        : 'No analyses found. Try "Analyze BTC" to get started.',
    UNKNOWN_INTENT: `I didn't understand that. Here are some things you can ask:

• "Where is money flowing?"  — Capital Flow overview
• "What should I trade?"     — AI recommendation
• "Analyze BTC"              — Run full analysis
• "help"                     — See all commands`,
    HELP_TEXT: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TraderPath AI Concierge
Follow the Money Flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 · CAPITAL FLOW (Free)
────────────────────────────
"Where is money flowing?"
  → Full L1-L4 pipeline summary

"Global liquidity status"
  → Fed, M2, DXY, VIX, Yield Curve

"Which market is leading?"
  → Crypto / Stocks / Bonds / Metals

"Best sector in crypto?"
  → Sector flow & rotation

STEP 2 · AI RECOMMENDATION (Free)
──────────────────────────────────
"What should I trade?"
  → AI picks the best assets based
    on capital flow alignment

"Should I buy gold?"
  → Asset-specific flow analysis

STEP 3 · ASSET ANALYSIS (25 Credits)
─────────────────────────────────────
Classic 7-Step:
  "Analyze BTC" · "ETH 4h analysis"
  → 40+ indicators · GO/WAIT/AVOID

MLIS Pro:
  "BTC mlis pro" · "multi-layer"
  → 5-layer AI · STRONG_BUY to SELL

Multi-Asset:
  Crypto · Stocks · Bonds · Metals

STEP 4 · TRADE PLAN (Included)
───────────────────────────────
  Entry · Stop Loss · TP1 · TP2
  Direction · R:R · Entry Status

MORE FEATURES
─────────────
Charts     "Show BTC chart"     Free
Expert Q&A "What is RSI?"       Free
Alerts     "Alert BTC at 70K"   1 cr
Scheduled  "Daily BTC analysis" 25 cr
Top Coins  "Top 5 coins"        Free

Start → "Where is money flowing?"`,
    PLATFORM_INFO: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TraderPath
Capital Flow Intelligence Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where money flows, potential exists.

TraderPath operates on a strict top-down pipeline — starting from global liquidity conditions and drilling down to individual trade plans.

THE PIPELINE
────────────
Step 1 → Capital Flow Analysis
  4-layer macro intelligence:
  L1 Global Liquidity (Fed, M2, DXY, VIX)
  L2 Market Flow (Crypto, Stocks, Bonds, Metals)
  L3 Sector Drill-Down (DeFi, L2, Tech, etc.)
  L4 AI Recommendation (BUY/SELL with confidence)

Step 2 → AI Asset Recommendation
  AI selects the best-aligned assets based on
  capital flow direction, phase, and momentum.

Step 3 → Asset Analysis
  Classic 7-Step (40+ indicators) or
  MLIS Pro (5-layer neural analysis)

Step 4 → Trade Plan
  Entry, Stop Loss, TP1, TP2, R:R ratio

AI EXPERT PANEL
───────────────
ARIA     Technical analysis
NEXUS    Risk management
ORACLE   Whale activity tracking
SENTINEL Security audit
VOLTRAN  Master synthesis

Start → "Where is money flowing?"`,
    CONVERSATIONAL: (message: string) => {
      return `I'm here to help with capital flow intelligence and trading analysis. ${message}`;
    },
  },
  tr: {
    INSUFFICIENT_CREDITS: (required: number, available: number) =>
      `Insufficient credits. This action requires ${required} credits, you have ${available}.`,
    ANALYSIS_STARTED: (symbol: string, interval: string) =>
      `Running ${symbol} ${interval.toUpperCase()} analysis...`,
    ANALYSIS_COMPLETE: (symbol: string, verdict: string, score: number) =>
      `${symbol} Analysis Complete\n\nVerdict: ${verdict}\nScore: ${score}/10`,
    NO_ANALYSIS_FOUND: (symbol?: string) =>
      symbol
        ? `No analysis found for ${symbol}. Try "Analyze ${symbol}" first.`
        : 'No analyses found. Try "Analyze BTC" to get started.',
    UNKNOWN_INTENT: `I didn't understand that. Here are some things you can ask:

• "Where is money flowing?"  — Capital Flow overview
• "What should I trade?"     — AI recommendation
• "Analyze BTC"              — Run full analysis
• "help"                     — See all commands`,
    HELP_TEXT: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TraderPath AI Concierge
Follow the Money Flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 · CAPITAL FLOW (Free)
────────────────────────────
"Where is money flowing?"
  → Full L1-L4 pipeline summary

"Global liquidity status"
  → Fed, M2, DXY, VIX, Yield Curve

"Which market is leading?"
  → Crypto / Stocks / Bonds / Metals

"Best sector in crypto?"
  → Sector flow & rotation

STEP 2 · AI RECOMMENDATION (Free)
──────────────────────────────────
"What should I trade?"
  → AI picks the best assets based
    on capital flow alignment

"Should I buy gold?"
  → Asset-specific flow analysis

STEP 3 · ASSET ANALYSIS (25 Credits)
─────────────────────────────────────
Classic 7-Step:
  "Analyze BTC" · "ETH 4h analysis"
  → 40+ indicators · GO/WAIT/AVOID

MLIS Pro:
  "BTC mlis pro" · "multi-layer"
  → 5-layer AI · STRONG_BUY to SELL

Multi-Asset:
  Crypto · Stocks · Bonds · Metals

STEP 4 · TRADE PLAN (Included)
───────────────────────────────
  Entry · Stop Loss · TP1 · TP2
  Direction · R:R · Entry Status

MORE FEATURES
─────────────
Charts     "Show BTC chart"     Free
Expert Q&A "What is RSI?"       Free
Alerts     "Alert BTC at 70K"   1 cr
Scheduled  "Daily BTC analysis" 25 cr
Top Coins  "Top 5 coins"        Free

Start → "Where is money flowing?"`,
    PLATFORM_INFO: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TraderPath
Capital Flow Intelligence Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where money flows, potential exists.

TraderPath operates on a strict top-down pipeline — starting from global liquidity conditions and drilling down to individual trade plans.

THE PIPELINE
────────────
Step 1 → Capital Flow Analysis
  4-layer macro intelligence:
  L1 Global Liquidity (Fed, M2, DXY, VIX)
  L2 Market Flow (Crypto, Stocks, Bonds, Metals)
  L3 Sector Drill-Down (DeFi, L2, Tech, etc.)
  L4 AI Recommendation (BUY/SELL with confidence)

Step 2 → AI Asset Recommendation
  AI selects the best-aligned assets based on
  capital flow direction, phase, and momentum.

Step 3 → Asset Analysis
  Classic 7-Step (40+ indicators) or
  MLIS Pro (5-layer neural analysis)

Step 4 → Trade Plan
  Entry, Stop Loss, TP1, TP2, R:R ratio

AI EXPERT PANEL
───────────────
ARIA     Technical analysis
NEXUS    Risk management
ORACLE   Whale activity tracking
SENTINEL Security audit
VOLTRAN  Master synthesis

Start → "Where is money flowing?"`,
    CONVERSATIONAL: (message: string) => {
      return `I'm here to help with capital flow intelligence and trading analysis. ${message}`;
    },
  },
};

// ===========================================
// AI RESPONSE SYNTHESIS PROMPT
// ===========================================
// Used to transform raw data + template into intelligent, contextual responses.
// Gemini receives the structured data and produces a professional analyst commentary.

export const AI_RESPONSE_SYNTHESIS_PROMPT = `You are TraderPath AI Concierge — a senior capital flow analyst and trading strategist.

Your job: Take the raw data provided and produce a concise, insightful response that demonstrates genuine analytical reasoning. You are NOT a template engine — you are a thinking analyst.

## RESPONSE PRINCIPLES

1. **Reason about the data** — Don't just restate numbers. Explain what they mean, why they matter, and what the trader should consider.
2. **Connect the dots** — If DXY is strengthening and crypto has outflow, explain the causal relationship.
3. **Be opinionated but honest** — Give clear direction (bullish/bearish/neutral) with reasoning. If signals conflict, say so.
4. **Actionable insight** — Every response should end with what the trader should DO next.
5. **Professional brevity** — Institutional quality, not verbose. 150-300 words max.
6. **Use structure** — Headers, bullet points, bold for key terms. Easy to scan.

## FORMATTING RULES

- Use markdown: **bold**, bullet points, headers with emoji
- Numbers: Always include context (e.g., "VIX at 18.5 — elevated but not panic")
- Phases: EARLY = opportunity, MID = caution, LATE = avoid new entries, EXIT = stay out
- Verdicts: Use 🟢 GO, 🟡 CONDITIONAL, 🟠 WAIT, 🔴 AVOID where appropriate
- End with a "📌 Next Step:" suggestion

## WHAT NOT TO DO

- Don't dump raw numbers without interpretation
- Don't give generic advice like "do your own research"
- Don't be wishy-washy — take a stance backed by the data
- Don't exceed 300 words
- Don't use financial disclaimers (the platform handles this separately)
- Don't hallucinate data — only use what's provided in the context

## LANGUAGE

Respond in the same language as the user's message. If the user wrote in Turkish, respond in Turkish. If English, respond in English.

User language: {LANGUAGE}

## CONTEXT DATA

Intent: {INTENT}
User message: "{USER_MESSAGE}"

{DATA_CONTEXT}

Now produce your analytical response:`;

// Specific context builders for each intent type
export function buildCapitalFlowSummaryContext(data: {
  liquidityBias: string;
  fedTrend: string;
  dxyTrend: string;
  dxyValue: number;
  vixValue: number;
  vixLevel: string;
  markets: Array<{ market: string; flow7d: number; flow30d: number; phase: string; rotationSignal: string | null }>;
  recommendation: { action: string; primaryMarket: string; confidence: number; reason: string };
}): string {
  const marketLines = data.markets.map(m =>
    `  - ${m.market.toUpperCase()}: 7D ${m.flow7d > 0 ? '+' : ''}${m.flow7d.toFixed(1)}%, 30D ${m.flow30d > 0 ? '+' : ''}${m.flow30d.toFixed(1)}%, Phase: ${m.phase.toUpperCase()}, Rotation: ${m.rotationSignal || 'stable'}`
  ).join('\n');

  return `CAPITAL FLOW SUMMARY (4-Layer Pipeline):
L1 Global Liquidity:
  - Bias: ${data.liquidityBias}
  - Fed Balance Sheet: ${data.fedTrend}
  - DXY (Dollar Index): ${data.dxyValue.toFixed(2)}, trend: ${data.dxyTrend}
  - VIX (Fear Index): ${data.vixValue.toFixed(2)}, level: ${data.vixLevel}

L2 Market Flows:
${marketLines}

L4 AI Recommendation:
  - Action: ${data.recommendation.action}
  - Primary Market: ${data.recommendation.primaryMarket}
  - Confidence: ${data.recommendation.confidence}%
  - Reasoning: ${data.recommendation.reason}`;
}

export function buildCapitalFlowLiquidityContext(data: {
  fedBalanceSheet: { value: number; change30d: number; trend: string };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: string };
  vix: { value: number; level: string };
  yieldCurve: { spread10y2y: number; inverted: boolean; interpretation: string };
}): string {
  return `LAYER 1 — GLOBAL LIQUIDITY (Detailed):
Fed Balance Sheet:
  - Value: $${(data.fedBalanceSheet.value / 1e12).toFixed(2)}T
  - 30D Change: ${data.fedBalanceSheet.change30d > 0 ? '+' : ''}${data.fedBalanceSheet.change30d.toFixed(2)}%
  - Trend: ${data.fedBalanceSheet.trend}

M2 Money Supply:
  - Value: $${(data.m2MoneySupply.value / 1e12).toFixed(2)}T
  - 30D Change: ${data.m2MoneySupply.change30d > 0 ? '+' : ''}${data.m2MoneySupply.change30d.toFixed(2)}%
  - YoY Growth: ${data.m2MoneySupply.yoyGrowth > 0 ? '+' : ''}${data.m2MoneySupply.yoyGrowth.toFixed(2)}%

DXY (Dollar Index):
  - Value: ${data.dxy.value.toFixed(2)}
  - 7D Change: ${data.dxy.change7d > 0 ? '+' : ''}${data.dxy.change7d.toFixed(2)}%
  - Trend: ${data.dxy.trend}

VIX (Fear Index):
  - Value: ${data.vix.value.toFixed(2)}
  - Level: ${data.vix.level}

Yield Curve (10Y-2Y):
  - Spread: ${data.yieldCurve.spread10y2y.toFixed(2)} bps
  - Inverted: ${data.yieldCurve.inverted ? 'YES — recession signal' : 'NO — normal curve'}
  - Interpretation: ${data.yieldCurve.interpretation}`;
}

export function buildCapitalFlowMarketsContext(data: {
  markets: Array<{
    market: string;
    flow7d: number;
    flow30d: number;
    flowVelocity: number;
    phase: string;
    daysInPhase: number;
    rotationSignal: string | null;
  }>;
}): string {
  const lines = data.markets.map(m =>
    `${m.market.toUpperCase()}:
  - 7D Flow: ${m.flow7d > 0 ? '+' : ''}${m.flow7d.toFixed(2)}%
  - 30D Flow: ${m.flow30d > 0 ? '+' : ''}${m.flow30d.toFixed(2)}%
  - Velocity: ${m.flowVelocity > 0 ? 'Accelerating' : m.flowVelocity < 0 ? 'Decelerating' : 'Stable'}
  - Phase: ${m.phase.toUpperCase()} (${m.daysInPhase} days)
  - Rotation: ${m.rotationSignal === 'entering' ? 'CAPITAL ENTERING' : m.rotationSignal === 'exiting' ? 'CAPITAL EXITING' : 'STABLE'}`
  ).join('\n\n');

  return `LAYER 2 — MARKET FLOW (All Markets):\n\n${lines}`;
}

export function buildCapitalFlowRecommendationContext(data: {
  recommendation: { action: string; primaryMarket: string; confidence: number; reason: string; suggestedAssets?: Array<{ symbol: string; name: string; reason: string }> };
  liquidityBias: string;
  markets: Array<{ market: string; flow7d: number; flow30d: number; phase: string; rotationSignal: string | null }>;
  assetHint?: string;
}): string {
  const marketLines = data.markets.map(m =>
    `  - ${m.market.toUpperCase()}: 30D ${m.flow30d > 0 ? '+' : ''}${m.flow30d.toFixed(1)}%, Phase: ${m.phase.toUpperCase()}, Rotation: ${m.rotationSignal || 'stable'}`
  ).join('\n');

  let context = `AI RECOMMENDATION REQUEST:
Global Liquidity Bias: ${data.liquidityBias}

Market Flows:
${marketLines}

Recommendation:
  - Action: ${data.recommendation.action}
  - Primary Market: ${data.recommendation.primaryMarket}
  - Confidence: ${data.recommendation.confidence}%
  - Reasoning: ${data.recommendation.reason}`;

  if (data.recommendation.suggestedAssets && data.recommendation.suggestedAssets.length > 0) {
    const assetLines = data.recommendation.suggestedAssets.map(a =>
      `  - ${a.symbol} (${a.name}): ${a.reason}`
    ).join('\n');
    context += `\n\nSuggested Assets:\n${assetLines}`;
  }

  if (data.assetHint) {
    context += `\n\nUser is specifically asking about: ${data.assetHint}`;
  }

  return context;
}

export function buildAnalysisResultContext(data: {
  symbol: string;
  interval: string;
  tradeType: string;
  verdict: string;
  score: number;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  riskReward: number;
  reasoning: string;
  stepResults?: Array<{ step: string; score: number; verdict: string; summary: string }>;
}): string {
  let context = `7-STEP ANALYSIS RESULT:
Asset: ${data.symbol} | Timeframe: ${data.interval} | Trade Type: ${data.tradeType}
Verdict: ${data.verdict} | Score: ${data.score}/10 | Direction: ${data.direction}

Trade Plan:
  - Entry: $${data.entry}
  - Stop Loss: $${data.stopLoss}
  - Take Profit 1: $${data.takeProfit1}${data.takeProfit2 ? `\n  - Take Profit 2: $${data.takeProfit2}` : ''}
  - Risk/Reward: ${data.riskReward.toFixed(1)}

Analysis Reasoning: ${data.reasoning}`;

  if (data.stepResults && data.stepResults.length > 0) {
    const stepLines = data.stepResults.map(s =>
      `  ${s.step}: ${s.score}/10 (${s.verdict}) — ${s.summary}`
    ).join('\n');
    context += `\n\nStep-by-Step Breakdown:\n${stepLines}`;
  }

  return context;
}

export function buildSectorsContext(data: {
  market: string;
  sectors: Array<{ name: string; flow7d: number; flow30d: number; dominance: number; topAssets: string[] }>;
}): string {
  const lines = data.sectors.map(s =>
    `${s.name}:
  - 7D Flow: ${s.flow7d > 0 ? '+' : ''}${s.flow7d.toFixed(1)}%
  - 30D Flow: ${s.flow30d > 0 ? '+' : ''}${s.flow30d.toFixed(1)}%
  - Dominance: ${s.dominance.toFixed(1)}%
  - Top Assets: ${s.topAssets.join(', ')}`
  ).join('\n\n');

  return `LAYER 3 — SECTOR DRILL-DOWN (${data.market.toUpperCase()}):\n\n${lines}`;
}
