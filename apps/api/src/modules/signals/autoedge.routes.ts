/**
 * AutoEdge Trade Management Routes
 *
 * Admin-only endpoints for monitoring and managing AutoEdge trades
 * on Binance Futures Testnet.
 */

import type { FastifyInstance } from 'fastify';
import {
  getOpenTrades,
  getAllTrades,
  getTradeStats,
  emergencyCloseAll,
  monitorOpenTrades,
} from './autoedge-executor.service';
import { isTestnetConfigured, getUsdtBalance, getPositions } from './binance-testnet.client';
import { generateAutoEdgeSignal } from './signal-generator.job';

export async function autoedgeRoutes(app: FastifyInstance): Promise<void> {
  // ─── Status ──────────────────────────────────────────────────
  app.get('/status', async (_req, reply) => {
    try {
      const configured = isTestnetConfigured();
      let balance = null;
      let positions = null;

      if (configured) {
        try {
          balance = await getUsdtBalance();
          const allPositions = await getPositions();
          positions = allPositions.filter(p => parseFloat(p.positionAmt) !== 0);
        } catch (err) {
          console.error('[AutoEdge-Routes] Status fetch error:', err);
        }
      }

      const stats = await getTradeStats();

      return reply.send({
        success: true,
        data: {
          configured,
          balance,
          openPositions: positions?.length || 0,
          positions,
          stats,
        },
      });
    } catch (err) {
      console.error('[AutoEdge-Routes] Status error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ─── Open Trades ──────────────────────────────────────────────
  app.get('/trades', async (req, reply) => {
    try {
      const { status, limit } = req.query as { status?: string; limit?: string };

      let trades;
      if (status === 'open') {
        trades = await getOpenTrades();
      } else {
        trades = await getAllTrades(parseInt(limit || '50'));
      }

      return reply.send({
        success: true,
        data: trades,
      });
    } catch (err) {
      console.error('[AutoEdge-Routes] Trades error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ─── Trade Stats ──────────────────────────────────────────────
  app.get('/stats', async (_req, reply) => {
    try {
      const stats = await getTradeStats();
      return reply.send({ success: true, data: stats });
    } catch (err) {
      console.error('[AutoEdge-Routes] Stats error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ─── Manual Trigger ───────────────────────────────────────────
  app.post('/trigger', async (_req, reply) => {
    try {
      const result = await generateAutoEdgeSignal();
      return reply.send({ success: true, data: result });
    } catch (err) {
      console.error('[AutoEdge-Routes] Trigger error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ─── Force Monitor Check ────────────────────────────────────
  app.post('/monitor', async (_req, reply) => {
    try {
      const result = await monitorOpenTrades();
      return reply.send({ success: true, data: result });
    } catch (err) {
      console.error('[AutoEdge-Routes] Monitor error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ─── Emergency Close All ────────────────────────────────────
  app.post('/emergency-close', async (_req, reply) => {
    try {
      console.log('[AutoEdge-Routes] ⚠️ Emergency close all triggered');
      const result = await emergencyCloseAll();
      return reply.send({ success: true, data: result });
    } catch (err) {
      console.error('[AutoEdge-Routes] Emergency close error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ─── Binance Testnet Balance ─────────────────────────────────
  app.get('/balance', async (_req, reply) => {
    try {
      if (!isTestnetConfigured()) {
        return reply.status(400).send({
          success: false,
          error: 'Binance Testnet not configured. Set BINANCE_TESTNET_API_KEY and BINANCE_TESTNET_API_SECRET.',
        });
      }
      const balance = await getUsdtBalance();
      return reply.send({ success: true, data: balance });
    } catch (err) {
      console.error('[AutoEdge-Routes] Balance error:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
}
