// ===========================================
// Coin Icon Utilities
// Uses local SVG generation - no external API calls
// ===========================================

// Import local cache for instant loading
import { getLocalCoinIcon, getCoinColor, COIN_COLORS } from './coin-icons-cache';

// Re-export local icon function as getCoinIcon for backward compatibility
export function getCoinIcon(symbol: string): string {
  return getLocalCoinIcon(symbol);
}

// Re-export getCoinIconUrl for backward compatibility
export function getCoinIconUrl(symbol: string, _size: 'small' | 'large' = 'small'): string {
  return getLocalCoinIcon(symbol);
}

// Fallback icon URL (uses local SVG generation)
export const FALLBACK_COIN_ICON = getLocalCoinIcon('?');

// Export coin colors for components
export { getCoinColor, COIN_COLORS };

// Get coin name from symbol
export function getCoinName(symbol: string): string {
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
  };
  return names[symbol.toUpperCase()] || symbol;
}
