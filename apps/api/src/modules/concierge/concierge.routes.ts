import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { conciergeService } from './concierge.service';
import { prisma } from '../../core/database';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../config/languages';

// Get list of supported language codes
const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(l => l.code);

// Request schema - supports all configured languages
const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  language: z.string().min(2).max(5).optional(), // Don't enforce enum here, validate below
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

      // Get user's language preference from database if not provided in request
      let language = body.language;

      if (!language) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferredLanguage: true },
          });
          language = user?.preferredLanguage || DEFAULT_LANGUAGE;
        } catch {
          language = DEFAULT_LANGUAGE;
        }
      }

      // Validate language is supported, fallback to default if not
      if (!supportedLanguageCodes.includes(language)) {
        language = DEFAULT_LANGUAGE;
      }

      const response = await conciergeService.processMessage({
        message: body.message,
        userId,
        language,
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
