# TraderPath - Gemini API Cost Analysis

> **Analysis Date:** 2026-02-03
> **Model Currently Used:** `gemini-2.5-flash` (configurable via admin)
> **Codebase Version:** Production (Railway deployment)

---

## Executive Summary

| Service | Gemini Calls | Input Tokens | Output Tokens | Cost/Use (Flash) | Cost/Use (Pro) |
|---------|-------------|--------------|---------------|------------------|----------------|
| **7-Step Analysis** | 8 | ~6,200 | ~2,050 | **$0.0011** | **$0.0282** |
| **MLIS Pro Analysis** | 0 | 0 | 0 | **$0.00** | **$0.00** |
| **Capital Flow (Full Summary)** | 2 | ~1,600 | ~800 | **$0.00036** | **$0.0100** |
| **AI Expert Panel (per analysis)** | 5 | ~12,500 | ~2,000 | **$0.00154** | **$0.0356** |
| **Concierge (per message)** | 1 | ~3,000 | ~500 | **$0.00037** | **$0.0088** |
| **Expert Q&A (per question)** | 1 | ~3,500 | ~1,000 | **$0.00056** | **$0.0144** |

### Pricing Reference

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **Gemini 2.5 Flash** | $0.075 | $0.30 |
| **Gemini 2.5 Pro** | $1.25 | $10.00 |
| **Gemini 1.5 Pro** | $1.25 | $5.00 |

> **Note:** TraderPath currently uses **Flash** model which is ~16x cheaper than Pro.

---

## 1. Asset Analysis - Classic 7-Step

### Overview
The 7-Step analysis makes **8 Gemini API calls** sequentially through the analysis engine.

### Detailed Breakdown

| Step | Function | Input Tokens | Output Tokens | Purpose |
|------|----------|--------------|---------------|---------|
| 1 | `evaluateMarketGateWithRAG()` | ~800 | 200 | Market conditions validation |
| 2 | `evaluateAssetGateWithRAG()` | ~900 | 250 | Asset quality + direction |
| 3 | `evaluateSafetyGateWithRAG()` | ~700 | 250 | Risk & manipulation check |
| 4 | `evaluateTimingGateWithRAG()` | ~650 | 250 | Entry timing analysis |
| 5 | `evaluateTradePlanGateWithRAG()` | ~600 | 250 | Trade plan quality |
| 6 | `evaluateTrapGateWithRAG()` | ~550 | 250 | Trap detection |
| 7 | `generateAIAnalysisSummary()` | ~1,200 | 400 | AI summary + tokenomics |
| 8 | `summarizeNews()` | ~500 | 200 | News sentiment |
| **TOTAL** | | **~5,900** | **~2,050** | |

### Token Composition

```
Input Tokens Breakdown (per gate ~700-900 avg):
├── Trading Knowledge Base:      ~200 tokens
├── Market/Asset Data:           ~300-500 tokens
├── System Prompt:               ~150 tokens
├── Instructions:                ~100 tokens
└── TOTAL per gate:              ~750 tokens avg

AI Summary (largest call):
├── Analysis Results:            ~400 tokens
├── Key Metrics:                 ~200 tokens
├── Tokenomics Data:             ~300 tokens
├── Instructions:                ~300 tokens
└── TOTAL:                       ~1,200 tokens
```

### Cost Calculation

```
Gemini 2.5 Flash:
├── Input:  5,900 tokens × $0.075/1M  = $0.00044
├── Output: 2,050 tokens × $0.30/1M   = $0.00062
└── TOTAL per 7-Step Analysis:        = $0.00106 ≈ $0.0011

Gemini 2.5 Pro (if upgraded):
├── Input:  5,900 tokens × $1.25/1M   = $0.00738
├── Output: 2,050 tokens × $10.00/1M  = $0.02050
└── TOTAL per 7-Step Analysis:        = $0.02788 ≈ $0.028
```

### Daily Cost Projection (100 credits/day = 1 analysis)

| Model | Cost per Analysis | 10 analyses/day | 30-day cost |
|-------|-------------------|-----------------|-------------|
| Flash | $0.0011 | $0.011 | $0.33 |
| Pro | $0.028 | $0.28 | $8.40 |

---

## 2. Asset Analysis - MLIS Pro

### Overview
MLIS Pro (Multi-Layer Intelligence System) uses **0 Gemini API calls**.

All 5 layers are calculated using technical indicators:
- Technical Layer: EMA, MACD, ADX (local calculation)
- Momentum Layer: RSI, StochRSI, CCI, Williams %R (local calculation)
- Volatility Layer: ATR, Bollinger Bands (local calculation)
- Volume Layer: OBV, CMF, volume analysis (local calculation)
- Sentiment Layer: Fear & Greed Index (free external API)

