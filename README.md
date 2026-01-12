# TraderPath

> From Confusion to Conviction in 7 Steps

A gamified cryptocurrency trading analysis platform that guides users through a 7-step decision funnel with AI-powered insights and manipulation detection.

## Features

- **7-Step Analysis Funnel**: Market Pulse → Asset Scanner → Safety Check → Timing → Trade Plan → Trap Check → Final Verdict
- **Credit-Based System**: Pay-as-you-go with gamified rewards
- **Manipulation Detection**: Spoofing, layering, and whale tracking
- **AI Predictions**: TFT model with confidence scores
- **Daily Rewards**: Login bonuses, spin wheel, quizzes, streaks
- **Achievement System**: XP, levels, and badges

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + Shadcn/ui
- TanStack Query
- Zustand
- Framer Motion

### Backend
- Node.js + Fastify
- TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- Redis (Upstash)
- BullMQ

## Project Structure

```
traderpath/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── analysis-engine/  # Core analysis logic
│   └── ui/           # Shared UI components
└── infrastructure/   # Terraform, K8s, Docker
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or Neon account)
- Redis instance (or Upstash account)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/traderpath.git
cd traderpath
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Set up the database:
```bash
npm run db:push
```

5. Start development servers:
```bash
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start all services in dev mode
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run test         # Run tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `BINANCE_API_KEY` - Binance API key for market data
- `STRIPE_SECRET_KEY` - Stripe secret key for payments

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Analysis
- `GET /api/analysis/market-pulse` - Step 1 (FREE)
- `POST /api/analysis/asset-scan` - Step 2 (2 credits)
- `POST /api/analysis/safety-check` - Step 3 (5 credits)
- `POST /api/analysis/timing` - Step 4 (3 credits)
- `POST /api/analysis/trade-plan` - Step 5 (5 credits)
- `POST /api/analysis/trap-check` - Step 6 (5 credits)
- `GET /api/analysis/verdict/:id` - Step 7 (FREE)
- `POST /api/analysis/full` - All steps (15 credits)

### Credits
- `GET /api/credits/balance` - Get balance
- `GET /api/credits/packages` - Get packages
- `POST /api/credits/purchase` - Buy credits
- `GET /api/credits/history` - Transaction history

### Rewards
- `GET /api/rewards/daily` - Daily rewards status
- `POST /api/rewards/claim-login` - Claim login reward
- `POST /api/rewards/spin` - Spin the wheel
- `POST /api/rewards/quiz` - Answer quiz
- `GET /api/rewards/achievements` - Get achievements

## Credit Costs

| Action | Credits |
|--------|---------|
| Market Pulse | FREE |
| Asset Scanner | 2 |
| Safety Check | 5 |
| Timing | 3 |
| Trade Plan | 5 |
| Trap Check | 5 |
| Final Verdict | FREE |
| Full Analysis | 15 |
| Price Alert | 1 |
| AI Chat Question | 2 |

## Deployment

### Vercel (Frontend)
```bash
vercel --prod
```

### Railway (Backend)
```bash
railway up
```

## Documentation

- [Technical Specification](./TECHNICAL_SPECIFICATION.md)
- [API Documentation](./docs/api.md)
- [Database Schema](./apps/api/prisma/schema.prisma)

## License

Proprietary - All Rights Reserved

---

Built with love by the TraderPath Team
