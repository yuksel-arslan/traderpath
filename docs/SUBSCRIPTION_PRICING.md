# TraderPath - Subscription Pricing Model

> **Version:** 1.0
> **Date:** 2026-02-03
> **Status:** All 5 Phases Complete - Subscription System Ready

---

## Market Analysis

### Competitor Pricing (2026)

| Platform | Price Range | Target Audience |
|----------|-------------|-----------------|
| Bitsgap | $29 - $149/mo | Bot traders |
| 3Commas | $49 - $92/mo | Automated trading |
| StockioAI | $49.99/mo | AI stock analysis |
| Cryptohopper | $29 - $129/mo | Bot + signals |
| Crypto Inner | $70 - $100/mo | Premium signals |
| Nansen Pro | ~$150/mo | On-chain analytics |
| 2moon VIP | $297/mo | Exclusive signals |

**TraderPath Positioning:** Mid-market AI analysis platform ($29-$99/mo)

---

## Cost Basis (From COST_ANALYSIS.md)

### Per-User Costs

| Usage Level | Gemini Cost/Day | Gemini Cost/Month |
|-------------|-----------------|-------------------|
| Light (2 analyses) | $0.003 | $0.09 |
| Medium (5 analyses) | $0.006 | $0.18 |
| Heavy (10 analyses) | $0.011 | $0.33 |
| Power User (MAX) | $0.18 | $5.40 |

### Infrastructure (Fixed)

| Service | Monthly Cost |
|---------|--------------|
| Neon PostgreSQL | $25 |
| Railway Hosting | $20 |
| Upstash Redis | $10 |
| Vercel Frontend | $20 |
| **TOTAL** | **$75/month** |

### Break-Even Per User

```
At 100 users:  $75/100 + $1.00 = $1.75/user/month
At 500 users:  $75/500 + $1.00 = $1.15/user/month
At 1000 users: $75/1000 + $1.00 = $1.08/user/month
```

---

## Subscription Tiers

### Tier Structure

| Tier | Price/Month | Price/Year | Savings |
|------|-------------|------------|---------|
| **Free** | $0 | $0 | - |
| **Starter** | $29 | $290 | 17% |
| **Pro** | $59 | $590 | 17% |
| **Elite** | $99 | $990 | 17% |

### Credit Allocations

| Tier | Daily Credits | Monthly Credits | Cost Coverage |
|------|---------------|-----------------|---------------|
| **Free** | 10 | 300 | 1 analysis/day |
| **Starter** | 100 | 3,000 | 4 analyses/day |
| **Pro** | 250 | 7,500 | 10 analyses/day |
| **Elite** | 500 | 15,000 | 20 analyses/day |

### Feature Matrix

| Feature | Free | Starter | Pro | Elite |
|---------|------|---------|-----|-------|
| **Capital Flow L1-L2** | ✅ | ✅ | ✅ | ✅ |
| **Capital Flow L3** | ❌ | ✅ | ✅ | ✅ |
| **Capital Flow L4 (AI Recs)** | ❌ | ✅ | ✅ | ✅ |
| **7-Step Analysis** | 1/day | 4/day | 10/day | 20/day |
| **MLIS Pro Analysis** | ❌ | ✅ | ✅ | ✅ |
| **AI Expert Q&A** | ❌ | 10/mo | 50/mo | Unlimited |
| **AI Concierge** | ❌ | ✅ | ✅ | ✅ |
| **Email Reports** | ❌ | 10/mo | 50/mo | Unlimited |
| **PDF Reports** | ❌ | 10/mo | 50/mo | Unlimited |
| **Scheduled Reports** | ❌ | 3 | 10 | Unlimited |
| **Price Alerts** | 3 | 10 | 50 | Unlimited |
| **API Access** | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Early Features** | ❌ | ❌ | ❌ | ✅ |

---

## Credit Costs

### Service Credit Consumption

| Service | Credits | Notes |
|---------|---------|-------|
| 7-Step Analysis | 25 | Per analysis |
| MLIS Pro Analysis | 25 | Per analysis |
| Capital Flow L3 | 0 | Included in subscription |
| Capital Flow L4 | 0 | Included in subscription |
| AI Expert Question | 5 | After 3 free/analysis |
| Email Report | 5 | After 2 free/analysis |
| PDF Report | 5 | After 2 free/analysis |
| Price Alert | 1 | Per alert |

### Credit Purchase (Add-on)

| Package | Credits | Price | Per Credit |
|---------|---------|-------|------------|
| Micro | 100 | $9 | $0.09 |
| Small | 300 | $24 | $0.08 |
| Medium | 750 | $52 | $0.07 |
| Large | 2,000 | $120 | $0.06 |

---

## Profit Analysis

### Per-Tier Margins

