// ===========================================
// AI Expert Routes
// API endpoints for AI expert chat (3 credits)
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { aiExpertService } from './ai-expert.service';
import { CREDIT_COSTS } from '@tradepath/types';
import { prisma } from '../../core/database';

// Request validation schemas
const chatSchema = z.object({
  expertId: z.enum(['aria', 'nexus', 'oracle', 'sentinel']),
  message: z.string().min(1).max(2000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  // Stage 2: If symbol is provided, it's a paid real analysis
  symbol: z.string().optional(),
  // Explicitly request stage 2 analysis
  stage: z.enum(['education', 'analysis']).optional().default('education'),
});

export async function aiExpertRoutes(fastify: FastifyInstance) {
  // ===========================================
  // GET /api/ai-expert/experts
  // Get list of available AI experts
  // ===========================================
  fastify.get(
    '/api/ai-expert/experts',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const experts = aiExpertService.getAllExperts();

      return reply.send({
        success: true,
        data: {
          experts,
          creditCost: CREDIT_COSTS.AI_EXPERT_QUESTION, // 3 credits
        },
      });
    }
  );

  // ===========================================
  // GET /api/ai-expert/suggested-questions
  // Get all suggested questions with 2-stage info
  // ===========================================
  fastify.get(
    '/api/ai-expert/suggested-questions',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const questions = aiExpertService.getAllSuggestedQuestions();

      return reply.send({
        success: true,
        data: {
          questions,
          totalQuestions: Object.values(questions).flat().length,
          categories: ['education', 'strategy', 'practical'],
          description: 'Her soru için eğitici ön izleme ve ücretli aksiyon bilgisi',
        },
      });
    }
  );

  // ===========================================
  // GET /api/ai-expert/:expertId/questions
  // Get suggested questions for specific expert
  // ===========================================
  fastify.get(
    '/api/ai-expert/:expertId/questions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { expertId } = request.params as { expertId: string };
      const expert = aiExpertService.getExpert(expertId);

      if (!expert) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'EXPERT_NOT_FOUND',
            message: `Expert "${expertId}" not found`,
          },
        });
      }

      const questions = aiExpertService.getSuggestedQuestions(expertId as any);

      // Group by category
      const grouped = {
        education: questions.filter(q => q.category === 'education'),
        strategy: questions.filter(q => q.category === 'strategy'),
        practical: questions.filter(q => q.category === 'practical'),
      };

      return reply.send({
        success: true,
        data: {
          expert: {
            id: expert.id,
            name: expert.name,
            role: expert.role,
          },
          questions: grouped,
          totalQuestions: questions.length,
          pricing: {
            stage1_education: { cost: 0, description: 'ÜCRETSİZ - Kavramı öğren' },
            stage2_analysis: { cost: 3, description: 'Gerçek coin analizi' },
            add_to_report: { cost: 2, description: 'Rapora ekle' },
            send_email: { cost: 1, description: 'E-posta gönder' },
          },
          howItWorks: {
            step1: '🎓 Soru sor → ÜCRETSİZ eğitici yanıt al',
            step2: '📊 Coin seç → 3 kredi ile gerçek analiz',
            step3: '📋 Rapora ekle → 2 kredi',
            step4: '📧 E-posta gönder → 1 kredi',
          },
        },
      });
    }
  );

  // ===========================================
  // GET /api/ai-expert/:expertId
  // Get specific expert info
  // ===========================================
  fastify.get(
    '/api/ai-expert/:expertId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { expertId } = request.params as { expertId: string };
      const expert = aiExpertService.getExpert(expertId);

      if (!expert) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'EXPERT_NOT_FOUND',
            message: `Expert "${expertId}" not found`,
          },
        });
      }

      // Get suggested questions for this expert
      const suggestedQuestions = aiExpertService.getSuggestedQuestions(expertId as any);

      return reply.send({
        success: true,
        data: {
          expert: {
            id: expert.id,
            name: expert.name,
            role: expert.role,
          },
          creditCost: CREDIT_COSTS.AI_EXPERT_QUESTION, // 3 credits
          suggestedQuestions: suggestedQuestions.slice(0, 5), // Top 5 questions
        },
      });
    }
  );

  // ===========================================
  // POST /api/ai-expert/chat
  // 2-Stage Chat System:
  // - Stage 1 (education): FREE - Learn concepts
  // - Stage 2 (analysis): 3 credits - Real coin analysis
  // ===========================================
  fastify.post(
    '/api/ai-expert/chat',
    {
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Validate request body
      const parseResult = chatSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        });
      }

      const body = parseResult.data;

      // Check if expert exists
      const expert = aiExpertService.getExpert(body.expertId);
      if (!expert) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'EXPERT_NOT_FOUND',
            message: `Expert "${body.expertId}" not found`,
          },
        });
      }

      // Determine if this is a paid request (Stage 2)
      const isStage2 = body.stage === 'analysis' || !!body.symbol;
      const cost = isStage2 ? CREDIT_COSTS.AI_EXPERT_QUESTION : 0; // Stage 1 is FREE!

      let chargeResult = { success: true, newBalance: 0 };

      // Only charge for Stage 2 (real analysis)
      if (isStage2) {
        if (!body.symbol) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'SYMBOL_REQUIRED',
              message: 'Gerçek analiz için coin sembolü gereklidir (örn: BTCUSDT)',
            },
          });
        }

        chargeResult = await creditService.charge(
          userId,
          cost,
          `ai_expert_analysis_${body.expertId}`,
          {
            expertId: body.expertId,
            expertName: expert.name,
            symbol: body.symbol,
            stage: 'analysis',
          }
        );

        if (!chargeResult.success) {
          return reply.code(402).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_CREDITS',
              message: `${body.symbol} için gerçek analiz yapmak 3 kredi gerektirir. Eğitici yanıtlar ücretsizdir!`,
              required: cost,
              current: chargeResult.newBalance,
              hint: 'stage: "education" ile ücretsiz öğrenebilirsin',
            },
          });
        }
      }

      try {
        // Enhance message with symbol context for Stage 2
        let enhancedMessage = body.message;
        if (isStage2 && body.symbol) {
          enhancedMessage = `[GERÇEK ANALİZ İSTEĞİ - ${body.symbol}]\n${body.message}\n\nBu coin için gerçek verileri kullanarak detaylı analiz yap.`;
        }

        // Call AI Expert service
        const response = await aiExpertService.chat({
          expertId: body.expertId,
          message: enhancedMessage,
          conversationHistory: body.conversationHistory,
          userId,
        });

        // Add Stage 2 call-to-action for free responses
        let finalResponse = response.response;
        if (!isStage2) {
          finalResponse += `\n\n---\n\n🚀 **Bu bilgiyi gerçek bir coin için uygulamak ister misin?**\nHerhangi bir coin sembolü gönder (örn: BTCUSDT) ve 3 kredi ile gerçek analiz yapayım. Sonucu raporuna ekleyebilirsin!`;
        }

        return reply.send({
          success: true,
          data: {
            response: finalResponse,
            examples: response.examples,
            expert: {
              id: expert.id,
              name: expert.name,
              role: expert.role,
            },
            stage: isStage2 ? 'analysis' : 'education',
            symbol: body.symbol || null,
            isFree: !isStage2,
            creditsUsed: cost,
            newBalance: chargeResult.newBalance,
            nextStep: isStage2
              ? { action: 'add_to_report', creditCost: 2, description: 'Bu analizi raporuna ekle' }
              : { action: 'analyze', creditCost: 3, description: 'Bir coin için gerçek analiz yap' },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error({ err: error, expertId: body.expertId }, 'AI Expert chat error');

        // Refund credits on error (only if charged)
        if (isStage2 && cost > 0) {
          await creditService.add(
            userId,
            cost,
            'BONUS',
            'ai_expert_chat_error_refund',
            {
              expertId: body.expertId,
              error: errorMessage,
              isRefund: true,
            }
          );
        }

        return reply.code(500).send({
          success: false,
          error: {
            code: 'AI_CHAT_ERROR',
            message: isStage2
              ? `Uzman AI yanıt veremedi: ${errorMessage}. Krediniz iade edildi.`
              : `Uzman AI yanıt veremedi: ${errorMessage}`,
          },
        });
      }
    }
  );

  // ===========================================
  // POST /api/ai-expert/add-to-report
  // Add expert insight to a report (2 credits)
  // ===========================================
  fastify.post(
    '/api/ai-expert/add-to-report',
    {
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as {
        symbol: string;
        expertId: string;
        insight: string;
        reportId?: string;
      };

      if (!body.symbol || !body.expertId || !body.insight) {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'symbol, expertId and insight are required' },
        });
      }

      // 2 credits to add to report
      const cost = 2;
      const chargeResult = await creditService.charge(
        userId,
        cost,
        'add_expert_to_report',
        { symbol: body.symbol, expertId: body.expertId }
      );

      if (!chargeResult.success) {
        return reply.code(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'Rapora eklemek için 2 kredi gereklidir.',
            required: cost,
          },
        });
      }

      try {
        const result = await aiExpertService.addToReport({
          userId,
          symbol: body.symbol,
          expertId: body.expertId as any,
          insight: body.insight,
          reportId: body.reportId,
        });

        return reply.send({
          success: true,
          data: {
            reportId: result.reportId,
            isNew: result.isNew,
            symbol: result.symbol,
            message: result.isNew
              ? `${result.symbol} için yeni rapor oluşturuldu ve uzman görüşü eklendi.`
              : `Uzman görüşü mevcut rapora eklendi.`,
            creditsUsed: cost,
            newBalance: chargeResult.newBalance,
          },
        });
      } catch (error) {
        // Refund on error
        await creditService.add(userId, cost, 'BONUS', 'add_to_report_error_refund', { isRefund: true });

        return reply.code(500).send({
          success: false,
          error: { code: 'REPORT_ERROR', message: 'Rapora eklenemedi. Krediniz iade edildi.' },
        });
      }
    }
  );

  // ===========================================
  // POST /api/ai-expert/send-report-email
  // Send expert report via email (1 credit)
  // ===========================================
  fastify.post(
    '/api/ai-expert/send-report-email',
    {
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as {
        reportId: string;
        email?: string; // Optional, defaults to user's email
      };

      if (!body.reportId) {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'reportId is required' },
        });
      }

      // Get user info for email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      const targetEmail = body.email || user.email;
      if (!targetEmail) {
        return reply.code(400).send({
          success: false,
          error: { code: 'NO_EMAIL', message: 'Email address is required' },
        });
      }

      // 1 credit to send email
      const cost = 1;
      const chargeResult = await creditService.charge(
        userId,
        cost,
        'send_report_email',
        { reportId: body.reportId, email: targetEmail }
      );

      if (!chargeResult.success) {
        return reply.code(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'E-posta göndermek için 1 kredi gereklidir.',
            required: cost,
          },
        });
      }

      try {
        // Get report data
        const report = await prisma.report.findFirst({
          where: { id: body.reportId, userId },
        });

        if (!report) {
          await creditService.add(userId, cost, 'BONUS', 'email_refund_not_found', { isRefund: true });
          return reply.code(404).send({
            success: false,
            error: { code: 'REPORT_NOT_FOUND', message: 'Rapor bulunamadı. Krediniz iade edildi.' },
          });
        }

        const reportData = report.reportData as Record<string, unknown>;
        const expertInsights = (reportData.expertInsights || []) as Array<{
          expertName: string;
          insight: string;
        }>;

        // Format insights for email
        const insightsText = expertInsights
          .map((e) => `**${e.expertName}:**\n${e.insight}`)
          .join('\n\n---\n\n');

        // Send email
        const { emailService } = await import('../email/email.service');
        const result = await emailService.sendExpertReport(targetEmail, {
          userName: user.name || 'Trader',
          symbol: report.symbol,
          expertName: expertInsights.length > 0 ? expertInsights[0].expertName : 'AI Expert',
          expertInsights: insightsText || 'Henüz uzman görüşü eklenmemiş.',
          reportUrl: `${process.env.APP_URL || 'https://tradepath.app'}/reports/${report.id}`,
          generatedAt: report.generatedAt.toLocaleDateString('tr-TR'),
        });

        if (!result.success) {
          await creditService.add(userId, cost, 'BONUS', 'email_send_error_refund', { isRefund: true });
          return reply.code(500).send({
            success: false,
            error: { code: 'EMAIL_ERROR', message: 'E-posta gönderilemedi. Krediniz iade edildi.' },
          });
        }

        return reply.send({
          success: true,
          data: {
            message: `Rapor ${targetEmail} adresine gönderildi.`,
            email: targetEmail,
            reportId: report.id,
            symbol: report.symbol,
            creditsUsed: cost,
            newBalance: chargeResult.newBalance,
          },
        });
      } catch (error) {
        await creditService.add(userId, cost, 'BONUS', 'email_error_refund', { isRefund: true });
        return reply.code(500).send({
          success: false,
          error: { code: 'EMAIL_ERROR', message: 'E-posta gönderilemedi. Krediniz iade edildi.' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/ai-expert/report-summary/:symbol
  // Get expert insights for a symbol
  // ===========================================
  fastify.get(
    '/api/ai-expert/report-summary/:symbol',
    {
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { symbol } = request.params as { symbol: string };

      const summary = await aiExpertService.getExpertSummary({
        userId,
        symbol,
      });

      return reply.send({
        success: true,
        data: summary,
      });
    }
  );
}

export default aiExpertRoutes;
