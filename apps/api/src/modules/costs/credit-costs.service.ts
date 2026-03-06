// ===========================================
// Credit Costs Service
// Centralized service for managing dynamic credit costs
// Loads from database with in-memory caching
// ===========================================

import { prisma } from '../../core/database';

// Default credit costs (fallback if database is not available)
// NOTE: These values must match backend subscription-tiers.ts SERVICE_CREDITS
const DEFAULT_CREDIT_COSTS = {
  // Analysis Steps (Classic 7-Step)
  STEP_MARKET_PULSE: 0,
  STEP_ASSET_SCANNER: 1,
  STEP_SAFETY_CHECK: 2,
  STEP_TIMING: 2,
  STEP_TRADE_PLAN: 2,
  STEP_TRAP_CHECK: 2,
  STEP_FINAL_VERDICT: 1,

  // Bundles
  BUNDLE_FULL_ANALYSIS: 10,      // Classic 7-Step Analysis
  BUNDLE_MLIS_PRO_ANALYSIS: 10,  // MLIS Pro 5-Layer Analysis
  BUNDLE_QUICK_CHECK: 5,
  BUNDLE_SMART_ENTRY: 12,

  // MLIS Pro Layers (5-Layer Neural Network)
  MLIS_LAYER_TECHNICAL: 2,
  MLIS_LAYER_MOMENTUM: 2,
  MLIS_LAYER_VOLATILITY: 2,
  MLIS_LAYER_VOLUME: 2,
  MLIS_LAYER_VERDICT: 2,

  // Capital Flow
  CAPITAL_FLOW_L3_L4: 5,  // L3 + L4 combined

  // Features
  AI_EXPERT_QUESTION: 5,
  AI_CONCIERGE_MESSAGE: 5,
  PDF_REPORT: 5,
  REPORT_TRANSLATION: 5,
  EMAIL_SEND: 5,
  ADD_TO_REPORT: 2,
  PRICE_ALERT: 1,
  WATCHLIST_SLOT: 3,
  AUTO_REFRESH_HOUR: 5,

  // Credit Economy (Marketplace)
  ANALYSIS_PURCHASE: 15, // Second-hand analysis purchase
};

export type CreditCostKey = keyof typeof DEFAULT_CREDIT_COSTS;

interface CachedCosts {
  costs: typeof DEFAULT_CREDIT_COSTS;
  loadedAt: number;
}

// Cache duration: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedCosts: CachedCosts | null = null;

/**
 * Map database fields to CREDIT_COSTS keys
 */
