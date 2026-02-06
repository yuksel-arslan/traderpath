/**
 * Feature Gate Hook
 * Checks if the current user has access to specific features based on their subscription tier
 */

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscription, SubscriptionTier, SubscriptionPlan } from './useSubscription';

export type GatedFeature =
  | 'capital_flow_l3'
  | 'capital_flow_l4'
  | 'asset_analysis'
  | 'ai_features'
  | 'reports_export'
  | 'automation'
  | 'rewards'
  | 'scheduled_reports'
  | 'pdf_reports'
  | 'email_reports';

// Map features to their required subscription properties
const FEATURE_MAP: Record<GatedFeature, {
  subscriptionKey: keyof SubscriptionPlan['features'] | null;
  minimumTier: SubscriptionTier;
}> = {
  capital_flow_l3: { subscriptionKey: 'capitalFlowL3', minimumTier: 'starter' },
  capital_flow_l4: { subscriptionKey: 'capitalFlowL4', minimumTier: 'starter' },
  asset_analysis: { subscriptionKey: 'assetAnalysis', minimumTier: 'pro' },
  ai_features: { subscriptionKey: 'aiFeatures', minimumTier: 'elite' },
  reports_export: { subscriptionKey: 'reportsExport', minimumTier: 'starter' },
  automation: { subscriptionKey: 'automation', minimumTier: 'starter' },
  rewards: { subscriptionKey: 'rewards', minimumTier: 'free' },
  scheduled_reports: { subscriptionKey: 'automation', minimumTier: 'starter' },
  pdf_reports: { subscriptionKey: 'reportsExport', minimumTier: 'starter' },
  email_reports: { subscriptionKey: 'reportsExport', minimumTier: 'starter' },
};

// Tier hierarchy for comparison
const TIER_LEVEL: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  elite: 3,
};

interface UseFeatureGateReturn {
  /** Check if user has access to a specific feature */
  hasAccess: (feature: GatedFeature) => boolean;
  /** Check if user's tier meets minimum requirement */
  meetsMinimumTier: (minimumTier: SubscriptionTier) => boolean;
  /** Get remaining limit for a feature (e.g., scheduled reports) */
  getRemainingLimit: (limitKey: keyof SubscriptionPlan['limits']) => number;
  /** Current user's tier */
  currentTier: SubscriptionTier;
  /** Is the user on free tier */
  isFreeTier: boolean;
  /** Is the user an admin */
  isAdmin: boolean;
  /** Is subscription data still loading */
  loading: boolean;
  /** Daily credits remaining */
  dailyCredits: number;
  /** Show upgrade prompt state */
  showUpgradePrompt: boolean;
  /** The feature that triggered the upgrade prompt */
  promptFeature: GatedFeature | null;
  /** Open upgrade prompt for a feature */
  openUpgradePrompt: (feature: GatedFeature) => void;
  /** Close upgrade prompt */
  closeUpgradePrompt: () => void;
  /** Check access and show prompt if denied */
  checkAccessWithPrompt: (feature: GatedFeature) => boolean;
}

export function useFeatureGate(): UseFeatureGateReturn {
  const { subscription, loading, hasFeature, getLimit } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<GatedFeature | null>(null);

  // Check admin status from user-info cache (set by layout.tsx)
  const queryClient = useQueryClient();
  const userInfo = queryClient.getQueryData<{ isAdmin?: boolean }>(['user-info']);
  const isAdmin = userInfo?.isAdmin === true;

  const currentTier = isAdmin ? 'elite' as SubscriptionTier : (subscription?.tier ?? 'free');
  const isFreeTier = !isAdmin && currentTier === 'free';
  const dailyCredits = isAdmin ? 999999 : (subscription?.dailyCredits ?? 0);

  // Check if user's tier meets minimum requirement
  const meetsMinimumTier = useCallback((minimumTier: SubscriptionTier): boolean => {
    return TIER_LEVEL[currentTier] >= TIER_LEVEL[minimumTier];
  }, [currentTier]);

  // Check if user has access to a specific feature
  const hasAccess = useCallback((feature: GatedFeature): boolean => {
    // Admin users have access to all features
    if (isAdmin) return true;

    const featureConfig = FEATURE_MAP[feature];

    // First check minimum tier requirement
    if (!meetsMinimumTier(featureConfig.minimumTier)) {
      return false;
    }

    // If there's a specific subscription key, check it
    if (featureConfig.subscriptionKey) {
      return hasFeature(featureConfig.subscriptionKey);
    }

    // Default to true if tier requirement is met
    return true;
  }, [isAdmin, meetsMinimumTier, hasFeature]);

  // Get remaining limit for a feature
  const getRemainingLimit = useCallback((limitKey: keyof SubscriptionPlan['limits']): number => {
    // Admin users have unlimited limits
    if (isAdmin) return Infinity;
    const limit = getLimit(limitKey);
    // -1 means unlimited
    if (limit === -1) return Infinity;
    return limit;
  }, [isAdmin, getLimit]);

  // Open upgrade prompt
  const openUpgradePrompt = useCallback((feature: GatedFeature) => {
    setPromptFeature(feature);
    setShowUpgradePrompt(true);
  }, []);

  // Close upgrade prompt
  const closeUpgradePrompt = useCallback(() => {
    setShowUpgradePrompt(false);
    setPromptFeature(null);
  }, []);

  // Check access and show prompt if denied
  const checkAccessWithPrompt = useCallback((feature: GatedFeature): boolean => {
    const access = hasAccess(feature);
    if (!access) {
      openUpgradePrompt(feature);
    }
    return access;
  }, [hasAccess, openUpgradePrompt]);

  return {
    hasAccess,
    meetsMinimumTier,
    getRemainingLimit,
    currentTier,
    isFreeTier,
    isAdmin,
    loading,
    dailyCredits,
    showUpgradePrompt,
    promptFeature,
    openUpgradePrompt,
    closeUpgradePrompt,
    checkAccessWithPrompt,
  };
}

/**
 * Utility to get the required tier for a feature
 */
export function getRequiredTier(feature: GatedFeature): SubscriptionTier {
  return FEATURE_MAP[feature].minimumTier;
}

/**
 * Utility to check if a tier is higher than another
 */
export function isTierHigherOrEqual(tier: SubscriptionTier, compareTo: SubscriptionTier): boolean {
  return TIER_LEVEL[tier] >= TIER_LEVEL[compareTo];
}

export default useFeatureGate;
