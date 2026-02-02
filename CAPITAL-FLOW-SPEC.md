# CAPITAL FLOW SYSTEM - KURUMSAL ŞARTNAME

> **Versiyon:** 1.0
> **Tarih:** 2026-02-02
> **Durum:** ONAYLANDI

---

## Felsefe

> **"Ücretli API'ler ham veri satar. Biz ücretsiz ham veriyi akıllıca işleyerek aynı sonucu elde edeceğiz."**
>
> **"Para nereye akıyorsa potansiyel oradadır."**

---

## MİMARİ ÖZET

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: GLOBAL LIQUIDITY                │
│  Fed Likidite + DXY + VIX + Yield Curve + Credit Stress    │
│  Output: RISK_ON / RISK_OFF / NEUTRAL                       │
├─────────────────────────────────────────────────────────────┤
│                    LAYER 2: MARKET FLOWS                    │
│  Crypto: Volume + Order Book + Derivatives + Stablecoin     │
│  Stocks: ETF Volume + Sector Rotation                       │
│  Bonds: Duration Flow + Credit Flow                         │
│  Metals: Safe Haven + Industrial                            │
│  Output: Dominant market + Phase + Rotation signal          │
├─────────────────────────────────────────────────────────────┤
│                    LAYER 3: SECTOR ACTIVITY                 │
│  Selected market'taki sektörlerin flow ranking'i            │
│  Output: Hottest sector + Top assets in sector              │
├─────────────────────────────────────────────────────────────┤
│                    LAYER 4: ASSET SELECTION                 │
│  Sektördeki varlıkların multi-factor scoring'i              │
│  Output: Ranked assets ready for trade plan                 │
├─────────────────────────────────────────────────────────────┤
│                    → TRADE PLAN GENERATOR                   │
│  Layer 4'ten gelen en iyi varlıklar için işlem planı        │
│  Output: Entry / SL / TP / Position Size                    │
└─────────────────────────────────────────────────────────────┘
```

---

## ÜCRETSİZ VERİ KAYNAKLARI

| Kaynak | Sağladığı Veri | Rate Limit | Maliyet |
|--------|----------------|------------|---------|
| **Binance API** | OHLCV, Order Book, Trades, Funding Rate, Open Interest, Long/Short Ratio | 1200 req/min | ÜCRETSİZ |
| **Yahoo Finance** | Stocks, ETFs, Indices, Commodities, Bonds | ~2000 req/hour | ÜCRETSİZ |
| **FRED API** | Fed Balance Sheet, M2, Treasury Yields, GDP, CPI | 120 req/min | ÜCRETSİZ |
| **CoinGecko** | Market Cap, Volume, Price History | 30 req/min (demo) | ÜCRETSİZ |
| **DefiLlama** | TVL, Protocol Data, Chain Data, Stablecoins | Unlimited | ÜCRETSİZ |
| **Alternative.me** | Fear & Greed Index | Unlimited | ÜCRETSİZ |

---

# LAYER 1: GLOBAL LIQUIDITY TRACKER

## Amaç
Küresel likidite ortamını belirle: **RISK-ON** mı **RISK-OFF** mu?

## Veri Kaynakları ve Hesaplamalar

### 1.1 Fed Likidite Endeksi

**Kaynak:** FRED API (Ücretsiz)

| Metrik | FRED Kodu | Hesaplama | Sinyal |
|--------|-----------|-----------|--------|
| Fed Balance Sheet | WALCL | 4 haftalık değişim % | >0 = Genişleme |
| M2 Money Supply | M2SL | YoY değişim % | >5% = Likidite bolluğu |
| Reverse Repo | RRPONTSYD | Seviye değişimi | Düşüş = Likidite piyasaya akıyor |
| Treasury General Account | WTREGEN | Seviye değişimi | Düşüş = Harcama = Likidite |

**Formül:**
```
Fed_Liquidity_Score = (
  (WALCL_4w_change > 0 ? 25 : -25) +
  (M2_YoY > 5 ? 25 : M2_YoY > 0 ? 10 : -25) +
  (RRP_change < 0 ? 25 : -10) +
  (TGA_change < 0 ? 25 : -10)
) / 100