### Cost Calculation

```
Gemini API Cost: $0.00 per MLIS Pro analysis

External API Costs:
├── Binance API: FREE (price data)
├── Yahoo Finance: FREE (non-crypto data)
├── Fear & Greed Index: FREE (alternative.me)
└── TOTAL: $0.00
```

> **Note:** MLIS Pro is significantly cheaper than 7-Step because it doesn't use AI for interpretations.

---

## 3. Capital Flow Analysis

### Overview
Capital Flow Intelligence makes **2 Gemini API calls** for AI insights.

### Detailed Breakdown

| Function | Input Tokens | Output Tokens | Purpose |
|----------|--------------|---------------|---------|
| `generateLayerInsights()` | ~1,000 | 500 | 4-layer RAG insights |
| `analyzeMarketFlow()` | ~600 | 300 | Market-specific analysis |
| **TOTAL** | **~1,600** | **~800** | |

### Token Composition

```
Layer Insights Prompt (~1,000 tokens):
├── Global Liquidity Data:       ~200 tokens
├── Market Flow Data (4 markets): ~400 tokens
├── Sector Data:                 ~200 tokens
├── JSON Format Instructions:    ~200 tokens
└── TOTAL:                       ~1,000 tokens

Market Analysis Prompt (~600 tokens):
├── Market Data:                 ~300 tokens
├── Liquidity Context:           ~200 tokens
├── Instructions:                ~100 tokens
└── TOTAL:                       ~600 tokens
```

### Cost Calculation

```
Gemini 2.5 Flash:
├── Input:  1,600 tokens × $0.075/1M  = $0.00012
├── Output: 800 tokens × $0.30/1M     = $0.00024
└── TOTAL per Capital Flow Summary:   = $0.00036

Gemini 2.5 Pro:
├── Input:  1,600 tokens × $1.25/1M   = $0.00200
├── Output: 800 tokens × $10.00/1M    = $0.00800
└── TOTAL per Capital Flow Summary:   = $0.01000
```

### Daily Cost Projection (50 credits/day unlimited access)

| Model | Cost per Summary | Cache (5 min TTL) | Actual calls/day | 30-day cost |
|-------|------------------|-------------------|------------------|-------------|
| Flash | $0.00036 | ~288 max | ~50-100 | $0.54-1.08 |
| Pro | $0.010 | ~288 max | ~50-100 | $15-30 |

> **Note:** Capital Flow uses aggressive caching (5-15 min TTL), so actual API calls are much lower than theoretical max.

---

## 4. AI Expert Panel

### Overview
When running a full analysis with Expert Panel, **5 Gemini calls** are made.

### Detailed Breakdown

| Function | Input Tokens | Output Tokens | Purpose |
|----------|--------------|---------------|---------|
| ARIA Commentary | ~2,500 | 350 | Technical analysis |
| NEXUS Commentary | ~2,500 | 350 | Risk management |
| ORACLE Commentary | ~2,500 | 350 | Whale activity |
| SENTINEL Commentary | ~2,500 | 350 | Security check |
| VOLTRAN Synthesis | ~2,000 | 600 | Master synthesis |
| **TOTAL** | **~12,500** | **~2,000** | |

### Token Composition

```
Expert Commentary (~2,500 tokens each):
├── Expert System Prompt:        ~1,800 tokens (detailed persona)
├── TRADEPATH_CONTEXT:           ~400 tokens (rules + knowledge)
├── Analysis Data:               ~200 tokens
├── Instructions:                ~100 tokens
└── TOTAL per expert:            ~2,500 tokens

VOLTRAN Synthesis (~2,000 tokens):
├── All 4 Expert Opinions:       ~1,400 tokens
├── Synthesis Instructions:      ~400 tokens
├── Context:                     ~200 tokens
└── TOTAL:                       ~2,000 tokens
```

### Cost Calculation

```
Gemini 2.5 Flash:
├── Input:  12,500 tokens × $0.075/1M  = $0.00094
├── Output: 2,000 tokens × $0.30/1M    = $0.00060
└── TOTAL per Expert Panel:            = $0.00154

Gemini 2.5 Pro:
├── Input:  12,500 tokens × $1.25/1M   = $0.01563
├── Output: 2,000 tokens × $10.00/1M   = $0.02000
└── TOTAL per Expert Panel:            = $0.03563
```

---

## 5. AI Concierge

### Overview
Each Concierge message makes **1 Gemini call** for intent detection.

### Detailed Breakdown

