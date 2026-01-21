import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { conciergeService } from './concierge.service';

// Request schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  language: z.enum(['tr', 'en']).optional().default('en'),
});

export async function conciergeRoutes(app: FastifyInstance) {
  /**
   * POST /api/concierge/chat
   * Main chat endpoint
   */
  app.post('/chat', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const body = chatRequestSchema.parse(request.body);

      const response = await conciergeService.processMessage({
        message: body.message,
        userId,
        language: body.language,
      });

      return reply.send(response);
    } catch (error) {
      console.error('Concierge chat error:', error);

      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request',
          message: error.errors[0]?.message || 'Validation failed',
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process message. Please try again.',
      });
    }
  });
}
