// ===========================================
// Coin Icon Utilities
// Uses asset logos cache with API support
// ===========================================

// Import from new asset logos cache
import {
  getLogoUrl,
  getAssetLogo,
  generateFallbackSvg,
  AssetClass,
} from './asset-logos-cache';

// Re-export getCoinIcon for backward compatibility
export function getCoinIcon(symbol: string): string {
  return getLogoUrl(symbol);
}

// Re-export getCoinIconUrl for backward compatibility
export function getCoinIconUrl(symbol: string, _size: 'small' | 'large' = 'small'): string {
  return getLogoUrl(symbol);
}

// Fallback icon URL
export const FALLBACK_COIN_ICON = generateFallbackSvg('?', '#4F46E5');

// Get coin color
export function getCoinColor(symbol: string): { bg: string; text: string } {
  const logoInfo = getAssetLogo(symbol);

  // Determine text color based on background brightness
  const getBrightness = (hex: string): number => {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    return (R * 299 + G * 587 + B * 114) / 1000;
  };

  const textColor = getBrightness(logoInfo.color) > 128 ? '#000000' : '#FFFFFF';

  return {
    bg: logoInfo.color,
    text: textColor,
  };
}

// Legacy COIN_COLORS export - build from cache data
export const COIN_COLORS: Record<string, { bg: string; text: string }> = {};

// Get coin name from symbol
export function getCoinName(symbol: string): string {
  const logoInfo = getAssetLogo(symbol);

  // If we have a name from the cache, use it
  if (!logoInfo.isDefault && logoInfo.name) {
    return logoInfo.name;
  }

  // Fallback to hardcoded names for common symbols
  const names: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'BNB',
    SOL: 'Solana',
    XRP: 'XRP',
    ADA: 'Cardano',
    DOGE: 'Dogecoin',
    AVAX: 'Avalanche',
    DOT: 'Polkadot',
    MATIC: 'Polygon',
    LINK: 'Chainlink',
    UNI: 'Uniswap',
    ATOM: 'Cosmos',
    LTC: 'Litecoin',
    FIL: 'Filecoin',
    NEAR: 'NEAR',
    APT: 'Aptos',
    ARB: 'Arbitrum',
    OP: 'Optimism',
    INJ: 'Injective',
    SUI: 'Sui',
    SEI: 'Sei',
    TIA: 'Celestia',
    PEPE: 'Pepe',
    SHIB: 'Shiba Inu',
    WIF: 'dogwifhat',
    BONK: 'Bonk',
    RENDER: 'Render',
    FET: 'Fetch.ai',
    TRX: 'Tron',
    TON: 'Toncoin',
    ICP: 'Internet Computer',
    BCH: 'Bitcoin Cash',
    ETC: 'Ethereum Classic',
    XLM: 'Stellar',
    HBAR: 'Hedera',
    VET: 'VeChain',
    FTM: 'Fantom',
    ALGO: 'Algorand',
    SAND: 'The Sandbox',
    MANA: 'Decentraland',
    AXS: 'Axie Infinity',
    GALA: 'Gala',
    ENJ: 'Enjin Coin',
    CHZ: 'Chiliz',
    CRV: 'Curve',
    AAVE: 'Aave',
    MKR: 'Maker',
    SNX: 'Synthetix',
    COMP: 'Compound',
    YFI: 'Yearn Finance',
    SUSHI: 'SushiSwap',
    IMX: 'Immutable',
    WLD: 'Worldcoin',
    AGIX: 'SingularityNET',
    TAO: 'Bittensor',
    JUP: 'Jupiter',
    PYTH: 'Pyth Network',
    STRK: 'Starknet',
    // Stocks
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft',
    GOOGL: 'Alphabet',
    AMZN: 'Amazon',
    META: 'Meta Platforms',
    NVDA: 'NVIDIA',
    TSLA: 'Tesla',
    SPY: 'S&P 500 ETF',
    QQQ: 'Nasdaq 100 ETF',
    // Metals
    GLD: 'SPDR Gold',
    SLV: 'iShares Silver',
    XAUUSD: 'Gold',
    XAGUSD: 'Silver',
    // Bonds
    TLT: 'Treasury 20+ Year',
    BND: 'Total Bond Market',
  };

  return names[symbol.toUpperCase()] || symbol;
}

// Export asset class type
export type { AssetClass };
