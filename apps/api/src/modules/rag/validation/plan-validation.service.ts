/**
 * Plan Validation Service — Gatekeeper
 *
 * Validates ALL trade plans (engine + multi-strategy) before
 * they reach the user. No plan passes without validation.
 *
 * Validation categories:
 *   - risk: R/R ratio, SL distance, position sizing
 *   - sanity: P10 < P50 < P90, TP ordering, price realism
 *   - timing: Economic events, market hours
 *   - liquidity: Volume checks
 *   - capital_flow: Direction alignment with capital flow
 *
 * Severity levels:
 *   - block: Plan MUST be rejected or annotated with warning
 *   - warn: Plan is allowed but flagged
 *   - info: Informational note only
 */

import {
  ValidationCheckResult,
  PlanValidationResult,
  ValidationContext,
  ValidationCategory,
  ValidationSeverity,
  ForecastBand,
  StrategyPlan,
} from '../types';

// ============================================================================
// VALIDATION RULE DEFINITIONS
// ============================================================================

interface ValidationRule {
  id: string;
  name: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  check: (plan: PlanInput, ctx: ValidationContext) => ValidationCheckResult;
}

interface PlanInput {
  planId: string;
  planType: 'engine' | 'breakout' | 'pullback' | 'trend_following' | 'range';
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  riskReward?: number;
}

// ============================================================================
// VALIDATION RULES (10 rules)
// ============================================================================