Range: -1 to +1
```

### 1.2 Dollar Strength (DXY Proxy)

**Kaynak:** Yahoo Finance (UUP ETF veya DX-Y.NYB)

| Metrik | Hesaplama | Sinyal |
|--------|-----------|--------|
| DXY 20-day MA | SMA(20) | Trend yönü |
| DXY 50-day MA | SMA(50) | Orta vade trend |
| DXY Momentum | RSI(14) | Aşırı alım/satım |

**Formül:**
```
DXY_Trend =
  IF price < SMA20 < SMA50 THEN "weakening" (risk-on)
  IF price > SMA20 > SMA50 THEN "strengthening" (risk-off)
  ELSE "neutral"

DXY_Score =
  weakening: +0.3
  neutral: 0
  strengthening: -0.3
```

### 1.3 Volatility Regime (VIX Analysis)

**Kaynak:** Yahoo Finance (^VIX)

| Metrik | Hesaplama | Sinyal |
|--------|-----------|--------|
| VIX Level | Current value | <15=Complacent, 15-20=Normal, 20-30=Elevated, >30=Fear |
| VIX Term Structure | VIX vs VIX3M | Contango=Calm, Backwardation=Stress |
| VIX Percentile | 252-day percentile | Tarihsel konum |
| VIX Rate of Change | 5-day change % | Ani spike tespiti |

**Formül:**
```
VIX_Score =
  IF VIX < 15 AND contango THEN +0.3 (complacent, risk-on)
  IF VIX 15-20 AND contango THEN +0.1 (normal)
  IF VIX 20-30 OR backwardation THEN -0.2 (elevated)
  IF VIX > 30 OR spike > 20% THEN -0.4 (fear, risk-off)
```

### 1.4 Yield Curve Analysis

**Kaynak:** FRED API

| Metrik | FRED Kodu | Hesaplama | Sinyal |
|--------|-----------|-----------|--------|
| 10Y-2Y Spread | DGS10 - DGS2 | Current spread | <0 = Recession signal |
| 10Y-3M Spread | DGS10 - DTB3 | Current spread | Fed'in izlediği |
| 2Y Yield Momentum | DGS2 | 30-day change | Fed beklentisi |
| Real Yield (10Y-CPI) | DGS10 - CPIAUCSL | Approximate | Gerçek getiri |

**Formül:**
```
Yield_Curve_Score =
  IF 10Y2Y > 0.5 AND steepening THEN +0.3 (healthy)
  IF 10Y2Y > 0 AND 10Y2Y < 0.5 THEN +0.1 (flattening)
  IF 10Y2Y < 0 AND 10Y2Y > -0.5 THEN -0.2 (inverted)
  IF 10Y2Y < -0.5 THEN -0.4 (deeply inverted)
```

### 1.5 Credit Stress Proxy

**Kaynak:** Yahoo Finance (ETF'ler kullanarak)

| Proxy | ETF | Hesaplama | Ne Ölçer |
|-------|-----|-----------|----------|
| HY Spread Proxy | HYG/LQD ratio | 20-day change | High yield stress |
| IG Spread Proxy | LQD/TLT ratio | 20-day change | Investment grade stress |
| Financial Stress | XLF/SPY ratio | 20-day change | Banking sector health |

**Formül:**
```
Credit_Stress_Score =
  HYG_LQD_ratio declining > 2% = -0.2 (stress)
  XLF_SPY_ratio declining > 3% = -0.2 (financial stress)
  Both stable or improving = +0.2 (healthy)
```

### LAYER 1 TOPLAM SKOR

```
Global_Liquidity_Score = (
  Fed_Liquidity_Score * 0.30 +
  DXY_Score * 0.20 +
  VIX_Score * 0.20 +
  Yield_Curve_Score * 0.15 +
  Credit_Stress_Score * 0.15
)

Range: -1 to +1

BIAS:
  > +0.3  → STRONG_RISK_ON
  +0.1 to +0.3 → RISK_ON
  -0.1 to +0.1 → NEUTRAL
  -0.3 to -0.1 → RISK_OFF
  < -0.3 → STRONG_RISK_OFF
