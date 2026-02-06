/**
 * Unified Analysis Pipeline Routes
 * ==================================
 * Endpoints:
 *   POST /api/unified-analysis/start   → Start pipeline, returns sessionId
 *   GET  /api/unified-analysis/progress/:sessionId → SSE stream of progress
 *   GET  /api/unified-analysis/report/:sessionId   → Get completed report
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  startPipeline,
  getProgress,
  getReport,
  addProgressListener,
  removeProgressListener,
} from './unified-pipeline.service';
import { PIPELINE_STEPS } from './types';

export async function unifiedAnalysisRoutes(app: FastifyInstance) {
  // ========================================================================
  // POST /start - Start a new unified analysis pipeline
  // ========================================================================
  app.post('/start', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { symbol } = request.body as { symbol?: string };

    if (!symbol || typeof symbol !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'Symbol is required',
      });
    }

    const cleanSymbol = symbol.trim().toUpperCase().replace(/USDT$|BUSD$|USDC$/, '');

    if (!cleanSymbol || cleanSymbol.length > 20) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid symbol',
      });
    }

    try {
      const sessionId = startPipeline(cleanSymbol);

      return reply.send({
        success: true,
        data: {
          sessionId,
          symbol: cleanSymbol,
          steps: PIPELINE_STEPS.map(s => ({ id: s.id, label: s.label })),
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to start analysis',
      });
    }
  });

  // ========================================================================
  // GET /progress/:sessionId - SSE stream of pipeline progress
  // ========================================================================
  app.get('/progress/:sessionId', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };

    // Check if session exists
    const progress = getProgress(sessionId);
    if (!progress) {
      return reply.status(404).send({
        success: false,
        error: 'Session not found',
      });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send current state immediately
    reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);

    // If already completed, close
    if (progress.status === 'completed' || progress.status === 'failed') {
      reply.raw.end();
      return;
    }

    // Listen for updates
    const listener = (updatedProgress: any) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(updatedProgress)}\n\n`);

        // Close stream when done
        if (updatedProgress.status === 'completed' || updatedProgress.status === 'failed') {
          setTimeout(() => {
            try { reply.raw.end(); } catch { /* ignore */ }
          }, 500);
        }
      } catch {
        // Connection closed
        removeProgressListener(sessionId, listener);
      }
    };

    addProgressListener(sessionId, listener);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      removeProgressListener(sessionId, listener);
    });

    // Keep-alive ping every 15 seconds
    const pingInterval = setInterval(() => {
      try {
        reply.raw.write(': ping\n\n');
      } catch {
        clearInterval(pingInterval);
      }
    }, 15000);

    request.raw.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  // ========================================================================
  // GET /status/:sessionId - Get current progress (non-SSE, polling fallback)
  // ========================================================================
  app.get('/status/:sessionId', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };

    const progress = getProgress(sessionId);
    if (!progress) {
      return reply.status(404).send({
        success: false,
        error: 'Session not found',
      });
    }

    return reply.send({
      success: true,
      data: progress,
    });
  });

  // ========================================================================
  // GET /report/:sessionId - Get the completed report
  // ========================================================================
  app.get('/report/:sessionId', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };

    // Check progress first
    const progress = getProgress(sessionId);

    if (progress && progress.status === 'running') {
      return reply.status(202).send({
        success: false,
        error: 'Analysis still in progress',
        data: { progress },
      });
    }

    if (progress && progress.status === 'failed') {
      return reply.status(500).send({
        success: false,
        error: progress.error || 'Analysis failed',
      });
    }

    // Try to get report from cache
    const report = await getReport(sessionId);
    if (!report) {
      return reply.status(404).send({
        success: false,
        error: 'Report not found or expired',
      });
    }

    return reply.send({
      success: true,
      data: report,
    });
  });

  // ========================================================================
  // GET /steps - Get pipeline step definitions
  // ========================================================================
  app.get('/steps', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: PIPELINE_STEPS,
    });
  });
}

export default unifiedAnalysisRoutes;
