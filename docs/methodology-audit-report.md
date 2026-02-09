# TraderPath Methodology Audit Report

**Date:** 2026-02-09
**Auditor:** Claude Code (Automated Codebase Audit)
**Scope:** Marketing methodology page (`/how-it-works`) vs actual backend implementation
**Verdict:** 41/64 claims fully implemented (64%), 8 partial (12.5%), 15 mock/missing (23.5%)

---

## Executive Summary

The TraderPath methodology page makes 64 distinct technical claims across 5 sections. This audit cross-referenced every claim against the actual source code (file paths, function names, line numbers). The Capital Flow system (L1-L4) and Data Infrastructure are largely implemented. The 7-Step Engine is ~75% complete. **MLIS Pro descriptions are 100% misleading** — no neural networks, GARCH models, or Platt scaling exist. The AI Expert Panel is a Gemini AI wrapper, not a proprietary multi-agent system.

---

## 1. Capital Flow Intelligence Framework (L1-L4)

**Score: 13/14 (93%)**

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| L1-1 | Fed Balance Sheet (FRED API) | **DONE** | `capital-flow/providers/fred.provider.ts:84-123` | Real WALCL series from FRED |
| L1-2 | M2 Money Supply growth | **DONE** | `capital-flow/providers/fred.provider.ts:129-169` | Real M2SL series from FRED |
| L1-3 | DXY momentum | **DONE** | `capital-flow/providers/yahoo.provider.ts:530-563` | DX-Y.NYB from Yahoo Finance |
| L1-4 | VIX term structure (contango/backwardation) | **MISSING** | `yahoo.provider.ts:28-29` | `^VIX3M` symbol defined but **never called**. Only spot VIX fetched. No term structure analysis. |
| L1-5 | Yield Curve (10Y-2Y spread) | **DONE** | `capital-flow/providers/fred.provider.ts:175-212` | Real DGS10/DGS2 from FRED |
| L1-6 | Liquidity regime classification (risk-on/off/neutral) | **DONE** | `capital-flow/capital-flow.service.ts:1109-1156` | 9-factor weighted scoring model |
| L2-1 | 7d/30d flow velocity across 4 asset classes | **DONE** | `yahoo.provider.ts:262-351` | Volume-weighted calculation |
| L2-2 | 5 markets (Crypto, Stocks, Bonds, Metals, BIST) | **DONE** | Multiple providers | Each has dedicated provider/function |
| L2-3 | Phase detection: EARLY/MID/LATE/EXIT | **DONE** | `capital-flow.service.ts:686-758` | Percentile-based phase classification |
| L2-4 | Rotation detection (entering/stable/exiting) | **DONE** | `capital-flow.service.ts:820-831` | Flow velocity + direction analysis |
| L3-1 | DeFi TVL flows | **DONE** | `capital-flow/providers/defillama.provider.ts:52-99` | Real DefiLlama API |
| L3-2 | L2/Chain activity | **DONE** | `defillama.provider.ts:104-139` | Chain-level TVL tracking |
| L3-3 | Sector volume (GICS ETFs) | **DONE** | `yahoo.provider.ts:661-717` | 11 sector ETFs tracked |
| L4-1 | AI recommendation engine (BUY/SELL/WAIT) | **DONE** | `capital-flow.service.ts:1162+` | 5-factor composite scoring |

### What's Missing

- **VIX Term Structure**: The `^VIX3M` symbol is already defined in `yahoo.provider.ts:29` but never fetched. Need to add `getVixTermStructure()` that compares VIX vs VIX3M to determine contango (complacent) vs backwardation (fear).

---

## 2. 7-Step Analysis Engine

**Score: 21/28 (75%)**

### Step 1: Market Pulse

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 1-1 | Fear & Greed Composite | **DONE** | `analysis.engine.ts:166-316` | Real API + 5-tier classification |
| 1-2 | BTC Dominance Delta | **DONE** | `analysis.engine.ts:~200` | BTC vs ETH 24h comparison |
| 1-3 | Funding Rate Spread | **PARTIAL** | `analysis.engine.ts:273-276` | Single BTC funding rate only. No multi-pair spread calculation. |
| 1-4 | VIX Term Structure | **MISSING** | N/A | Only spot VIX level checked. No contango/backwardation analysis. |