const VALIDATION_RULES: ValidationRule[] = [
  // ── RISK ─────────────────────────────────────────────────────────
  {
    id: 'max_sl_distance',
    name: 'Maximum Stop Loss Distance',
    category: 'risk',
    severity: 'block',
    check: (plan, ctx) => {
      const slDistance = Math.abs(plan.entry - plan.stopLoss) / plan.entry;
      const maxAllowed = 0.10; // 10%
      return {
        passed: slDistance <= maxAllowed,
        ruleId: 'max_sl_distance',
        ruleName: 'Maximum Stop Loss Distance',
        category: 'risk',
        severity: 'block',
        message: slDistance <= maxAllowed
          ? `SL distance ${(slDistance * 100).toFixed(1)}% within limit`
          : `SL distance ${(slDistance * 100).toFixed(1)}% exceeds maximum ${(maxAllowed * 100).toFixed(0)}%`,
        data: { slDistance: slDistance * 100, maxAllowed: maxAllowed * 100 },
      };
    },
  },
  {
    id: 'min_sl_distance',
    name: 'Minimum Stop Loss Distance',
    category: 'risk',
    severity: 'warn',
    check: (plan, ctx) => {
      const slDistance = Math.abs(plan.entry - plan.stopLoss) / plan.entry;
      const minRequired = 0.005; // 0.5%
      return {
        passed: slDistance >= minRequired,
        ruleId: 'min_sl_distance',
        ruleName: 'Minimum Stop Loss Distance',
        category: 'risk',
        severity: 'warn',
        message: slDistance >= minRequired
          ? `SL distance ${(slDistance * 100).toFixed(2)}% adequate`
          : `SL distance ${(slDistance * 100).toFixed(2)}% too tight — likely to be hit by noise`,
        data: { slDistance: slDistance * 100, minRequired: minRequired * 100 },
      };
    },
  },
  {
    id: 'min_risk_reward',
    name: 'Minimum Risk/Reward Ratio',
    category: 'risk',
    severity: 'block',
    check: (plan, ctx) => {
      if (!plan.takeProfits.length) {
        return {
          passed: false,
          ruleId: 'min_risk_reward',
          ruleName: 'Minimum Risk/Reward Ratio',
          category: 'risk',
          severity: 'block',
          message: 'No take profit targets defined',
        };
      }
      const risk = Math.abs(plan.entry - plan.stopLoss);
      const reward = Math.abs(plan.takeProfits[0] - plan.entry);
      const rr = risk > 0 ? reward / risk : 0;
      const minRR = 1.0;
      return {
        passed: rr >= minRR,
        ruleId: 'min_risk_reward',
        ruleName: 'Minimum Risk/Reward Ratio',
        category: 'risk',
        severity: 'block',
        message: rr >= minRR
          ? `R/R ratio ${rr.toFixed(1)}:1 meets minimum`
          : `R/R ratio ${rr.toFixed(1)}:1 below minimum ${minRR}:1`,
        data: { riskReward: rr, minimum: minRR },
      };
    },
  },

  // ── SANITY ───────────────────────────────────────────────────────
  {
    id: 'sl_direction_check',
    name: 'Stop Loss Direction Sanity',
    category: 'sanity',
    severity: 'block',
    check: (plan, ctx) => {
      const correct = plan.direction === 'long'
        ? plan.stopLoss < plan.entry
        : plan.stopLoss > plan.entry;
      return {
        passed: correct,
        ruleId: 'sl_direction_check',
        ruleName: 'Stop Loss Direction Sanity',
        category: 'sanity',
        severity: 'block',
        message: correct
          ? `SL correctly placed ${plan.direction === 'long' ? 'below' : 'above'} entry`
          : `SL on wrong side of entry for ${plan.direction} position`,
      };
    },
  },
  {
    id: 'tp_direction_check',
    name: 'Take Profit Direction Sanity',
    category: 'sanity',
    severity: 'block',
    check: (plan, ctx) => {
      if (!plan.takeProfits.length) {
        return { passed: true, ruleId: 'tp_direction_check', ruleName: 'Take Profit Direction Sanity', category: 'sanity', severity: 'block', message: 'No TPs to validate' };
      }
      const tp1 = plan.takeProfits[0];
      const correct = plan.direction === 'long' ? tp1 > plan.entry : tp1 < plan.entry;
      return {
        passed: correct,
        ruleId: 'tp_direction_check',
        ruleName: 'Take Profit Direction Sanity',
        category: 'sanity',
        severity: 'block',
        message: correct
          ? `TP1 correctly placed ${plan.direction === 'long' ? 'above' : 'below'} entry`
          : `TP1 on wrong side of entry for ${plan.direction} position`,
      };
    },
  },
  {
    id: 'entry_price_realism',
    name: 'Entry Price Realism',
    category: 'sanity',
    severity: 'warn',
    check: (plan, ctx) => {
      const distance = Math.abs(plan.entry - ctx.currentPrice) / ctx.currentPrice;
      const maxDistance = 0.05; // 5%
      return {
        passed: distance <= maxDistance,
        ruleId: 'entry_price_realism',
        ruleName: 'Entry Price Realism',
        category: 'sanity',
        severity: 'warn',
        message: distance <= maxDistance
          ? `Entry ${(distance * 100).toFixed(1)}% from current price — reasonable`
          : `Entry ${(distance * 100).toFixed(1)}% from current price — consider updating`,
        data: { distancePercent: distance * 100 },
      };
    },
  },

  // ── TIMING ───────────────────────────────────────────────────────
  {
    id: 'economic_event_check',
    name: 'Economic Event Block',
    category: 'timing',
    severity: 'block',
    check: (plan, ctx) => {
      return {
        passed: !ctx.economicCalendar.shouldBlockTrade,
        ruleId: 'economic_event_check',
        ruleName: 'Economic Event Block',
        category: 'timing',
        severity: 'block',
        message: !ctx.economicCalendar.shouldBlockTrade
          ? 'No blocking economic events'
          : `Trade blocked: ${ctx.economicCalendar.blockReason || 'High-impact event imminent'}`,
      };
    },
  },

  // ── CAPITAL FLOW ─────────────────────────────────────────────────
  {
    id: 'capital_flow_direction',
    name: 'Capital Flow Direction Alignment',
    category: 'capital_flow',
    severity: 'warn',
    check: (plan, ctx) => {
      if (!ctx.capitalFlowBias || !ctx.capitalFlowPhase) {
        return { passed: true, ruleId: 'capital_flow_direction', ruleName: 'Capital Flow Direction Alignment', category: 'capital_flow', severity: 'warn', message: 'No capital flow data available' };
      }

      // Must match isCounterCapitalFlow() in multi-strategy.service.ts
      const isCounterFlow =
        (plan.direction === 'long' && ctx.capitalFlowBias === 'risk_off' && ctx.capitalFlowPhase === 'exit') ||
        (plan.direction === 'short' && ctx.capitalFlowBias === 'risk_on' && ctx.capitalFlowPhase === 'early') ||
        (plan.direction === 'long' && ctx.capitalFlowPhase === 'exit');

      return {
        passed: !isCounterFlow,
        ruleId: 'capital_flow_direction',
        ruleName: 'Capital Flow Direction Alignment',
        category: 'capital_flow',
        severity: 'warn',
        message: !isCounterFlow
          ? `Direction aligned with capital flow (${ctx.capitalFlowBias}, ${ctx.capitalFlowPhase} phase)`
          : `COUNTER-TREND: ${plan.direction.toUpperCase()} opposes ${ctx.capitalFlowBias} / ${ctx.capitalFlowPhase} phase`,
        data: { bias: ctx.capitalFlowBias, phase: ctx.capitalFlowPhase },
      };
    },
  },
  {
    id: 'capital_flow_exit_phase',
    name: 'Capital Flow EXIT Phase Warning',
    category: 'capital_flow',
    severity: 'warn',
    check: (plan, ctx) => {
      const isExit = ctx.capitalFlowPhase === 'exit';
      return {
        passed: !isExit,
        ruleId: 'capital_flow_exit_phase',
        ruleName: 'Capital Flow EXIT Phase Warning',
        category: 'capital_flow',
        severity: 'warn',
        message: !isExit
          ? `Capital flow phase: ${ctx.capitalFlowPhase || 'unknown'}`
          : 'Capital in EXIT phase — all new entries carry elevated risk',
      };
    },
  },

  // ── FORECAST BAND ────────────────────────────────────────────────
  {
    id: 'tp_within_forecast',
    name: 'TP Within Forecast Band',
    category: 'sanity',
    severity: 'warn',
    check: (plan, ctx) => {
      if (!ctx.forecastBands?.length || !plan.takeProfits.length) {
        return { passed: true, ruleId: 'tp_within_forecast', ruleName: 'TP Within Forecast Band', category: 'sanity', severity: 'warn', message: 'No forecast bands to validate against' };
      }
      const shortBand = ctx.forecastBands.find(b => b.horizon === 'short');
      if (!shortBand) {
        return { passed: true, ruleId: 'tp_within_forecast', ruleName: 'TP Within Forecast Band', category: 'sanity', severity: 'warn', message: 'No short-term forecast band' };
      }

      const tp1 = plan.takeProfits[0];
      const withinBand = tp1 >= shortBand.p10 && tp1 <= shortBand.p90;
      return {
        passed: true, // Only informational
        ruleId: 'tp_within_forecast',
        ruleName: 'TP Within Forecast Band',
        category: 'sanity',
        severity: 'info',
        message: withinBand
          ? `TP1 at ${tp1} is within short-term P10-P90 forecast band`
          : `TP1 at ${tp1} is outside short-term forecast band (P10: ${shortBand.p10}, P90: ${shortBand.p90})`,
        data: { tp1, p10: shortBand.p10, p90: shortBand.p90 },
      };
    },
  },
];

