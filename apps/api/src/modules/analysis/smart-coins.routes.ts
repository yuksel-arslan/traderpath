// ===========================================
// Smart Coins Routes
// API endpoints for intelligent coin suggestions
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { smartCoinsService } from './services/smart-coins.service';

export async function smartCoinsRoutes(fastify: FastifyInstance) {
  // ===========================================
  // GET /api/smart-coins - Get all smart coin suggestions
  // ===========================================
  fastify.get(
    '/api/smart-coins',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await smartCoinsService.getSmartCoins();

        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to fetch smart coins' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/smart-coins/:category - Get specific category
  // ===========================================
  fastify.get<{ Params: { category: string } }>(
    '/api/smart-coins/:category',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { category } = request.params as { category: string };

        const validCategories = ['trending', 'gainers', 'losers', 'highVolume', 'topMarketCap'];
        if (!validCategories.includes(category)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_CATEGORY',
              message: `Category must be one of: ${validCategories.join(', ')}`,
            },
          });
        }

        const data = await smartCoinsService.getCategory(
          category as 'trending' | 'gainers' | 'losers' | 'highVolume' | 'topMarketCap'
        );

        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to fetch category' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/smart-coins/search/:query - Search for a coin
  // ===========================================
  fastify.get<{ Params: { query: string } }>(
    '/api/smart-coins/search/:query',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query } = request.params as { query: string };

        if (!query || query.length < 1) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_QUERY', message: 'Search query is required' },
          });
        }

        const coin = await smartCoinsService.searchCoin(query);

        return reply.send({
          success: true,
          data: coin,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to search coin' },
        });
      }
    }
  );
}

export default smartCoinsRoutes;
