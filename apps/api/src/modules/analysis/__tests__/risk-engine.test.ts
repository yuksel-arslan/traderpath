/**
 * Unit tests — Risk Engine (TASK 3.3)
 *
 * Covers:
 *   • calculateStopLoss()  — ATR, level, trap-zone methods + clamping
 *   • calculateTakeProfits() — R:R fallback, S/R level, TP separation
 *   • calculatePositionSize() — base 2%, dynamic adjustments
 *   • classifyRiskLevel() — deduction logic + level mapping
 *   • estimateWinRate() — base 50%, adjustments + clamp
 *   • TRADE_STYLE_LIMITS — correct max SL/TP per style
 */

import { describe, it, expect } from 'vitest';
import {
  calculateStopLoss,
  calculateTakeProfits,
  calculatePositionSize,
  classifyRiskLevel,
  estimateWinRate,
  TRADE_STYLE_LIMITS,
  MIN_SL_PERCENT,
} from '../risk';

// ---------------------------------------------------------------------------
// calculateStopLoss
// ---------------------------------------------------------------------------

describe('calculateStopLoss()', () => {
  const base = {
    direction:  'long' as const,
    entryPrice: 100,
    atr:        2,
    tradeStyle: 'dayTrade' as const,
  };

  it('returns a stop price below entry for LONG', () => {
    const result = calculateStopLoss(base);
    expect(result.price).toBeLessThan(base.entryPrice);
  });

  it('returns a stop price above entry for SHORT', () => {
    const result = calculateStopLoss({ ...base, direction: 'short' });
    expect(result.price).toBeGreaterThan(base.entryPrice);
  });

  it('percentage is positive', () => {
    const result = calculateStopLoss(base);
    expect(result.percentage).toBeGreaterThan(0);
  });

  it('uses ATR method by default (no level provided)', () => {
    const result = calculateStopLoss(base);
    expect(result.method).toBe('atr');
  });

  it('uses level method when supportLevel is closer than ATR*2', () => {
    const result = calculateStopLoss({
      ...base,
      supportLevel: 97, // support below entry; level - ATR = 95
    });
    // level distance = |100 - (97 - 2)| = 5; ATR distance = 2*2 = 4
    // level wins since it's wider
    expect(result.method).toBe('level');
  });

  it('uses trap_zone method when nearestStopHunt is provided and wins', () => {
    const result = calculateStopLoss({
      ...base,
      nearestStopHunt: 94, // trap zone at 94; SL = 94 - 2*0.5 = 93; dist = 7
    });
    expect(result.method).toBe('trap_zone');
  });

  it('clamps stop percentage to minimum (MIN_SL_PERCENT)', () => {
    const result = calculateStopLoss({ ...base, atr: 0.001 }); // very tiny ATR
    expect(result.percentage).toBeGreaterThanOrEqual(MIN_SL_PERCENT);
  });

  it('clamps stop percentage to max for scalping (3%)', () => {
    const result = calculateStopLoss({ ...base, atr: 20, tradeStyle: 'scalping' }); // huge ATR
    expect(result.percentage).toBeLessThanOrEqual(3);
  });

  it('clamps stop percentage to max for swingTrade (15%)', () => {
    const result = calculateStopLoss({ ...base, atr: 50, tradeStyle: 'swingTrade' });
    expect(result.percentage).toBeLessThanOrEqual(15);
  });
});

// ---------------------------------------------------------------------------
// calculateTakeProfits
// ---------------------------------------------------------------------------