```

### LAYER 1 OUTPUT

```typescript
interface Layer1Output {
  timestamp: Date;

  fedLiquidity: {
    score: number;
    balanceSheetTrend: 'expanding' | 'contracting' | 'stable';
    m2Growth: number;
    rrpTrend: 'draining' | 'building' | 'stable';
    tgaTrend: 'spending' | 'building' | 'stable';
  };

  dollarStrength: {
    score: number;
    trend: 'weakening' | 'strengthening' | 'neutral';
    dxyLevel: number;
    dxyRsi: number;
  };

  volatilityRegime: {
    score: number;
    vixLevel: number;
    regime: 'complacent' | 'normal' | 'elevated' | 'fear';
    termStructure: 'contango' | 'backwardation';
    spikeAlert: boolean;
  };

  yieldCurve: {
    score: number;
    spread10Y2Y: number;
    spread10Y3M: number;
    shape: 'steep' | 'flat' | 'inverted';
    realYield: number;
  };

  creditStress: {
    score: number;
    hySpreadTrend: 'widening' | 'tightening' | 'stable';
    financialHealth: 'healthy' | 'stressed' | 'critical';
  };

  totalScore: number;
  bias: 'strong_risk_on' | 'risk_on' | 'neutral' | 'risk_off' | 'strong_risk_off';
  confidence: number;

  implication: string;
  keyDrivers: string[];
  warnings: string[];
}
```

---

# LAYER 2: MARKET FLOW ANALYZER

## Amaç
Her piyasaya (Crypto, Stocks, Bonds, Metals) **gerçek para akışını** tespit et.

## Kritik Prensip

> **Fiyat değişimi ≠ Para akışı**
>
> Para akışını ölçmek için: **Volume × Price Direction × Conviction**

---

## 2.1 CRYPTO MARKET FLOW

### Veri Kaynakları

| Kaynak | Endpoint | Veri |
|--------|----------|------|
| Binance | /api/v3/ticker/24hr | Volume, Price change |
| Binance | /api/v3/depth | Order book (bid/ask imbalance) |
| Binance | /fapi/v1/openInterest | Open Interest |
| Binance | /futures/data/globalLongShortAccountRatio | Long/Short ratio |
| Binance | /fapi/v1/fundingRate | Funding rate |
| CoinGecko | /global | Total market cap |
| DefiLlama | /tvl | DeFi TVL |
| DefiLlama | /stablecoins | Stablecoin market cap |
| Alternative.me | /fng | Fear & Greed |

### Flow Hesaplama

#### A. Volume-Weighted Flow
```typescript
const totalVolume24h = sum(all_usdt_pairs.quoteVolume);
const volumeChange7d = (totalVolume7d / previous7d - 1) * 100;
```

#### B. Order Book Imbalance
```typescript
// İlk %2 fiyat aralığındaki likidite
const imbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);
// Range: -1 (sell pressure) to +1 (buy pressure)
```

#### C. Derivatives Flow
```typescript
// Open Interest değişimi + Funding Rate + Long/Short Ratio
const derivativesScore = calculateDerivativesFlow();
```

#### D. Stablecoin Flow
```typescript
// Stablecoin market cap artışı = yeni para girişi
const stablecoinFlow7d = ((totalMcap - totalMcap7dAgo) / totalMcap7dAgo) * 100;
```

### Crypto Flow Final

```typescript
const flowScore = (
  volumeFlow.score * 0.25 +
  orderBookFlow.imbalance * 0.25 +
  derivativesFlow.score * 0.25 +
  stablecoinFlow.score * 0.25
);
```

---

## 2.2 STOCKS MARKET FLOW

### Veri Kaynakları

| ETF | Ticker | Ne Ölçer |
|-----|--------|----------|
| S&P 500 | SPY | Broad market |
| Nasdaq 100 | QQQ | Tech sentiment |
| Russell 2000 | IWM | Small caps (risk appetite) |
| Dow Jones | DIA | Blue chips |

### Flow Hesaplama

```typescript
// Dollar volume = price × volume (gerçek para hareketi)
const dollarVolume = data.regularMarketPrice * data.regularMarketVolume;

