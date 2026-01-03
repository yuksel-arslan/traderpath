// ===========================================
// Expert AI Routes
// AI-powered expert answers with real TradePath examples
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { expertService } from './expert.service';
import { CREDIT_COSTS } from '@tradepath/types';

export default async function expertRoutes(app: FastifyInstance) {
  /**
   * POST /api/expert/ask
   * Ask the expert AI a question (3 credits)
   */
  const askSchema = z.object({
    question: z.string().min(10, 'Soru en az 10 karakter olmalı').max(500, 'Soru en fazla 500 karakter olabilir'),
  });

  app.post('/ask', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = askSchema.parse(request.body);

    const cost = CREDIT_COSTS.AI_EXPERT_QUESTION;

    // Check and charge credits
    const chargeResult = await creditService.charge(userId, cost, 'expert_ai_question', {
      questionPreview: body.question.substring(0, 50),
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: {
          code: 'CREDIT_001',
          message: 'Yetersiz kredi. Uzman AI için 3 kredi gereklidir.',
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
      await creditService.add(userId, cost, 'REFUND', 'expert_ai_error', {
        reason: 'API error',
      });

      return reply.status(500).send({
        success: false,
        error: {
          code: 'EXPERT_ERROR',
          message: 'Uzman AI yanıt veremedi. Krediniz iade edildi.',
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
        category: 'Teknik Analiz',
        questions: [
          'RSI göstergesi nasıl yorumlanır?',
          'Destek ve direnç seviyeleri nasıl belirlenir?',
          'MACD indikatörü nedir ve nasıl kullanılır?',
        ],
      },
      {
        category: 'Risk Yönetimi',
        questions: [
          'Pozisyon boyutlandırma nasıl yapılır?',
          'Stop loss nereye konulmalı?',
          'Risk/ödül oranı neden önemlidir?',
        ],
      },
      {
        category: 'Balina Davranışları',
        questions: [
          'Balina hareketleri nasıl tespit edilir?',
          'Exchange flow nedir ve ne anlama gelir?',
          'Smart money nereye bakıyor?',
        ],
      },
      {
        category: 'Piyasa Yapısı',
        questions: [
          'BTC dominansı altcoinleri nasıl etkiler?',
          'Fear & Greed endeksi ne anlama gelir?',
          'Bull ve bear piyasası nasıl anlaşılır?',
        ],
      },
      {
        category: 'Manipülasyon',
        questions: [
          'Pump and dump nasıl tespit edilir?',
          'Wash trading nedir?',
          'Spoofing nasıl anlaşılır?',
        ],
      },
      {
        category: 'Trading Psikolojisi',
        questions: [
          'FOMO ile nasıl başa çıkılır?',
          'Kayıplardan sonra nasıl toparlanılır?',
          'Trading disiplini nasıl kazanılır?',
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
      const recentQuestions = await app.prisma.creditTransaction.findMany({
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
          preview: meta?.questionPreview || 'Soru',
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
        error: { code: 'RECENT_ERROR', message: 'Son sorular yüklenemedi' },
      });
    }
  });
}