describe('calculateTakeProfits()', () => {
  const base = {
    direction:  'long' as const,
    entryPrice: 100,
    riskAmount: 3,   // 3% risk unit
    atr:        1.5,
    tradeStyle: 'dayTrade' as const,
  };

  it('returns 2 TP levels', () => {
    const result = calculateTakeProfits(base);
    expect(result.levels).toHaveLength(2);
  });

  it('TP1 price is above entry for LONG', () => {
    const result = calculateTakeProfits(base);
    expect(result.levels[0].price).toBeGreaterThan(base.entryPrice);
  });

  it('TP2 price is above TP1 price for LONG', () => {
    const result = calculateTakeProfits(base);
    expect(result.levels[1].price).toBeGreaterThan(result.levels[0].price);
  });

  it('TP1 price is below entry for SHORT', () => {
    const result = calculateTakeProfits({ ...base, direction: 'short' });
    expect(result.levels[0].price).toBeLessThan(base.entryPrice);
  });

  it('TP2 price is below TP1 price for SHORT', () => {
    const result = calculateTakeProfits({ ...base, direction: 'short' });
    expect(result.levels[1].price).toBeLessThan(result.levels[0].price);
  });

  it('TP1 allocation is 60%, TP2 is 40%', () => {
    const result = calculateTakeProfits(base);
    expect(result.levels[0].allocation).toBe(60);
    expect(result.levels[1].allocation).toBe(40);
  });

  it('averageRR is positive', () => {
    const result = calculateTakeProfits(base);
    expect(result.averageRR).toBeGreaterThan(0);
  });

  it('TP1 riskReward >= 1.0 (minimum acceptable)', () => {
    const result = calculateTakeProfits(base);
    expect(result.levels[0].riskReward).toBeGreaterThanOrEqual(1.0);
  });

  it('uses nearest resistance level when valid (>= 1R)', () => {
    // resistance at 107 = 7 points above entry = 7/3 ≈ 2.33R
    const result = calculateTakeProfits({ ...base, resistanceLevels: [107, 115] });
    expect(result.levels[0].price).toBeCloseTo(107, 0);
  });

  it('falls back to 2R when resistance < 1R', () => {
    // resistance at 101.5 = 1.5 points = 1.5/3 = 0.5R < 1R → fallback to 2R
    const result = calculateTakeProfits({ ...base, resistanceLevels: [101.5] });
    // 2R = 100 + 3*2 = 106
    expect(result.levels[0].price).toBeCloseTo(106, 0);
  });

  it('caps TP at maxTpPercent from entry (scalping = 6%)', () => {
    const result = calculateTakeProfits({
      ...base,
      tradeStyle:   'scalping',
      riskAmount:   20, // huge risk → TP would exceed cap
    });
    const maxPrice = base.entryPrice * 1.06;
    expect(result.levels[0].price).toBeLessThanOrEqual(maxPrice + 0.01);
    expect(result.levels[1].price).toBeLessThanOrEqual(maxPrice + 0.01);
  });

  it('enforces minimum ATR separation between TP1 and TP2', () => {
    const result = calculateTakeProfits(base);
    const sep = result.levels[1].price - result.levels[0].price;
    expect(sep).toBeGreaterThanOrEqual(base.atr * 0.5);
  });
});

// ---------------------------------------------------------------------------
// calculatePositionSize
// ---------------------------------------------------------------------------

