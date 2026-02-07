/**
 * Morning Briefing API Routes
 */

import type { FastifyInstance } from 'fastify';
import { morningBriefingService } from './morning-briefing.service';
import { triggerManualBriefing } from './morning-briefing-cron.job';

export async function morningBriefingRoutes(app: FastifyInstance) {
  /**
   * GET /api/morning-briefing
   * Get today's morning briefing (cached)
   */
  app.get('/morning-briefing', async (request, reply) => {
    try {
      const briefing = await morningBriefingService.getTodaysBriefing();

      return reply.send({
        success: true,
        data: briefing,
      });
    } catch (error: any) {
      console.error('[MorningBriefing] API error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch morning briefing',
      });
    }
  });

  /**
   * GET /api/morning-briefing/latest
   * Get cached briefing without regeneration
   */
  app.get('/morning-briefing/latest', async (request, reply) => {
    try {
      const briefing = await morningBriefingService.getCachedBriefing();

      if (!briefing) {
        return reply.status(404).send({
          success: false,
          error: 'No briefing available',
        });
      }

      return reply.send({
        success: true,
        data: briefing,
      });
    } catch (error: any) {
      console.error('[MorningBriefing] API error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch cached briefing',
      });
    }
  });

  /**
   * POST /api/morning-briefing/generate
   * Manually trigger briefing generation (admin only)
   */
  app.post('/morning-briefing/generate', async (request, reply) => {
    try {
      // Check if user is admin
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      // Generate new briefing
      const briefing = await morningBriefingService.generateBriefing();

      return reply.send({
        success: true,
        data: briefing,
        message: 'Briefing generated successfully',
      });
    } catch (error: any) {
      console.error('[MorningBriefing] Generation error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate briefing',
      });
    }
  });

  /**
   * POST /api/morning-briefing/trigger
   * Manually trigger the full briefing job (admin only)
   */
  app.post('/morning-briefing/trigger', async (request, reply) => {
    try {
      // Check if user is admin
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      // Trigger the full job (generation + delivery)
      triggerManualBriefing();

      return reply.send({
        success: true,
        message: 'Briefing job triggered. Check logs for delivery status.',
      });
    } catch (error: any) {
      console.error('[MorningBriefing] Trigger error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to trigger briefing job',
      });
    }
  });

  /**
   * GET /api/morning-briefing/preferences
   * Get user's briefing preferences
   */
  app.get('/morning-briefing/preferences', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
        });
      }

      const preferences = await morningBriefingService.getUserPreferences(user.id);

      return reply.send({
        success: true,
        data: preferences,
      });
    } catch (error: any) {
      console.error('[MorningBriefing] Preferences error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch preferences',
      });
    }
  });
}
