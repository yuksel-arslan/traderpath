/**
 * Subscription Hook
 * Manages user subscription state and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { authFetch, apiBaseUrl } from '../lib/api';

// Subscription tier types
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite';
export type SubscriptionStatus = 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'TRIALING';

// Subscription plan from API
export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlySavings: number;
  dailyCredits: number;
  features: {
    capitalFlowL3: boolean;
    capitalFlowL4: boolean;
    mlisProAccess: boolean;
    aiConcierge: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    earlyFeatures: boolean;
  };
  limits: {
    maxScheduledReports: number;
    maxAlerts: number;
    monthlyAiExpertQuestions: number;
    monthlyEmailReports: number;
    monthlyPdfReports: number;
  };
}

// User's subscription status
export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  dailyCredits: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  features: SubscriptionPlan['features'];
  limits: SubscriptionPlan['limits'];
}

interface UseSubscriptionReturn {
  // Data
  subscription: UserSubscription | null;
  plans: SubscriptionPlan[];

  // Loading states
  loading: boolean;
  plansLoading: boolean;
  actionLoading: boolean;

  // Error
  error: string | null;

  // Actions
  refreshSubscription: () => Promise<void>;
  createCheckout: (tier: Exclude<SubscriptionTier, 'free'>, interval: 'month' | 'year') => Promise<string | null>;
  openBillingPortal: () => Promise<string | null>;
  cancelSubscription: () => Promise<boolean>;
  resumeSubscription: () => Promise<boolean>;

  // Helpers
  isSubscribed: boolean;
  isPaidTier: boolean;
  hasFeature: (feature: keyof SubscriptionPlan['features']) => boolean;
  getLimit: (limit: keyof SubscriptionPlan['limits']) => number;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription plans (public endpoint)
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/subscriptions/plans`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.plans) {
          setPlans(data.data.plans);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Fetch user's subscription status
  const fetchSubscription = useCallback(async () => {
    try {
      const res = await authFetch('/api/subscriptions/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setSubscription(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await fetchSubscription();
  }, [fetchSubscription]);

  // Create checkout session
  const createCheckout = useCallback(async (
    tier: Exclude<SubscriptionTier, 'free'>,
    interval: 'month' | 'year'
  ): Promise<string | null> => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await authFetch('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier, interval }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }

      return data.data?.url || null;
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout session');
      return null;
    } finally {
      setActionLoading(false);
    }
  }, []);

  // Open billing portal
  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await authFetch('/api/subscriptions/portal', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to open billing portal');
      }

      return data.data?.url || null;
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      return null;
    } finally {
      setActionLoading(false);
    }
  }, []);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await authFetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to cancel subscription');
      }

      await refreshSubscription();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [refreshSubscription]);

  // Resume subscription
  const resumeSubscription = useCallback(async (): Promise<boolean> => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await authFetch('/api/subscriptions/resume', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to resume subscription');
      }

      await refreshSubscription();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to resume subscription');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [refreshSubscription]);

  // Computed values
  const isSubscribed = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING';
  const isPaidTier = subscription?.tier !== 'free' && isSubscribed;

  const hasFeature = useCallback((feature: keyof SubscriptionPlan['features']): boolean => {
    return subscription?.features?.[feature] ?? false;
  }, [subscription]);

  const getLimit = useCallback((limit: keyof SubscriptionPlan['limits']): number => {
    return subscription?.limits?.[limit] ?? 0;
  }, [subscription]);

  // Initial fetch
  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, [fetchPlans, fetchSubscription]);

  return {
    subscription,
    plans,
    loading,
    plansLoading,
    actionLoading,
    error,
    refreshSubscription,
    createCheckout,
    openBillingPortal,
    cancelSubscription,
    resumeSubscription,
    isSubscribed,
    isPaidTier,
    hasFeature,
    getLimit,
  };
}

// Helper to format subscription tier display name
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    elite: 'Elite',
  };
  return names[tier] || tier;
}

// Helper to get tier badge color
export function getTierColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    free: 'slate',
    starter: 'blue',
    pro: 'purple',
    elite: 'amber',
  };
  return colors[tier] || 'slate';
}