### Step 2: Asset Scanner

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 2-1 | RSI / Stochastic Oscillator | **DONE** | `analysis.engine.ts:352-537` | Real calculation |
| 2-2 | MACD Histogram Divergence | **PARTIAL** | `analysis.engine.ts:2926-2949` | MACD calculated, but **no divergence detection** (MACD vs price direction comparison missing) |
| 2-3 | Bollinger Band Width | **DONE** | Trade config indicators | Real calculation |
| 2-4 | ADX Trend Strength | **DONE** | Trade config indicators | Real calculation |
| 2-5 | 40+ indicators | **DONE** | `trade-config.ts` | Full indicator suite |

### Step 3: Safety Check

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 3-1 | Bid-Ask Imbalance Ratio | **DONE** | Order book analysis | Real order book data |
| 3-2 | Order Book Depth (40 levels) | **DONE** | Binance Depth API | Fetches 100 levels, analyzes 40 |
| 3-3 | Spoofing Detection Score | **DONE** | Manipulation detection code | Detects large orders >2% from price |
| 3-4 | Liquidity Score | **DONE** | Composite formula | Volume + price + spread formula |
| 3-5 | Wash trading / layering / iceberg detection | **DONE** | Beyond methodology claims | Actually exceeds what's documented |

### Step 4: Timing Analysis

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 4-1 | S/R Cluster Proximity | **DONE** | `analysis.engine.ts:3185-3270` | 5-bar pivot detection + clustering |
| 4-2 | Economic Event Window | **DONE** | `economic-calendar.service.ts` | 4hr before + 2hr after blocking |
| 4-3 | Volume Profile (VPOC) | **MISSING** | N/A | PVT exists but **no VPOC calculation**. No volume-at-price histogram. |
| 4-4 | Momentum Confluence | **PARTIAL** | `analysis.engine.ts:733-850` | RSI+MACD+trend checked individually. No formal **confluence score** formula. |

### Step 5: Trade Plan

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 5-1 | ATR-Based Stop Distance | **DONE** | `analysis.engine.ts:5365-5565` | 1.5-2x ATR buffer |
| 5-2 | R:R Optimization | **DONE** | Plan validation | Minimum 1.0 R:R enforced |
| 5-3 | AI Price Prediction | **DONE** | `ai-price-predictor.service.ts` | Gemini 2.5 Pro with sanity checks |
| 5-4 | Position Sizing | **DONE** | Trade plan output | Kelly Criterion formula |

### Step 6: Trap Check -- CRITICAL GAPS

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 6-1 | Liquidation Density Map | **MOCK** | `analysis.engine.ts:4733-4753` | Simple price * 0.9/0.85/1.1/1.15 multipliers. Not a real heatmap, no exchange liquidation data. |
| 6-2 | Whale Wallet Monitoring | **MOCK** | Safety check section | Not on-chain wallet tracking. Just Binance trades >$50k filter on public trade data. |
| 6-3 | Open Interest Delta | **MISSING** | N/A | OI value exists in input but **delta (change over time) is not calculated**. |
| 6-4 | Smart Money Index | **MISSING** | N/A | No SMI formula. Order book imbalance used as loose proxy. |

### Step 7: Final Verdict

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| 7-1 | Composite Score (0-10) | **DONE** | `analysis.engine.ts:5080-5086` | Weighted average of 5 steps |
| 7-2 | Confidence Interval | **DONE** | Direction confidence % | Percentage-based |
| 7-3 | Direction Conviction | **DONE** | `analysis.engine.ts:4856-5076` | 11-source weighted system |
| 7-4 | GO/COND/WAIT/AVOID verdicts | **DONE** | 4-tier gate logic | Threshold-based classification |

### Architecture Claims

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| A-1 | Sequential gated pipeline | **DONE** | Each step returns `canProceed` |
| A-2 | Sub-scores on 0-10 scale | **DONE** | All steps normalized |
| A-3 | Auditable indicator details | **DONE** | `indicatorDetails` object preserved |

---

## 3. MLIS Pro -- CRITICAL: 0% Accuracy

**Score: 0/7 (0%)**

> **Every claim about MLIS Pro is misleading.** The code at `services/mlis.service.ts` uses standard technical indicators (EMA, RSI, ATR, OBV) organized into 5 groups. There are no neural networks, no machine learning models, no GARCH variance modeling, and no Platt scaling.

