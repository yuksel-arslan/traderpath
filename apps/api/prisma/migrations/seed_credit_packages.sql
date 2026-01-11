-- Seed default credit packages
-- Run this after add_unique_credit_package_name.sql

INSERT INTO "credit_packages" (id, name, credits, bonus_credits, price_usd, price_per_credit, discount_percent, is_popular, is_active, created_at)
VALUES
  (uuid_generate_v4(), 'Starter Pack', 50, 0, 7.99, 0.1598, 0, false, true, NOW()),
  (uuid_generate_v4(), 'Trader Pack', 150, 15, 19.99, 0.1211, 0, true, true, NOW()),
  (uuid_generate_v4(), 'Pro Pack', 400, 60, 44.99, 0.0978, 0, false, true, NOW()),
  (uuid_generate_v4(), 'Whale Pack', 1000, 200, 89.99, 0.0750, 0, false, true, NOW())
ON CONFLICT (name) DO UPDATE SET
  credits = EXCLUDED.credits,
  bonus_credits = EXCLUDED.bonus_credits,
  price_usd = EXCLUDED.price_usd,
  price_per_credit = EXCLUDED.price_per_credit,
  discount_percent = EXCLUDED.discount_percent,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active;
