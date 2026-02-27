/**
 * Regime Scoring System Types
 *
 * Mathematical, backtestable scoring layers:
 *   L1 — Global Liquidity Regime Score (GLRS)
 *   L2 — Flow Velocity & Rotation Score (FVR)
 *   L3 — Sector Concentration Index (SCI)
 *   L4 — Instrument Conviction Score (ICS)
 *   Lead-Lag Matrix
 */

// ============================================================
// L1 — Global Liquidity Regime Score (GLRS)
// ============================================================

export type LiquidityRegime =
  | 'strong_risk_on'   // 70–100
  | 'mild_risk_on'     // 55–70
  | 'neutral'          // 45–55
  | 'risk_off'         // 30–45
  | 'liquidity_stress'; // <30

export interface GLRSComponents {
  /** Fed Balance Sheet YoY z-score */
  zFedBS: number;
  /** M2 Money Supply YoY z-score */
  zM2: number;
  /** DXY momentum z-score (inverted: negative = risk-on) */
  zDXY: number;
  /** VIX term structure slope z-score */
  zVIXts: number;
  /** 10Y–2Y yield curve spread z-score */
  zYieldCurve: number;
  /** Net Liquidity (Fed BS - RRP - TGA) change z-score */
  zNetLiquidity: number;
  /** RRP trend z-score (draining = positive) */
  zRRP: number;
  /** TGA trend z-score (spending = positive) */
  zTGA: number;
}

export interface GLRSWeights {
  fedBS: number;
  m2: number;
  dxy: number;
  vixTs: number;
  yieldCurve: number;
  netLiquidity: number;
  rrp: number;
  tga: number;
}

export interface GLRSResult {
  /** Raw weighted z-score sum */
  rawScore: number;
  /** Normalized score 0–100 */
  score: number;
  /** Classified regime */
  regime: LiquidityRegime;
  /** Individual z-score components */
  components: GLRSComponents;
  /** Weights used */
  weights: GLRSWeights;
  /** Human-readable breakdown */
  breakdown: {
    dominant: string;      // Most impactful factor
    supportive: string[];  // Aligned factors
    opposing: string[];    // Divergent factors
  };
  timestamp: string;
}

// ============================================================
// L2 — Flow Velocity & Rotation Score (FVR)
// ============================================================

export type FlowPhase = 'early' | 'expansion' | 'late' | 'distribution';

export interface MarketFVR {
  market: string;
  /** (Flow_7d - Flow_30d) / sigma_flow */
  flowVelocity: number;
  /** z-score of flow velocity */
  zFlowVelocity: number;
  /** Relative strength vs benchmark */
  relativeStrength: number;
  /** z-score of relative strength */
  zRelativeStrength: number;
  /** Detected flow phase */
  phase: FlowPhase;
  /** Composite rotation score = Z_FlowVelocity + Z_RelativeStrength */
  rotationScore: number;
  /** Days since phase began */
  daysInPhase: number;
}

export interface FVRResult {
  /** Per-market flow analysis */
  markets: MarketFVR[];
  /** Active rotation pairs (from → to) */
  activeRotations: {
    from: string;
    to: string;
    confidence: number; // 0–100
    magnitude: number;
  }[];
  /** Strongest flow destination */
  strongestInflow: string | null;
  /** Strongest flow source */
  strongestOutflow: string | null;
  timestamp: string;
}

// ============================================================
// L3 — Sector Concentration Index (SCI)
// ============================================================

export interface SectorSCI {
  /** Sector name */
  sector: string;
  /** Parent market */
  market: string;
  /** Return_sector - Return_benchmark */
  relativeStrength: number;
  /** (SectorFlow - MeanFlow) / StdFlow */
  flowAnomaly: number;
  /** 0.5 * RS + 0.5 * FlowAnomaly */
  sci: number;
  /** SCI > 1.5 → disproportionate capital concentration */
  isConcentrated: boolean;
  /** Top assets in this sector */
  topAssets: string[];
}

export interface SCIResult {
  /** Per-sector analysis */
  sectors: SectorSCI[];
  /** Sectors with SCI > 1.5 */
  concentratedSectors: SectorSCI[];
  /** Highest SCI sector */
  hottest: SectorSCI | null;
  timestamp: string;
}

// ============================================================
// L4 — Instrument Conviction Score (ICS)
// ============================================================

export type ConvictionSignal = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

export interface ICSResult {
  /** 7-Step analysis score (0–10 normalized to 0–1) */
  score7Step: number;
  /** ML probability (0–1) */
  probML: number;
  /** Asset relative strength (z-score normalized to 0–1) */
  rsAsset: number;
  /** Raw ICS = α * score7Step + β * probML + γ * rsAsset */
  rawICS: number;
  /** Calibrated confidence (isotonic regression output) */
  calibratedConfidence: number;
  /** Signal based on ICS + GLRS gate */
  signal: ConvictionSignal;
  /** Whether GLRS gate allows trading */
  glrsGateOpen: boolean;
  /** Current GLRS score for context */
  glrsScore: number;
  /** Weight breakdown */
  weights: { alpha: number; beta: number; gamma: number };
}

// ============================================================
// Lead-Lag Matrix
// ============================================================

export interface LeadLagPair {
  /** Leading indicator/series name */
  leadSeries: string;
  /** Lagging indicator/series name */
  lagSeries: string;
  /** Cross-correlation at different lags */
  correlations: {
    lag: number;    // days
    rho: number;    // correlation [-1, +1]
  }[];
  /** Best lag (highest absolute correlation) */
  bestLag: number;
  /** Correlation at best lag */
  bestCorrelation: number;
  /** Whether lead-lag relationship is statistically significant */
  isSignificant: boolean;
}

export interface LeadLagResult {
  /** All tested pairs */
  pairs: LeadLagPair[];
  /** Pairs with significant lead-lag relationship */
  significantPairs: LeadLagPair[];
  /** Key insight */
  insight: string;
  /** Lags tested */
  lagsTestedDays: number[];
  timestamp: string;
}

// ============================================================
// Unified Regime Score
// ============================================================

export interface RegimeScoreResult {
  /** L1: Global Liquidity Regime */
  glrs: GLRSResult;
  /** L2: Flow Velocity & Rotation */
  fvr: FVRResult;
  /** L3: Sector Concentration */
  sci: SCIResult;
  /** Lead-Lag Matrix */
  leadLag: LeadLagResult;
  /** Unified regime assessment */
  regime: {
    /** Overall score 0–100 */
    score: number;
    /** Regime label */
    label: LiquidityRegime;
    /** Whether conditions favor new trades */
    tradeFavorable: boolean;
    /** Summary sentence */
    summary: string;
  };
  /** ISO timestamp */
  timestamp: string;
}