| # | Methodology Claim | Actual Code | File Reference |
|---|-------------------|-------------|----------------|
| M-1 | "5-layer **neural** inference system" | Standard technical indicators in 5 groups. Zero neural network code. | `mlis.service.ts:236-533` |
| M-2 | "**Convolutional** feature extraction from raw OHLCV sequences" | EMA(20,50,200), MACD, ADX. No convolutions, no CNNs. | `mlis.service.ts:236-295` |
| M-3 | "Velocity and acceleration decomposition with **regime-adaptive** thresholds" | RSI, Stochastic RSI, CCI, Williams %R with **hardcoded** thresholds (70, 30, etc.) | `mlis.service.ts:297-363` |
| M-4 | "**GARCH**-family variance modeling with regime-switching detection" | Simple ATR + Bollinger Bands. No GARCH code exists anywhere in the codebase. | `mlis.service.ts:365-409` |
| M-5 | "On-balance volume divergence with institutional flow from **tick-level** data" | Standard OBV, CMF. No tick data used. No institutional flow estimation. | `mlis.service.ts:411-463` |
| M-6 | "**Platt scaling** calibrated confidence output" | `weightedSum / totalWeight` -- simple weighted average. No Platt scaling. | `mlis.service.ts:557-584` |
| M-7 | "Contradicts 7-Step verdict -> automatic conviction downgrade" | **No such logic exists.** MLIS and 7-Step run independently with no cross-validation. | Not found in any file |

### What Should Be Done

**Option A (Recommended):** Fix methodology text to honestly describe what MLIS does:
- "Neural inference" -> "Multi-layer indicator analysis"
- "Convolutional feature extraction" -> "Multi-timeframe trend decomposition"
- "GARCH variance modeling" -> "ATR-based volatility assessment"
- "Platt scaling" -> "Weighted confidence scoring"
- Add dual-engine contradiction logic (implement in code)

**Option B:** Actually implement ML models (months of work, requires training data, GPU infrastructure)

---

## 4. AI Expert Panel

**Score: 0/5 fully implemented (0% as claimed), 2/5 partial**

> **Core finding:** Every "AI Expert" is a Gemini AI prompt with a different system instruction. There are no proprietary AI models. The data collection pipelines are real (partially), but all "interpretation" is Gemini.

| # | Expert | Claim | Status | Reality |
|---|--------|-------|--------|---------|
| E-1 | ARIA | "Interprets indicator confluence, candlestick patterns" | **GEMINI PROXY** | Real indicator data -> Gemini prompt -> text response. ARIA is a Gemini persona, not a separate model. |
| E-2 | NEXUS | "Correlation risk, concentration risk, tail-event probability" | **GEMINI PROXY** | No quantitative risk model. Sends trade plan JSON to Gemini and asks for commentary. No correlation matrix, no VaR, no tail probability calculations. |
| E-3 | ORACLE | "Whale movements, exchange netflows, stablecoin dynamics" | **PARTIAL** | **Crypto only:** Detects trades >$50k from Binance public data. This is NOT wallet tracking or exchange flow monitoring. **Non-crypto:** Returns empty array `Promise.resolve([])` |
| E-4 | SENTINEL | "Smart contract vulnerabilities, regulatory risks, solvency" | **PARTIAL** | GoPlus API for ~40 hardcoded tokens only. Manipulation detection for crypto order books. **Regulatory risk:** MISSING. **Exchange solvency:** MISSING. |
| E-5 | VOLTRAN | "Ensemble synthesis module" | **GEMINI PROXY** | A 5th Gemini prompt that reads the 4 expert outputs (all Gemini text) and asks Gemini to synthesize them. |

### What Should Be Done

Fix methodology descriptions:
- "Multi-agent reasoning system" -> "Multi-perspective AI commentary system"
- Clarify that experts use Gemini AI for interpretation
- Remove claims about proprietary models
- "Whale wallet monitoring" -> "Large trade detection (crypto only)"
- Remove "regulatory risk" and "exchange solvency" claims from SENTINEL

---

## 5. Data Infrastructure

**Score: 7/10 (70%)**