// Price-volume conviction
const volumeRatio = data.regularMarketVolume / data.averageVolume;
const conviction = priceChange * volumeRatio;
```

### Sector Rotation

```typescript
// Risk-on sektörler (Tech, Consumer Disc, Financials)
const riskOnFlow = (XLK + XLY + XLF) / 3;

// Defensive sektörler (Utilities, Consumer Staples, Healthcare)
const defensiveFlow = (XLU + XLP + XLV) / 3;

const rotation = riskOnFlow > defensiveFlow ? 'risk_on' : 'defensive';
```

---

## 2.3 BONDS MARKET FLOW

### Veri Kaynakları

| ETF | Ticker | Ne Ölçer |
|-----|--------|----------|
| 20+ Year Treasury | TLT | Long duration |
| 7-10 Year Treasury | IEF | Medium duration |
| 1-3 Year Treasury | SHY | Short duration (safety) |
| Investment Grade | LQD | Corporate credit |
| High Yield | HYG | Junk bonds (risk appetite) |
| TIPS | TIP | Inflation protection |

### Flow Hesaplama

```typescript
// Volume × Direction analizi (yield değişimi DEĞİL!)
const flow = priceChange * volumeRatio;

// Duration rotation
const durationRotation = TLT_flow - SHY_flow;

// Credit rotation
const creditRotation = HYG_flow - LQD_flow;
```

---

## 2.4 METALS MARKET FLOW

### Veri Kaynakları

| ETF | Ticker | Ne Ölçer |
|-----|--------|----------|
| Gold | GLD | Safe haven |
| Silver | SLV | Industrial + monetary |
| Copper | CPER | Economic growth proxy |
| Gold Miners | GDX | Leveraged gold exposure |

### Flow Hesaplama

```typescript
// Gold/Silver ratio (monetary vs industrial)
const goldSilverRatio = goldPrice / silverPrice;

// Gold/Copper ratio (safe haven vs growth)
const goldCopperRatio = goldPrice / copperPrice;

const direction = goldFlow > copperFlow ? 'safe_haven' : 'growth';
```

---

## LAYER 2 OUTPUT

```typescript
interface Layer2Output {
  timestamp: Date;

  markets: {
    crypto: MarketFlowData;
    stocks: MarketFlowData;
    bonds: MarketFlowData;
    metals: MarketFlowData;
  };

  correlation: {
    cryptoStocks: number;
    stocksBonds: number;
    goldDollar: number;
  };

  rotation: {
    from: string | null;
    to: string | null;
    confidence: number;
  };

  dominantFlow: 'crypto' | 'stocks' | 'bonds' | 'metals';
}

interface MarketFlowData {
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: 'early' | 'mid' | 'late' | 'exit';
  components: Record<string, number>;
  signals: Record<string, boolean>;
}
```

---

# LAYER 3: SECTOR ACTIVITY ANALYZER

## Amaç
Para akışı tespit edilen piyasadaki **en güçlü sektörleri** belirle.

---

## 3.1 CRYPTO SECTORS

### Sector Tanımları

```typescript
const CRYPTO_SECTORS = {
  'Layer 1': ['ETH', 'SOL', 'AVAX', 'ADA', 'DOT', 'NEAR', 'ATOM'],
  'Layer 2': ['ARB', 'OP', 'MATIC', 'IMX', 'STRK'],
  'DeFi': ['UNI', 'AAVE', 'MKR', 'CRV', 'LDO', 'SNX', 'COMP'],
  'AI': ['FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO', 'WLD'],
  'Gaming': ['AXS', 'SAND', 'MANA', 'GALA', 'IMX', 'RONIN'],
  'Meme': ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI'],
  'Infrastructure': ['LINK', 'GRT', 'FIL', 'AR', 'THETA', 'OCEAN'],
  'Exchange': ['BNB', 'CRO', 'OKB', 'KCS', 'GT']
};
```

### Sector Flow Hesaplama

```typescript
// Token-based flow (Binance volume × price change)
const priceVolumeFlow = avgPriceChange * volumeScore;

