/**
 * BILGE Guardian System - API Routes (Fastify)
 *
 * Admin endpoints for BILGE Dashboard
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getErrors,
  getPatterns,
  getHealthStatus,
  generateWeeklyReport,
  submitFeedback,
  getFeedbacks,
  updateFeedbackStatus,
  getInnovationIdeas,
  generateInnovationIdea,
  resolveError,
  collectError,
} from './bilge.service';
import { FeedbackCategory, FeedbackStatus, IdeaStatus, ErrorSeverity, ErrorCategory } from './types';

// Middleware type
interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * BILGE Routes Plugin
 */
export async function bilgeRoutes(app: FastifyInstance): Promise<void> {
  // ============================================
  // HEALTH & DASHBOARD (Admin only)
  // ============================================

  /**
   * GET /api/bilge/health
   * Get guardian health status
   */
  app.get(
    '/api/bilge/health',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const project = (request.query as any)['project'] || 'traderpath';
        const health = await getHealthStatus(project);

        return { success: true, data: health };
      } catch (error: any) {
        console.error('[BILGE] Health check error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get health status',
        });
      }
    }
  );

  /**
   * GET /api/bilge/dashboard
   * Get dashboard summary data
   */
  app.get(
    '/api/bilge/dashboard',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const project = (request.query as any)['project'] || 'traderpath';

        const [health, errors, patterns, feedbacks, ideas] = await Promise.all([
          getHealthStatus(project),
          getErrors(project, { limit: 10 }),
          getPatterns(),
          getFeedbacks(project, { limit: 5, status: 'new' }),
          getInnovationIdeas(project, { limit: 5, status: 'proposed' }),
        ]);

        return {
          success: true,
          data: {
            health,
            recentErrors: errors,
            patterns,
            pendingFeedback: feedbacks,
            proposedIdeas: ideas,
          },
        };
      } catch (error: any) {
        console.error('[BILGE] Dashboard error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get dashboard data',
        });
      }
    }
  );

  // ============================================
  // ERRORS
  // ============================================

  /**
   * GET /api/bilge/errors
   * Get error list
   */
  app.get(
    '/api/bilge/errors',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const query = request.query as any;
        const project = query['project'] || 'traderpath';
        const limit = parseInt(query['limit']) || 50;
        const severity = query['severity'] as ErrorSeverity | undefined;
        const category = query['category'] as ErrorCategory | undefined;
        const status = query['status'] as string | undefined;

        const errors = await getErrors(project, {
          limit,
          severity,
          category,
          status,
        });

        return {
          success: true,
          data: errors,
          total: errors.length,
        };
      } catch (error: any) {
        console.error('[BILGE] Get errors error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get errors',
        });
      }
    }
  );

  /**
   * POST /api/bilge/errors/:id/resolve
   * Resolve an error
   */
  app.post(
    '/api/bilge/errors/:id/resolve',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const params = request.params as any;
        const query = request.query as any;
        const body = request.body as any;

        const project = query['project'] || 'traderpath';
        const errorId = params['id'];
        const { resolution } = body;

        if (!resolution) {
          return reply.status(400).send({
            success: false,
            error: 'Resolution is required',
          });
        }

        const error = await resolveError(
          project,
          errorId,
          request.user?.email || 'admin',
          resolution
        );

        if (!error) {
          return reply.status(404).send({
            success: false,
            error: 'Error not found',
          });
        }

        return { success: true, data: error };
      } catch (error: any) {
        console.error('[BILGE] Resolve error error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to resolve error',
        });
      }
    }
  );

  /**
   * POST /api/bilge/errors/report
   * Report an error manually (internal use)
   */
  app.post(
    '/api/bilge/errors/report',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const { message, stack, code, endpoint, method, userId, requestId, project } = body;

        if (!message) {
          return reply.status(400).send({
            success: false,
            error: 'Message is required',
          });
        }

        const error = await collectError({
          message,
          stack,
          code,
          endpoint,
          method,
          userId,
          requestId,
          project: project || 'traderpath',
        });

        return { success: true, data: { id: error.id } };
      } catch (error: any) {
        console.error('[BILGE] Report error error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to report error',
        });
      }
    }
  );

  // ============================================
  // PATTERNS
  // ============================================

  /**
   * GET /api/bilge/patterns
   * Get all patterns
   */
  app.get(
    '/api/bilge/patterns',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const patterns = await getPatterns();
        return { success: true, data: patterns };
      } catch (error: any) {
        console.error('[BILGE] Get patterns error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get patterns',
        });
      }
    }
  );

  // ============================================
  // WEEKLY REPORTS
  // ============================================

  /**
   * GET /api/bilge/reports/weekly
   * Get/generate weekly report
   */
  app.get(
    '/api/bilge/reports/weekly',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const project = (request.query as any)['project'] || 'traderpath';
        const report = await generateWeeklyReport(project);

        return { success: true, data: report };
      } catch (error: any) {
        console.error('[BILGE] Weekly report error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to generate weekly report',
        });
      }
    }
  );

  // ============================================
  // USER FEEDBACK
  // ============================================

  /**
   * POST /api/bilge/feedback
   * Submit user feedback (authenticated users)
   */
  app.post(
    '/api/bilge/feedback',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        if (!user) {
          return reply.status(401).send({ success: false, error: 'Authentication required' });
        }

        const body = request.body as any;
        const { category, message, attachments } = body;

        if (!category || !message) {
          return reply.status(400).send({
            success: false,
            error: 'Category and message are required',
          });
        }

        const validCategories: FeedbackCategory[] = [
          'bug_report',
          'feature_request',
          'ux_feedback',
          'documentation',
          'general',
          'praise',
        ];

        if (!validCategories.includes(category)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid category',
          });
        }

        const feedback = await submitFeedback({
          project: 'traderpath',
          userId: user.id,
          userEmail: user.email,
          userTier: user.isAdmin ? 'Admin' : 'User',
          category,
          message,
          attachments,
        });

        return {
          success: true,
          data: feedback,
          message: 'Thank you for your feedback!',
        };
      } catch (error: any) {
        console.error('[BILGE] Submit feedback error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to submit feedback',
        });
      }
    }
  );

  /**
   * GET /api/bilge/feedback
   * Get feedback list (admin)
   */
  app.get(
    '/api/bilge/feedback',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const query = request.query as any;
        const project = query['project'] || 'traderpath';
        const limit = parseInt(query['limit']) || 50;
        const status = query['status'] as FeedbackStatus | undefined;
        const category = query['category'] as FeedbackCategory | undefined;

        const feedbacks = await getFeedbacks(project, {
          limit,
          status,
          category,
        });

        return {
          success: true,
          data: feedbacks,
          total: feedbacks.length,
        };
      } catch (error: any) {
        console.error('[BILGE] Get feedback error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get feedback',
        });
      }
    }
  );

  /**
   * POST /api/bilge/feedback/:id/approve
   * Approve feedback (admin)
   */
  app.post(
    '/api/bilge/feedback/:id/approve',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const params = request.params as any;
        const query = request.query as any;
        const project = query['project'] || 'traderpath';
        const feedbackId = params['id'];

        const feedback = await updateFeedbackStatus(project, feedbackId, 'approved');

        if (!feedback) {
          return reply.status(404).send({
            success: false,
            error: 'Feedback not found',
          });
        }

        return { success: true, data: feedback };
      } catch (error: any) {
        console.error('[BILGE] Approve feedback error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to approve feedback',
        });
      }
    }
  );

  /**
   * POST /api/bilge/feedback/:id/reject
   * Reject feedback (admin)
   */
  app.post(
    '/api/bilge/feedback/:id/reject',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const params = request.params as any;
        const query = request.query as any;
        const project = query['project'] || 'traderpath';
        const feedbackId = params['id'];

        const feedback = await updateFeedbackStatus(project, feedbackId, 'rejected');

        if (!feedback) {
          return reply.status(404).send({
            success: false,
            error: 'Feedback not found',
          });
        }

        return { success: true, data: feedback };
      } catch (error: any) {
        console.error('[BILGE] Reject feedback error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to reject feedback',
        });
      }
    }
  );

  /**
   * POST /api/bilge/feedback/:id/respond
   * Respond to feedback (admin)
   */
  app.post(
    '/api/bilge/feedback/:id/respond',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const params = request.params as any;
        const query = request.query as any;
        const body = request.body as any;
        const project = query['project'] || 'traderpath';
        const feedbackId = params['id'];
        const { response, isCustomResponse } = body;

        if (!response) {
          return reply.status(400).send({
            success: false,
            error: 'Response is required',
          });
        }

        const feedback = await updateFeedbackStatus(project, feedbackId, 'responded', {
          respondedBy: request.user?.email || 'admin',
          response,
          isCustomResponse: isCustomResponse ?? true,
        });

        if (!feedback) {
          return reply.status(404).send({
            success: false,
            error: 'Feedback not found',
          });
        }

        return {
          success: true,
          data: feedback,
          message: 'Response sent to user',
        };
      } catch (error: any) {
        console.error('[BILGE] Respond to feedback error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to respond to feedback',
        });
      }
    }
  );

  // ============================================
  // INNOVATION IDEAS
  // ============================================

  /**
   * GET /api/bilge/ideas
   * Get innovation ideas (admin)
   */
  app.get(
    '/api/bilge/ideas',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const query = request.query as any;
        const project = query['project'] || 'traderpath';
        const limit = parseInt(query['limit']) || 50;
        const status = query['status'] as IdeaStatus | undefined;

        const ideas = await getInnovationIdeas(project, {
          limit,
          status,
        });

        return {
          success: true,
          data: ideas,
          total: ideas.length,
        };
      } catch (error: any) {
        console.error('[BILGE] Get ideas error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get ideas',
        });
      }
    }
  );

  /**
   * POST /api/bilge/ideas/generate
   * Generate new innovation idea (admin)
   */
  app.post(
    '/api/bilge/ideas/generate',
    { preHandler: [app.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user?.isAdmin) {
        return reply.status(403).send({ success: false, error: 'Admin access required' });
      }

      try {
        const query = request.query as any;
        const body = request.body as any;
        const project = query['project'] || 'traderpath';
        const { source, context } = body;

        if (!context) {
          return reply.status(400).send({
            success: false,
            error: 'Context is required',
          });
        }

        const idea = await generateInnovationIdea(project, source || 'manual', context);

        if (!idea) {
          return reply.status(500).send({
            success: false,
            error: 'Failed to generate idea',
          });
        }

        return { success: true, data: idea };
      } catch (error: any) {
        console.error('[BILGE] Generate idea error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to generate idea',
        });
      }
    }
  );
}

export default bilgeRoutes;
