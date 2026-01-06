// Coin icon utilities - using CoinGecko CDN for real coin images

// Map of symbol to CoinGecko coin ID
const COIN_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  FIL: 'filecoin',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  RENDER: 'render-token',
  FET: 'fetch-ai',
  RNDR: 'render-token',
  TRX: 'tron',
  TON: 'the-open-network',
  ICP: 'internet-computer',
  BCH: 'bitcoin-cash',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  HBAR: 'hedera-hashgraph',
  VET: 'vechain',
  FTM: 'fantom',
  ALGO: 'algorand',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  GALA: 'gala',
  ENJ: 'enjincoin',
  CHZ: 'chiliz',
  CRV: 'curve-dao-token',
  AAVE: 'aave',
  MKR: 'maker',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  YFI: 'yearn-finance',
  SUSHI: 'sushi',
  ONE: 'harmony',
  ZIL: 'zilliqa',
  ENS: 'ethereum-name-service',
  LDO: 'lido-dao',
  RPL: 'rocket-pool',
  GMX: 'gmx',
  DYDX: 'dydx',
  IMX: 'immutable-x',
  BLUR: 'blur',
  LUNC: 'terra-luna',
  LUNA: 'terra-luna-2',
  KAVA: 'kava',
  ROSE: 'oasis-network',
  ZEC: 'zcash',
  XMR: 'monero',
  DASH: 'dash',
  CAKE: 'pancakeswap-token',
  '1INCH': '1inch',
  BAT: 'basic-attention-token',
  GRT: 'the-graph',
  STX: 'blockstack',
  FLOW: 'flow',
  EGLD: 'elrond-erd-2',
  THETA: 'theta-token',
  XTZ: 'tezos',
  EOS: 'eos',
  NEO: 'neo',
  IOTA: 'iota',
  KSM: 'kusama',
  RUNE: 'thorchain',
  OCEAN: 'ocean-protocol',
  ANKR: 'ankr',
  CKB: 'nervos-network',
  JASMY: 'jasmycoin',
  SKL: 'skale',
  ICX: 'icon',
  QTUM: 'qtum',
  ZRX: '0x',
  STORJ: 'storj',
  CELO: 'celo',
  KLAY: 'klay-token',
  HNT: 'helium',
  MINA: 'mina-protocol',
  GLMR: 'moonbeam',
  ASTR: 'astar',
  AGIX: 'singularitynet',
  WLD: 'worldcoin-wld',
  JTO: 'jito-governance-token',
  JUP: 'jupiter-exchange-solana',
  PYTH: 'pyth-network',
  STRK: 'starknet',
  BOME: 'book-of-meme',
  TAO: 'bittensor',
  ORDI: 'ordinals',
  SATS: '1000sats',
};

// Get CoinGecko image URL for a coin
export function getCoinIconUrl(symbol: string, size: 'small' | 'large' = 'small'): string {
  const upperSymbol = symbol.toUpperCase();
  const coinId = COIN_ID_MAP[upperSymbol];

  if (coinId) {
    // CoinGecko CDN
    return `https://assets.coingecko.com/coins/images/${getCoinGeckoImageId(coinId)}/${size}/${coinId}.png`;
  }

  // Fallback: try CryptoCompare
  return `https://www.cryptocompare.com/media/37746238/${upperSymbol.toLowerCase()}.png`;
}

// Alternative simpler approach using CryptoIcons repo
export function getCoinIcon(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  // Using cryptocurrency-icons CDN (more reliable)
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${upperSymbol.toLowerCase()}.png`;
}

// Fallback icon URL when coin icon is not found
export const FALLBACK_COIN_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%234F46E5"/%3E%3Ctext x="50" y="60" font-size="30" fill="white" text-anchor="middle" font-weight="bold"%3E%3F%3C/text%3E%3C/svg%3E';

// Helper to get CoinGecko image ID (they use different IDs)
function getCoinGeckoImageId(coinId: string): number {
  const idMap: Record<string, number> = {
    'bitcoin': 1,
    'ethereum': 279,
    'binancecoin': 825,
    'solana': 4128,
    'ripple': 44,
    'cardano': 975,
    'dogecoin': 5,
    'avalanche-2': 12559,
    'polkadot': 12171,
    'matic-network': 4713,
    'chainlink': 877,
    'uniswap': 12504,
    'cosmos': 1481,
    'litecoin': 2,
    'filecoin': 12817,
    'near': 10365,
    'aptos': 26455,
    'arbitrum': 16547,
    'optimism': 25244,
    'injective-protocol': 12882,
    'sui': 26375,
    'sei-network': 28205,
    'celestia': 31967,
    'pepe': 29850,
    'shiba-inu': 11939,
    'dogwifcoin': 33566,
    'bonk': 28600,
    'render-token': 5690,
    'fetch-ai': 5681,
  };
  return idMap[coinId] || 1;
}

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
  };
  return names[symbol.toUpperCase()] || symbol;
}