// Helper to safely extract a number from a Prisma record field
function numOrDefault(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  if (value != null) {
    const n = Number(value);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function mapDbToCosts(dbSettings: Record<string, unknown>): typeof DEFAULT_CREDIT_COSTS {
  return {
    // Analysis Steps (Classic 7-Step)
    STEP_MARKET_PULSE: numOrDefault(dbSettings.creditCostMarketPulse, DEFAULT_CREDIT_COSTS.STEP_MARKET_PULSE),
    STEP_ASSET_SCANNER: numOrDefault(dbSettings.creditCostAssetScanner, DEFAULT_CREDIT_COSTS.STEP_ASSET_SCANNER),
    STEP_SAFETY_CHECK: numOrDefault(dbSettings.creditCostSafetyCheck, DEFAULT_CREDIT_COSTS.STEP_SAFETY_CHECK),
    STEP_TIMING: numOrDefault(dbSettings.creditCostTiming, DEFAULT_CREDIT_COSTS.STEP_TIMING),
    STEP_TRADE_PLAN: numOrDefault(dbSettings.creditCostTradePlan, DEFAULT_CREDIT_COSTS.STEP_TRADE_PLAN),
    STEP_TRAP_CHECK: numOrDefault(dbSettings.creditCostTrapCheck, DEFAULT_CREDIT_COSTS.STEP_TRAP_CHECK),
    STEP_FINAL_VERDICT: numOrDefault(dbSettings.creditCostFinalVerdict, DEFAULT_CREDIT_COSTS.STEP_FINAL_VERDICT),

    // Bundles
    BUNDLE_FULL_ANALYSIS: numOrDefault(dbSettings.creditCostFullAnalysis, DEFAULT_CREDIT_COSTS.BUNDLE_FULL_ANALYSIS),
    BUNDLE_MLIS_PRO_ANALYSIS: numOrDefault(dbSettings.creditCostMlisProAnalysis, DEFAULT_CREDIT_COSTS.BUNDLE_MLIS_PRO_ANALYSIS),
    BUNDLE_QUICK_CHECK: numOrDefault(dbSettings.creditCostQuickCheck, DEFAULT_CREDIT_COSTS.BUNDLE_QUICK_CHECK),
    BUNDLE_SMART_ENTRY: numOrDefault(dbSettings.creditCostSmartEntry, DEFAULT_CREDIT_COSTS.BUNDLE_SMART_ENTRY),

    // MLIS Pro Layers (5-Layer Neural Network)
    MLIS_LAYER_TECHNICAL: numOrDefault(dbSettings.creditCostMlisTechnicalLayer, DEFAULT_CREDIT_COSTS.MLIS_LAYER_TECHNICAL),
    MLIS_LAYER_MOMENTUM: numOrDefault(dbSettings.creditCostMlisMomentumLayer, DEFAULT_CREDIT_COSTS.MLIS_LAYER_MOMENTUM),
    MLIS_LAYER_VOLATILITY: numOrDefault(dbSettings.creditCostMlisVolatilityLayer, DEFAULT_CREDIT_COSTS.MLIS_LAYER_VOLATILITY),
    MLIS_LAYER_VOLUME: numOrDefault(dbSettings.creditCostMlisVolumeLayer, DEFAULT_CREDIT_COSTS.MLIS_LAYER_VOLUME),
    MLIS_LAYER_VERDICT: numOrDefault(dbSettings.creditCostMlisVerdictLayer, DEFAULT_CREDIT_COSTS.MLIS_LAYER_VERDICT),

    // Capital Flow
    CAPITAL_FLOW_L3_L4: numOrDefault(dbSettings.creditCostCapitalFlowL3L4, DEFAULT_CREDIT_COSTS.CAPITAL_FLOW_L3_L4),

    // Features
    AI_EXPERT_QUESTION: numOrDefault(dbSettings.creditCostAiExpert, DEFAULT_CREDIT_COSTS.AI_EXPERT_QUESTION),
    AI_CONCIERGE_MESSAGE: numOrDefault(dbSettings.creditCostAiConcierge, DEFAULT_CREDIT_COSTS.AI_CONCIERGE_MESSAGE),
    PDF_REPORT: numOrDefault(dbSettings.creditCostPdfReport, DEFAULT_CREDIT_COSTS.PDF_REPORT),
    REPORT_TRANSLATION: numOrDefault(dbSettings.creditCostTranslation, DEFAULT_CREDIT_COSTS.REPORT_TRANSLATION),
    EMAIL_SEND: numOrDefault(dbSettings.creditCostEmailSend, DEFAULT_CREDIT_COSTS.EMAIL_SEND),
    ADD_TO_REPORT: numOrDefault(dbSettings.creditCostAddToReport, DEFAULT_CREDIT_COSTS.ADD_TO_REPORT),
    PRICE_ALERT: numOrDefault(dbSettings.creditCostPriceAlert, DEFAULT_CREDIT_COSTS.PRICE_ALERT),
    WATCHLIST_SLOT: numOrDefault(dbSettings.creditCostWatchlistSlot, DEFAULT_CREDIT_COSTS.WATCHLIST_SLOT),
    AUTO_REFRESH_HOUR: DEFAULT_CREDIT_COSTS.AUTO_REFRESH_HOUR, // Not in DB yet

    // Credit Economy (Marketplace)
    ANALYSIS_PURCHASE: numOrDefault(dbSettings.creditCostAnalysisPurchase, DEFAULT_CREDIT_COSTS.ANALYSIS_PURCHASE),
  };
}

/**
 * Load credit costs from database
 */
async function loadFromDatabase(): Promise<typeof DEFAULT_CREDIT_COSTS> {
  try {
    const settings = await prisma.costSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      // Create default settings if not exists
      const created = await prisma.costSettings.create({
        data: { id: 'default' },
      });
      return mapDbToCosts(created);
    }

    return mapDbToCosts(settings);
  } catch (error) {
    console.error('Failed to load credit costs from database:', error);
    return DEFAULT_CREDIT_COSTS;
  }
}

/**
 * Get all credit costs (with caching)
 */
export async function getCreditCosts(): Promise<typeof DEFAULT_CREDIT_COSTS> {
  const now = Date.now();

  // Return cached if still valid
  if (cachedCosts && (now - cachedCosts.loadedAt) < CACHE_TTL_MS) {
    return cachedCosts.costs;
  }

  // Load from database
  const costs = await loadFromDatabase();

  // Update cache
  cachedCosts = {
    costs,
    loadedAt: now,
  };

  return costs;
}

/**
 * Get a specific credit cost by key
 */
export async function getCreditCost(key: CreditCostKey): Promise<number> {
  const costs = await getCreditCosts();
  return costs[key];
}

/**
 * Update credit costs in database
 */
export async function updateCreditCosts(updates: Partial<{
  // Analysis Steps
  creditCostMarketPulse: number;
  creditCostAssetScanner: number;
  creditCostSafetyCheck: number;
  creditCostTiming: number;
  creditCostTradePlan: number;
  creditCostTrapCheck: number;
  creditCostFinalVerdict: number;
  // Bundles
  creditCostFullAnalysis: number;
  creditCostMlisProAnalysis: number;
  creditCostQuickCheck: number;
  creditCostSmartEntry: number;
  // MLIS Pro Layers
  creditCostMlisTechnicalLayer: number;
  creditCostMlisMomentumLayer: number;
  creditCostMlisVolatilityLayer: number;
  creditCostMlisVolumeLayer: number;
  creditCostMlisVerdictLayer: number;
  // Capital Flow
  creditCostCapitalFlowL3L4: number;
  // Features
  creditCostAiExpert: number;
  creditCostAiConcierge: number;
  creditCostPdfReport: number;
  creditCostTranslation: number;
  creditCostEmailSend: number;
  creditCostAddToReport: number;
  creditCostPriceAlert: number;
  creditCostWatchlistSlot: number;
}>): Promise<typeof DEFAULT_CREDIT_COSTS> {
  try {
    const updated = await prisma.costSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updates },
      update: updates,
    });

    // Invalidate cache
    cachedCosts = null;

    return mapDbToCosts(updated);
  } catch (error) {
    console.error('Failed to update credit costs:', error);
    throw error;
  }
}

/**
 * Invalidate the cache (useful after admin updates)
 */
export function invalidateCreditCostsCache(): void {
  cachedCosts = null;
}

/**
 * Get default credit costs (for reference)
 */
export function getDefaultCreditCosts(): typeof DEFAULT_CREDIT_COSTS {
  return { ...DEFAULT_CREDIT_COSTS };
}

// Export service object
export const creditCostsService = {
  getCreditCosts,
  getCreditCost,
  updateCreditCosts,
  invalidateCreditCostsCache,
  getDefaultCreditCosts,
};
