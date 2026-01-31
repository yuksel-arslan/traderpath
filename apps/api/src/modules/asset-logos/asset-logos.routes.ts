// ===========================================
// Asset Logos API Routes
// Public endpoints for logo retrieval
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import {
  getAllLogos,
  getLogosByAssetClass,
  getLogoForSymbol,
  updateLogo,
  bulkUpdateLogos,
  detectAssetClass,
} from './asset-logos.service';
import { AssetClass, AssetLogoInfo } from './asset-logos.data';

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

export default async function assetLogosRoutes(app: FastifyInstance) {
  // ===========================================
  // GET /api/asset-logos
  // Get all logos (for initial cache population)
  // Public endpoint - no auth required
  // ===========================================
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allLogos = await getAllLogos();

      return reply.send({
        success: true,
        data: allLogos,
      });
    } catch (error) {
      console.error('[AssetLogos] Failed to get all logos:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve logos',
      });
    }
  });

  // ===========================================
  // GET /api/asset-logos/:assetClass
  // Get logos for a specific asset class
  // ===========================================
  app.get<{
    Params: { assetClass: string };
  }>('/:assetClass', async (request, reply) => {
    try {
      const assetClass = request.params.assetClass as AssetClass;

      if (!['crypto', 'stocks', 'metals', 'bonds'].includes(assetClass)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid asset class. Must be one of: crypto, stocks, metals, bonds',
        });
      }

      const logos = await getLogosByAssetClass(assetClass);

      return reply.send({
        success: true,
        data: {
          assetClass,
          logos,
          count: Object.keys(logos).length,
        },
      });
    } catch (error) {
      console.error('[AssetLogos] Failed to get logos by class:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve logos',
      });
    }
  });

  // ===========================================
  // GET /api/asset-logos/symbol/:symbol
  // Get logo for a specific symbol
  // ===========================================
  app.get<{
    Params: { symbol: string };
    Querystring: { assetClass?: string };
  }>('/symbol/:symbol', async (request, reply) => {
    try {
      const symbol = request.params.symbol.toUpperCase();
      const assetClassQuery = request.query.assetClass as AssetClass | undefined;

      const logoInfo = await getLogoForSymbol(symbol, assetClassQuery);
      const assetClass = assetClassQuery || detectAssetClass(symbol);

      if (!logoInfo) {
        // Return default fallback info
        return reply.send({
          success: true,
          data: {
            symbol,
            assetClass,
            logoUrl: null,
            color: '#4F46E5', // Default indigo
            name: symbol,
            isDefault: true,
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          symbol,
          assetClass,
          ...logoInfo,
          isDefault: false,
        },
      });
    } catch (error) {
      console.error('[AssetLogos] Failed to get symbol logo:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve logo',
      });
    }
  });

  // ===========================================
  // POST /api/asset-logos/batch
  // Get logos for multiple symbols at once
  // ===========================================
  app.post<{
    Body: { symbols: string[] };
  }>('/batch', async (request, reply) => {
    try {
      const { symbols } = request.body;

      if (!symbols || !Array.isArray(symbols)) {
        return reply.status(400).send({
          success: false,
          error: 'symbols array is required',
        });
      }

      if (symbols.length > 100) {
        return reply.status(400).send({
          success: false,
          error: 'Maximum 100 symbols per request',
        });
      }

      const results: Record<
        string,
        AssetLogoInfo & { assetClass: AssetClass; isDefault: boolean }
      > = {};

      for (const symbol of symbols) {
        const upperSymbol = symbol.toUpperCase();
        const logoInfo = await getLogoForSymbol(upperSymbol);
        const assetClass = detectAssetClass(upperSymbol);

        if (logoInfo) {
          results[upperSymbol] = {
            ...logoInfo,
            assetClass,
            isDefault: false,
          };
        } else {
          results[upperSymbol] = {
            logoUrl: '',
            color: '#4F46E5',
            name: upperSymbol,
            assetClass,
            isDefault: true,
          };
        }
      }

      return reply.send({
        success: true,
        data: results,
        count: Object.keys(results).length,
      });
    } catch (error) {
      console.error('[AssetLogos] Failed to batch get logos:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve logos',
      });
    }
  });

  // ===========================================
  // Admin Routes (require authentication + admin role)
  // ===========================================

  // PUT /api/asset-logos/admin/update
  // Update a single logo
  app.put<{
    Body: {
      symbol: string;
      assetClass: AssetClass;
      logoInfo: AssetLogoInfo;
    };
  }>('/admin/update', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const user = getUser(request);

      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      const { symbol, assetClass, logoInfo } = request.body;

      if (!symbol || !assetClass || !logoInfo) {
        return reply.status(400).send({
          success: false,
          error: 'symbol, assetClass, and logoInfo are required',
        });
      }

      const success = await updateLogo(symbol, assetClass, logoInfo);

      if (!success) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to update logo',
        });
      }

      return reply.send({
        success: true,
        message: `Logo for ${symbol} updated successfully`,
      });
    } catch (error) {
      console.error('[AssetLogos] Failed to update logo:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update logo',
      });
    }
  });

  // PUT /api/asset-logos/admin/bulk
  // Bulk update logos for an asset class
  app.put<{
    Body: {
      assetClass: AssetClass;
      logos: Record<string, AssetLogoInfo>;
    };
  }>('/admin/bulk', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const user = getUser(request);

      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      const { assetClass, logos } = request.body;

      if (!assetClass || !logos) {
        return reply.status(400).send({
          success: false,
          error: 'assetClass and logos are required',
        });
      }

      const success = await bulkUpdateLogos(assetClass, logos);

      if (!success) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to bulk update logos',
        });
      }

      return reply.send({
        success: true,
        message: `${Object.keys(logos).length} logos updated for ${assetClass}`,
      });
    } catch (error) {
      console.error('[AssetLogos] Failed to bulk update logos:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to bulk update logos',
      });
    }
  });
}
