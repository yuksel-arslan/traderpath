# Analysis Service — SERVICE.md
# TraderPath.io | Version: 3.0 | Updated: 2026-03

## Overview
| Property | Value |
|----------|-------|
| Port | 3002 |
| Directory | `backend/analysis_service` |
| Language | TypeScript / Node.js 22+ |
| AI Model | Claude claude-sonnet-4-20250514 (Anthropic SDK) |
| Purpose | Strategy-aware trading analysis with 4 distinct prompt frameworks |

---

## Strategy Types

| Strategy | Timeframes | Hold Time | Min Confidence | Min R/R | Max Leverage |
|----------|-----------|-----------|----------------|---------|--------------|
| SCALPING | 1m, 3m, 5m | 2-30 min | 65% | 1.5:1 | 10x |
| DAY_TRADE | 15m, 30m, 1h | 1-8 hrs | 60% | 2.0:1 | 20x |
| SWING_TRADE | 4h, 1d | 3-14 days | 60% | 2.5:1 | 10x |
| POSITION_TRADE | 1w, 1M | 1-12 months | 55% | 3.0:1 | 5x |

---

## Architecture

```
analysis_service/
├── src/
│   ├── index.ts                    # Express server, route definitions
│   ├── analysisController.ts       # Request handling, credit deduction
│   ├── prompts/
│   │   ├── strategyPromptBuilder.ts  # Core prompt builder
│   │   └── strategies/
│   │       ├── CORE_CONTEXT.md       # Shared analyst persona + schemas
│   │       ├── SCALPING_PROMPT.md    # Scalping framework
│   │       ├── DAYTRADING_PROMPT.md  # Day trading framework
│   │       ├── SWINGTRADING_PROMPT.md # Swing trading framework
│   │       └── POSITIONTRADING_PROMPT.md # Position trading framework
│   ├── marketData/
│   │   ├── indicatorService.ts     # OHLCV + indicator calculation
│   │   ├── orderBookService.ts     # Order book snapshot
│   │   └── sentimentService.ts     # Fear/greed, funding rates
│   └── validators/
│       └── outputValidator.ts      # JSON schema validation
```

---

## API Endpoints

```
POST /api/analysis/run
  Body: { symbol, interval, strategyType? (auto-detected if omitted) }
  Returns: Full trading analysis JSON

GET  /api/analysis/history/:symbol
  Returns: Last 10 analyses for symbol

GET  /api/analysis/strategies
  Returns: Available strategies with metadata

POST /api/analysis/validate
  Body: Raw analysis JSON
  Returns: Validation result

GET  /health
```

---

## Strategy Auto-Detection

Interval → Strategy mapping:
```
1m, 3m, 5m    → SCALPING
15m, 30m, 1h  → DAY_TRADE  
4h, 1d        → SWING_TRADE
1w, 1M        → POSITION_TRADE
```

User can override via `strategyType` parameter.

---

## Prompt Architecture

### 4-Layer System
```
Layer 0: CORE_CONTEXT.md
  - Analyst persona definition
  - Universal market data schema
  - Non-negotiable risk rules
  - Confidence scoring matrix
  - Universal JSON output schema

Layer 1: Strategy-Specific Prompt (one of 4 files)
  - Strategy identity & philosophy
  - Market condition filters (trade/no-trade rules)
  - Technical analysis framework (strategy-weighted indicators)
  - Entry methodology (specific setups)
  - Risk management (strategy-specific sizing/stops/targets)
  - Additional JSON fields (strategy-specific metrics)
  - Narrative length requirements

Layer 2: Market Condition Pre-checks
  - Auto-WAIT triggers (spread, volume, ADX thresholds)
  - Warning generation (confidence reducers)
  - Injected into user prompt

Layer 3: Market Data
  - Real-time OHLCV (last 20 candles)
  - Calculated indicators
  - Order book snapshot
  - Sentiment data (Fear/Greed, Funding Rate, OI, L/S ratio)
```

### Key Design Principles
- **Analysis timestamp → forecast origin**: Chart forecast lines start from analysis time, NOT current time
- **Auto-WAIT**: Unfavorable conditions detected → automatic WAIT signal regardless of indicator signals
- **Confidence floor**: Below strategy minimum → force WAIT output
- **Pre-mortem mandatory**: All strategies require failure scenario analysis (scalping: 1, position: 3+)

---

## Output JSON Structure

All strategies return:
```typescript
{
  direction: 'BUY' | 'SELL' | 'WAIT',
  strategyType: StrategyType,
  confidenceScore: number,        // 0-100
  conviction: string,
  entry: { price, type, zone },
  riskManagement: { stopLoss, stopLossType, riskPercent, positionSizeMultiplier },
  targets: Array<{ level, price, exitPercent, rationale }>,
  timeframe: { expectedDuration, maxHoldTime, reviewTrigger },
  keyLevels: { criticalSupport, criticalResistance, invalidationLevel },
  marketContext: { regime, trendStrength, volumeProfile },
  signals: { primary, secondary, warnings },
  predictions: { bullCase, baseCase, bearCase },
  premortem: Array<{ failureScenario, probability, earlyWarning }>,
  narrative: string,              // Markdown
  chartData: { forecastPoints },  // Timestamps from analysis time
  
  // PLUS strategy-specific extension:
  scalpingMetrics?    // For SCALPING
  dayTradingMetrics?  // For DAY_TRADE
  swingMetrics?       // For SWING_TRADE
  positionMetrics?    // For POSITION_TRADE
}
```

---

## Credit Costs
- Capital Flow Analysis: 50 credits/day
- 7-Step + MLIS Analysis: 100 credits/day (includes strategy prompt)
- Best Opportunities Signal: 50 credits/day

---

## Environment Variables
```env
ANTHROPIC_API_KEY=
ANALYSIS_SERVICE_PORT=3002
BINANCE_API_KEY=
BINANCE_SECRET=
FEAR_GREED_API_URL=https://api.alternative.me/fng/
MAX_ANALYSIS_TOKENS=4096
PROMPT_FILES_PATH=./src/prompts/strategies
```

---

## Key Technical Notes

1. **Forecast timestamp origin**: Always use `Math.floor(Date.now() / 1000)` at analysis time, pass to prompt
2. **Prompt file caching**: Load markdown files at service startup, cache in memory (don't re-read per request)
3. **JSON validation**: Always validate AI output against schema before returning to client
4. **Fallback**: If AI returns invalid JSON, retry once with explicit JSON correction instruction
5. **Token monitoring**: Log estimated vs actual tokens per strategy type
