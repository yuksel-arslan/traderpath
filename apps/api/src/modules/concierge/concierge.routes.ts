import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { conciergeService } from './concierge.service';
import { prisma } from '../../core/database';
import { logger } from '../../core/logger';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../config/languages';
import { synthesizeSpeech, isGoogleTTSAvailable, getSupportedTTSLanguages } from '../../core/google-tts';

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
      logger.error({ error }, 'Concierge chat error');

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

  // TTS request schema
  const ttsRequestSchema = z.object({
    text: z.string().min(1).max(2000),
    language: z.string().min(2).max(5).default('en'),
    gender: z.enum(['MALE', 'FEMALE']).default('MALE'),
    speakingRate: z.number().min(0.25).max(4.0).default(1.0),
  });

  /**
   * POST /api/concierge/tts
   * Text-to-Speech using Google Cloud TTS
   * Returns base64 encoded MP3 audio
   */
  app.post('/tts', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if TTS is available
      if (!isGoogleTTSAvailable()) {
        return reply.status(503).send({
          success: false,
          error: 'TTS service unavailable',
          message: 'Text-to-speech service is not configured.',
        });
      }

      const body = ttsRequestSchema.parse(request.body);

      // Synthesize speech
      const result = await synthesizeSpeech({
        text: body.text,
        language: body.language,
        gender: body.gender,
        speakingRate: body.speakingRate,
      });

      return reply.send({
        success: true,
        data: {
          audioContent: result.audioContent,
          contentType: result.contentType,
        },
      });
    } catch (error) {
      console.error('TTS error:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request',
          message: error.errors[0]?.message || 'Validation failed',
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'TTS failed',
        message: 'Failed to generate speech. Please try again.',
      });
    }
  });

  /**
   * GET /api/concierge/tts/languages
   * Get supported TTS languages
   */
  app.get('/tts/languages', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        available: isGoogleTTSAvailable(),
        languages: getSupportedTTSLanguages(),
      },
    });
  });
}
