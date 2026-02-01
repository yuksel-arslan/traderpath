// ===========================================
// Local Coin Icon Cache
// SVG-based icons stored locally to avoid external API calls
// ===========================================

// Color palette for coins (brand colors)
const COIN_COLORS: Record<string, { bg: string; text: string }> = {
  BTC: { bg: '#F7931A', text: '#FFFFFF' },
  ETH: { bg: '#627EEA', text: '#FFFFFF' },
  BNB: { bg: '#F3BA2F', text: '#1E2026' },
  SOL: { bg: '#9945FF', text: '#FFFFFF' },
  XRP: { bg: '#23292F', text: '#FFFFFF' },
  ADA: { bg: '#0033AD', text: '#FFFFFF' },
  DOGE: { bg: '#C2A633', text: '#1A1A1A' },
  AVAX: { bg: '#E84142', text: '#FFFFFF' },
  DOT: { bg: '#E6007A', text: '#FFFFFF' },
  MATIC: { bg: '#8247E5', text: '#FFFFFF' },
  LINK: { bg: '#375BD2', text: '#FFFFFF' },
  UNI: { bg: '#FF007A', text: '#FFFFFF' },
  ATOM: { bg: '#2E3148', text: '#FFFFFF' },
  LTC: { bg: '#345D9D', text: '#FFFFFF' },
  FIL: { bg: '#0090FF', text: '#FFFFFF' },
  NEAR: { bg: '#000000', text: '#FFFFFF' },
  APT: { bg: '#4DA2FF', text: '#FFFFFF' },
  ARB: { bg: '#28A0F0', text: '#FFFFFF' },
  OP: { bg: '#FF0420', text: '#FFFFFF' },
  INJ: { bg: '#00F2EA', text: '#000000' },
  SUI: { bg: '#6FBCF0', text: '#FFFFFF' },
  SEI: { bg: '#9B1C1C', text: '#FFFFFF' },
  TIA: { bg: '#7B2BF9', text: '#FFFFFF' },
  PEPE: { bg: '#479F53', text: '#FFFFFF' },
  SHIB: { bg: '#FFA409', text: '#1A1A1A' },
  WIF: { bg: '#B17236', text: '#FFFFFF' },
  BONK: { bg: '#F8A527', text: '#1A1A1A' },
  RENDER: { bg: '#000000', text: '#FFFFFF' },
  FET: { bg: '#1D2951', text: '#FFFFFF' },
  TRX: { bg: '#EF0027', text: '#FFFFFF' },
  TON: { bg: '#0098EA', text: '#FFFFFF' },
  ICP: { bg: '#29ABE2', text: '#FFFFFF' },
  BCH: { bg: '#8DC351', text: '#FFFFFF' },
  ETC: { bg: '#328332', text: '#FFFFFF' },
  XLM: { bg: '#000000', text: '#FFFFFF' },
  HBAR: { bg: '#000000', text: '#FFFFFF' },
  VET: { bg: '#15BDFF', text: '#FFFFFF' },
  FTM: { bg: '#1969FF', text: '#FFFFFF' },
  ALGO: { bg: '#000000', text: '#FFFFFF' },
  SAND: { bg: '#04ADEF', text: '#FFFFFF' },
  MANA: { bg: '#FF2D55', text: '#FFFFFF' },
  AXS: { bg: '#0055D5', text: '#FFFFFF' },
  GALA: { bg: '#000000', text: '#FFFFFF' },
  ENJ: { bg: '#7866D5', text: '#FFFFFF' },
  CHZ: { bg: '#CD0124', text: '#FFFFFF' },
  CRV: { bg: '#0000FF', text: '#FFFFFF' },
  AAVE: { bg: '#B6509E', text: '#FFFFFF' },
  MKR: { bg: '#1AAB9B', text: '#FFFFFF' },
  SNX: { bg: '#00D1FF', text: '#000000' },
  COMP: { bg: '#00D395', text: '#000000' },
  YFI: { bg: '#006AE3', text: '#FFFFFF' },
  SUSHI: { bg: '#FA52A0', text: '#FFFFFF' },
  IMX: { bg: '#00BFFF', text: '#FFFFFF' },
  WLD: { bg: '#000000', text: '#FFFFFF' },
  AGIX: { bg: '#6916FF', text: '#FFFFFF' },
  TAO: { bg: '#000000', text: '#FFFFFF' },
  ORDI: { bg: '#000000', text: '#FFFFFF' },
  JUP: { bg: '#C8FF00', text: '#000000' },
  PYTH: { bg: '#6B47ED', text: '#FFFFFF' },
  STRK: { bg: '#EC796B', text: '#FFFFFF' },
};

// Default colors for unknown coins
const DEFAULT_COLORS = { bg: '#4F46E5', text: '#FFFFFF' };

/**
 * Generate SVG data URL for a coin icon
 * This creates a simple branded circle with coin symbol
 */
export function generateCoinIconSvg(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().slice(0, 4);
  const colors = COIN_COLORS[upperSymbol] || DEFAULT_COLORS;
  const displaySymbol = upperSymbol.slice(0, 2);

  // Calculate font size based on symbol length
  const fontSize = displaySymbol.length > 2 ? 28 : 32;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustColor(colors.bg, -20)};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad)" stroke="${adjustColor(colors.bg, -30)}" stroke-width="2"/>
      <text x="50" y="58" font-size="${fontSize}" fill="${colors.text}" text-anchor="middle" font-weight="bold" font-family="system-ui, -apple-system, sans-serif">${displaySymbol}</text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Adjust color brightness
 */
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Get coin icon - returns local SVG data URL
 * No external API calls, fully offline capable
 */
export function getLocalCoinIcon(symbol: string): string {
  return generateCoinIconSvg(symbol);
}

/**
 * Get coin brand color
 */
export function getCoinColor(symbol: string): { bg: string; text: string } {
  const upperSymbol = symbol.toUpperCase();
  return COIN_COLORS[upperSymbol] || DEFAULT_COLORS;
}

// Export the color map for components that need it
export { COIN_COLORS };
