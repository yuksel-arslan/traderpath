'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  X,
  Zap,
  Star,
  Crown,
  Gem,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useSubscription,
  SubscriptionPlan,
  SubscriptionTier,
  getTierDisplayName,
} from '../../hooks/useSubscription';
import { getAuthToken } from '../../lib/api';

interface SubscriptionTiersProps {
  /** Page variant shows all tiers with full details, compact shows minimal */
  variant?: 'page' | 'compact';
  /** Override logged in state (auto-detected if not provided) */
  isLoggedIn?: boolean;
  /** Current user's tier (auto-fetched if not provided) */
  currentTier?: SubscriptionTier;
  /** Callback when checkout URL is received */
  onCheckout?: (url: string) => void;
}

// Tier icons
const TIER_ICONS: Record<SubscriptionTier, typeof Zap> = {
  free: Gem,
  starter: Zap,
  pro: Star,
  elite: Crown,
};

// Tier colors for gradients
const TIER_COLORS: Record<SubscriptionTier, { from: string; to: string; border: string; text: string }> = {
  free: {
    from: 'from-slate-500',
    to: 'to-slate-600',
    border: 'border-slate-300 dark:border-slate-700',
    text: 'text-slate-500',
  },
  starter: {
    from: 'from-blue-500',
    to: 'to-blue-600',
    border: 'border-blue-500',
    text: 'text-blue-500',
  },
  pro: {
    from: 'from-purple-500',
    to: 'to-purple-600',
    border: 'border-purple-500',
    text: 'text-purple-500',
  },
  elite: {
    from: 'from-amber-500',
    to: 'to-amber-600',
    border: 'border-amber-500',
    text: 'text-amber-500',
  },
};

