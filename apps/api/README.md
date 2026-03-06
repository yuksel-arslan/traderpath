# TraderPath API

Fastify backend for TraderPath trading analysis platform.

## Production Setup

### Signals & AutoEdge Migration

AutoEdge ve signal sistemi için bu SQL'i production Neon DB'ye uygulamanız gerekiyor:

```bash
psql $DATABASE_URL -f apps/api/prisma/migrations/apply_signals_production.sql
```

Bu migration yapılmadan AutoEdge sinyal üretmez (sessizce atlar, crash olmaz).
