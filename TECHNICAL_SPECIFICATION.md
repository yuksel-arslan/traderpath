# TraderPath - Technical Specification Document

## Version 1.1.0 | January 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Design](#4-database-design)
5. [API Specification](#5-api-specification)
6. [Credit & Rewards System](#6-credit--rewards-system)
7. [7-Step Analysis Engine](#7-7-step-analysis-engine)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Security](#9-security)
10. [Deployment](#10-deployment)
11. [Performance Requirements](#11-performance-requirements)

**Appendices**
- [Appendix A: Error Codes](#appendix-a-error-codes)
- [Appendix B: Supported Symbols](#appendix-b-supported-symbols-mvp)
- [Appendix C: Implementation Notes](#appendix-c-important-implementation-notes)
- [Appendix D: Changelog](#appendix-d-changelog)

---

## 1. Project Overview

### 1.1 Vision
TraderPath is a gamified cryptocurrency trading analysis platform that guides users through a 7-step decision funnel, from macro market analysis to actionable trade plans.

### 1.2 Core Value Proposition
- **7-Step Decision Funnel**: Structured analysis from "What's happening in the market?" to "Should I trade?"
- **Credit-Based Monetization**: Pay-as-you-go model with gamified rewards
- **Manipulation Detection**: Advanced whale tracking and market manipulation alerts
- **AI-Powered Insights**: TFT model predictions with confidence scores

### 1.3 Target Users
- Active cryptocurrency traders (daily/weekly trading)
- Swing traders looking for optimal entry points
- Risk-conscious traders who want manipulation alerts

### 1.4 Key Metrics (KPIs)
- Daily Active Users (DAU)
- Credit Purchase Rate (CPR)
- Average Revenue Per User (ARPU)
- 7-Day Retention Rate
- Streak Completion Rate

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │   Web    │  │  Mobile  │  │ Telegram │  │  Discord │               │
│  │  (Next)  │  │  (RN)    │  │   Bot    │  │   Bot    │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │             │                       │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Fastify)                            │
│                              Port: 3000                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Rate Limiting │ Auth Middleware │ Request Logging │ CORS       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   ANALYSIS    │  │    CREDIT     │  │     USER      │
│   SERVICE     │  │   SERVICE     │  │   SERVICE     │
│  Port: 3001   │  │  Port: 3002   │  │  Port: 3003   │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  PostgreSQL  │  │    Redis     │  │  TimescaleDB │                  │
│  │   (Neon)     │  │  (Upstash)   │  │  (optional)  │                  │
│  │              │  │              │  │              │                  │
│  │  - Users     │  │  - Sessions  │  │  - OHLCV     │                  │
│  │  - Credits   │  │  - Cache     │  │  - OrderBook │                  │
│  │  - Rewards   │  │  - Queues    │  │  - Trades    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Binance    │  │   CoinGecko  │  │   OpenAI/    │                  │
│  │  WebSocket   │  │     API      │  │   Gemini     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Communication

| From | To | Protocol | Purpose |
|------|-----|----------|---------|
| Client | API Gateway | HTTPS/WSS | All client requests |
| API Gateway | Services | HTTP | Internal routing |
| Services | Redis | TCP | Caching, queues |
| Services | PostgreSQL | TCP | Data persistence |
| Analysis Service | Binance | WebSocket | Real-time market data |

### 2.3 Microservices Overview

| Service | Port | Responsibility |
|---------|------|----------------|
| API Gateway | 3000 | Routing, auth, rate limiting |
| Analysis Service | 3001 | 7-step analysis, ML predictions |
| Credit Service | 3002 | Credits, rewards, achievements |
| User Service | 3003 | Auth, profiles, settings |
| Notification Service | 3004 | Alerts, push notifications |
| Data Service | 3005 | Market data ingestion |

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Styling |
| Shadcn/ui | latest | UI components |
| TanStack Query | 5.x | Data fetching & caching |
| Zustand | 4.x | State management |
| Framer Motion | 10.x | Animations |
| Recharts | 2.x | Charts and visualizations |

### 3.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| TypeScript | 5.x | Type safety |
| Fastify | 4.x | HTTP framework |
| Prisma | 5.x | ORM |
| BullMQ | 4.x | Job queues |
| Socket.io | 4.x | WebSocket |
| Zod | 3.x | Validation |

### 3.3 Database & Cache

| Technology | Purpose |
|------------|---------|
| PostgreSQL (Neon) | Primary database |
| Redis (Upstash) | Caching, sessions, queues |
| TimescaleDB | Time-series data (optional) |

### 3.4 Infrastructure

| Technology | Purpose |
|------------|---------|
| Vercel | Frontend hosting |
| Railway/Fly.io | Backend hosting |
| Cloudflare | CDN, DDoS protection |
| GitHub Actions | CI/CD |

### 3.5 External APIs

| API | Purpose |
|-----|---------|
| Binance WebSocket | Real-time market data |
| CoinGecko | Market metadata |
| OpenAI/Gemini | AI summaries |
| Stripe | Payments |

### 3.6 Gemini AI Configuration (Admin Configurable)

All Gemini API calls use the centralized `callGeminiWithRetry()` function from `apps/api/src/core/gemini.ts`.

**Model Types:**
| Type | Usage | Redis Setting |
|------|-------|---------------|
| `default` | Analysis gates, market pulse, AI summaries | `admin:gemini:settings.model` |
| `expert` | AI Expert questions, VOLTRAN | `admin:gemini:settings.expertModel` |
| `concierge` | AI Concierge chat | `admin:gemini:settings.conciergeModel` |

**Available Models:**
- `gemini-2.5-flash` (default, recommended)
- `gemini-2.0-flash`
- `gemini-1.5-flash`
- `gemini-1.5-pro`

**Function Signature:**
```typescript
callGeminiWithRetry(
  options: GeminiRequestOptions,
  maxRetries: number = 3,
  operation: string = 'gemini_request',
  modelType: 'default' | 'expert' | 'concierge' = 'default'
): Promise<GeminiResponse>
```

**Files Using Centralized Function:**
- `apps/api/src/modules/analysis/analysis.engine.ts` - 8 gate calls
- `apps/api/src/modules/analysis/analysis.routes.ts` - getGeminiInsight
- `apps/api/src/modules/expert/expert.service.ts` - Expert questions
- `apps/api/src/modules/concierge/concierge.service.ts` - Concierge chat

**Admin Settings Redis Key:** `admin:gemini:settings`
```json
{
  "model": "gemini-2.5-flash",
  "expertModel": "gemini-2.5-flash",
  "conciergeModel": "gemini-2.5-flash"
}
```

---

## 4. Database Design

### 4.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      users      │       │  credit_balance │       │ credit_packages │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │───────│ user_id (FK)    │       │ id (PK)         │
│ email           │       │ balance         │       │ name            │
│ password_hash   │       │ lifetime_earned │       │ credits         │
│ name            │       │ lifetime_spent  │       │ price_usd       │
│ avatar_url      │       │ updated_at      │       │ bonus_credits   │
│ level           │       └─────────────────┘       │ discount_pct    │
│ xp              │                                 │ is_active       │
│ streak_days     │                                 └─────────────────┘
│ streak_last     │
│ created_at      │       ┌─────────────────┐       ┌─────────────────┐
│ updated_at      │       │credit_transactions      │   achievements  │
└─────────────────┘       ├─────────────────┤       ├─────────────────┤
        │                 │ id (PK)         │       │ id (PK)         │
        │                 │ user_id (FK)    │───────│ code            │
        │                 │ amount          │       │ name            │
        │                 │ type            │       │ description     │
        │                 │ source          │       │ category        │
        │                 │ metadata        │       │ xp_reward       │
        │                 │ created_at      │       │ credit_reward   │
        │                 └─────────────────┘       │ icon            │
        │                                           │ requirement     │
        │                 ┌─────────────────┐       └─────────────────┘
        │                 │ user_achievements│              │
        │                 ├─────────────────┤              │
        └─────────────────│ user_id (FK)    │──────────────┘
                          │ achievement_id  │
                          │ unlocked_at     │
                          │ progress        │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    analyses     │       │   price_alerts  │       │    referrals    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │       │ referrer_id(FK) │
│ symbol          │       │ symbol          │       │ referred_id(FK) │
│ steps_completed │       │ target_price    │       │ status          │
│ result_json     │       │ direction       │       │ credits_earned  │
│ credits_spent   │       │ is_triggered    │       │ created_at      │
│ created_at      │       │ created_at      │       └─────────────────┘
└─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  daily_rewards  │       │   quiz_answers  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │
│ date            │       │ quiz_id (FK)    │
│ login_claimed   │       │ is_correct      │
│ spin_result     │       │ credits_earned  │
│ quiz_completed  │       │ answered_at     │
│ ads_watched     │       └─────────────────┘
└─────────────────┘
```

### 4.2 Core Tables Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    google_id VARCHAR(255),

    -- Gamification
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    streak_last_date DATE,

    -- Settings
    preferred_coins TEXT[] DEFAULT ARRAY['BTC', 'ETH', 'SOL'],
    notification_settings JSONB DEFAULT '{}',

    -- Referral
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Credit Balance Table
CREATE TABLE credit_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 25 NOT NULL,
    daily_free_remaining INTEGER DEFAULT 5,
    daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
    lifetime_earned INTEGER DEFAULT 25,
    lifetime_spent INTEGER DEFAULT 0,
    lifetime_purchased INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Transactions Table
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive = credit, negative = debit
    balance_after INTEGER NOT NULL,

    type VARCHAR(50) NOT NULL, -- 'purchase', 'reward', 'spend', 'refund', 'referral'
    source VARCHAR(100) NOT NULL, -- 'daily_login', 'spin', 'quiz', 'analysis_step_2', etc.

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Packages Table
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    credits INTEGER NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    price_usd DECIMAL(10,2) NOT NULL,
    price_per_credit DECIMAL(10,4) NOT NULL,
    discount_percent INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements Table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'analysis', 'whale', 'trading', 'social', 'education'
    icon VARCHAR(50),

    xp_reward INTEGER DEFAULT 0,
    credit_reward INTEGER DEFAULT 0,

    requirement_type VARCHAR(50) NOT NULL, -- 'count', 'streak', 'percentage'
    requirement_value INTEGER NOT NULL,
    requirement_metadata JSONB DEFAULT '{}',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements Table
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id),

    progress INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, achievement_id)
);

-- Analyses Table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(10) DEFAULT '4h',

    steps_completed INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    -- Results stored as JSONB for flexibility
    step_1_result JSONB, -- Market Pulse
    step_2_result JSONB, -- Asset Scanner
    step_3_result JSONB, -- Safety Check
    step_4_result JSONB, -- Timing
    step_5_result JSONB, -- Trade Plan
    step_6_result JSONB, -- Trap Check
    step_7_result JSONB, -- Final Verdict

    total_score DECIMAL(3,1),
    credits_spent INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Daily Rewards Table
CREATE TABLE daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,

    login_claimed BOOLEAN DEFAULT FALSE,
    login_credits INTEGER DEFAULT 0,

    spin_used BOOLEAN DEFAULT FALSE,
    spin_result INTEGER DEFAULT 0,

    quiz_completed BOOLEAN DEFAULT FALSE,
    quiz_correct BOOLEAN DEFAULT FALSE,
    quiz_credits INTEGER DEFAULT 0,

    ads_watched INTEGER DEFAULT 0,
    ads_credits INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, reward_date)
);

-- Price Alerts Table
CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    target_price DECIMAL(20,8) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'above', 'below'

    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,

    credits_spent INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals Table
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referred_id UUID NOT NULL REFERENCES users(id),

    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'registered', 'first_analysis', 'first_purchase'

    referrer_credits_earned INTEGER DEFAULT 0,
    referred_credits_earned INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(referred_id)
);

-- Quizzes Table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- ['option1', 'option2', 'option3', 'option4']
    correct_index INTEGER NOT NULL,
    explanation TEXT,

    category VARCHAR(50) NOT NULL,
    difficulty INTEGER DEFAULT 1, -- 1-3

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_symbol ON analyses(symbol);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_daily_rewards_user_date ON daily_rewards(user_id, reward_date);
CREATE INDEX idx_price_alerts_user_active ON price_alerts(user_id, is_active);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
```

---

## 5. API Specification

### 5.1 Authentication Endpoints

```yaml
# POST /api/auth/register
Request:
  email: string (required)
  password: string (min 8 chars)
  name: string (required)
  referral_code?: string

Response:
  success: boolean
  user: UserObject
  token: string
  credits: number

# POST /api/auth/login
Request:
  email: string
  password: string

Response:
  success: boolean
  user: UserObject
  token: string

# POST /api/auth/google
Request:
  id_token: string

Response:
  success: boolean
  user: UserObject
  token: string

# GET /api/auth/me
Headers:
  Authorization: Bearer <token>

Response:
  user: UserObject
  credits: CreditBalance
  stats: UserStats
```

### 5.2 Analysis Endpoints

```yaml
# GET /api/analysis/market-pulse
# Step 1: Market Pulse (FREE)
Response:
  btc_dominance: number
  total_market_cap: number
  fear_greed_index: number
  market_regime: 'risk-on' | 'risk-off' | 'neutral'
  trend: 'bullish' | 'bearish' | 'sideways'
  macro_events: Event[]
  summary: string

# POST /api/analysis/asset-scan
# Step 2: Asset Scanner (2 credits)
Request:
  symbol: string
  interval?: string

Response:
  symbol: string
  multi_timeframe: TimeframeAnalysis[]
  forecast: {
    prediction: number
    confidence: number
    scenarios: Scenario[]
  }
  key_levels: {
    resistance: number[]
    support: number[]
    poc: number
  }
  score: number

# POST /api/analysis/safety-check
# Step 3: Safety Check (5 credits)
Request:
  symbol: string
  analysis_id: string

Response:
  manipulation: {
    spoofing: boolean
    layering: boolean
    iceberg: { detected: boolean, price?: number }
    wash_trading: boolean
  }
  whale_activity: {
    buys: WhaleTransaction[]
    sells: WhaleTransaction[]
    net_flow: number
    bias: 'accumulation' | 'distribution' | 'neutral'
  }
  exchange_flows: ExchangeFlow[]
  risk_level: 'low' | 'medium' | 'high'
  warnings: string[]

# POST /api/analysis/timing
# Step 4: Timing (3 credits)
Request:
  symbol: string
  analysis_id: string

Response:
  trade_now: boolean
  reason: string
  entry_conditions: Condition[]
  optimal_zones: EntryZone[]
  estimated_wait: string
  score: number

# POST /api/analysis/trade-plan
# Step 5: Trade Plan (5 credits)
Request:
  symbol: string
  analysis_id: string
  account_size?: number

Response:
  direction: 'long' | 'short'
  entries: Entry[]
  stop_loss: { price: number, percentage: number }
  take_profits: TakeProfit[]
  risk_reward: number
  position_size: number
  risk_amount: number
  score: number

# POST /api/analysis/trap-check
# Step 6: Trap Check (5 credits)
Request:
  symbol: string
  analysis_id: string

Response:
  traps: {
    bull_trap: boolean
    bear_trap: boolean
    liquidity_grab: { detected: boolean, zones: number[] }
    stop_hunt_zones: number[]
    fakeout_risk: 'low' | 'medium' | 'high'
  }
  liquidation_heatmap: LiquidationLevel[]
  counter_strategy: string[]
  risk_level: 'low' | 'medium' | 'high'

# GET /api/analysis/verdict/:analysis_id
# Step 7: Final Verdict (FREE with previous steps)
Response:
  overall_score: number
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid'
  component_scores: ComponentScore[]
  confidence_factors: Factor[]
  recommendation: string
  created_at: string

# POST /api/analysis/full
# Full Analysis Bundle (15 credits)
Request:
  symbol: string
  interval?: string
  account_size?: number

Response:
  analysis_id: string
  steps: {
    market_pulse: Step1Result
    asset_scan: Step2Result
    safety_check: Step3Result
    timing: Step4Result
    trade_plan: Step5Result
    trap_check: Step6Result
    verdict: Step7Result
  }
  credits_spent: 15
```

### 5.3 Credit Endpoints

```yaml
# GET /api/credits/balance
Response:
  balance: number
  daily_free_remaining: number
  daily_reset_at: string
  level_bonus: number

# GET /api/credits/packages
Response:
  packages: CreditPackage[]

# POST /api/credits/purchase
Request:
  package_id: string
  payment_method: 'stripe' | 'crypto'

Response:
  success: boolean
  credits_added: number
  bonus_credits: number
  new_balance: number
  transaction_id: string

# GET /api/credits/history
Query:
  page?: number
  limit?: number
  type?: string

Response:
  transactions: CreditTransaction[]
  total: number
  page: number
  pages: number

# POST /api/credits/charge (internal)
Request:
  user_id: string
  amount: number
  source: string
  metadata?: object

Response:
  success: boolean
  charged: number
  new_balance: number
```

### 5.4 Rewards Endpoints

```yaml
# GET /api/rewards/daily
Response:
  login: { claimed: boolean, credits: number }
  spin: { used: boolean, result?: number }
  quiz: { completed: boolean, question?: Quiz }
  ads: { watched: number, max: number, credits_per_ad: number }
  streak: { days: number, next_bonus: number }

# POST /api/rewards/claim-login
Response:
  success: boolean
  credits: number
  streak_days: number
  streak_bonus?: number

# POST /api/rewards/spin
Response:
  success: boolean
  result: number
  is_jackpot: boolean
  new_balance: number

# POST /api/rewards/quiz
Request:
  answer_index: number

Response:
  correct: boolean
  credits: number
  explanation: string
  streak_bonus?: number

# POST /api/rewards/watch-ad
Response:
  success: boolean
  credits: number
  ads_remaining: number

# GET /api/rewards/achievements
Response:
  achievements: Achievement[]
  unlocked: UserAchievement[]
  in_progress: AchievementProgress[]

# POST /api/rewards/referral
Request:
  referral_code: string

Response:
  success: boolean
  referrer_name: string
  bonus_credits: number
```

### 5.5 User Endpoints

```yaml
# GET /api/user/profile
Response:
  user: UserProfile
  stats: {
    total_analyses: number
    successful_signals: number
    achievements_count: number
    referrals_count: number
  }
  level: {
    current: number
    xp: number
    xp_for_next: number
    benefits: string[]
  }

# PATCH /api/user/profile
Request:
  name?: string
  avatar_url?: string
  preferred_coins?: string[]
  notification_settings?: object

Response:
  success: boolean
  user: UserProfile

# GET /api/user/referral-code
Response:
  code: string
  url: string
  stats: {
    total_referrals: number
    pending: number
    completed: number
    credits_earned: number
  }
  tier: {
    name: string
    bonus_percent: number
    next_tier?: string
    referrals_needed?: number
  }
```

---

## 6. Credit & Rewards System

### 6.1 Credit Costs

| Action | Credits | Description |
|--------|---------|-------------|
| Step 1: Market Pulse | FREE | Always free |
| Step 2: Asset Scanner | 2 | Basic forecast |
| Step 3: Safety Check | 5 | Manipulation detection |
| Step 4: Timing | 3 | Entry zone calculation |
| Step 5: Trade Plan | 5 | Full plan with SL/TP |
| Step 6: Trap Check | 5 | Liquidation analysis |
| Step 7: Final Verdict | FREE | With previous steps |
| Quick Check Bundle | 5 | Steps 2 + 7 |
| Smart Entry Bundle | 12 | Steps 2-4 + 7 (20% off) |
| Full Analysis Bundle | 15 | All steps (25% off) |
| Price Alert (1) | 1 | Single alert |
| AI Chat Question | 2 | One Q&A |
| PDF Report | 8 | Detailed report |
| Watchlist Slot | 3 | +1 coin tracking |

### 6.2 Credit Earning

| Source | Credits | Frequency |
|--------|---------|-----------|
| Daily Login | 3 | Daily |
| Daily Spin | 1-10 | Daily |
| Watch Ad | 2 | 3x daily |
| Daily Quiz (correct) | 5 | Daily |
| 7-Day Streak Bonus | 20 | Weekly |
| 30-Day Streak Bonus | 100 | Monthly |
| Referral Signup | 20 | Per referral |
| Referral First Analysis | 10 | Per referral |
| Referral First Purchase | 10% | Per purchase |
| Achievement Unlock | 10-500 | One-time |
| Level Up | 10 | Per level |

### 6.3 Credit Packages

| Package | Credits | Bonus | Price | Per Credit |
|---------|---------|-------|-------|------------|
| Starter | 50 | - | $7.99 | $0.16 |
| Trader | 150 | +15 | $19.99 | $0.12 |
| Pro | 400 | +60 | $44.99 | $0.10 |
| Whale | 1000 | +200 | $89.99 | $0.08 |

### 6.4 Level System

| Level | XP Required | Daily Bonus | Discount | Other Benefits |
|-------|-------------|-------------|----------|----------------|
| 1 | 0 | 0 | 0% | - |
| 5 | 500 | +1 credit | 0% | - |
| 10 | 1,500 | +2 credits | 0% | +1 alert slot |
| 15 | 3,500 | +2 credits | 10% | - |
| 20 | 6,000 | +3 credits | 10% | +2 alert slots |
| 25 | 10,000 | +3 credits | 15% | - |
| 30 | 15,000 | +5 credits | 15% | Priority queue |
| 40 | 25,000 | +5 credits | 20% | - |
| 50 | 40,000 | +10 credits | 20% | VIP badge |
| 100 | 100,000 | +10 credits | 25% | Hall of Fame |

### 6.5 XP Sources

| Action | XP |
|--------|-----|
| Analysis | +10 |
| Full Analysis | +30 |
| Daily Login | +5 |
| Quiz Correct | +15 |
| Achievement | +50 |
| Referral | +25 |
| Daily Streak | +10 × days |

---

## 7. 7-Step Analysis Engine

### 7.1 Step Details

#### Step 1: Market Pulse (FREE)
```typescript
interface MarketPulse {
  // BTC Dominance
  btc_dominance: number;
  btc_dominance_trend: 'rising' | 'falling' | 'stable';

  // Total Market Cap
  total_market_cap: number;
  market_cap_24h_change: number;

  // Fear & Greed
  fear_greed_index: number;
  fear_greed_label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';

  // Market Regime
  market_regime: 'risk_on' | 'risk_off' | 'neutral';

  // Trend Analysis
  trend: {
    direction: 'bullish' | 'bearish' | 'sideways';
    strength: number; // 0-100
    timeframes_aligned: number; // out of 4
  };

  // Macro Events
  macro_events: {
    name: string;
    date: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }[];

  // AI Summary
  summary: string;

  // Verdict
  verdict: 'suitable' | 'caution' | 'avoid';
}
```

#### Step 2: Asset Scanner (2 credits)
```typescript
interface AssetScan {
  symbol: string;
  current_price: number;

  // Multi-timeframe Analysis
  timeframes: {
    tf: '1M' | '1W' | '1D' | '4H' | '1H';
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  }[];

  // TFT Forecast
  forecast: {
    price_24h: number;
    price_7d: number;
    confidence: number;
    scenarios: {
      name: 'bull' | 'base' | 'bear';
      price: number;
      probability: number;
    }[];
  };

  // Key Levels
  levels: {
    resistance: number[];
    support: number[];
    poc: number; // Point of Control
  };

  // Technical Indicators
  indicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    moving_averages: { ma20: number; ma50: number; ma200: number };
  };

  score: number; // 0-10
}
```

#### Step 3: Safety Check (5 credits)
```typescript
interface SafetyCheck {
  // Manipulation Detection
  manipulation: {
    spoofing_detected: boolean;
    spoofing_details?: string;

    layering_detected: boolean;
    layering_details?: string;

    iceberg_detected: boolean;
    iceberg_price?: number;
    iceberg_side?: 'buy' | 'sell';

    wash_trading: boolean;
    pump_dump_risk: 'low' | 'medium' | 'high';
  };

  // Whale Activity
  whale_activity: {
    large_buys: {
      amount_usd: number;
      price: number;
      time: string;
    }[];
    large_sells: {
      amount_usd: number;
      price: number;
      time: string;
    }[];
    net_flow_usd: number;
    bias: 'accumulation' | 'distribution' | 'neutral';
  };

  // Exchange Flows
  exchange_flows: {
    exchange: string;
    inflow: number;
    outflow: number;
    net: number;
    interpretation: string;
  }[];

  // Smart Money
  smart_money: {
    positioning: 'long' | 'short' | 'neutral';
    confidence: number;
  };

  // Risk Assessment
  risk_level: 'low' | 'medium' | 'high';
  warnings: string[];

  score: number; // 0-10
}
```

#### Step 4: Timing (3 credits)
```typescript
interface TimingAnalysis {
  // Current Status
  trade_now: boolean;
  reason: string;

  // Entry Conditions
  conditions: {
    name: string;
    met: boolean;
    details: string;
  }[];

  // Optimal Entry Zones
  entry_zones: {
    price_low: number;
    price_high: number;
    probability: number;
    eta: string;
    quality: number; // 1-5 stars
  }[];

  // Wait Recommendation
  wait_for?: {
    event: string;
    estimated_time: string;
  };

  score: number; // 0-10
}
```

#### Step 5: Trade Plan (5 credits)
```typescript
interface TradePlan {
  // Direction
  direction: 'long' | 'short';
  type: 'limit' | 'market';

  // Entries (Scaling)
  entries: {
    price: number;
    percentage: number; // of total position
    type: 'limit' | 'stop_limit';
  }[];
  average_entry: number;

  // Stop Loss
  stop_loss: {
    price: number;
    percentage: number;
    reason: string;
  };

  // Take Profits
  take_profits: {
    price: number;
    percentage: number; // of position to close
    reason: string;
  }[];

  // Risk Management
  risk_reward: number;
  win_rate_estimate: number;
  position_size_percent: number;
  risk_amount?: number; // if account size provided

  // Trailing Stop
  trailing_stop?: {
    activate_after: string;
    trail_percent: number;
  };

  score: number; // 0-10
}
```

#### Step 6: Trap Check (5 credits)
```typescript
interface TrapCheck {
  // Trap Detection
  traps: {
    bull_trap: boolean;
    bull_trap_zone?: number;

    bear_trap: boolean;
    bear_trap_zone?: number;

    liquidity_grab: {
      detected: boolean;
      zones: number[];
    };

    stop_hunt_zones: number[];

    fakeout_risk: 'low' | 'medium' | 'high';
  };

  // Liquidation Heatmap
  liquidation_levels: {
    price: number;
    amount_usd: number;
    type: 'longs' | 'shorts';
  }[];

  // Counter Strategy
  counter_strategy: string[];

  // Pro Tip
  pro_tip: string;

  risk_level: 'low' | 'medium' | 'high';
  score: number; // 0-10
}
```

#### Step 7: Final Verdict (FREE)
```typescript
interface FinalVerdict {
  // Overall Score
  overall_score: number; // 0-10

  // Verdict
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';

  // Component Scores
  component_scores: {
    step: string;
    score: number;
    weight: number;
  }[];

  // Confidence Factors
  confidence_factors: {
    factor: string;
    positive: boolean;
    impact: 'high' | 'medium' | 'low';
  }[];

  // Final Recommendation
  recommendation: string;

  // Metadata
  analysis_id: string;
  created_at: string;
  expires_at: string;
}
```

### 7.2 Scoring Weights

| Step | Weight | Impact on Final Score |
|------|--------|----------------------|
| Market Pulse | 15% | General market condition |
| Asset Scanner | 20% | Asset-specific outlook |
| Safety Check | 20% | Risk from manipulation |
| Timing | 15% | Entry quality |
| Trade Plan | 15% | Plan quality |
| Trap Check | 15% | Hidden risks |

### 7.3 Analysis Flow

```
User Request (symbol)
       │
       ▼
┌──────────────────┐
│  Check Credits   │
│  (enough for     │
│   requested      │
│   steps?)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Fetch Market    │────▶│  Cache Check     │
│  Data            │     │  (Redis 5min)    │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Run Analysis    │
│  Pipeline        │
│  (parallel where │
│   possible)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Step 1 │ │Step 2 │ ... (requested steps)
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌──────────────────┐
│  Aggregate       │
│  Results         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Calculate       │
│  Final Score     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate AI     │
│  Summary         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Deduct Credits  │
│  & Save          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Return Results  │
└──────────────────┘
```

### 7.4 Trade Type Configuration Matrix

TraderPath supports three distinct trade types, each with optimized timeframes, indicators, and analysis parameters.

#### Summary Matrix

| Trade Type | Timeframes | Candles | Hold Period | Risk | Credit Cost | Key Indicators |
|------------|------------|---------|-------------|------|-------------|----------------|
| **Scalping** | 1m, 5m, 15m | 10-100 | 1-15 min | High | 3 | RSI(7), STOCH_RSI, ATR(7), VWAP, SUPERTREND(7,2), ORDER_FLOW, SQUEEZE |
| **Day Trade** | 15m, 1h, 4h | 12-96 | 1-8 hours | Medium | 2 | RSI(14), MACD, ICHIMOKU, ADX, STOCHASTIC, BOLLINGER, OBV |
| **Swing** | 4h, 1d, 1w | 7-90 | 2-14 days | Low | 1 | ICHIMOKU, EMA(50/200), RSI(14), MACD, AD, WHALE_ACTIVITY, TSI |

#### Step → Indicator Category Mapping

| Step | Primary Indicators | Focus Area |
|------|-------------------|------------|
| **Step 1: Market Pulse** | ADX, ICHIMOKU, EMA, BOLLINGER | Market direction and volatility state |
| **Step 2: Asset Scan** | VWAP, OBV, CMF, AD, LIQUIDITY_SCORE | Asset health and accumulation patterns |
| **Step 3: Safety Check** | SPOOFING, ORDER_FLOW, WHALE_ACTIVITY, SQUEEZE | Risk detection and manipulation warning |
| **Step 4: Timing** | RSI, STOCHASTIC, STOCH_RSI, MACD, SUPERTREND | Optimal entry/exit timing |
| **Step 5: Trade Plan** | ATR, PSAR, KELTNER, DONCHIAN | SL/TP calculation and position sizing |
| **Step 6: Trap Check** | OBV, RSI, MACD, FORCE_INDEX, AD | Volume/price divergence and trap detection |
| **Step 7: Verdict** | ADX, RSI, ATR (subset) | Final confidence score and recommendation |

#### Detailed Configuration: SCALPING (1-15 minutes)

| Step | Timeframes (candles) | Indicators |
|------|---------------------|------------|
| 1. Market Pulse | 1m(60), 5m(30), 15m(20) | ATR(14), BOLLINGER(20,2), RELATIVE_VOLUME, EMA(9), EMA(21) |
| 2. Asset Scan | 1m(100), 5m(50) | VWAP, LIQUIDITY_SCORE, BID_ASK_SPREAD, VOLUME_SPIKE, SLIPPAGE_ESTIMATE |
| 3. Safety Check | 1m(60), 5m(30) | SPOOFING_DETECTION, ORDER_FLOW_IMBALANCE, SQUEEZE, WHALE_ACTIVITY, CMF |
| 4. Timing | 1m(60), 5m(20) | RSI(7), STOCH_RSI(14,3,3), MACD(12,26,9), SUPERTREND(7,2), KELTNER |
| 5. Trade Plan | 1m(30), 5m(15) | ATR(7), PSAR, BOLLINGER, VWAP |
| 6. Trap Check | 1m(30), 5m(15) | OBV, ORDER_FLOW_IMBALANCE, MFI(14), FORCE_INDEX |
| 7. Verdict | 1m(10) | ADX(14), RSI(7), ATR(7) |

#### Detailed Configuration: DAY TRADE (1-8 hours)

| Step | Timeframes (candles) | Indicators |
|------|---------------------|------------|
| 1. Market Pulse | 15m(96), 1h(48), 4h(30) | ICHIMOKU, ADX(14), EMA(20/50/200), BOLLINGER |
| 2. Asset Scan | 1h(72), 4h(42) | VWAP, OBV, LIQUIDITY_SCORE, AROON(25), CMF, PVT |
| 3. Safety Check | 15m(48), 1h(24), 4h(12) | HISTORICAL_VOLATILITY, ATR, WHALE_ACTIVITY, MFI, SQUEEZE, MARKET_IMPACT |
| 4. Timing | 15m(48), 1h(24) | RSI(14), STOCHASTIC(14,3,3), MACD, SUPERTREND(10,3), CCI, WILLIAMS_R |
| 5. Trade Plan | 15m(24), 1h(12) | ATR(14), PSAR, KELTNER, DONCHIAN, VWAP |
| 6. Trap Check | 15m(24), 1h(12) | OBV, RSI(14), MACD, AD, ORDER_FLOW_IMBALANCE |
| 7. Verdict | 15m(12), 1h(6) | ADX(14), RSI(14), ATR(14), SUPERTREND |

#### Detailed Configuration: SWING (2-14 days)

| Step | Timeframes (candles) | Indicators |
|------|---------------------|------------|
| 1. Market Pulse | 4h(90), 1d(60), 1w(20) | ICHIMOKU, ADX(14), EMA(50/200), SMA(50/200), BOLLINGER |
| 2. Asset Scan | 1d(90), 1w(26) | OBV, AD, CMF, PVT, AROON(25), WHALE_ACTIVITY, VWMA |
| 3. Safety Check | 4h(42), 1d(30), 1w(12) | HISTORICAL_VOLATILITY, ATR, BOLLINGER, LIQUIDITY_SCORE, MFI, MARKET_IMPACT |
| 4. Timing | 4h(60), 1d(30) | RSI(14), STOCHASTIC, STOCH_RSI, MACD, SUPERTREND, TSI, ULTIMATE |
| 5. Trade Plan | 4h(30), 1d(14) | ATR(14), PSAR, DONCHIAN, ICHIMOKU, KELTNER |
| 6. Trap Check | 4h(30), 1d(14) | OBV, RSI(14), MACD, AD, ROC, FORCE_INDEX |
| 7. Verdict | 4h(12), 1d(7) | ADX(14), ICHIMOKU, RSI(14), ATR(14) |

#### Indicator Categories

**40+ Technical Indicators organized by category:**

| Category | Indicators |
|----------|-----------|
| **Trend** | EMA, SMA, MACD, ADX, SUPERTREND, ICHIMOKU, PSAR, AROON, VWMA |
| **Momentum** | RSI, STOCHASTIC, STOCH_RSI, CCI, WILLIAMS_R, ROC, MFI, ULTIMATE, TSI |
| **Volatility** | BOLLINGER, ATR, KELTNER, DONCHIAN, HISTORICAL_VOLATILITY, SQUEEZE |
| **Volume** | OBV, VWAP, AD, CMF, FORCE_INDEX, EOM, PVT, RELATIVE_VOLUME, VOLUME_SPIKE |
| **Advanced** | ORDER_FLOW_IMBALANCE, BID_ASK_SPREAD, DEPTH_RATIO, SLIPPAGE_ESTIMATE, MARKET_IMPACT, LIQUIDITY_SCORE, SPOOFING_DETECTION, WHALE_ACTIVITY |

---

## 8. Frontend Architecture

### 8.1 Page Structure

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (marketing)/
│   ├── page.tsx (landing)
│   ├── pricing/
│   └── about/
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx (dashboard home)
│   ├── analyze/
│   │   ├── page.tsx (coin selector)
│   │   └── [symbol]/
│   │       └── page.tsx (7-step analysis)
│   ├── credits/
│   │   ├── page.tsx (balance & packages)
│   │   └── history/
│   ├── rewards/
│   │   ├── page.tsx (daily rewards)
│   │   ├── achievements/
│   │   └── referrals/
│   ├── alerts/
│   ├── history/
│   └── settings/
└── api/
    └── [...] (API routes if needed)
```

### 8.2 Component Library

```
components/
├── ui/ (shadcn components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...
├── analysis/
│   ├── StepCard.tsx
│   ├── MarketPulse.tsx
│   ├── AssetScanner.tsx
│   ├── SafetyCheck.tsx
│   ├── TimingAnalysis.tsx
│   ├── TradePlan.tsx
│   ├── TrapCheck.tsx
│   ├── FinalVerdict.tsx
│   ├── AnalysisFlow.tsx
│   └── ScoreGauge.tsx
├── credits/
│   ├── CreditBalance.tsx
│   ├── CreditPackageCard.tsx
│   ├── CreditHistory.tsx
│   └── BuyCreditsModal.tsx
├── rewards/
│   ├── DailyRewards.tsx
│   ├── SpinWheel.tsx
│   ├── QuizCard.tsx
│   ├── StreakDisplay.tsx
│   ├── AchievementCard.tsx
│   └── LevelProgress.tsx
├── common/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── CoinSelector.tsx
│   ├── PriceDisplay.tsx
│   └── LoadingSpinner.tsx
└── charts/
    ├── PriceChart.tsx
    ├── LiquidationHeatmap.tsx
    └── WhaleFlowChart.tsx
```

### 8.3 State Management

```typescript
// stores/useUserStore.ts
interface UserState {
  user: User | null;
  credits: CreditBalance | null;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshCredits: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

// stores/useAnalysisStore.ts
interface AnalysisState {
  currentAnalysis: Analysis | null;
  completedSteps: number[];
  isLoading: Record<number, boolean>;

  // Actions
  startAnalysis: (symbol: string) => Promise<void>;
  runStep: (step: number) => Promise<void>;
  runFullAnalysis: () => Promise<void>;
  clearAnalysis: () => void;
}

// stores/useRewardsStore.ts
interface RewardsState {
  dailyStatus: DailyRewards | null;
  achievements: Achievement[];
  userAchievements: UserAchievement[];

  // Actions
  claimLogin: () => Promise<void>;
  spin: () => Promise<number>;
  answerQuiz: (answer: number) => Promise<boolean>;
  watchAd: () => Promise<void>;
}
```

---

## 9. Security

### 9.1 Authentication

- JWT tokens with 7-day expiry
- Refresh tokens with 30-day expiry
- HTTP-only cookies for web
- Rate limiting on auth endpoints (5 attempts/minute)

### 9.2 API Security

- All endpoints require authentication (except public ones)
- Request validation with Zod
- SQL injection prevention with Prisma
- XSS prevention with proper encoding
- CORS whitelist for allowed origins

### 9.3 Payment Security

- Stripe for card payments (PCI compliant)
- Webhook signature verification
- Idempotency keys for transactions
- Transaction logging

### 9.4 Data Protection

- Passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted at rest
- HTTPS only
- Regular security audits

---

## 10. Deployment

### 10.1 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost |
| Staging | Pre-production testing | staging.traderpath.io |
| Production | Live application | app.traderpath.io |

### 10.2 CI/CD Pipeline

```yaml
# GitHub Actions
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        # Deploy steps

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        # Deploy steps
```

### 10.3 Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE                               │
│                   (CDN + DDoS + WAF)                         │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│      VERCEL         │         │    RAILWAY/FLY      │
│    (Frontend)       │         │    (Backend)        │
│                     │         │                     │
│  - Next.js SSR      │         │  - API Gateway      │
│  - Edge Functions   │         │  - Microservices    │
│  - Auto-scaling     │         │  - Auto-scaling     │
└─────────────────────┘         └─────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │      NEON       │   │    UPSTASH      │   │    STRIPE       │
          │   (PostgreSQL)  │   │    (Redis)      │   │   (Payments)    │
          └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 11. Performance Requirements

### 11.1 Response Times

| Endpoint | Target | Max |
|----------|--------|-----|
| Auth endpoints | 200ms | 500ms |
| Market Pulse (cached) | 50ms | 100ms |
| Analysis steps | 1s | 3s |
| Full analysis | 5s | 10s |
| Credit operations | 100ms | 300ms |

### 11.2 Throughput

| Metric | Target |
|--------|--------|
| Concurrent users | 10,000 |
| Requests per second | 5,000 |
| WebSocket connections | 50,000 |

### 11.3 Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Recovery time | < 5 minutes |
| Data backup | Every 6 hours |

### 11.4 Caching Strategy

| Data | Cache Duration | Location |
|------|----------------|----------|
| Market Pulse | 5 minutes | Redis |
| Asset data | 1 minute | Redis |
| User session | 24 hours | Redis |
| Static assets | 1 year | CDN |

---

## Appendix A: Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| AUTH_001 | Invalid credentials | 401 |
| AUTH_002 | Token expired | 401 |
| AUTH_003 | Account not verified | 403 |
| CREDIT_001 | Insufficient credits | 402 |
| CREDIT_002 | Package not found | 404 |
| CREDIT_003 | Payment failed | 402 |
| ANALYSIS_001 | Symbol not supported | 400 |
| ANALYSIS_002 | Analysis expired | 410 |
| ANALYSIS_003 | Step not unlocked | 403 |
| REWARD_001 | Already claimed today | 409 |
| REWARD_002 | Quiz already answered | 409 |
| RATE_001 | Rate limit exceeded | 429 |

---

## Appendix B: Supported Symbols (MVP)

| Symbol | Name |
|--------|------|
| BTC | Bitcoin |
| ETH | Ethereum |
| SOL | Solana |
| BNB | Binance Coin |
| XRP | Ripple |
| ADA | Cardano |
| DOGE | Dogecoin |
| AVAX | Avalanche |
| DOT | Polkadot |
| MATIC | Polygon |

---

*Document Version: 1.1.0*
*Last Updated: January 2026*
*Author: TraderPath Team*

---

## Appendix C: Important Implementation Notes

### C.1 Prisma & Database

| Issue | Solution | File Reference |
|-------|----------|----------------|
| Prisma Decimal serialization fails | Always use `Number()` to convert before JSON response | `analysis.routes.ts` |
| Analysis vs Report confusion | Analysis table = user analyses (totalScore, outcome). Report table = generated reports. Never mix! | All analysis endpoints |

### C.2 Data Architecture Rules

```
┌─────────────────────┐     ┌─────────────────────┐
│   Analysis Table    │     │    Report Table     │
├─────────────────────┤     ├─────────────────────┤
│ - User's analyses   │────▶│ - Generated from    │
│ - totalScore        │     │   analyses          │
│ - outcome           │     │ - PDF reports       │
│ - step results      │     │ - Export data       │
│                     │     │                     │
│ Statistics API:     │     │ Report API:         │
│ GET /statistics ────┤     │ GET /reports ───────┤
└─────────────────────┘     └─────────────────────┘
```

**Rule**: Analysis statistics (avgScore, win rate, total count) → ALWAYS from `analysis` table

### C.3 Brand Colors

| Name | Hex Codes | Usage |
|------|-----------|-------|
| Teal (Logo) | `#5EEDC3`, `#2DD4A8`, `#14B8A6` | Primary brand, positive actions |
| Coral (Logo) | `#EF5A6F`, `#F87171`, `#FF8A9B` | Accent, alerts, animations |
| Trading Gradient | Red → Amber → Green | Score indicators |

### C.4 Animation Classes

| Class | Purpose | Colors |
|-------|---------|--------|
| `gradient-text-animate` | Trading colors animation | Red/Amber/Green |
| `gradient-text-logo-animate` | Logo colors animation | Teal/Coral |
| `gradient-text-brand` | Brand gradient | Teal to Coral |

---

## Appendix D: Changelog

### 2026-01-17
- Added Statistics API using analysis table (not reports)
- Fixed Prisma Decimal serialization issue
- Added CountUp animation component for landing page stats
- Implemented logo color animation class (`gradient-text-logo-animate`)
- Admin badge logic for user profiles
- Dashboard number formatting (formatNumber, formatCredits)

### 2024-12 (Initial)
- Initial technical specification document
- Core architecture design
- 7-step analysis engine specification
- Credit & rewards system design
