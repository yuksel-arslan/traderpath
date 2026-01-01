// ===========================================
// Translation Routes
// API endpoints for report translation
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { translationService, SUPPORTED_LANGUAGES } from './translation.service';
import { CREDIT_COSTS } from '@tradepath/types';

const translateSchema = z.object({
  texts: z.record(z.string()),
  targetLanguage: z.string().min(2).max(5),
});

export async function translationRoutes(fastify: FastifyInstance) {
  // ===========================================
  // GET /api/translation/languages
  // Get supported languages
  // ===========================================
  fastify.get('/api/translation/languages', async (_request, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        languages: SUPPORTED_LANGUAGES,
        defaultLanguage: 'en',
        cost: CREDIT_COSTS.REPORT_TRANSLATION,
      },
    });
  });

  // ===========================================
  // POST /api/translation/translate
  // Translate texts (costs credits)
  // ===========================================
  fastify.post('/api/translation/translate', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const body = translateSchema.parse(request.body);

    // Check if user has enough credits
    const cost = CREDIT_COSTS.REPORT_TRANSLATION;
    const chargeResult = await creditService.charge(userId, cost, 'report_translation', {
      targetLanguage: body.targetLanguage,
      textCount: Object.keys(body.texts).length,
    });

    if (!chargeResult.success) {
      return reply.code(402).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits for translation',
          required: cost,
        },
      });
    }

    try {
      const result = await translationService.translateTexts({
        texts: body.texts,
        targetLanguage: body.targetLanguage,
        userId,
      });

      return reply.send({
        success: true,
        data: {
          translations: result.translations,
          language: body.targetLanguage,
          languageName: SUPPORTED_LANGUAGES[body.targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || body.targetLanguage,
        },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      fastify.log.error(error);

      // Refund credits on error
      await creditService.add(userId, cost, 'refund', 'translation_error_refund', {});

      return reply.code(500).send({
        error: { code: 'TRANSLATION_ERROR', message: 'Failed to translate content' },
      });
    }
  });

  // ===========================================
  // POST /api/translation/estimate
  // Estimate translation cost (no charge)
  // ===========================================
  fastify.post('/api/translation/estimate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { textLength } = request.body as { textLength: number };

    const estimatedCostUsd = translationService.estimateTranslationCost(textLength || 1000);

    return reply.send({
      success: true,
      data: {
        creditCost: CREDIT_COSTS.REPORT_TRANSLATION,
        estimatedApiCostUsd: estimatedCostUsd.toFixed(6),
      },
    });
  });
}