export function SubscriptionTiers({
  variant = 'page',
  isLoggedIn: isLoggedInProp,
  currentTier: currentTierProp,
  onCheckout
}: SubscriptionTiersProps) {
  const router = useRouter();
  const { plans, plansLoading, subscription, createCheckout, actionLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(isLoggedInProp ?? false);

  // Auto-detect auth status if not provided
  useEffect(() => {
    if (isLoggedInProp !== undefined) {
      setIsLoggedIn(isLoggedInProp);
      setAuthChecked(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const token = await getAuthToken();
        setIsLoggedIn(!!token);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [isLoggedInProp]);

  // Use prop tier if provided, otherwise use from subscription hook
  const currentTier = currentTierProp ?? subscription?.tier ?? 'free';

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (tier === 'free') return;

    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    setLoadingTier(tier);
    const url = await createCheckout(tier as Exclude<SubscriptionTier, 'free'>, billingInterval);
    setLoadingTier(null);

    if (url) {
      if (onCheckout) {
        onCheckout(url);
      } else {
        window.location.href = url;
      }
    }
  };

  if (plansLoading || !authChecked) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Separate free and paid plans
  const freePlan = plans.find(p => p.tier === 'free');
  const paidPlans = plans.filter(p => p.tier !== 'free');

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setBillingInterval('month')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              billingInterval === 'month'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2',
              billingInterval === 'year'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Yearly
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
              SAVE 17%
            </span>
          </button>
        </div>
      </div>

      {/* Subscription Cards */}
      <div className={cn(
        'grid gap-6',
        variant === 'compact'
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      )}>
        {/* Free Tier */}
        {freePlan && (
          <TierCard
            plan={freePlan}
            variant={variant}
            interval={billingInterval}
            isCurrentTier={currentTier === 'free'}
            isLoggedIn={isLoggedIn}
            loading={loadingTier === 'free'}
            onSubscribe={() => {}}
            disabled={true}
          />
        )}

        {/* Paid Tiers */}
        {paidPlans.map((plan) => (
          <TierCard
            key={plan.tier}
            plan={plan}
            variant={variant}
            interval={billingInterval}
            isCurrentTier={currentTier === plan.tier}
            isLoggedIn={isLoggedIn}
            loading={loadingTier === plan.tier || actionLoading}
            onSubscribe={() => handleSubscribe(plan.tier)}
            disabled={actionLoading}
            recommended={plan.tier === 'pro'}
          />
        ))}
      </div>

      {/* Enterprise Note */}
      <div className="text-center text-sm text-muted-foreground">
        Need a custom plan for your team?{' '}
        <a href="mailto:contact@traderpath.io" className="text-emerald-500 hover:underline">
          Contact us
        </a>
      </div>
    </div>
  );
}

// Individual Tier Card Component
interface TierCardProps {
  plan: SubscriptionPlan;
  variant: 'page' | 'compact';
  interval: 'month' | 'year';
  isCurrentTier: boolean;
  isLoggedIn: boolean;
  loading: boolean;
  onSubscribe: () => void;
  disabled: boolean;
  recommended?: boolean;
}

function TierCard({
  plan,
  variant,
  interval,
  isCurrentTier,
  isLoggedIn,
  loading,
  onSubscribe,
  disabled,
  recommended,
}: TierCardProps) {
  const Icon = TIER_ICONS[plan.tier];
  const colors = TIER_COLORS[plan.tier];
  const price = interval === 'month' ? plan.monthlyPrice : plan.yearlyPrice;
  const isFree = plan.tier === 'free';
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'relative bg-white dark:bg-slate-900 rounded-xl border-2 transition-all duration-200',
        isCompact ? 'p-4' : 'p-6',
        recommended && !isCurrentTier && 'border-purple-500 shadow-lg shadow-purple-500/10',
        isCurrentTier && 'border-emerald-500 shadow-lg shadow-emerald-500/10',
        !recommended && !isCurrentTier && colors.border
      )}
    >
      {/* Badges */}
      {recommended && !isCurrentTier && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          RECOMMENDED
        </div>
      )}
      {isCurrentTier && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
          CURRENT PLAN
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div
          className={cn(
            'w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center',
            `bg-gradient-to-br ${colors.from} ${colors.to}`
          )}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {getTierDisplayName(plan.tier)}
        </h3>
        <div className="mt-2">
          {isFree ? (
            <div className="text-3xl font-bold text-slate-900 dark:text-white">Free</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                ${price}
                <span className="text-base font-normal text-muted-foreground">
                  /{interval === 'month' ? 'mo' : 'yr'}
                </span>
              </div>
              {interval === 'year' && plan.yearlySavings > 0 && (
                <p className="text-sm text-emerald-500">
                  Save {plan.yearlySavings}% with yearly billing
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className={cn('space-y-2 mb-4', isCompact && 'text-sm')}>
        <FeatureItem included={true} text="Capital Flow L1-L2" compact={isCompact} />
        <FeatureItem included={plan.features.capitalFlowL3} text="Capital Flow L3-L4" compact={isCompact} />
        <FeatureItem included={plan.features.assetAnalysis} text="Asset Analysis" compact={isCompact} />
        <FeatureItem included={plan.features.aiFeatures} text="AI Features" compact={isCompact} />
        {!isCompact && (
          <>
            <FeatureItem included={plan.features.reportsExport} text="Reports & Export" compact={isCompact} />
            <FeatureItem included={plan.features.automation} text="Automation" compact={isCompact} />
            <FeatureItem included={plan.features.rewards} text="Rewards" compact={isCompact} />
          </>
        )}
      </div>

      {/* Limits - only in full variant */}
      {!isCompact && (
        <div className="text-xs text-muted-foreground space-y-1 mb-6">
          <p>
            Daily Analyses:{' '}
            {plan.limits.maxDailyAnalyses === -1 ? 'Unlimited' : plan.limits.maxDailyAnalyses || 'N/A'}
          </p>
          <p>
            Scheduled Reports:{' '}
            {plan.limits.maxScheduledReports === -1 ? 'Unlimited' : plan.limits.maxScheduledReports}
          </p>
          <p>Price Alerts: {plan.limits.maxAlerts === -1 ? 'Unlimited' : plan.limits.maxAlerts}</p>
          {!isFree && (
            <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-2">
              💡 Need more? Buy credits for extra analyses
            </p>
          )}
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={onSubscribe}
        disabled={disabled || isFree || isCurrentTier}
        className={cn(
          'w-full py-3 rounded-lg font-medium text-center transition flex items-center justify-center gap-2',
          isCurrentTier && 'bg-emerald-500/10 text-emerald-600 cursor-default',
          isFree && !isCurrentTier && 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default',
          !isFree && !isCurrentTier && recommended && 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700',
          !isFree && !isCurrentTier && !recommended && `bg-gradient-to-r ${colors.from} ${colors.to} text-white hover:opacity-90`,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : isCurrentTier ? (
          'Current Plan'
        ) : isFree ? (
          'Free Forever'
        ) : isLoggedIn ? (
          'Subscribe Now'
        ) : (
          'Get Started'
        )}
      </button>
    </div>
  );
}

// Feature list item
function FeatureItem({ included, text, compact }: { included: boolean; text: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', compact ? 'text-xs' : 'text-sm')}>
      {included ? (
        <Check className={cn('text-emerald-500 flex-shrink-0', compact ? 'w-3 h-3' : 'w-4 h-4')} />
      ) : (
        <X className={cn('text-slate-300 dark:text-slate-700 flex-shrink-0', compact ? 'w-3 h-3' : 'w-4 h-4')} />
      )}
      <span className={cn(!included && 'text-muted-foreground')}>{text}</span>
    </div>
  );
}
