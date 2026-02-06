/**
 * RAG API Routes
 *
 * POST /api/rag/enrich        - Full RAG enrichment for an analysis
 * GET  /api/rag/forecast/:sym - Forecast bands only (cached, free)
 * GET  /api/rag/validate      - Validate a plan
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ragOrchestrator } from './rag-orchestrator.service';
import { forecastBandService } from './forecast/forecast-band.service';
import { planValidationService } from './validation/plan-validation.service';
import { detectAssetClass } from '../analysis/services/asset-specific/asset-analyzer-orchestrator';
import { authenticate } from '../../core/auth/middleware';

export async function ragRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────────
  // POST /api/rag/enrich
  // Full RAG enrichment. Typically called after analysis completes.
  // ─────────────────────────────────────────────────────────────────
  const enrichSchema = z.object({
    symbol: z.string().toUpperCase(),
    mode: z.enum(['fast', 'news', 'deep']).default('fast'),
    // Engine data (simplified input for standalone calls)
    currentPrice: z.number().positive(),
    atr: z.number().positive(),
    direction: z.enum(['long', 'short', 'neutral']),
    confidence: z.number().min(0).max(100),
    supports: z.array(z.number()).default([]),
    resistances: z.array(z.number()).default([]),
    rsi: z.number().optional(),
    adx: z.number().optional(),
    bbWidth: z.number().optional(),
    // Capital flow context
    capitalFlowPhase: z.enum(['early', 'mid', 'late', 'exit']).optional(),
    capitalFlowBias: z.enum(['risk_on', 'risk_off', 'neutral']).optional(),
  });

  app.post('/enrich', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = enrichSchema.parse(request.body);
      const assetClass = detectAssetClass(body.symbol);

      const result = await ragOrchestrator.enrichAnalysis(
        body.symbol,
        assetClass,
        {
          currentPrice: body.currentPrice,
          atr: body.atr,
          direction: body.direction,
          confidence: body.confidence,
          supports: body.supports,
          resistances: body.resistances,
          rsi: body.rsi,
          adx: body.adx,
          bbWidth: body.bbWidth,
        },
        body.capitalFlowPhase && body.capitalFlowBias ? {
          phase: body.capitalFlowPhase,
          bias: body.capitalFlowBias,
          direction: null,
        } : undefined,
        body.mode,
      );

      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RAG enrichment failed';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/rag/forecast/:symbol
  // Returns cached forecast bands (free, ATR-based only)
  // ─────────────────────────────────────────────────────────────────
  app.get('/forecast/:symbol', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
    try {
      const symbol = request.params.symbol.toUpperCase();
      const assetClass = detectAssetClass(symbol);

      // Minimal data needed for forecast
      const querySchema = z.object({
        currentPrice: z.coerce.number().positive(),
        atr: z.coerce.number().positive(),
        direction: z.enum(['long', 'short', 'neutral']).default('neutral'),
        confidence: z.coerce.number().min(0).max(100).default(50),
      });

      const query = querySchema.parse(request.query);

      const result = await forecastBandService.generateBands(
        symbol,
        assetClass,
        {
          currentPrice: query.currentPrice,
          atr: query.atr,
          direction: query.direction,
          confidence: query.confidence,
        },
        false, // No AI enhancement for free endpoint
      );

      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forecast generation failed';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/rag/validate
  // Validate a trade plan (free utility endpoint)
  // ─────────────────────────────────────────────────────────────────
  const validateSchema = z.object({
    direction: z.enum(['long', 'short']),
    entry: z.number().positive(),
    stopLoss: z.number().positive(),
    takeProfits: z.array(z.number().positive()),
    symbol: z.string().toUpperCase(),
    currentPrice: z.number().positive(),
    atr: z.number().positive(),
  });

  app.post('/validate', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = validateSchema.parse(request.body);
      const assetClass = detectAssetClass(body.symbol);

      const result = planValidationService.validate(
        {
          planId: 'user-plan',
          planType: 'engine',
          direction: body.direction,
          entry: body.entry,
          stopLoss: body.stopLoss,
          takeProfits: body.takeProfits,
        },
        {
          symbol: body.symbol,
          assetClass,
          currentPrice: body.currentPrice,
          atr: body.atr,
          volume24h: 0,
          marketRegime: '',
          capitalFlowPhase: null,
          capitalFlowBias: null,
          capitalFlowDirection: null,
          economicCalendar: { shouldBlockTrade: false },
        },
      );

      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
