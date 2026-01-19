// ===========================================
// Translation Routes
// API endpoints for report translation
// Primary: Google Translate (fast, cheap)
// Fallback: Gemini AI (complex translations)
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { translationService, SUPPORTED_LANGUAGES } from './translation.service';
import { creditCostsService } from '../costs/credit-costs.service';

const translateSchema = z.object({
  texts: z.record(z.string()),
  targetLanguage: z.string().min(2).max(5),
  useGemini: z.boolean().optional(), // Force Gemini for complex translations
});

const quickTranslateSchema = z.object({
  text: z.string().max(500), // Limit for free translations
  targetLanguage: z.string().min(2).max(5),
});

export async function translationRoutes(fastify: FastifyInstance) {
  // ===========================================
  // GET /api/translation/languages
  // Get supported languages and provider info
  // ===========================================
  fastify.get('/api/translation/languages', async (_request, reply: FastifyReply) => {
    const cost = await creditCostsService.getCreditCost('REPORT_TRANSLATION');
    const provider = translationService.getAvailableProvider();

    return reply.send({
      success: true,
      data: {
        languages: SUPPORTED_LANGUAGES,
        defaultLanguage: 'en',
        cost,
        provider, // 'google' | 'gemini' | null
      },
    });
  });

  // ===========================================
  // POST /api/translation/quick
  // Quick translate single text (free, rate limited)
  // For UI elements and short texts
  // ===========================================
  fastify.post('/api/translation/quick', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = quickTranslateSchema.parse(request.body);

      // Skip if target is English
      if (body.targetLanguage === 'en') {
        return reply.send({
          success: true,
          data: {
            translation: body.text,
            language: 'en',
          },
        });
      }

      const translation = await translationService.translate(
        body.text,
        body.targetLanguage
      );

      return reply.send({
        success: true,
        data: {
          translation,
          language: body.targetLanguage,
          languageName: SUPPORTED_LANGUAGES[body.targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || body.targetLanguage,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: { code: 'TRANSLATION_ERROR', message: 'Failed to translate' },
      });
    }
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
    const cost = await creditCostsService.getCreditCost('REPORT_TRANSLATION');
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
        useGemini: body.useGemini,
      });

      return reply.send({
        success: true,
        data: {
          translations: result.translations,
          language: body.targetLanguage,
          languageName: SUPPORTED_LANGUAGES[body.targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || body.targetLanguage,
          provider: result.provider, // 'google' | 'gemini'
        },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      fastify.log.error(error);

      // Refund credits on error
      await creditService.add(userId, cost, 'BONUS' as any, 'translation_error_refund', {});

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
    const creditCost = await creditCostsService.getCreditCost('REPORT_TRANSLATION');
    const provider = translationService.getAvailableProvider();

    return reply.send({
      success: true,
      data: {
        creditCost,
        estimatedApiCostUsd: estimatedCostUsd.toFixed(6),
        provider, // 'google' | 'gemini' | null
      },
    });
  });
}
