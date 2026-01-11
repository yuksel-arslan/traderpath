/**
 * Paid Data Provider Interfaces
 *
 * These interfaces define the structure for premium data sources.
 * Implementation requires API keys and subscriptions.
 *
 * Supported Providers:
 * - Glassnode: On-chain analytics (from $29/month)
 * - CryptoQuant: On-chain metrics (from $39/month)
 * - Santiment: Social/on-chain data (from $49/month)
 * - Kaiko: Institutional market data (enterprise)
 * - Nansen: Smart money tracking (from $150/month)
 * - IntoTheBlock: Blockchain analytics (from $50/month)
 */

import {
  DataProviderConfig,
  DataProviderResponse,
  OnChainMetrics,
  SocialSentiment,
  InstitutionalFlow,
  SmartMoneyIndicators,
  ProviderCapabilities,
} from '../types';

// =============================================================================
// PROVIDER CONFIGURATIONS (Update with your API keys)
// =============================================================================

export const PAID_PROVIDERS: Record<string, DataProviderConfig> = {
  glassnode: {
    name: 'Glassnode',
    apiKey: process.env.GLASSNODE_API_KEY,
    baseUrl: 'https://api.glassnode.com/v1',
    rateLimit: 60, // per minute
    isPaid: true,
    isEnabled: !!process.env.GLASSNODE_API_KEY,
  },
  cryptoquant: {
    name: 'CryptoQuant',
    apiKey: process.env.CRYPTOQUANT_API_KEY,
    baseUrl: 'https://api.cryptoquant.com/v1',
    rateLimit: 100,
    isPaid: true,
    isEnabled: !!process.env.CRYPTOQUANT_API_KEY,
  },
  santiment: {
    name: 'Santiment',
    apiKey: process.env.SANTIMENT_API_KEY,
    baseUrl: 'https://api.santiment.net/graphql',
    rateLimit: 50,
    isPaid: true,
    isEnabled: !!process.env.SANTIMENT_API_KEY,
  },
  nansen: {
    name: 'Nansen',
    apiKey: process.env.NANSEN_API_KEY,
    baseUrl: 'https://api.nansen.ai/v1',
    rateLimit: 30,
    isPaid: true,
    isEnabled: !!process.env.NANSEN_API_KEY,
  },
  intotheblock: {
    name: 'IntoTheBlock',
    apiKey: process.env.INTOTHEBLOCK_API_KEY,
    baseUrl: 'https://api.intotheblock.com/v1',
    rateLimit: 60,
    isPaid: true,
    isEnabled: !!process.env.INTOTHEBLOCK_API_KEY,
  },
};

// =============================================================================
// PROVIDER INTERFACES
// =============================================================================

/**
 * Base interface for all data providers
 */
export interface IDataProvider {
  name: string;
  config: DataProviderConfig;
  capabilities: ProviderCapabilities;
  isAvailable(): boolean;
}

/**
 * On-chain data provider interface (Glassnode, CryptoQuant)
 */
export interface IOnChainProvider extends IDataProvider {
  getExchangeFlows(asset: string): Promise<DataProviderResponse<OnChainMetrics>>;
  getWhaleActivity(asset: string): Promise<DataProviderResponse<OnChainMetrics>>;
  getNetworkActivity(asset: string): Promise<DataProviderResponse<OnChainMetrics>>;
  getSupplyMetrics(asset: string): Promise<DataProviderResponse<OnChainMetrics>>;
}

/**
 * Social sentiment provider interface (Santiment)
 */
export interface ISocialProvider extends IDataProvider {
  getSocialVolume(asset: string): Promise<DataProviderResponse<SocialSentiment>>;
  getSocialSentiment(asset: string): Promise<DataProviderResponse<SocialSentiment>>;
  getTrendingAssets(): Promise<DataProviderResponse<SocialSentiment[]>>;
}

/**
 * Institutional flow provider interface
 */
export interface IInstitutionalProvider extends IDataProvider {
  getETFFlows(): Promise<DataProviderResponse<InstitutionalFlow>>;
  getFuturesData(asset: string): Promise<DataProviderResponse<InstitutionalFlow>>;
  getOptionsData(asset: string): Promise<DataProviderResponse<InstitutionalFlow>>;
}

/**
 * Smart money tracking provider interface (Nansen)
 */
export interface ISmartMoneyProvider extends IDataProvider {
  getSmartMoneyFlows(asset: string): Promise<DataProviderResponse<SmartMoneyIndicators>>;
  getWhaleWallets(asset: string): Promise<DataProviderResponse<SmartMoneyIndicators>>;
  getInstitutionalActivity(): Promise<DataProviderResponse<SmartMoneyIndicators>>;
}

// =============================================================================
// PLACEHOLDER IMPLEMENTATIONS (To be implemented when API keys are available)
// =============================================================================

/**
 * Glassnode Provider Placeholder
 *
 * Key Metrics Available:
 * - Exchange Inflow/Outflow
 * - Active Addresses
 * - SOPR (Spent Output Profit Ratio)
 * - NUPL (Net Unrealized Profit/Loss)
 * - Supply in Profit
 * - Whale Holdings
 */
export class GlassnodeProvider implements IOnChainProvider {
  name = 'Glassnode';
  config = PAID_PROVIDERS.glassnode;
  capabilities: ProviderCapabilities = {
    marketSentiment: true,
    onChainMetrics: true,
    socialSentiment: false,
    institutionalFlow: false,
    smartMoneyIndicators: true,
    historicalData: true,
    realTimeData: false,
  };