describe('calculatePositionSize()', () => {
  const base = {
    entryPrice:    100,
    stopLossPrice: 95, // 5% stop
    accountSize:   10_000,
    safetyScore:   7,
    confidence:    60,
    marketRegime:  'neutral' as const,
    riskLevel:     'medium' as const,
  };

  it('riskPercent is between 1% and 3%', () => {
    const result = calculatePositionSize(base);
    expect(result.riskPercent).toBeGreaterThanOrEqual(1);
    expect(result.riskPercent).toBeLessThanOrEqual(3);
  });

  it('positionPercent is positive', () => {
    const result = calculatePositionSize(base);
    expect(result.positionPercent).toBeGreaterThan(0);
  });

  it('positionUsd is positive', () => {
    const result = calculatePositionSize(base);
    expect(result.positionUsd).toBeGreaterThan(0);
  });

  it('high safety score increases riskPercent vs low safety', () => {
    const highSafety = calculatePositionSize({ ...base, safetyScore: 9 });
    const lowSafety  = calculatePositionSize({ ...base, safetyScore: 3 });
    expect(highSafety.riskPercent).toBeGreaterThan(lowSafety.riskPercent);
  });

  it('high confidence increases riskPercent vs low confidence', () => {
    const highConf = calculatePositionSize({ ...base, confidence: 85 });
    const lowConf  = calculatePositionSize({ ...base, confidence: 30 });
    expect(highConf.riskPercent).toBeGreaterThan(lowConf.riskPercent);
  });

  it('risk_off regime reduces riskPercent vs neutral', () => {
    const riskOff     = calculatePositionSize({ ...base, marketRegime: 'risk_off' });
    const riskNeutral = calculatePositionSize({ ...base, marketRegime: 'neutral' });
    expect(riskOff.riskPercent).toBeLessThanOrEqual(riskNeutral.riskPercent);
  });

  it('critical riskLevel reduces riskPercent vs low riskLevel', () => {
    const critical = calculatePositionSize({ ...base, riskLevel: 'critical' });
    const low      = calculatePositionSize({ ...base, riskLevel: 'low' });
    expect(critical.riskPercent).toBeLessThan(low.riskPercent);
  });

  it('positionPercent caps at 50% max', () => {
    // Tiny stop = big position — should be capped
    const result = calculatePositionSize({ ...base, stopLossPrice: 99.99 });
    expect(result.positionPercent).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// classifyRiskLevel
// ---------------------------------------------------------------------------

describe('classifyRiskLevel()', () => {
  it('returns low risk when no risk factors present', () => {
    const result = classifyRiskLevel({});
    expect(result.riskLevel).toBe('low');
    expect(result.riskScore).toBe(100);
  });

  it('honeypot detection → critical risk', () => {
    const result = classifyRiskLevel({ isHoneypot: true });
    expect(result.riskLevel).toBe('critical');
  });

  it('spoofing + layering → high risk (100 - 20 - 15 = 65 → medium)', () => {
    const result = classifyRiskLevel({ spoofingDetected: true, layeringDetected: true });
    // 100 - 20 - 15 = 65 → medium (65 >= 50 && < 75)
    expect(result.riskLevel).toBe('medium');
  });

  it('multiple factors → riskScore decreases cumulatively', () => {
    const single   = classifyRiskLevel({ spoofingDetected: true });
    const multiple = classifyRiskLevel({ spoofingDetected: true, washTrading: true, pumpDumpRisk: 'high' });
    expect(multiple.riskScore).toBeLessThan(single.riskScore);
  });

  it('stepScore is riskScore / 10 (clamped 1-10)', () => {
    const result = classifyRiskLevel({});
    expect(result.stepScore).toBeCloseTo(10, 0);
  });

  it('adds a warning for each detected risk factor', () => {
    const result = classifyRiskLevel({ spoofingDetected: true, washTrading: true });
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('riskScore is always between 0 and 100', () => {
    // Many overlapping factors
    const result = classifyRiskLevel({
      isHoneypot: true,
      spoofingDetected: true,
      layeringDetected: true,
      washTrading: true,
      pumpDumpRisk: 'high',
    });
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// estimateWinRate
// ---------------------------------------------------------------------------

describe('estimateWinRate()', () => {
  const base = {
    direction:      'long' as const,
    trendDirection: 'neutral',
    trendStrength:  50,
    confidence:     50,
    safetyScore:    5,
    tradeNow:       false,
    riskReward:     1.5,
  };

  it('returns a number between 35 and 75', () => {
    const rate = estimateWinRate(base);
    expect(rate).toBeGreaterThanOrEqual(35);
    expect(rate).toBeLessThanOrEqual(75);
  });

  it('bullish trend + long direction increases win rate vs neutral', () => {
    const aligned = estimateWinRate({ ...base, trendDirection: 'bullish' });
    const neutral = estimateWinRate(base);
    expect(aligned).toBeGreaterThan(neutral);
  });

  it('bearish trend + short direction increases win rate vs neutral', () => {
    const aligned = estimateWinRate({ ...base, direction: 'short', trendDirection: 'bearish' });
    const neutral = estimateWinRate(base);
    expect(aligned).toBeGreaterThan(neutral);
  });

  it('high trend strength increases win rate', () => {
    const highStrength = estimateWinRate({ ...base, trendStrength: 85 });
    const lowStrength  = estimateWinRate({ ...base, trendStrength: 30 });
    expect(highStrength).toBeGreaterThan(lowStrength);
  });

  it('tradeNow = true increases win rate', () => {
    const now   = estimateWinRate({ ...base, tradeNow: true });
    const later = estimateWinRate({ ...base, tradeNow: false });
    expect(now).toBeGreaterThan(later);
  });

  it('riskReward >= 2 increases win rate', () => {
    const goodRR = estimateWinRate({ ...base, riskReward: 2.5 });
    const badRR  = estimateWinRate({ ...base, riskReward: 0.8 });
    expect(goodRR).toBeGreaterThan(badRR);
  });

  it('clamps at 75% maximum', () => {
    const rate = estimateWinRate({
      ...base,
      trendDirection: 'bullish',
      trendStrength:  90,
      confidence:     95,
      safetyScore:    10,
      tradeNow:       true,
      riskReward:     5,
    });
    expect(rate).toBeLessThanOrEqual(75);
  });

  it('clamps at 35% minimum', () => {
    const rate = estimateWinRate({
      ...base,
      trendDirection: 'bearish',
      confidence:     10,
      safetyScore:    2,
    });
    expect(rate).toBeGreaterThanOrEqual(35);
  });
});

// ---------------------------------------------------------------------------
// TRADE_STYLE_LIMITS
// ---------------------------------------------------------------------------

describe('TRADE_STYLE_LIMITS', () => {
  it('scalping has tightest SL (3%)', () => {
    expect(TRADE_STYLE_LIMITS.scalping.maxSlPercent).toBe(3);
  });

  it('swingTrade has widest SL (15%)', () => {
    expect(TRADE_STYLE_LIMITS.swingTrade.maxSlPercent).toBe(15);
  });

  it('SL limits are in ascending order: scalping < dayTrade < swingTrade', () => {
    expect(TRADE_STYLE_LIMITS.scalping.maxSlPercent)
      .toBeLessThan(TRADE_STYLE_LIMITS.dayTrade.maxSlPercent);
    expect(TRADE_STYLE_LIMITS.dayTrade.maxSlPercent)
      .toBeLessThan(TRADE_STYLE_LIMITS.swingTrade.maxSlPercent);
  });

  it('TP limits are in ascending order: scalping < dayTrade < swingTrade', () => {
    expect(TRADE_STYLE_LIMITS.scalping.maxTpPercent)
      .toBeLessThan(TRADE_STYLE_LIMITS.dayTrade.maxTpPercent);
    expect(TRADE_STYLE_LIMITS.dayTrade.maxTpPercent)
      .toBeLessThan(TRADE_STYLE_LIMITS.swingTrade.maxTpPercent);
  });
});