| # | Claim | Status | File | Evidence |
|---|-------|--------|------|----------|
| D-1 | FRED API (Fed BS, M2, Treasury) | **DONE** | `fred.provider.ts` | Real API key, real data series |
| D-2 | Binance 500+ pairs | **DONE** | `binance.provider.ts` | Real OHLCV + ticker endpoints |
| D-3 | Yahoo Finance (equities, metals, bonds) | **DONE** | `yahoo.provider.ts` | Real quotes, 15-min delayed |
| D-4 | DefiLlama "2000+ protocols" | **PARTIAL** | `defillama.provider.ts` | Fetches by 6 sector categories. Does not scan 2000 individual protocols. |
| D-5 | CoinGecko / CMC tokenomics | **DONE** | `tokenomics.service.ts` | 3-tier fallback: CoinGecko -> CMC -> Binance |
| D-6 | Finnhub economic calendar | **DONE** | `economic-calendar.service.ts` | Real API + hardcoded FOMC fallback |
| D-7 | Multi-provider cross-validation | **PARTIAL** | Only in tokenomics | Only tokenomics has fallback chains. FRED, DefiLlama are single-source. |
| D-8 | Outlier detection on OHLCV | **PARTIAL** | Wash trading detection only | No price spike / flash crash filter on raw candle data. |
| D-9 | Redis caching with TTL | **DONE** | Multiple services | Market Pulse 5min, Order Book 10s, Ticker 5s |
| D-10 | Prisma 15s query timeout | **DONE** | `database.ts:19-48` | Middleware with slow query logging |

---

## Priority Fix List

### Priority 1: Methodology Text Honesty (CRITICAL)

These changes are required to avoid misleading users:

| # | Current Text | Honest Replacement | Section |
|---|-------------|-------------------|---------|
| 1 | "5-layer neural inference system" | "5-layer multi-indicator analysis system" | MLIS Pro |
| 2 | "Convolutional feature extraction from raw OHLCV" | "Multi-timeframe trend decomposition using EMA, MACD, ADX" | MLIS L1 |
| 3 | "GARCH-family variance modeling" | "ATR-based volatility assessment with Bollinger Band regime detection" | MLIS L3 |
| 4 | "Platt scaling calibrated confidence" | "Weighted confidence scoring with threshold-based calibration" | MLIS L5 |
| 5 | "On-balance volume with institutional flow from tick-level data" | "Volume flow analysis using OBV, CMF, and volume trend indicators" | MLIS L4 |
| 6 | "Multi-agent reasoning system" | "Multi-perspective AI commentary system powered by Gemini" | AI Expert |
| 7 | "Whale wallet monitoring" | "Large trade detection from public exchange data (crypto only)" | ORACLE |
| 8 | "Regulatory risks, exchange solvency" | Remove these claims entirely | SENTINEL |

### Priority 2: Backend Code Implementations

Features that can be implemented to close gaps:

| # | Feature | Estimated Complexity | Target File |
|---|---------|---------------------|-------------|
| 1 | VIX term structure (VIX vs VIX3M) | Low | `yahoo.provider.ts` |
| 2 | Dual-engine contradiction logic | Medium | `analysis.engine.ts` or `analysis.routes.ts` |
| 3 | MACD divergence detection | Low | `analysis.engine.ts` |
| 4 | Volume Profile / VPOC | Medium | `analysis.engine.ts` |
| 5 | OI delta (change tracking) | Low | `analysis.engine.ts` |
| 6 | Momentum confluence score | Low | `analysis.engine.ts` |
| 7 | Funding rate spread (multi-pair) | Low | `analysis.engine.ts` |
| 8 | OHLCV outlier/spike filter | Low | `multi-asset-data-provider.ts` |

---

## Appendix: File Reference Map

| Module | Key Files |
|--------|-----------|
| Capital Flow | `apps/api/src/modules/capital-flow/capital-flow.service.ts`, `providers/fred.provider.ts`, `providers/yahoo.provider.ts`, `providers/defillama.provider.ts` |
| Analysis Engine | `apps/api/src/modules/analysis/analysis.engine.ts` (~5800 lines) |
| MLIS Pro | `apps/api/src/modules/analysis/services/mlis.service.ts` (~749 lines) |
| AI Expert Panel | `apps/api/src/modules/analysis/services/ai-expert.service.ts` |
| Trade Plan | `apps/api/src/modules/analysis/analysis.engine.ts:5365-5565` |
| Multi-Asset Provider | `apps/api/src/modules/analysis/providers/multi-asset-data-provider.ts` |
| Indicators | `apps/api/src/modules/analysis/trade-config.ts` |
| AI Price Predictor | `apps/api/src/modules/analysis/services/ai-price-predictor.service.ts` |
| Economic Calendar | `apps/api/src/modules/analysis/services/economic-calendar.service.ts` |
| RAG Layer | `apps/api/src/modules/rag/rag-orchestrator.service.ts` |

---

*This report was generated by automated codebase analysis. All line numbers reference the codebase as of 2026-02-09.*