  isAvailable(): boolean {
    return this.config.isEnabled;
  }

  async getExchangeFlows(asset: string): Promise<DataProviderResponse<OnChainMetrics>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Glassnode API key not configured. Set GLASSNODE_API_KEY env variable.',
        timestamp: Date.now(),
      };
    }
    // TODO: Implement when API key is available
    return {
      success: false,
      error: 'Not implemented yet',
      timestamp: Date.now(),
    };
  }

  async getWhaleActivity(asset: string): Promise<DataProviderResponse<OnChainMetrics>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Glassnode API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getNetworkActivity(asset: string): Promise<DataProviderResponse<OnChainMetrics>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Glassnode API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getSupplyMetrics(asset: string): Promise<DataProviderResponse<OnChainMetrics>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Glassnode API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }
}

/**
 * Santiment Provider Placeholder
 *
 * Key Metrics Available:
 * - Social Volume
 * - Social Sentiment
 * - Development Activity
 * - Whale Transaction Count
 * - Exchange Flow Balance
 */
export class SantimentProvider implements ISocialProvider {
  name = 'Santiment';
  config = PAID_PROVIDERS.santiment;
  capabilities: ProviderCapabilities = {
    marketSentiment: true,
    onChainMetrics: true,
    socialSentiment: true,
    institutionalFlow: false,
    smartMoneyIndicators: true,
    historicalData: true,
    realTimeData: false,
  };

  isAvailable(): boolean {
    return this.config.isEnabled;
  }

  async getSocialVolume(asset: string): Promise<DataProviderResponse<SocialSentiment>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Santiment API key not configured. Set SANTIMENT_API_KEY env variable.',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getSocialSentiment(asset: string): Promise<DataProviderResponse<SocialSentiment>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Santiment API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getTrendingAssets(): Promise<DataProviderResponse<SocialSentiment[]>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Santiment API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }
}

/**
 * Nansen Provider Placeholder
 *
 * Key Metrics Available:
 * - Smart Money Flows
 * - Whale Wallet Tracking
 * - DEX Trading Analysis
 * - NFT Analytics
 * - Token God Mode
 */
export class NansenProvider implements ISmartMoneyProvider {
  name = 'Nansen';
  config = PAID_PROVIDERS.nansen;
  capabilities: ProviderCapabilities = {
    marketSentiment: false,
    onChainMetrics: true,
    socialSentiment: false,
    institutionalFlow: true,
    smartMoneyIndicators: true,
    historicalData: true,
    realTimeData: true,
  };

  isAvailable(): boolean {
    return this.config.isEnabled;
  }

  async getSmartMoneyFlows(asset: string): Promise<DataProviderResponse<SmartMoneyIndicators>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Nansen API key not configured. Set NANSEN_API_KEY env variable.',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getWhaleWallets(asset: string): Promise<DataProviderResponse<SmartMoneyIndicators>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Nansen API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getInstitutionalActivity(): Promise<DataProviderResponse<SmartMoneyIndicators>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Nansen API key not configured',
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }
}

// =============================================================================
// AGGREGATOR - Combines data from multiple providers
// =============================================================================

export class DataProviderAggregator {
  private providers: Map<string, IDataProvider> = new Map();

  constructor() {
    // Initialize available providers
    this.providers.set('glassnode', new GlassnodeProvider());
    this.providers.set('santiment', new SantimentProvider());
    this.providers.set('nansen', new NansenProvider());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name]) => name);
  }

  getProviderStatus(): Record<string, { available: boolean; capabilities: ProviderCapabilities }> {
    const status: Record<string, { available: boolean; capabilities: ProviderCapabilities }> = {};

    for (const [name, provider] of this.providers) {
      status[name] = {
        available: provider.isAvailable(),
        capabilities: provider.capabilities,
      };
    }

    return status;
  }

  /**
   * Get combined on-chain metrics from all available providers
   */
  async getOnChainMetrics(asset: string): Promise<DataProviderResponse<OnChainMetrics>> {
    const glassnode = this.providers.get('glassnode') as GlassnodeProvider;

    if (glassnode?.isAvailable()) {
      const flows = await glassnode.getExchangeFlows(asset);
      if (flows.success) return flows;
    }

    return {
      success: false,
      error: 'No on-chain data providers available. Configure GLASSNODE_API_KEY.',
      timestamp: Date.now(),
    };
  }

  /**
   * Get combined social sentiment from all available providers
   */
  async getSocialSentiment(asset: string): Promise<DataProviderResponse<SocialSentiment>> {
    const santiment = this.providers.get('santiment') as SantimentProvider;

    if (santiment?.isAvailable()) {
      const sentiment = await santiment.getSocialSentiment(asset);
      if (sentiment.success) return sentiment;
    }

    return {
      success: false,
      error: 'No social sentiment providers available. Configure SANTIMENT_API_KEY.',
      timestamp: Date.now(),
    };
  }

  /**
   * Get smart money indicators
   */
  async getSmartMoneyData(asset: string): Promise<DataProviderResponse<SmartMoneyIndicators>> {
    const nansen = this.providers.get('nansen') as NansenProvider;

    if (nansen?.isAvailable()) {
      const data = await nansen.getSmartMoneyFlows(asset);
      if (data.success) return data;
    }

    return {
      success: false,
      error: 'No smart money tracking providers available. Configure NANSEN_API_KEY.',
      timestamp: Date.now(),
    };
  }
}

// Export singleton instance
export const dataProviderAggregator = new DataProviderAggregator();