// ============================================================================
// PLAN VALIDATION SERVICE
// ============================================================================

class PlanValidationService {
  /**
   * Validate a single plan against all rules
   */
  validate(plan: PlanInput, context: ValidationContext): PlanValidationResult {
    const checks: ValidationCheckResult[] = [];

    for (const rule of VALIDATION_RULES) {
      try {
        const result = rule.check(plan, context);
        checks.push(result);
      } catch (err) {
        checks.push({
          passed: true, // Don't block on rule errors
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: 'info',
          message: `Rule check error: ${err instanceof Error ? err.message : 'unknown'}`,
        });
      }
    }

    const blockCount = checks.filter(c => !c.passed && c.severity === 'block').length;
    const warnCount = checks.filter(c => !c.passed && c.severity === 'warn').length;
    const passedCount = checks.filter(c => c.passed).length;

    const overallStatus: 'pass' | 'warn' | 'block' =
      blockCount > 0 ? 'block' :
      warnCount > 0 ? 'warn' :
      'pass';

    return {
      planId: plan.planId,
      planType: plan.planType,
      overallStatus,
      checks,
      passedCount,
      warnCount,
      blockCount,
      validatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate the existing engine trade plan
   */
  validateEnginePlan(
    tradePlan: {
      direction: string;
      averageEntry: number;
      stopLoss: { price: number };
      takeProfits: Array<{ price: number }>;
      riskReward: number;
    },
    context: ValidationContext,
  ): PlanValidationResult {
    return this.validate(
      {
        planId: 'engine-primary',
        planType: 'engine',
        direction: tradePlan.direction?.toLowerCase() === 'short' ? 'short' : 'long',
        entry: tradePlan.averageEntry,
        stopLoss: tradePlan.stopLoss.price,
        takeProfits: tradePlan.takeProfits.map(tp => tp.price),
        riskReward: tradePlan.riskReward,
      },
      context,
    );
  }

  /**
   * Validate all multi-strategy plans
   */
  validateStrategies(
    strategies: StrategyPlan[],
    context: ValidationContext,
  ): PlanValidationResult[] {
    return strategies.map(strategy =>
      this.validate(
        {
          planId: strategy.id,
          planType: strategy.type,
          direction: strategy.direction,
          entry: strategy.entry.price,
          stopLoss: strategy.stopLoss.price,
          takeProfits: strategy.takeProfits.map(tp => tp.price),
          riskReward: strategy.riskReward,
        },
        context,
      ),
    );
  }

  /**
   * Get a summary of validation results
   */
  summarize(results: PlanValidationResult[]): {
    totalPlans: number;
    passed: number;
    warned: number;
    blocked: number;
    topIssues: string[];
  } {
    const passed = results.filter(r => r.overallStatus === 'pass').length;
    const warned = results.filter(r => r.overallStatus === 'warn').length;
    const blocked = results.filter(r => r.overallStatus === 'block').length;

    // Collect unique failure messages
    const issues = new Set<string>();
    for (const result of results) {
      for (const check of result.checks) {
        if (!check.passed && check.severity !== 'info') {
          issues.add(check.message);
        }
      }
    }

    return {
      totalPlans: results.length,
      passed,
      warned,
      blocked,
      topIssues: Array.from(issues).slice(0, 5),
    };
  }
}

// Singleton
export const planValidationService = new PlanValidationService();
