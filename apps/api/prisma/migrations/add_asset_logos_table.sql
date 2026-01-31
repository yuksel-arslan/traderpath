-- Asset Logos Cache Table
-- Stores logo URLs and colors for all assets (crypto, stocks, metals, bonds)

CREATE TABLE IF NOT EXISTS "asset_logos" (
  "id" VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  "crypto_logos" JSONB NOT NULL DEFAULT '{}',
  "stock_logos" JSONB NOT NULL DEFAULT '{}',
  "metal_logos" JSONB NOT NULL DEFAULT '{}',
  "bond_logos" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default record if not exists
INSERT INTO "asset_logos" ("id", "crypto_logos", "stock_logos", "metal_logos", "bond_logos", "version")
VALUES ('default', '{}', '{}', '{}', '{}', 1)
ON CONFLICT ("id") DO NOTHING;