| Tier | Price | Est. Gemini Cost | Infra Share | Profit | Margin |
|------|-------|------------------|-------------|--------|--------|
| Free | $0 | $0.09 | $0.08 | -$0.17 | N/A |
| Starter | $29 | $0.18 | $0.08 | $28.74 | 99.1% |
| Pro | $59 | $0.33 | $0.08 | $58.59 | 99.3% |
| Elite | $99 | $0.55 | $0.08 | $98.37 | 99.4% |

> **Note:** Margins are extremely high because Gemini Flash is very cheap.

### Revenue Projections

| Users | Free | Starter | Pro | Elite | Monthly Revenue |
|-------|------|---------|-----|-------|-----------------|
| 100 | 70 | 20 | 8 | 2 | $1,250 |
| 500 | 350 | 100 | 40 | 10 | $6,250 |
| 1000 | 700 | 200 | 80 | 20 | $12,500 |
| 5000 | 3500 | 1000 | 400 | 100 | $62,500 |

---

## Stripe Configuration

### Products

```javascript
// Stripe Products
const PRODUCTS = {
  STARTER: {
    name: 'TraderPath Starter',
    description: 'Perfect for casual traders. 100 credits/day.',
    metadata: { tier: 'starter', credits_daily: 100 }
  },
  PRO: {
    name: 'TraderPath Pro',
    description: 'For active traders. 250 credits/day + priority support.',
    metadata: { tier: 'pro', credits_daily: 250 }
  },
  ELITE: {
    name: 'TraderPath Elite',
    description: 'For professional traders. 500 credits/day + API access.',
    metadata: { tier: 'elite', credits_daily: 500 }
  }
};
```

### Prices

```javascript
// Stripe Prices (in cents)
const PRICES = {
  STARTER_MONTHLY: {
    product: 'STARTER',
    unit_amount: 2900, // $29
    currency: 'usd',
    recurring: { interval: 'month' }
  },
  STARTER_YEARLY: {
    product: 'STARTER',
    unit_amount: 29000, // $290
    currency: 'usd',
    recurring: { interval: 'year' }
  },
  PRO_MONTHLY: {
    product: 'PRO',
    unit_amount: 5900, // $59
    currency: 'usd',
    recurring: { interval: 'month' }
  },
  PRO_YEARLY: {
    product: 'PRO',
    unit_amount: 59000, // $590
    currency: 'usd',
    recurring: { interval: 'year' }
  },
  ELITE_MONTHLY: {
    product: 'ELITE',
    unit_amount: 9900, // $99
    currency: 'usd',
    recurring: { interval: 'month' }
  },
  ELITE_YEARLY: {
    product: 'ELITE',
    unit_amount: 99000, // $990
    currency: 'usd',
    recurring: { interval: 'year' }
  }
};
```

### Credit Packages (One-time)

```javascript
const CREDIT_PACKAGES = {
  MICRO: { credits: 100, price: 900 },   // $9
  SMALL: { credits: 300, price: 2400 },  // $24
  MEDIUM: { credits: 750, price: 5200 }, // $52
  LARGE: { credits: 2000, price: 12000 } // $120
};
```

---

## Database Schema

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  tier VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Tier Configuration

```typescript
const TIER_CONFIG = {
  free: {
    dailyCredits: 10,
    capitalFlowL3: false,
    capitalFlowL4: false,
    mlisProAccess: false,
    maxScheduledReports: 0,
    maxAlerts: 3,
    aiExpertQuestions: 0,
    apiAccess: false,
  },
  starter: {
    dailyCredits: 100,
    capitalFlowL3: true,
    capitalFlowL4: true,
    mlisProAccess: true,
    maxScheduledReports: 3,
    maxAlerts: 10,
    aiExpertQuestions: 10,
    apiAccess: false,
  },
  pro: {
    dailyCredits: 250,
    capitalFlowL3: true,
    capitalFlowL4: true,
    mlisProAccess: true,
    maxScheduledReports: 10,
    maxAlerts: 50,
    aiExpertQuestions: 50,
    apiAccess: false,
    prioritySupport: true,
  },
  elite: {
    dailyCredits: 500,
    capitalFlowL3: true,
    capitalFlowL4: true,
    mlisProAccess: true,
    maxScheduledReports: -1, // Unlimited
    maxAlerts: -1,
    aiExpertQuestions: -1,
    apiAccess: true,
    prioritySupport: true,
    earlyFeatures: true,
  },
};
```

---

## Migration Strategy

### From Daily Pass to Subscription

Current system has:
- Capital Flow L3: 25 credits/day
- Capital Flow L4: 25 credits/day
- Asset Analysis: 100 credits/day (max 10)

New system:
- Subscription tiers with included features
- No daily passes needed
- Credit pool for analysis

### Transition Plan

