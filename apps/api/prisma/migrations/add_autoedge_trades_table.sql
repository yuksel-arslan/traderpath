-- AutoEdge Trades Table
-- Tracks automated trades executed on Binance Futures Testnet

CREATE TABLE IF NOT EXISTS auto_edge_trades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id         VARCHAR(50) NOT NULL,
  symbol            VARCHAR(20) NOT NULL,
  binance_symbol    VARCHAR(30) NOT NULL,
  direction         VARCHAR(10) NOT NULL,  -- long, short
  status            VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, tp1_hit, tp2_hit, sl_hit, closed_manual, error

  -- Entry
  entry_order_id    BIGINT NOT NULL,
  entry_price       DECIMAL(20, 8) NOT NULL,
  quantity          DECIMAL(20, 8) NOT NULL,

  -- SL/TP Order IDs from Binance
  sl_order_id       BIGINT,
  tp1_order_id      BIGINT,
  tp2_order_id      BIGINT,

  -- Planned Levels (from signal)
  planned_entry     DECIMAL(20, 8) NOT NULL,
  planned_sl        DECIMAL(20, 8) NOT NULL,
  planned_tp1       DECIMAL(20, 8) NOT NULL,
  planned_tp2       DECIMAL(20, 8) NOT NULL,

  -- Trade Settings
  leverage          INT NOT NULL DEFAULT 5,
  position_size_usdt DECIMAL(20, 8),

  -- TP1 Partial Close Tracking
  tp1_hit           BOOLEAN DEFAULT FALSE,
  tp1_hit_at        TIMESTAMPTZ,

  -- Outcome
  exit_price        DECIMAL(20, 8),
  pnl_usdt          DECIMAL(20, 8),
  pnl_percent       DECIMAL(10, 4),
  closed_at         TIMESTAMPTZ,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_autoedge_trades_status ON auto_edge_trades (status);
CREATE INDEX IF NOT EXISTS idx_autoedge_trades_symbol ON auto_edge_trades (symbol);
CREATE INDEX IF NOT EXISTS idx_autoedge_trades_signal_id ON auto_edge_trades (signal_id);
CREATE INDEX IF NOT EXISTS idx_autoedge_trades_created_at ON auto_edge_trades (created_at);