// TVL-based flow (DefiLlama) - applicable sectors only
const tvlFlow = defillamaCategory ? tvlData.change_7d : 0;

// Combined flow
const combinedFlow = defillamaCategory
  ? (priceVolumeFlow * 0.6 + tvlFlow * 0.4)
  : priceVolumeFlow;
```

---

## 3.2 STOCKS SECTORS

### Sector ETF'ler

```typescript
const STOCK_SECTORS = {
  'Technology': 'XLK',
  'Healthcare': 'XLV',
  'Financials': 'XLF',
  'Consumer Discretionary': 'XLY',
  'Consumer Staples': 'XLP',
  'Energy': 'XLE',
  'Utilities': 'XLU',
  'Materials': 'XLB',
  'Industrials': 'XLI',
  'Real Estate': 'XLRE',
  'Communication': 'XLC'
};
```

### Sector Flow Hesaplama

```typescript
// Volume-weighted flow
const volumeRatio = quote.regularMarketVolume / quote.averageDailyVolume3Month;
const flow7d = priceChange7d * volumeRatio;

// Relative strength vs SPY
const relativeStrength = sectorChange - spyChange;
```

---

## 3.3 BONDS SECTORS

### Sector Tanımları

```typescript
const BONDS_SECTORS = {
  'Treasury Long Duration': ['TLT', 'VGLT', 'SPTL'],
  'Treasury Medium Duration': ['IEF', 'VGIT', 'SCHR'],
  'Treasury Short Duration': ['SHY', 'VGSH', 'SCHO'],
  'Investment Grade Corporate': ['LQD', 'VCIT', 'IGIB'],
  'High Yield Corporate': ['HYG', 'JNK', 'USHY'],
  'TIPS (Inflation Protected)': ['TIP', 'SCHP', 'VTIP'],
  'Municipal Bonds': ['MUB', 'VTEB', 'TFI'],
  'International Bonds': ['BNDX', 'IAGG', 'BWX'],
  'Emerging Market Bonds': ['EMB', 'VWOB', 'PCY']
};
```

### Bond Rotation Signals

```typescript
// Risk-on vs Defensive
const riskOnFlow = HYG_flow + EMB_flow;
const defensiveFlow = SHY_flow + IEF_flow;

// Duration rotation
const durationRotation = TLT_flow - SHY_flow > 0 ? 'extending' : 'shortening';

// Credit rotation
const creditRotation = HYG_flow - LQD_flow > 0 ? 'reaching_for_yield' : 'flight_to_quality';
```

---

## 3.4 METALS SECTORS

### Sector Tanımları

```typescript
const METALS_SECTORS = {
  'Precious Metals - Gold': ['GLD', 'IAU', 'SGOL'],
  'Precious Metals - Silver': ['SLV', 'SIVR', 'PSLV'],
  'Precious Metals - Platinum': ['PPLT', 'PLTM'],
  'Precious Metals - Palladium': ['PALL'],
  'Industrial Metals - Copper': ['CPER', 'JJC'],
  'Industrial Metals - Aluminum': ['JJU'],
  'Industrial Metals - Nickel': ['JJN'],
  'Industrial Metals - Zinc': ['JJT'],
  'Miners - Gold Miners': ['GDX', 'GDXJ', 'RING'],
  'Miners - Silver Miners': ['SIL', 'SILJ'],
  'Broad Commodities': ['DBC', 'PDBC', 'GSG']
};
```

### Metals Rotation Signals

```typescript
// Gold/Silver ratio
const gsRatioTrend = gsRatioChange > 0 ? 'gold_outperforming' : 'silver_outperforming';

// Gold/Copper ratio (safe haven vs growth)
const gcRatioTrend = gcRatioChange > 0 ? 'defensive' : 'risk_on';

// Miner sentiment
const minerSentiment = minerFlow / metalFlow > 1.5 ? 'euphoric' :
                       minerFlow / metalFlow > 1 ? 'bullish' : 'neutral';
