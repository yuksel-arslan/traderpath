// ===========================================
// AI Expert Routes
// API endpoints for AI expert chat (5 credits per message)
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { aiExpertService } from './ai-expert.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { prisma } from '../../core/database';

// Request validation schemas
const chatSchema = z.object({
  expertId: z.enum(['aria', 'nexus', 'oracle', 'sentinel']),
  message: z.string().min(1).max(15000), // Increased for analysis context
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
  // If analysisId is provided, user gets 3 free questions for that analysis
  analysisId: z.string().uuid().optional(),
});

// Constants for AI Expert pricing
const FREE_QUESTIONS_PER_ANALYSIS = 3;
const AI_EXPERT_QUESTION_COST = 5;

export async function aiExpertRoutes(fastify: FastifyInstance) {
  // ===========================================
  // GET /api/ai-expert/experts
  // Get list of available AI experts
  // ===========================================
  fastify.get(
    '/api/ai-expert/experts',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const experts = aiExpertService.getAllExperts();
      const creditCost = await creditCostsService.getCreditCost('AI_EXPERT_QUESTION');

      return reply.send({
        success: true,
        data: {
          experts,
          creditCost,
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
          description: 'Educational preview and paid action info for each question',
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

      // Get dynamic credit costs
      const [aiExpertCost, addToReportCost, emailSendCost] = await Promise.all([
        creditCostsService.getCreditCost('AI_EXPERT_QUESTION'),
        creditCostsService.getCreditCost('ADD_TO_REPORT'),
        creditCostsService.getCreditCost('EMAIL_SEND'),
      ]);

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
            stage1_education: { cost: 0, description: 'FREE - Learn the concept' },
            stage2_analysis: { cost: aiExpertCost, description: 'Real coin analysis' },
            add_to_report: { cost: addToReportCost, description: 'Add to report' },
            send_email: { cost: emailSendCost, description: 'Send via email' },
          },
          howItWorks: {
            step1: '🎓 Ask a question → Get FREE educational answer',
            step2: `📊 Choose a coin → ${aiExpertCost} credits for real analysis`,
            step3: `📋 Add to report → ${addToReportCost} credits`,
            step4: `📧 Send email → ${emailSendCost} credits`,
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
      const creditCost = await creditCostsService.getCreditCost('AI_EXPERT_QUESTION');

      return reply.send({
        success: true,
        data: {
          expert: {
            id: expert.id,
            name: expert.name,
            role: expert.role,
          },
          creditCost,
          suggestedQuestions: suggestedQuestions.slice(0, 5), // Top 5 questions
        },
      });
    }
  );

  // ===========================================
  // POST /api/ai-expert/chat
  // Chat with AI Expert - 5 credits per message
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

      // Check if user is admin (free access) - isAdmin is set by authenticate middleware
      const isAdmin = (request as any).user?.isAdmin === true;

      // Determine if this question is free (when tied to an analysis)
      let isFreeQuestion = false;
      let analysis = null;
      let freeQuestionsRemaining = 0;

      if (body.analysisId) {
        // Check if analysis exists and belongs to user (or user has purchased it)
        analysis = await prisma.analysis.findFirst({
          where: {
            id: body.analysisId,
            OR: [
              { userId }, // User owns it
              // Or check if user has purchased it
            ],
          },
          select: {
            id: true,
            userId: true,
            aiExpertQuestionsUsed: true,
          },
        });

        if (analysis) {
          freeQuestionsRemaining = FREE_QUESTIONS_PER_ANALYSIS - analysis.aiExpertQuestionsUsed;
          isFreeQuestion = freeQuestionsRemaining > 0;
        }
      }

      const cost = isAdmin ? 0 : (isFreeQuestion ? 0 : AI_EXPERT_QUESTION_COST);

      let chargeResult = { success: true, newBalance: 0 };

      // Only charge if not admin and not free question
      if (!isAdmin && !isFreeQuestion) {
        chargeResult = await creditService.charge(
          userId,
          cost,
          `ai_expert_chat_${body.expertId}`,
          {
            expertId: body.expertId,
            expertName: expert.name,
            analysisId: body.analysisId,
          }
        );

        if (!chargeResult.success) {
          return reply.code(402).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_CREDITS',
              message: `Insufficient credits. AI Expert requires ${AI_EXPERT_QUESTION_COST} credits per message (free questions exhausted for this analysis).`,
              required: cost,
              current: chargeResult.newBalance,
            },
          });
        }
      }

      // Update question counter if tied to an analysis
      if (analysis) {
        await prisma.analysis.update({
          where: { id: body.analysisId },
          data: { aiExpertQuestionsUsed: { increment: 1 } },
        });
      }

      try {
        // Call AI Expert service (conversation history comes from frontend localStorage)
        const response = await aiExpertService.chat({
          expertId: body.expertId,
          message: body.message,
          conversationHistory: body.conversationHistory as { role: 'user' | 'assistant'; content: string }[] | undefined,
          userId,
        });

        return reply.send({
          success: true,
          data: {
            response: response.response,
            examples: response.examples,
            expert: {
              id: expert.id,
              name: expert.name,
              role: expert.role,
            },
            creditsUsed: cost,
            newBalance: chargeResult.newBalance,
            // Free question tracking (if tied to analysis)
            freeQuestions: analysis ? {
              used: analysis.aiExpertQuestionsUsed + 1, // +1 because we just used one
              total: FREE_QUESTIONS_PER_ANALYSIS,
              remaining: Math.max(0, FREE_QUESTIONS_PER_ANALYSIS - analysis.aiExpertQuestionsUsed - 1),
              wasFree: isFreeQuestion,
            } : null,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error({ err: error, expertId: body.expertId }, 'AI Expert chat error');

        // Refund credits on error (only if charged)
        if (!isAdmin && cost > 0) {
          try {
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
          } catch (refundError) {
            fastify.log.error({ err: refundError, userId, cost }, 'Failed to refund credits');
          }
        }

        return reply.code(500).send({
          success: false,
          error: {
            code: 'AI_CHAT_ERROR',
            message: `AI Expert failed to respond: ${errorMessage}. Credits refund attempted.`,
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

      // Credits to add to report
      const cost = await creditCostsService.getCreditCost('ADD_TO_REPORT');
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
            message: `Adding to report requires ${cost} credits.`,
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
              ? `New report created for ${result.symbol} with expert insight.`
              : `Expert insight added to existing report.`,
            creditsUsed: cost,
            newBalance: chargeResult.newBalance,
          },
        });
      } catch (error) {
        // Refund on error
        try {
          await creditService.add(userId, cost, 'BONUS', 'add_to_report_error_refund', { isRefund: true });
        } catch (refundError) {
          fastify.log.error({ err: refundError, userId, cost }, 'Failed to refund credits');
        }

        return reply.code(500).send({
          success: false,
          error: { code: 'REPORT_ERROR', message: 'Failed to add to report. Credits refund attempted.' },
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

      // Credits to send email
      const cost = await creditCostsService.getCreditCost('EMAIL_SEND');
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
            message: `Sending email requires ${cost} credits.`,
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
          try {
            await creditService.add(userId, cost, 'BONUS', 'email_refund_not_found', { isRefund: true });
          } catch (refundError) {
            fastify.log.error({ err: refundError, userId, cost }, 'Failed to refund credits');
          }
          return reply.code(404).send({
            success: false,
            error: { code: 'REPORT_NOT_FOUND', message: 'Report not found. Credits refund attempted.' },
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
          expertInsights: insightsText || 'No expert insights added yet.',
          reportUrl: `${process.env.APP_URL || 'https://traderpath.io'}/reports/${report.id}`,
          generatedAt: report.generatedAt.toLocaleDateString('en-US'),
        });

        if (!result.success) {
          try {
            await creditService.add(userId, cost, 'BONUS', 'email_send_error_refund', { isRefund: true });
          } catch (refundError) {
            fastify.log.error({ err: refundError, userId, cost }, 'Failed to refund credits');
          }
          return reply.code(500).send({
            success: false,
            error: { code: 'EMAIL_ERROR', message: 'Failed to send email. Credits refund attempted.' },
          });
        }

        return reply.send({
          success: true,
          data: {
            message: `Report sent to ${targetEmail}.`,
            email: targetEmail,
            reportId: report.id,
            symbol: report.symbol,
            creditsUsed: cost,
            newBalance: chargeResult.newBalance,
          },
        });
      } catch (error) {
        try {
          await creditService.add(userId, cost, 'BONUS', 'email_error_refund', { isRefund: true });
        } catch (refundError) {
          fastify.log.error({ err: refundError, userId, cost }, 'Failed to refund credits');
        }
        return reply.code(500).send({
          success: false,
          error: { code: 'EMAIL_ERROR', message: 'Failed to send email. Credits refund attempted.' },
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
