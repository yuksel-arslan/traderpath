// ===========================================
// Contract Security Routes
// On-chain security check endpoints
// ===========================================

import { FastifyInstance, FastifyRequest } from 'fastify';
import { contractSecurityService, ChainId, CHAIN_IDS } from './contract-security.service';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';

// Request types
interface ContractCheckRequest {
  Body: {
    symbol?: string;
    contractAddress?: string;
    chain?: ChainId;
  };
}

interface QuickCheckRequest {
  Params: {
    symbol: string;
  };
}

export default async function contractSecurityRoutes(fastify: FastifyInstance) {
  // =========================================
  // Full Contract Security Analysis (5 credits)
  // =========================================
  fastify.post<ContractCheckRequest>(
    '/analyze',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { symbol, contractAddress, chain } = request.body;

      if (!symbol && !contractAddress) {
        return reply.status(400).send({
          success: false,
          error: { message: 'Either symbol or contractAddress is required' },
        });
      }

      const userId = request.user!.id;
      const creditCost = 5;

      // Try to charge credits
      const chargeResult = await creditService.charge(
        userId,
        creditCost,
        'contract_security_analysis',
        { symbol, contractAddress, chain }
      );

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'Insufficient credits',
            required: creditCost,
          },
        });
      }

      try {
        const result = await contractSecurityService.analyzeContract(
          symbol || '',
          contractAddress,
          chain
        );

        if (!result) {
          // Refund credits if no data available
          await creditService.add(userId, creditCost, 'BONUS', 'contract_security_refund', { isRefund: true });
          return reply.status(404).send({
            success: false,
            error: {
              message: symbol
                ? `Contract security data not available for ${symbol}. Try providing a contract address.`
                : 'Contract not found or not supported.',
              supportedTokens: contractSecurityService.getSupportedTokens(),
            },
          });
        }

        return reply.send({
          success: true,
          data: result,
          creditCost,
          newBalance: chargeResult.newBalance,
        });
      } catch (error) {
        // Refund on error
        await creditService.add(userId, creditCost, 'BONUS', 'contract_security_error_refund', { isRefund: true });
        console.error('Contract security analysis error:', error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to analyze contract security' },
        });
      }
    }
  );

  // =========================================
  // Quick Honeypot Check (2 credits)
  // =========================================
  fastify.get<QuickCheckRequest>(
    '/honeypot/:symbol',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { symbol } = request.params;
      const userId = request.user!.id;
      const creditCost = 2;

      const chargeResult = await creditService.charge(userId, creditCost, 'honeypot_check', { symbol });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits', required: creditCost },
        });
      }

      try {
        const result = await contractSecurityService.analyzeContract(symbol);

        if (!result) {
          await creditService.add(userId, creditCost, 'BONUS', 'honeypot_refund', { isRefund: true });
          return reply.status(404).send({
            success: false,
            error: { message: `Honeypot check not available for ${symbol}` },
          });
        }

        return reply.send({
          success: true,
          data: {
            symbol: result.symbol,
            isHoneypot: result.isHoneypot,
            cannotBuy: result.cannotBuy,
            cannotSellAll: result.cannotSellAll,
            buyTax: result.buyTax,
            sellTax: result.sellTax,
            warning: result.isHoneypot
              ? '🚨 HONEYPOT DETECTED! This token cannot be sold.'
              : result.cannotSellAll
              ? '⚠️ Cannot sell all tokens at once'
              : '✅ No honeypot detected',
          },
          creditCost,
          newBalance: chargeResult.newBalance,
        });
      } catch (error) {
        await creditService.add(userId, creditCost, 'BONUS', 'honeypot_error_refund', { isRefund: true });
        console.error('Honeypot check error:', error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to check honeypot status' },
        });
      }
    }
  );

  // =========================================
  // Quick Liquidity Lock Check (2 credits)
  // =========================================
  fastify.get<QuickCheckRequest>(
    '/liquidity-lock/:symbol',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { symbol } = request.params;
      const userId = request.user!.id;
      const creditCost = 2;

      const chargeResult = await creditService.charge(userId, creditCost, 'liquidity_lock_check', { symbol });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits', required: creditCost },
        });
      }

      try {
        const result = await contractSecurityService.analyzeContract(symbol);

        if (!result) {
          await creditService.add(userId, creditCost, 'BONUS', 'liquidity_refund', { isRefund: true });
          return reply.status(404).send({
            success: false,
            error: { message: `Liquidity lock check not available for ${symbol}` },
          });
        }

        return reply.send({
          success: true,
          data: {
            symbol: result.symbol,
            liquidityLocked: result.liquidityLocked,
            liquidityLockPercent: result.liquidityLockPercent,
            liquidityLockEndDate: result.liquidityLockEndDate,
            totalLiquidity: result.totalLiquidity,
            status: result.liquidityLocked
              ? `✅ ${result.liquidityLockPercent.toFixed(1)}% of liquidity is locked${
                  result.liquidityLockEndDate
                    ? ` until ${new Date(result.liquidityLockEndDate).toLocaleDateString()}`
                    : ''
                }`
              : '⚠️ Liquidity is NOT locked - RUG PULL risk!',
          },
          creditCost,
          newBalance: chargeResult.newBalance,
        });
      } catch (error) {
        await creditService.add(userId, creditCost, 'BONUS', 'liquidity_error_refund', { isRefund: true });
        console.error('Liquidity lock check error:', error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to check liquidity lock' },
        });
      }
    }
  );

  // =========================================
  // Quick Mint Function Check (2 credits)
  // =========================================
  fastify.get<QuickCheckRequest>(
    '/mint-check/:symbol',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { symbol } = request.params;
      const userId = request.user!.id;
      const creditCost = 2;

      const chargeResult = await creditService.charge(userId, creditCost, 'mint_check', { symbol });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits', required: creditCost },
        });
      }

      try {
        const result = await contractSecurityService.analyzeContract(symbol);

        if (!result) {
          await creditService.add(userId, creditCost, 'BONUS', 'mint_refund', { isRefund: true });
          return reply.status(404).send({
            success: false,
            error: { message: `Mint check not available for ${symbol}` },
          });
        }

        return reply.send({
          success: true,
          data: {
            symbol: result.symbol,
            isMintable: result.isMintable,
            ownerCanChangeBalance: result.ownerCanChangeBalance,
            canTakeBackOwnership: result.canTakeBackOwnership,
            status: result.isMintable
              ? '⚠️ Token is MINTABLE - Owner can create unlimited tokens'
              : result.ownerCanChangeBalance
              ? '⚠️ Owner can modify balances'
              : '✅ No dangerous mint functions detected',
          },
          creditCost,
          newBalance: chargeResult.newBalance,
        });
      } catch (error) {
        await creditService.add(userId, creditCost, 'BONUS', 'mint_error_refund', { isRefund: true });
        console.error('Mint check error:', error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to check mint function' },
        });
      }
    }
  );

  // =========================================
  // Contract Verification Check (1 credit)
  // =========================================
  fastify.get<QuickCheckRequest>(
    '/verified/:symbol',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { symbol } = request.params;
      const userId = request.user!.id;
      const creditCost = 1;

      const chargeResult = await creditService.charge(userId, creditCost, 'verified_check', { symbol });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits', required: creditCost },
        });
      }

      try {
        const result = await contractSecurityService.analyzeContract(symbol);

        if (!result) {
          await creditService.add(userId, creditCost, 'BONUS', 'verified_refund', { isRefund: true });
          return reply.status(404).send({
            success: false,
            error: { message: `Verification check not available for ${symbol}` },
          });
        }

        return reply.send({
          success: true,
          data: {
            symbol: result.symbol,
            contractAddress: result.contractAddress,
            chain: result.chain,
            isVerified: result.isVerified,
            status: result.isVerified
              ? '✅ Contract source code is VERIFIED'
              : '⚠️ Contract source code is NOT verified - Cannot inspect the code!',
          },
          creditCost,
          newBalance: chargeResult.newBalance,
        });
      } catch (error) {
        await creditService.add(userId, creditCost, 'BONUS', 'verified_error_refund', { isRefund: true });
        console.error('Verification check error:', error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to check contract verification' },
        });
      }
    }
  );

  // =========================================
  // Get Supported Tokens (Free)
  // =========================================
  fastify.get('/supported-tokens', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        tokens: contractSecurityService.getSupportedTokens(),
        chains: Object.keys(CHAIN_IDS),
        note: 'You can also provide a custom contract address with chain ID',
      },
    });
  });

  // =========================================
  // Add Custom Token (Free - saves for future use)
  // =========================================
  fastify.post<{
    Body: {
      symbol: string;
      contractAddress: string;
      chain: ChainId;
    };
  }>('/add-token', { preHandler: [authenticate] }, async (request, reply) => {
    const { symbol, contractAddress, chain } = request.body;

    if (!symbol || !contractAddress || !chain) {
      return reply.status(400).send({
        success: false,
        error: { message: 'symbol, contractAddress, and chain are required' },
      });
    }

    if (!CHAIN_IDS[chain]) {
      return reply.status(400).send({
        success: false,
        error: {
          message: `Invalid chain. Supported: ${Object.keys(CHAIN_IDS).join(', ')}`,
        },
      });
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return reply.status(400).send({
        success: false,
        error: { message: 'Invalid contract address format' },
      });
    }

    contractSecurityService.addTokenContract(symbol, contractAddress, chain);

    return reply.send({
      success: true,
      data: {
        message: `Token ${symbol.toUpperCase()} added successfully`,
        symbol: symbol.toUpperCase(),
        contractAddress,
        chain,
      },
    });
  });
}