```

---

## LAYER 3 OUTPUT

```typescript
interface Layer3Output {
  timestamp: Date;
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';

  sectors: Array<{
    rank: number;
    name: string;
    flow7d: number;
    flow30d: number;
    flowVelocity: number;
    phase: 'early' | 'mid' | 'late' | 'exit';
    conviction: 'high' | 'medium' | 'low';
    topAssets: string[];
    relativeStrength: number;
  }>;

  analysis: {
    hottestSector: string;
    coldestSector: string;
    rotationDetected: boolean;
    rotationFrom: string | null;
    rotationTo: string | null;
    recommendation: {
      sector: string;
      reason: string;
      confidence: number;
    };
  };
}
```

---

# LAYER 4: ASSET RECOMMENDATION ENGINE

## Amaç
Seçilen sektördeki **en iyi işlem adaylarını** belirle.

## Asset Scoring (5 Faktör)

```typescript
const totalScore = (
  flowScore * 0.25 +
  technicalScore * 0.25 +
  liquidityScore * 0.15 +
  riskScore * 0.15 +
  momentumScore * 0.20
);
```

---

## 1. Flow Score (Layer 2'den)

Layer 2'de hesaplanan market flow'un asset-specific versiyonu.

---

## 2. Technical Score (SADECE LEADING INDICATORS)

### Kullanılan Leading Indicators

| İndikatör | Ağırlık | Sinyal Türü |
|-----------|---------|-------------|
| RSI Divergence | 0.90 | Reversal |
| Order Flow Imbalance | 0.90 | Real-time pressure |
| StochRSI | 0.85 | Entry timing |
| MFI (Money Flow Index) | 0.85 | Smart money |
| CMF (Chaikin Money Flow) | 0.85 | Accumulation/Distribution |
| MACD Histogram Divergence | 0.85 | Momentum shift |
| Squeeze Indicator | 0.85 | Breakout |
| OBV Divergence | 0.85 | Volume confirmation |
| TSI (True Strength Index) | 0.80 | Momentum |
| SuperTrend Cross | 0.80 | Trend change |
| Volume Spike | 0.80 | Institutional activity |
| CCI | 0.75 | Cycle detection |
| Force Index | 0.75 | Price × Volume |
| Williams %R | 0.70 | Fast momentum |

### KULLANILMAYAN (Lagging) Indicators

> **UYARI:** Bu indikatörler skora katkı YAPMAZ, sadece context için kullanılır.

- SMA, EMA (Moving Averages)
- Bollinger Bands
- MACD Signal Line Cross
- Ichimoku Cloud
- ADX
- VWAP
- Parabolic SAR
- Aroon
- Donchian Channels

---

## 3. Liquidity Score

```typescript
// Crypto
const depthRatio = (bidDepth2pct + askDepth2pct) / dailyVolume;
const spreadScore = spread < 0.1 ? 100 : spread < 0.3 ? 70 : 50;

// Stocks
const volumeRatio = currentVolume / averageVolume;
```

---

## 4. Risk Score

### Risk Faktörleri

| Faktör | Max Puan Kaybı | Hesaplama |
|--------|----------------|-----------|
| **Volatility Risk** | -30 | ATR percentile + vol expansion |
| **Drawdown Risk** | -25 | Current drawdown + max DD 30d |
| **Liquidity Risk** | -20 | Order book depth + spread |
| **Structure Risk** | -15 | Distance to support + lower highs |
| **Derivatives Risk** | -10 | Funding rate + OI spike (crypto) |

### Risk Levels

```
score >= 80 → LOW risk
score >= 60 → MEDIUM risk
score >= 40 → HIGH risk
score < 40  → EXTREME risk
```

---

## 5. Momentum Score

### Momentum Faktörleri

| Faktör | Max Puan | Hesaplama |
|--------|----------|-----------|
| **Price ROC** | 25 | 5d/10d/20d ROC alignment + acceleration |
| **RSI Momentum** | 20 | RSI zone + slope + divergence |
| **StochRSI** | 15 | K/D crossover + zone |
| **MACD Histogram** | 15 | Zero cross + divergence |
| **CCI** | 10 | Zero cross + extreme readings |
| **Williams %R** | 10 | Oversold exit |
| **MFI** | 10 | Smart money flow + divergence |
| **Multi-TF Alignment** | 10 | 1H/4H/1D RSI alignment |

### Momentum Classification

```
score >= 80 → STRONG_BULLISH
score >= 60 → BULLISH
score >= 40 → NEUTRAL
score >= 20 → BEARISH
score < 20  → STRONG_BEARISH
```

---

## LAYER 4 OUTPUT

```typescript
interface Layer4Output {
  timestamp: Date;
  market: string;
  sector: string;