| Function | Input Tokens | Output Tokens | Purpose |
|----------|--------------|---------------|---------|
| `getIntentDetection()` | ~3,000 | 500 | Intent classification |

### Token Composition

```
Intent Detection Prompt (~3,000 tokens):
├── TRADERPATH_CAPABILITIES:     ~1,200 tokens (platform features)
├── INTENT_DETECTION_PROMPT:     ~1,400 tokens (25 intents + examples)
├── User Message:                ~100 tokens
├── Conversation Context:        ~300 tokens (optional)
└── TOTAL:                       ~3,000 tokens
```

### Cost Calculation

```
Gemini 2.5 Flash:
├── Input:  3,000 tokens × $0.075/1M  = $0.00023
├── Output: 500 tokens × $0.30/1M     = $0.00015
└── TOTAL per Concierge message:      = $0.00037

Gemini 2.5 Pro:
├── Input:  3,000 tokens × $1.25/1M   = $0.00375
├── Output: 500 tokens × $10.00/1M    = $0.00500
└── TOTAL per Concierge message:      = $0.00875
```

---

## 6. Expert Q&A Service

### Overview
Each educational question makes **1 Gemini call**.

### Detailed Breakdown

| Function | Input Tokens | Output Tokens | Purpose |
|----------|--------------|---------------|---------|
| `askExpert()` | ~3,500 | 1,000 | Expert education |

### Cost Calculation

```
Gemini 2.5 Flash:
├── Input:  3,500 tokens × $0.075/1M  = $0.00026
├── Output: 1,000 tokens × $0.30/1M   = $0.00030
└── TOTAL per Expert Q&A:             = $0.00056

Gemini 2.5 Pro:
├── Input:  3,500 tokens × $1.25/1M   = $0.00438
├── Output: 1,000 tokens × $10.00/1M  = $0.01000
└── TOTAL per Expert Q&A:             = $0.01438
```

---

## 7. Other Services (Minimal Cost)

### Translation Service
- ~500-2000 input tokens, ~4000 max output
- Cost: $0.0005-0.002 per translation (Flash)

### BILGE Guardian System
- 3 small Gemini calls for error analysis
- Cost: ~$0.0005 per analysis cycle (Flash)

---

## Total Daily Cost Per User (Max Usage)

### Service Breakdown

| Service | Daily Limit | Max Uses | Flash Cost | Pro Cost |
|---------|-------------|----------|------------|----------|
| Capital Flow (L3+L4) | 50 cr/day | Unlimited (cached) | $0.10 | $3.00 |
| Asset Analysis (7-Step) | 100 cr/day | 10 analyses | $0.011 | $0.28 |
| Asset Analysis (MLIS) | 100 cr/day | 10 analyses | $0.00 | $0.00 |
| AI Expert Panel | per analysis | 10 panels | $0.015 | $0.36 |
| Concierge | Unlimited | ~100 messages | $0.037 | $0.88 |
| Expert Q&A | 5 cr/question | ~20 questions | $0.011 | $0.29 |
| **TOTAL MAX** | | | **$0.18/day** | **$4.81/day** |

### Monthly Cost Projection

| Scenario | Flash | Pro |
|----------|-------|-----|
| Light User (2 analyses/day) | $0.05/mo | $1.30/mo |
| Medium User (5 analyses/day) | $0.10/mo | $2.60/mo |
| Heavy User (10 analyses/day) | $0.18/mo | $4.80/mo |
| Power User (MAX usage) | $5.40/mo | $144/mo |

---

## Infrastructure Costs (Monthly)

| Service | Provider | Cost |
|---------|----------|------|
| PostgreSQL | Neon Cloud | $25 (Pro plan) |
| Railway Hosting | Railway | $20 (Pro plan) |
| Redis | Upstash | $10 (Pro plan) |
| Vercel Frontend | Vercel | $20 (Pro plan) |
| Domain/SSL | Cloudflare | $0 |
| Binance API | Binance | $0 (free tier) |
| Yahoo Finance | Yahoo | $0 (free tier) |
| CoinGecko | CoinGecko | $0 (demo tier) |
| **TOTAL INFRA** | | **$75/month** |

---

## Break-Even Analysis

### Cost Per User (Monthly)

```
Fixed Infrastructure:          $75/month
Variable (Gemini Flash/user):  $0.10-5.40/month

Break-even calculation (100 users):
├── Infrastructure: $75 / 100 = $0.75/user
├── Gemini (avg):   $1.00/user
└── TOTAL COST:     $1.75/user/month

With 60% margin:
├── Target margin: 60%
├── Cost: $1.75
├── Min price: $1.75 / 0.40 = $4.38/user/month
└── Recommended: $9.99/month (safe margin)
```

