// ===========================================
// Expert AI Routes
// AI-powered expert answers with real TraderPath examples
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { expertService } from './expert.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { prisma } from '../../core/database';

export default async function expertRoutes(app: FastifyInstance) {
  /**
   * POST /api/expert/ask
   * Ask the expert AI a question (3 credits)
   */
  const askSchema = z.object({
    question: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question cannot exceed 500 characters'),
  });

  app.post('/ask', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = askSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('AI_EXPERT_QUESTION');

    // Check and charge credits
    const chargeResult = await creditService.charge(userId, cost, 'expert_ai_question', {
      questionPreview: body.question.substring(0, 50),
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: {
          code: 'CREDIT_001',
          message: `Insufficient credits. Expert AI requires ${cost} credits.`,
          required: cost,
        },
      });
    }

    try {
      // Get expert answer with examples
      const response = await expertService.askExpert(body.question, userId);

      return reply.send({
        success: true,
        data: {
          answer: response.answer,
          examples: response.examples,
          relatedTopics: response.relatedTopics,
        },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      console.error('Expert AI error:', error);

      // Refund credits on error
      await creditService.add(userId, cost, 'BONUS' as any, 'expert_ai_error', {
        reason: 'API error',
      });

      return reply.status(500).send({
        success: false,
        error: {
          code: 'EXPERT_ERROR',
          message: 'Expert AI failed to respond. Your credits have been refunded.',
        },
      });
    }
  });

  /**
   * GET /api/expert/suggested-questions
   * Get suggested questions for the user
   */
  app.get('/suggested-questions', {
    preHandler: authenticate,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const suggestedQuestions = [
      {
        category: 'Technical Analysis',
        questions: [
          'How to interpret the RSI indicator?',
          'How to identify support and resistance levels?',
          'What is MACD and how to use it?',
        ],
      },
      {
        category: 'Risk Management',
        questions: [
          'How to calculate position size?',
          'Where to place stop loss?',
          'Why is risk/reward ratio important?',
        ],
      },
      {
        category: 'Whale Behavior',
        questions: [
          'How to detect whale movements?',
          'What is exchange flow and what does it mean?',
          'Where is smart money looking?',
        ],
      },
      {
        category: 'Market Structure',
        questions: [
          'How does BTC dominance affect altcoins?',
          'What does Fear & Greed index mean?',
          'How to identify bull and bear markets?',
        ],
      },
      {
        category: 'Manipulation',
        questions: [
          'How to detect pump and dump schemes?',
          'What is wash trading?',
          'How to identify spoofing?',
        ],
      },
      {
        category: 'Trading Psychology',
        questions: [
          'How to deal with FOMO?',
          'How to recover after losses?',
          'How to develop trading discipline?',
        ],
      },
    ];

    return reply.send({
      success: true,
      data: suggestedQuestions,
    });
  });

  /**
   * GET /api/expert/recent
   * Get user's recent expert questions
   */
  app.get('/recent', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    try {
      // Get recent expert questions from credit transactions
      const recentQuestions = await prisma.creditTransaction.findMany({
        where: {
          userId,
          source: 'expert_ai_question',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          metadata: true,
          createdAt: true,
        },
      });

      const questions = recentQuestions.map((q) => {
        const meta = q.metadata as { questionPreview?: string } | null;
        return {
          id: q.id,
          preview: meta?.questionPreview || 'Question',
          date: q.createdAt,
        };
      });

      return reply.send({
        success: true,
        data: questions,
      });
    } catch (error) {
      console.error('Recent questions error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'RECENT_ERROR', message: 'Failed to load recent questions' },
      });
    }
  });
}