  rankedAssets: Array<{
    rank: number;
    symbol: string;
    totalScore: number;

    scores: {
      flow: number;
      technical: number;
      liquidity: number;
      risk: number;
      momentum: number;
    };

    recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
    direction: 'long' | 'short' | 'neutral';
    confidence: number;
    readyForTradePlan: boolean;
  }>;

  topPicks: {
    forLong: Array<{ symbol: string; score: number; reason: string }>;
    forShort: Array<{ symbol: string; score: number; reason: string }>;
  };

  nextStep: {
    action: 'proceed_to_trade_plan' | 'wait' | 'avoid_sector';
    assets: string[];
    reason: string;
  };
}
```

---

# PHASE DETECTION

## Dinamik Phase Detection (Percentile-Based)

```typescript
function detectPhase(flow7d, flow30d, flowVelocity, historicalFlows) {
  const p25 = percentile(historicalFlows, 25);
  const p50 = percentile(historicalFlows, 50);
  const p75 = percentile(historicalFlows, 75);

  const shortTermTrend = flow7d > 0 ? 'up' : 'down';
  const acceleration = flowVelocity > 0 ? 'accelerating' : 'decelerating';

  if (shortTermTrend === 'up' && flow7d > p75 && acceleration === 'accelerating') {
    if (flow30d < p50) return 'early';
    if (flow30d < p75) return 'mid';
    return 'late';
  }

  if (shortTermTrend === 'down' || acceleration === 'decelerating') {
    if (flow7d < p25 || flowVelocity < percentile(velocityHistory, 10)) {
      return 'exit';
    }
    return 'late';
  }

  return 'mid';
}
```

### Phase Meanings

| Phase | Süre | Anlam | Aksiyon |
|-------|------|-------|---------|
| **EARLY** | 0-30 gün | Para yeni girmeye başladı | ✅ EN İYİ GİRİŞ |
| **MID** | 30-60 gün | Trend olgunlaşıyor | ⚠️ Dikkatli giriş |
| **LATE** | 60-90 gün | Trend yoruluyor | ⛔ Yeni giriş yapma |
| **EXIT** | 90+ gün / tersine | Para çıkıyor | 🚫 ASLA GİRME |

---

# VERİ KAYNAĞI HARİTASI

## LAYER 1: Global Liquidity

| Metrik | Kaynak | Endpoint / Ticker | Güncelleme |
|--------|--------|-------------------|------------|
| Fed Balance Sheet | FRED | `WALCL` | Haftalık |
| M2 Money Supply | FRED | `M2SL` | Haftalık |
| Reverse Repo | FRED | `RRPONTSYD` | Günlük |
| TGA | FRED | `WTREGEN` | Haftalık |
| 10Y Yield | FRED | `DGS10` | Günlük |
| 2Y Yield | FRED | `DGS2` | Günlük |
| 3M T-Bill | FRED | `DTB3` | Günlük |
| DXY | Yahoo | `DX-Y.NYB` / `UUP` | Real-time |
| VIX | Yahoo | `^VIX` | Real-time |
| VIX3M | Yahoo | `^VIX3M` | Real-time |
| HYG | Yahoo | `HYG` | Real-time |
| LQD | Yahoo | `LQD` | Real-time |
| XLF | Yahoo | `XLF` | Real-time |

## LAYER 2: Market Flows

### Crypto

| Metrik | Kaynak | Endpoint |
|--------|--------|----------|
| 24hr Ticker | Binance | `/api/v3/ticker/24hr` |
| Order Book | Binance | `/api/v3/depth?limit=100` |
| Klines | Binance | `/api/v3/klines` |
| Funding Rate | Binance | `/fapi/v1/fundingRate` |
| Open Interest | Binance | `/fapi/v1/openInterest` |
| L/S Ratio | Binance | `/futures/data/globalLongShortAccountRatio` |
| Total MCap | CoinGecko | `/api/v3/global` |
| F&G Index | Alternative.me | `/fng/` |
| DeFi TVL | DefiLlama | `/tvl` |
| Stablecoins | DefiLlama | `/stablecoins` |

### Stocks

| Metrik | Kaynak | Ticker |
|--------|--------|--------|
| SPY | Yahoo | `SPY` |
| QQQ | Yahoo | `QQQ` |
| IWM | Yahoo | `IWM` |
| Sector ETFs | Yahoo | `XLK, XLV, XLF, XLY, XLP, XLE, XLU, XLB, XLI, XLRE, XLC` |

### Bonds

| Metrik | Kaynak | Ticker |
|--------|--------|--------|
| Long Treasury | Yahoo | `TLT, VGLT` |
| Medium Treasury | Yahoo | `IEF, VGIT` |
| Short Treasury | Yahoo | `SHY, VGSH` |
| IG Corporate | Yahoo | `LQD, VCIT` |
| High Yield | Yahoo | `HYG, JNK` |
| TIPS | Yahoo | `TIP, SCHP` |
| Muni | Yahoo | `MUB, VTEB` |
| EM Bonds | Yahoo | `EMB, VWOB` |

### Metals

| Metrik | Kaynak | Ticker |
|--------|--------|--------|
| Gold | Yahoo | `GLD, IAU, GC=F` |
| Silver | Yahoo | `SLV, SI=F` |
| Platinum | Yahoo | `PPLT, PL=F` |
| Copper | Yahoo | `CPER, HG=F` |
| Gold Miners | Yahoo | `GDX, GDXJ` |
| Broad Commodities | Yahoo | `DBC, PDBC` |

---

## API RATE LIMIT VE CACHE

| Kaynak | Rate Limit | Cache TTL |
|--------|------------|-----------|
| Binance Spot | 1200 req/min | 30-60 sn |
| Binance Futures | 2400 req/min | 30-60 sn |
| Yahoo Finance | ~2000 req/hour | 60-300 sn |
| FRED API | 120 req/min | 3600 sn |
| CoinGecko (Free) | 30 req/min | 600 sn |
| DefiLlama | Unlimited | 1800 sn |
| Alternative.me | Unlimited | 3600 sn |

---

## ÜCRETSİZ API KAYIT

| Kaynak | Kayıt Linki | Key Gerekli |
|--------|-------------|-------------|
| Binance | binance.com/api-management | Opsiyonel |
| Yahoo Finance | - | Hayır |
| FRED | fred.stlouisfed.org/docs/api/api_key.html | Evet (ücretsiz) |
| CoinGecko | coingecko.com/api/pricing | Demo key ücretsiz |
| DefiLlama | - | Hayır |
| Alternative.me | - | Hayır |

---

## DOSYA KONUMLARI

| Servis | Dosya |
|--------|-------|
| Capital Flow Service | `apps/api/src/modules/capital-flow/capital-flow.service.ts` |
| Types | `apps/api/src/modules/capital-flow/types.ts` |
| FRED Provider | `apps/api/src/modules/capital-flow/providers/fred.provider.ts` |
| Yahoo Provider | `apps/api/src/modules/capital-flow/providers/yahoo.provider.ts` |
| DefiLlama Provider | `apps/api/src/modules/capital-flow/providers/defillama.provider.ts` |
| Routes | `apps/api/src/modules/capital-flow/capital-flow.routes.ts` |
| Indicator Classification | `apps/api/src/modules/analysis/config/indicator-classification.ts` |

---

> **Son Güncelleme:** 2026-02-02
> **Onaylayan:** Kullanıcı
