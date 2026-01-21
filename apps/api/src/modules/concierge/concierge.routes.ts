import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { conciergeService } from './concierge.service';

// Request schemas
const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().optional(),
  language: z.enum(['tr', 'en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja', 'ko']).optional(),
});

// User type from JWT
interface JwtUser {
  id: string;
  email: string;
  name: string;
  level: number;
  isAdmin?: boolean;
}

// Helper to get typed user from request
function getUser(request: FastifyRequest): JwtUser {
  return request.user as JwtUser;
}

export async function conciergeRoutes(app: FastifyInstance) {
  /**
   * POST /api/concierge/chat
   * Main chat endpoint for AI Concierge
   */
  app.post('/chat', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = chatRequestSchema.parse(request.body);

    const response = await conciergeService.processMessage({
      message: body.message,
      userId,
      sessionId: body.sessionId,
      language: body.language,
    });

    return reply.send(response);
  });

  /**
   * GET /api/concierge/suggestions
   * Get suggested commands based on user context
   */
  app.get('/suggestions', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const language = (request.query as { language?: string }).language || 'tr';

    // Get user preferences for personalized suggestions
    const { prisma } = await import('../../core/database');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCoins: true },
    });

    const preferredCoins = user?.preferredCoins || ['BTC', 'ETH', 'SOL'];

    // Generate contextual suggestions
    const suggestions = language === 'tr' ? [
      `${preferredCoins[0]} nasıl?`,
      'Son analizlerim',
      'Top 5 coin analiz',
      'RSI nedir?',
      'Alarmlarımı göster',
    ] : [
      `How is ${preferredCoins[0]}?`,
      'My recent analyses',
      'Analyze top 5 coins',
      'What is RSI?',
      'Show my alerts',
    ];

    return reply.send({
      success: true,
      suggestions,
    });
  });

  /**
   * GET /api/concierge/quick-commands
   * Get quick command buttons for the UI
   */
  app.get('/quick-commands', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const language = (request.query as { language?: string }).language || 'tr';

    const commands = language === 'tr' ? [
      {
        id: 'top-movers',
        label: '🔥 Top Movers',
        command: 'Top 5 coin analiz et',
        description: 'En hareketli coinleri analiz et',
      },
      {
        id: 'favorites',
        label: '💎 Favorilerim',
        command: 'Favori coinlerimi analiz et',
        description: 'Kayıtlı coinlerini hızlıca analiz et',
      },
      {
        id: 'btc-quick',
        label: '₿ BTC Analiz',
        command: 'BTC nasıl?',
        description: 'Bitcoin hızlı analizi',
      },
      {
        id: 'status',
        label: '📊 Durum',
        command: 'Son analizlerim',
        description: 'Analiz geçmişi ve bakiye',
      },
    ] : [
      {
        id: 'top-movers',
        label: '🔥 Top Movers',
        command: 'Analyze top 5 coins',
        description: 'Analyze the most active coins',
      },
      {
        id: 'favorites',
        label: '💎 Favorites',
        command: 'Analyze my favorite coins',
        description: 'Quickly analyze your saved coins',
      },
      {
        id: 'btc-quick',
        label: '₿ BTC Analysis',
        command: 'How is BTC?',
        description: 'Quick Bitcoin analysis',
      },
      {
        id: 'status',
        label: '📊 Status',
        command: 'My recent analyses',
        description: 'Analysis history and balance',
      },
    ];

    return reply.send({
      success: true,
      commands,
    });
  });
}