### Scaling Projections

| Users | Infra/User | Gemini/User | Total Cost | Min Price (60% margin) |
|-------|------------|-------------|------------|------------------------|
| 100 | $0.75 | $1.00 | $1.75 | $4.38 |
| 500 | $0.15 | $1.00 | $1.15 | $2.88 |
| 1,000 | $0.08 | $1.00 | $1.08 | $2.70 |
| 5,000 | $0.02 | $1.00 | $1.02 | $2.55 |

---

## Best Opportunities Signal Service (NEW - Estimated)

### Planned Architecture
A new service to scan markets and identify high-probability trade opportunities.

### Estimated Implementation

| Component | Gemini Calls | Input Tokens | Output Tokens |
|-----------|-------------|--------------|---------------|
| Scan 30 coins | 0 | 0 | 0 |
| MLIS scoring (30 coins) | 0 | 0 | 0 |
| AI opportunity synthesis | 1 | ~2,000 | ~500 |
| **TOTAL per scan** | **1** | **~2,000** | **~500** |

### Cost Estimate

```
Per scan cycle (Flash):
├── Coin scanning: $0.00 (uses cached MLIS scores)
├── AI synthesis: ~$0.0003
└── TOTAL: ~$0.0003 per scan

Daily cost (50 credits, ~10 scans):
├── Flash: $0.003/day = $0.09/month
├── Pro: $0.08/day = $2.40/month
```

---

## Recommendations

### 1. Keep Using Gemini Flash
- Current Flash pricing is excellent ($0.18/day max vs $4.81 with Pro)
- Quality is sufficient for gate evaluations and insights
- Reserve Pro for complex reasoning if needed later

### 2. Optimize Token Usage
- **Cache system prompts**: Store compiled prompts in Redis
- **Reduce trading knowledge base**: Trim to essential content
- **Batch operations**: Combine multiple small calls where possible

### 3. Credit Pricing Validation

Based on actual costs:

| Credit Cost | Cost/Credit (Flash) | Recommended Markup |
|-------------|---------------------|-------------------|
| 100 credits (analysis) | $0.0011 | 10,000x+ margin |
| 50 credits (Capital Flow) | $0.00036 | 10,000x+ margin |
| 25 credits (L3/L4 access) | $0.00018 | 10,000x+ margin |

**Current credit pricing ($0.08-0.14/credit) is EXTREMELY profitable.**

Actual Gemini cost per credit: ~$0.00001-0.0001
Charged per credit: $0.08-0.14
**Margin: 80,000-1,400,000%**

### 4. Recommended Subscription Tiers

Based on this analysis, competitive pricing:

| Tier | Price/Month | Credits/Day | Gemini Cost/Mo | Profit Margin |
|------|-------------|-------------|----------------|---------------|
| **Free** | $0 | 10 | $0.03 | N/A (acquisition) |
| **Starter** | $19 | 100 | $0.30 | 98.4% |
| **Pro** | $49 | 300 | $0.90 | 98.2% |
| **Elite** | $99 | 600 | $1.80 | 98.2% |

---

## Files Analyzed

| File | Gemini Calls Found |
|------|-------------------|
| `apps/api/src/core/gemini.ts` | Core client |
| `apps/api/src/modules/analysis/analysis.engine.ts` | 8 calls |
| `apps/api/src/modules/analysis/services/mlis.service.ts` | 0 calls |
| `apps/api/src/modules/capital-flow/capital-flow.service.ts` | 2 calls |
| `apps/api/src/modules/ai-expert/ai-expert.service.ts` | 5 calls |
| `apps/api/src/modules/concierge/concierge.service.ts` | 1 call |
| `apps/api/src/modules/concierge/intent-detector.ts` | 1 call (fallback) |
| `apps/api/src/modules/expert/expert.service.ts` | 1 call |
| `apps/api/src/modules/translation/translation.service.ts` | 1 call |
| `apps/api/src/modules/bilge/bilge.service.ts` | 3 calls |

---

## Conclusion

TraderPath's Gemini API costs are **extremely low** due to using the Flash model:

- **Max daily cost per user: $0.18** (with Flash)
- **Average daily cost per user: $0.03-0.10** (typical usage)
- **Monthly infrastructure: $75 fixed**

The current credit pricing of $0.08-0.14 per credit provides margins of **80,000%+**, making the business model highly profitable even at aggressive subscription pricing.

**Recommended action:** Keep Flash model, implement subscription tiers starting at $19/month for excellent value proposition and healthy margins.