1. **Week 1:** Create Stripe products/prices
2. **Week 2:** Implement subscription webhook handlers
3. **Week 3:** Update frontend pricing page
4. **Week 4:** Add credit guards based on tier
5. **Week 5:** Deprecate daily passes
6. **Week 6:** Launch new pricing

---

## API Endpoints

```
GET    /api/subscriptions/plans          - List available plans
GET    /api/subscriptions/status         - Current user's subscription
POST   /api/subscriptions/checkout       - Create Stripe checkout session
POST   /api/subscriptions/portal         - Create billing portal session
POST   /api/subscriptions/webhook        - Stripe webhook handler
POST   /api/subscriptions/cancel         - Cancel subscription
POST   /api/credits/purchase             - One-time credit purchase
```

---

## Approval Checklist

- [x] Tier pricing approved ($29/$59/$99)
- [x] Credit allocations approved (100/250/500 daily)
- [x] Feature matrix approved
- [x] Credit package pricing approved
- [x] Stripe products created (test mode)
- [x] Database schema approved
- [x] Ready for Phase 3 implementation

---

## Phase 3 Implementation Status

### Completed (2026-02-03)

1. ✅ Database schema - `Subscription` model added to Prisma
2. ✅ Stripe service extended for subscriptions
3. ✅ Subscription management service created
4. ✅ API routes implemented:
   - `GET /api/subscriptions/plans` - List plans
   - `GET /api/subscriptions/status` - User subscription status
   - `POST /api/subscriptions/checkout` - Create checkout session
   - `POST /api/subscriptions/portal` - Billing portal
   - `POST /api/subscriptions/cancel` - Cancel subscription
   - `POST /api/subscriptions/resume` - Resume canceled subscription
   - `POST /api/subscriptions/webhook` - Stripe webhook handler
5. ✅ Daily credit allocation cron job (00:00 UTC)
6. ✅ Webhook handlers for all subscription events

### Phase 4 Implementation Status

### Completed (2026-02-03)

1. ✅ Updated pricing page with subscription tiers
   - Added `SubscriptionTiers` component with monthly/yearly toggle
   - Shows 17% savings badge for yearly billing
   - Credit packages moved to "Add-on Credits" section
2. ✅ Subscription checkout flow implemented
   - `useSubscription` hook for state management
   - Stripe checkout session creation
   - Redirect to Stripe Checkout
3. ✅ Billing settings page completed
   - Shows current subscription tier with color-coded badge
   - Daily credits display
   - Manage Billing button (Stripe portal)
   - Cancel/Resume subscription buttons
   - Renewal date and "Cancels Soon" warning
4. ✅ Tier-based feature display
   - `SubscriptionTiers` component shows all features per tier
   - Current plan highlighted
   - Upgrade prompts for free users

**Frontend Files Created/Updated:**
- `apps/web/hooks/useSubscription.ts` - Subscription state management hook
- `apps/web/components/pricing/SubscriptionTiers.tsx` - Tier cards component
- `apps/web/app/(marketing)/pricing/page.tsx` - Public pricing page
- `apps/web/app/(dashboard)/settings/page.tsx` - Billing settings section

### Phase 5 Implementation Status

### Completed (2026-02-03)

1. ✅ Feature gate hook created (`useFeatureGate`)
   - Checks subscription tier for feature access
   - Returns `hasAccess()`, `meetsMinimumTier()`, `getRemainingLimit()`
   - Supports upgrade prompt state management
2. ✅ UpgradePrompt component created
   - Modal and inline (card) variants
   - Feature-specific messaging and benefits
   - Tier-specific colors and styling
   - Redirect to pricing page
3. ✅ Capital Flow feature gates
   - Layer 3 (Sector Activity) - requires Starter+
   - Layer 4 (AI Recommendations) - requires Starter+
   - Shows UpgradeCard when locked
4. ✅ AI Concierge feature gate
   - Requires Starter+ subscription
   - Full-page upgrade prompt for free users

**Frontend Files Created/Updated:**
- `apps/web/hooks/useFeatureGate.ts` - Feature gate hook
- `apps/web/components/modals/UpgradePrompt.tsx` - Upgrade UI components
- `apps/web/app/(dashboard)/capital-flow/page.tsx` - L3/L4 feature gates
- `apps/web/app/(dashboard)/concierge/page.tsx` - Concierge feature gate

---

## Implementation Complete

All 5 phases of the billing system have been implemented:

1. ✅ **Phase 1 - Cost Analysis**: Gemini API costs analyzed
2. ✅ **Phase 2 - Pricing Model**: $29/$59/$99 tier structure approved
3. ✅ **Phase 3 - Stripe Integration**: Backend subscription handling
4. ✅ **Phase 4 - Frontend Integration**: Pricing page and billing settings
5. ✅ **Phase 5 - Free Tier**: Feature gates and upgrade prompts
