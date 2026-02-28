/**
 * Weekly Subscription Plans Configuration
 *
 * Two simple subscription types:
 * 1. Report Weekly: $6.99/week - 7 daily reports (Executive Summary or Detailed Analysis)
 * 2. Analysis Weekly: $6.99/week - 7 analyses + 5 AI Expert questions per analysis
 */

export type WeeklyPlanType = 'REPORT_WEEKLY' | 'ANALYSIS_WEEKLY';

export interface WeeklyPlanConfig {
  name: string;
  description: string;
  price: number; // in cents (Stripe format)
  priceUsd: number; // in dollars (display format)
  interval: 'week';
  quota: number; // reports or analyses per week
  aiExpertQuestionsPerAnalysis: number; // only for ANALYSIS_WEEKLY
  features: string[];
}

export const WEEKLY_PLAN_CONFIG: Record<WeeklyPlanType, WeeklyPlanConfig> = {
  REPORT_WEEKLY: {
    name: 'Intelligent Report Subscription',
    description: 'Daily Executive Summary or Detailed Analysis Report via Telegram & Discord',
    price: 699, // $6.99
    priceUsd: 6.99,
    interval: 'week',
    quota: 7,
    aiExpertQuestionsPerAnalysis: 0,
    features: [
      '7 reports per week (1 daily)',
      'Executive Summary or Detailed Analysis Report',
      'Snapshot PNG delivery (pixel-perfect)',
      'Telegram + Discord inline delivery',
      'Choose your preferred assets & timeframes',
      'Outcome tracking & TP/SL notifications',
    ],
  },
  ANALYSIS_WEEKLY: {
    name: 'Capital Flow & Asset Analysis Subscription',
    description: 'Full 7-Step Analysis with AI Expert Chat included',
    price: 699, // $6.99
    priceUsd: 6.99,
    interval: 'week',
    quota: 7,
    aiExpertQuestionsPerAnalysis: 5,
    features: [
      '7 full analyses per week',
      '5 AI Expert questions per analysis',
      'AI Concierge, Automatic, or Tailored methods',
      'Executive Summary + Detailed Report included',
      'Full 7-Step + MLIS Pro dual-engine',
      'RAG Intelligence enrichment',
      'Trade Plan with Entry / SL / TP1 / TP2',
    ],
  },
};

/**
 * Get plan config by type
 */
export function getWeeklyPlanConfig(planType: WeeklyPlanType): WeeklyPlanConfig {
  return WEEKLY_PLAN_CONFIG[planType];
}

/**
 * Get all plan types
 */
export function getAllWeeklyPlanTypes(): WeeklyPlanType[] {
  return ['REPORT_WEEKLY', 'ANALYSIS_WEEKLY'];
}

/**
 * Get per-unit cost display string
 */
export function getPerUnitCost(planType: WeeklyPlanType): string {
  const config = WEEKLY_PLAN_CONFIG[planType];
  const perUnit = config.priceUsd / config.quota;
  return `$${perUnit.toFixed(2)}`;
}
