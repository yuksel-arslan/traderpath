// ===========================================
// Contract Security Service
// On-chain security checks using GoPlus API
// ===========================================

import { redis } from '../../core/cache';

// Supported blockchain networks
export const CHAIN_IDS = {
  ethereum: '1',
  bsc: '56',
  polygon: '137',
  arbitrum: '42161',
  avalanche: '43114',
  fantom: '250',
  cronos: '25',
  base: '8453',
  optimism: '10',
  solana: 'solana', // Special handling for Solana
} as const;

export type ChainId = keyof typeof CHAIN_IDS;

// Popular token contract addresses (expandable)
const TOKEN_CONTRACTS: Record<string, { address: string; chain: ChainId }> = {
  // Ethereum Mainnet
  SHIB: { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', chain: 'ethereum' },
  PEPE: { address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', chain: 'ethereum' },
  FLOKI: { address: '0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E', chain: 'ethereum' },
  LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', chain: 'ethereum' },
  UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', chain: 'ethereum' },
  AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', chain: 'ethereum' },
  MKR: { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', chain: 'ethereum' },
  CRV: { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', chain: 'ethereum' },
  LDO: { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', chain: 'ethereum' },
  APE: { address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381', chain: 'ethereum' },
  DOGE: { address: '0x4206931337dc273a630d328dA6441786BfaD668f', chain: 'ethereum' }, // Wrapped

  // BSC (Binance Smart Chain)
  CAKE: { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', chain: 'bsc' },
  BAKE: { address: '0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5', chain: 'bsc' },
  SAFEMOON: { address: '0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3', chain: 'bsc' },
  BABYDOGE: { address: '0xc748673057861a797275CD8A068AbB95A902e8de', chain: 'bsc' },

  // Polygon
  QUICK: { address: '0xB5C064F955D8e7F38fE0460C556a72987494eE17', chain: 'polygon' },
  SAND: { address: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683', chain: 'polygon' },
  MANA: { address: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4', chain: 'polygon' },
};

// GoPlus API response types
interface GoPlusTokenSecurity {
  is_honeypot?: string; // "0" or "1"
  honeypot_with_same_creator?: string;
  is_open_source?: string; // "0" = not verified, "1" = verified
  is_proxy?: string;
  is_mintable?: string; // "0" or "1"
  can_take_back_ownership?: string;
  owner_change_balance?: string;
  hidden_owner?: string;
  selfdestruct?: string;
  external_call?: string;
  buy_tax?: string; // percentage as string
  sell_tax?: string;
  is_anti_whale?: string;
  anti_whale_modifiable?: string;
  cannot_buy?: string;
  cannot_sell_all?: string;
  slippage_modifiable?: string;
  personal_slippage_modifiable?: string;
  trading_cooldown?: string;
  is_blacklisted?: string;
  is_whitelisted?: string;
  is_in_dex?: string;
  transfer_pausable?: string;
  lp_holder_count?: string;
  lp_total_supply?: string;
  is_true_token?: string;
  is_airdrop_scam?: string;
  trust_list?: string;
  other_potential_risks?: string;
  note?: string;
  holder_count?: string;
  total_supply?: string;
  holders?: Array<{
    address: string;
    balance: string;
    percent: string;
    is_locked: number;
    is_contract: number;
    tag?: string;
  }>;
  lp_holders?: Array<{
    address: string;
    balance: string;
    percent: string;
    is_locked: number;
    is_contract: number;
    tag?: string;
    NFT_list?: Array<{ NFT_id: string; amount: string }>;
    locked_detail?: Array<{
      amount: string;
      end_time: string;
      opt_time: string;
    }>;
  }>;
  dex?: Array<{
    name: string;
    liquidity: string;
    pair: string;
  }>;
  token_name?: string;
  token_symbol?: string;
}

// Our structured security result
export interface ContractSecurityResult {
  symbol: string;
  contractAddress: string;
  chain: ChainId;
  chainId: string;

  // Core Security Checks
  isVerified: boolean; // Contract source code verified on explorer
  isHoneypot: boolean; // Can't sell after buying
  isMintable: boolean; // Owner can mint new tokens

  // Liquidity Lock
  liquidityLocked: boolean;
  liquidityLockPercent: number; // % of LP tokens locked
  liquidityLockEndDate: string | null; // When lock expires
  totalLiquidity: number; // Total liquidity in USD

  // Ownership & Control
  hasHiddenOwner: boolean;
  canTakeBackOwnership: boolean;
  ownerCanChangeBalance: boolean;
  hasSelfDestruct: boolean;

  // Trading Restrictions
  buyTax: number; // Percentage
  sellTax: number;
  cannotBuy: boolean;
  cannotSellAll: boolean;
  hasAntiWhale: boolean;
  hasTradingCooldown: boolean;
  isBlacklisted: boolean;
  transferPausable: boolean;

  // Token Info
  holderCount: number;
  lpHolderCount: number;
  isOnDex: boolean;
  dexList: string[];

  // Risk Assessment
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100, higher = safer
  warnings: string[];

  // Metadata
  fetchedAt: string;
  dataSource: 'goplus';
}

class ContractSecurityService {
  private readonly GOPLUS_API = 'https://api.gopluslabs.io/api/v1';
  private readonly CACHE_TTL = 300; // 5 minutes cache

  /**
   * Get contract address for a token symbol
   */
  getContractInfo(symbol: string): { address: string; chain: ChainId } | null {
    const upperSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
    return TOKEN_CONTRACTS[upperSymbol] || null;
  }

  /**
   * Add or update a token contract mapping
   */
  addTokenContract(symbol: string, address: string, chain: ChainId): void {
    TOKEN_CONTRACTS[symbol.toUpperCase()] = { address, chain };
  }

  /**
   * Check if we have contract info for a symbol
   */
  hasContractInfo(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
    return upperSymbol in TOKEN_CONTRACTS;
  }

  /**
   * Fetch security data from GoPlus API
   */
  private async fetchGoPlusData(
    contractAddress: string,
    chainId: string
  ): Promise<GoPlusTokenSecurity | null> {
    try {
      const cacheKey = `goplus:${chainId}:${contractAddress.toLowerCase()}`;

      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const url = `${this.GOPLUS_API}/token_security/${chainId}?contract_addresses=${contractAddress}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`GoPlus API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.code !== 1 || !data.result) {
        console.error('GoPlus API returned no data:', data);
        return null;
      }

      const tokenData = data.result[contractAddress.toLowerCase()];

      if (!tokenData) {
        console.error('Token not found in GoPlus response');
        return null;
      }

      // Cache the result
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(tokenData));

      return tokenData;
    } catch (error) {
      console.error('GoPlus API fetch error:', error);
      return null;
    }
  }

  /**
   * Analyze liquidity lock status
   */
  private analyzeLiquidityLock(lpHolders?: GoPlusTokenSecurity['lp_holders']): {
    locked: boolean;
    lockedPercent: number;
    lockEndDate: string | null;
  } {
    if (!lpHolders || lpHolders.length === 0) {
      return { locked: false, lockedPercent: 0, lockEndDate: null };
    }

    let totalLockedPercent = 0;
    let latestLockEnd: string | null = null;

    for (const holder of lpHolders) {
      if (holder.is_locked === 1) {
        totalLockedPercent += parseFloat(holder.percent || '0') * 100;

        if (holder.locked_detail && holder.locked_detail.length > 0) {
          for (const detail of holder.locked_detail) {
            const endTime = detail.end_time;
            if (!latestLockEnd || endTime > latestLockEnd) {
              latestLockEnd = endTime;
            }
          }
        }
      }
    }

    // Format lock end date
    let lockEndDate: string | null = null;
    if (latestLockEnd) {
      const timestamp = parseInt(latestLockEnd);
      if (!isNaN(timestamp)) {
        lockEndDate = new Date(timestamp * 1000).toISOString();
      }
    }

    return {
      locked: totalLockedPercent > 50, // Consider locked if >50% of LP is locked
      lockedPercent: Math.min(100, totalLockedPercent),
      lockEndDate,
    };
  }

  /**
   * Calculate total liquidity from DEX data
   */
  private calculateTotalLiquidity(dexList?: GoPlusTokenSecurity['dex']): number {
    if (!dexList || dexList.length === 0) return 0;

    return dexList.reduce((total, dex) => {
      return total + parseFloat(dex.liquidity || '0');
    }, 0);
  }

  /**
   * Calculate risk score and level
   */
  private calculateRisk(security: Partial<ContractSecurityResult>): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    warnings: string[];
  } {
    let score = 100;
    const warnings: string[] = [];

    // Critical issues (-40 each)
    if (security.isHoneypot) {
      score -= 40;
      warnings.push('🚨 HONEYPOT: Token cannot be sold!');
    }

    // Severe issues (-25 each)
    if (!security.isVerified) {
      score -= 25;
      warnings.push('⚠️ Contract source code is NOT verified');
    }
    if (security.isMintable) {
      score -= 25;
      warnings.push('⚠️ Owner can mint unlimited tokens');
    }
    if (security.ownerCanChangeBalance) {
      score -= 25;
      warnings.push('⚠️ Owner can modify token balances');
    }
    if (security.hasSelfDestruct) {
      score -= 25;
      warnings.push('⚠️ Contract has self-destruct function');
    }

    // Major issues (-15 each)
    if (!security.liquidityLocked) {
      score -= 15;
      warnings.push('⚠️ Liquidity is NOT locked');
    } else if (security.liquidityLockPercent && security.liquidityLockPercent < 80) {
      score -= 10;
      warnings.push(`⚠️ Only ${security.liquidityLockPercent.toFixed(1)}% of liquidity is locked`);
    }
    if (security.canTakeBackOwnership) {
      score -= 15;
      warnings.push('⚠️ Ownership can be reclaimed');
    }
    if (security.hasHiddenOwner) {
      score -= 15;
      warnings.push('⚠️ Contract has hidden owner');
    }

    // Moderate issues (-10 each)
    if (security.sellTax && security.sellTax > 10) {
      score -= 10;
      warnings.push(`⚠️ High sell tax: ${security.sellTax}%`);
    }
    if (security.buyTax && security.buyTax > 10) {
      score -= 10;
      warnings.push(`⚠️ High buy tax: ${security.buyTax}%`);
    }
    if (security.cannotSellAll) {
      score -= 10;
      warnings.push('⚠️ Cannot sell all tokens at once');
    }
    if (security.transferPausable) {
      score -= 10;
      warnings.push('⚠️ Transfers can be paused');
    }
    if (security.isBlacklisted) {
      score -= 10;
      warnings.push('⚠️ Address blacklisting enabled');
    }

    // Minor issues (-5 each)
    if (security.hasTradingCooldown) {
      score -= 5;
      warnings.push('ℹ️ Trading cooldown between transactions');
    }
    if (security.holderCount && security.holderCount < 100) {
      score -= 5;
      warnings.push('ℹ️ Low holder count (<100)');
    }

    // Positive factors (+5 each)
    if (security.isVerified) score += 5;
    if (security.liquidityLocked && security.liquidityLockPercent && security.liquidityLockPercent >= 90) score += 5;
    if (security.holderCount && security.holderCount > 1000) score += 5;

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) riskLevel = 'low';
    else if (score >= 60) riskLevel = 'medium';
    else if (score >= 30) riskLevel = 'high';
    else riskLevel = 'critical';

    return { riskLevel, riskScore: score, warnings };
  }

  /**
   * Main method: Get full contract security analysis
   */
  async analyzeContract(
    symbol: string,
    contractAddress?: string,
    chain?: ChainId
  ): Promise<ContractSecurityResult | null> {
    // Get contract info from mapping or use provided values
    let address = contractAddress;
    let chainInfo = chain;

    if (!address) {
      const contractInfo = this.getContractInfo(symbol);
      if (!contractInfo) {
        console.log(`No contract info found for ${symbol}`);
        return null;
      }
      address = contractInfo.address;
      chainInfo = contractInfo.chain;
    }

    if (!chainInfo) {
      chainInfo = 'ethereum'; // Default to Ethereum
    }

    const chainId = CHAIN_IDS[chainInfo];

    // Skip Solana for now (different API)
    if (chainId === 'solana') {
      console.log('Solana tokens not yet supported');
      return null;
    }

    // Fetch GoPlus data
    const goPlusData = await this.fetchGoPlusData(address, chainId);

    if (!goPlusData) {
      return null;
    }

    // Analyze liquidity lock
    const liquidityLock = this.analyzeLiquidityLock(goPlusData.lp_holders);
    const totalLiquidity = this.calculateTotalLiquidity(goPlusData.dex);

    // Build partial result for risk calculation
    const partialResult: Partial<ContractSecurityResult> = {
      isVerified: goPlusData.is_open_source === '1',
      isHoneypot: goPlusData.is_honeypot === '1',
      isMintable: goPlusData.is_mintable === '1',
      liquidityLocked: liquidityLock.locked,
      liquidityLockPercent: liquidityLock.lockedPercent,
      hasHiddenOwner: goPlusData.hidden_owner === '1',
      canTakeBackOwnership: goPlusData.can_take_back_ownership === '1',
      ownerCanChangeBalance: goPlusData.owner_change_balance === '1',
      hasSelfDestruct: goPlusData.selfdestruct === '1',
      buyTax: parseFloat(goPlusData.buy_tax || '0') * 100,
      sellTax: parseFloat(goPlusData.sell_tax || '0') * 100,
      cannotBuy: goPlusData.cannot_buy === '1',
      cannotSellAll: goPlusData.cannot_sell_all === '1',
      hasAntiWhale: goPlusData.is_anti_whale === '1',
      hasTradingCooldown: goPlusData.trading_cooldown === '1',
      isBlacklisted: goPlusData.is_blacklisted === '1',
      transferPausable: goPlusData.transfer_pausable === '1',
      holderCount: parseInt(goPlusData.holder_count || '0'),
      lpHolderCount: parseInt(goPlusData.lp_holder_count || '0'),
    };

    // Calculate risk
    const risk = this.calculateRisk(partialResult);

    // Build full result
    const result: ContractSecurityResult = {
      symbol: symbol.toUpperCase(),
      contractAddress: address,
      chain: chainInfo,
      chainId,

      isVerified: partialResult.isVerified!,
      isHoneypot: partialResult.isHoneypot!,
      isMintable: partialResult.isMintable!,

      liquidityLocked: partialResult.liquidityLocked!,
      liquidityLockPercent: partialResult.liquidityLockPercent!,
      liquidityLockEndDate: liquidityLock.lockEndDate,
      totalLiquidity,

      hasHiddenOwner: partialResult.hasHiddenOwner!,
      canTakeBackOwnership: partialResult.canTakeBackOwnership!,
      ownerCanChangeBalance: partialResult.ownerCanChangeBalance!,
      hasSelfDestruct: partialResult.hasSelfDestruct!,

      buyTax: partialResult.buyTax!,
      sellTax: partialResult.sellTax!,
      cannotBuy: partialResult.cannotBuy!,
      cannotSellAll: partialResult.cannotSellAll!,
      hasAntiWhale: partialResult.hasAntiWhale!,
      hasTradingCooldown: partialResult.hasTradingCooldown!,
      isBlacklisted: partialResult.isBlacklisted!,
      transferPausable: partialResult.transferPausable!,

      holderCount: partialResult.holderCount!,
      lpHolderCount: partialResult.lpHolderCount!,
      isOnDex: goPlusData.is_in_dex === '1',
      dexList: goPlusData.dex?.map(d => d.name) || [],

      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      warnings: risk.warnings,

      fetchedAt: new Date().toISOString(),
      dataSource: 'goplus',
    };

    return result;
  }

  /**
   * Quick honeypot check
   */
  async isHoneypot(symbol: string): Promise<boolean | null> {
    const result = await this.analyzeContract(symbol);
    return result?.isHoneypot ?? null;
  }

  /**
   * Quick liquidity lock check
   */
  async isLiquidityLocked(symbol: string): Promise<{
    locked: boolean;
    percent: number;
    endDate: string | null;
  } | null> {
    const result = await this.analyzeContract(symbol);
    if (!result) return null;

    return {
      locked: result.liquidityLocked,
      percent: result.liquidityLockPercent,
      endDate: result.liquidityLockEndDate,
    };
  }

  /**
   * Get supported tokens list
   */
  getSupportedTokens(): string[] {
    return Object.keys(TOKEN_CONTRACTS);
  }
}

export const contractSecurityService = new ContractSecurityService();
