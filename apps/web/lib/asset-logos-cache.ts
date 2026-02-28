// ===========================================
// Asset Logos Cache
// Client-side caching system for asset logos
// Fetches from API and caches in localStorage + memory
// ===========================================

// ===========================================
// Types
// ===========================================

export interface AssetLogoInfo {
  logoUrl: string;
  color: string;
  name: string;
}

export type AssetClass = 'crypto' | 'stocks' | 'metals' | 'bonds';

export interface CachedLogoInfo extends AssetLogoInfo {
  assetClass: AssetClass;
  isDefault: boolean;
}

interface LogoCache {
  crypto: Record<string, AssetLogoInfo>;
  stocks: Record<string, AssetLogoInfo>;
  metals: Record<string, AssetLogoInfo>;
  bonds: Record<string, AssetLogoInfo>;
  version: number;
  lastUpdated: string;
}

// ===========================================
// Constants
// ===========================================

const CACHE_KEY = 'traderpath_asset_logos';
const CACHE_VERSION_KEY = 'traderpath_asset_logos_version';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_COLOR = '#4F46E5'; // Indigo

// ===========================================
// Complete Asset Logo Data (hardcoded in frontend)
// Primary source - no API dependency
// ===========================================

const FALLBACK_CRYPTO_LOGOS: Record<string, AssetLogoInfo> = {
  // Major Cryptos
  BTC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png', color: '#F7931A', name: 'Bitcoin' },
  ETH: { logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png', color: '#627EEA', name: 'Ethereum' },
  BNB: { logoUrl: 'https://coin-images.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', color: '#F3BA2F', name: 'BNB' },
  SOL: { logoUrl: 'https://coin-images.coingecko.com/coins/images/4128/small/solana.png', color: '#9945FF', name: 'Solana' },
  XRP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', color: '#23292F', name: 'XRP' },
  ADA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/975/small/cardano.png', color: '#0033AD', name: 'Cardano' },
  DOGE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png', color: '#C2A633', name: 'Dogecoin' },
  AVAX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', color: '#E84142', name: 'Avalanche' },
  DOT: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12171/small/polkadot.png', color: '#E6007A', name: 'Polkadot' },
  MATIC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/4713/small/polygon.png', color: '#8247E5', name: 'Polygon' },
  LINK: { logoUrl: 'https://coin-images.coingecko.com/coins/images/877/small/chainlink-new-logo.png', color: '#375BD2', name: 'Chainlink' },
  UNI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12504/small/uniswap-uni.png', color: '#FF007A', name: 'Uniswap' },
  ATOM: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1481/small/cosmos_hub.png', color: '#2E3148', name: 'Cosmos' },
  LTC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/2/small/litecoin.png', color: '#345D9D', name: 'Litecoin' },
  FIL: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12817/small/filecoin.png', color: '#0090FF', name: 'Filecoin' },
  NEAR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/10365/small/near.jpg', color: '#000000', name: 'NEAR Protocol' },
  APT: { logoUrl: 'https://coin-images.coingecko.com/coins/images/26455/small/aptos_round.png', color: '#4DA2FF', name: 'Aptos' },
  ARB: { logoUrl: 'https://coin-images.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg', color: '#28A0F0', name: 'Arbitrum' },
  OP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/25244/small/Optimism.png', color: '#FF0420', name: 'Optimism' },
  INJ: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12882/small/Secondary_Symbol.png', color: '#00F2EA', name: 'Injective' },
  SUI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/26375/small/sui_asset.jpeg', color: '#6FBCF0', name: 'Sui' },
  SEI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png', color: '#9B1C1C', name: 'Sei' },
  TIA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/31967/small/tia.jpg', color: '#7B2BF9', name: 'Celestia' },
  // Meme Coins
  PEPE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/29850/small/pepe-token.jpeg', color: '#479F53', name: 'Pepe' },
  SHIB: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11939/small/shiba.png', color: '#FFA409', name: 'Shiba Inu' },
  WIF: { logoUrl: 'https://coin-images.coingecko.com/coins/images/33566/small/dogwifhat.jpg', color: '#B17236', name: 'dogwifhat' },
  BONK: { logoUrl: 'https://coin-images.coingecko.com/coins/images/28600/small/bonk.jpg', color: '#F8A527', name: 'Bonk' },
  FLOKI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/16746/small/FLOKI.png', color: '#F79420', name: 'Floki' },
  // AI & DePIN
  RENDER: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11636/small/rndr.png', color: '#000000', name: 'Render' },
  RNDR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11636/small/rndr.png', color: '#000000', name: 'Render' },
  FET: { logoUrl: 'https://coin-images.coingecko.com/coins/images/5681/small/Fetch.jpg', color: '#1D2951', name: 'Fetch.ai' },
  AGIX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/2138/small/singularitynet.png', color: '#6916FF', name: 'SingularityNET' },
  OCEAN: { logoUrl: 'https://coin-images.coingecko.com/coins/images/3687/small/ocean-protocol-logo.jpg', color: '#141414', name: 'Ocean Protocol' },
  TAO: { logoUrl: 'https://coin-images.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg', color: '#000000', name: 'Bittensor' },
  WLD: { logoUrl: 'https://coin-images.coingecko.com/coins/images/31069/small/worldcoin.jpeg', color: '#000000', name: 'Worldcoin' },
  // DeFi
  AAVE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12645/small/AAVE.png', color: '#B6509E', name: 'Aave' },
  MKR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1364/small/Mark_Maker.png', color: '#1AAB9B', name: 'Maker' },
  CRV: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12124/small/Curve.png', color: '#0000FF', name: 'Curve DAO' },
  COMP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/10775/small/COMP.png', color: '#00D395', name: 'Compound' },
  SNX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/3406/small/SNX.png', color: '#00D1FF', name: 'Synthetix' },
  YFI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11849/small/yearn-finance-yfi.png', color: '#006AE3', name: 'yearn.finance' },
  SUSHI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png', color: '#FA52A0', name: 'SushiSwap' },
  '1INCH': { logoUrl: 'https://coin-images.coingecko.com/coins/images/13469/small/1inch-token.png', color: '#1B314F', name: '1inch' },
  LDO: { logoUrl: 'https://coin-images.coingecko.com/coins/images/13573/small/Lido_DAO.png', color: '#00A3FF', name: 'Lido DAO' },
  BAL: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11683/small/Balancer.png', color: '#1E1E1E', name: 'Balancer' },
  // Gaming & Metaverse
  SAND: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12129/small/sandbox_logo.jpg', color: '#04ADEF', name: 'The Sandbox' },
  MANA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/878/small/decentraland-mana.png', color: '#FF2D55', name: 'Decentraland' },
  AXS: { logoUrl: 'https://coin-images.coingecko.com/coins/images/13029/small/axie_infinity_logo.png', color: '#0055D5', name: 'Axie Infinity' },
  GALA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png', color: '#000000', name: 'Gala' },
  ENJ: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1102/small/enjin-coin-logo.png', color: '#7866D5', name: 'Enjin Coin' },
  IMX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png', color: '#00BFFF', name: 'Immutable' },
  ILV: { logoUrl: 'https://coin-images.coingecko.com/coins/images/14468/small/illuvium.png', color: '#A855F7', name: 'Illuvium' },
  // Other Major Cryptos
  TRX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1094/small/tron-logo.png', color: '#EF0027', name: 'TRON' },
  TON: { logoUrl: 'https://coin-images.coingecko.com/coins/images/17980/small/ton_symbol.png', color: '#0098EA', name: 'Toncoin' },
  ICP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png', color: '#29ABE2', name: 'Internet Computer' },
  BCH: { logoUrl: 'https://coin-images.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png', color: '#8DC351', name: 'Bitcoin Cash' },
  ETC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/453/small/ethereum-classic-logo.png', color: '#328332', name: 'Ethereum Classic' },
  XLM: { logoUrl: 'https://coin-images.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png', color: '#000000', name: 'Stellar' },
  HBAR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/3688/small/hbar.png', color: '#000000', name: 'Hedera' },
  VET: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1167/small/VeChain-Logo-768x725.png', color: '#15BDFF', name: 'VeChain' },
  FTM: { logoUrl: 'https://coin-images.coingecko.com/coins/images/4001/small/Fantom_round.png', color: '#1969FF', name: 'Fantom' },
  ALGO: { logoUrl: 'https://coin-images.coingecko.com/coins/images/4380/small/download.png', color: '#000000', name: 'Algorand' },
  THETA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/2538/small/theta-token-logo.png', color: '#2AB8E6', name: 'Theta Network' },
  XTZ: { logoUrl: 'https://coin-images.coingecko.com/coins/images/976/small/Tezos-logo.png', color: '#2C7DF7', name: 'Tezos' },
  CHZ: { logoUrl: 'https://coin-images.coingecko.com/coins/images/8834/small/CHZ_Token_updated.png', color: '#CD0124', name: 'Chiliz' },
  // Solana Ecosystem
  JUP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/34188/small/jup.png', color: '#C8FF00', name: 'Jupiter' },
  PYTH: { logoUrl: 'https://coin-images.coingecko.com/coins/images/31924/small/pyth.png', color: '#6B47ED', name: 'Pyth Network' },
  RAY: { logoUrl: 'https://coin-images.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg', color: '#5A6FFF', name: 'Raydium' },
  ORCA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/17547/small/Orca_Logo.png', color: '#FFD15C', name: 'Orca' },
  // Layer 2 & Scaling
  STRK: { logoUrl: 'https://coin-images.coingecko.com/coins/images/26433/small/starknet.png', color: '#EC796B', name: 'Starknet' },
  MANTA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/34289/small/manta.jpg', color: '#0080FF', name: 'Manta Network' },
  METIS: { logoUrl: 'https://coin-images.coingecko.com/coins/images/15595/small/metis.PNG', color: '#00D2FF', name: 'Metis' },
  ZK: { logoUrl: 'https://coin-images.coingecko.com/coins/images/38043/small/ZKsyncIcon.png', color: '#8C8DFC', name: 'zkSync' },
  // Other Notable
  ORDI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/30162/small/ordi.png', color: '#000000', name: 'ORDI' },
  STX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/2069/small/Stacks_logo_full.png', color: '#5546FF', name: 'Stacks' },
  RUNE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/6595/small/RUNE.png', color: '#33FF99', name: 'THORChain' },
  KAS: { logoUrl: 'https://coin-images.coingecko.com/coins/images/25751/small/kaspa-icon-exchanges.png', color: '#49EACB', name: 'Kaspa' },
  EGLD: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12335/small/multiversx-symbol.png', color: '#000000', name: 'MultiversX' },
  QNT: { logoUrl: 'https://coin-images.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg', color: '#000000', name: 'Quant' },
  GRT: { logoUrl: 'https://coin-images.coingecko.com/coins/images/13397/small/Graph_Token.png', color: '#6747ED', name: 'The Graph' },
  FLR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/28624/small/FLR-icon200x200.png', color: '#E62058', name: 'Flare' },
};

const FALLBACK_STOCK_LOGOS: Record<string, AssetLogoInfo> = {
  // Major Index ETFs
  SPY: { logoUrl: '', color: '#00529B', name: 'SPDR S&P 500 ETF' },
  QQQ: { logoUrl: '', color: '#002D72', name: 'Invesco QQQ Trust' },
  DIA: { logoUrl: '', color: '#00529B', name: 'SPDR Dow Jones ETF' },
  IWM: { logoUrl: '', color: '#000000', name: 'iShares Russell 2000' },
  VTI: { logoUrl: '', color: '#8B2332', name: 'Vanguard Total Stock' },
  // Sector ETFs
  XLF: { logoUrl: '', color: '#00529B', name: 'Financial Select SPDR' },
  XLK: { logoUrl: '', color: '#00529B', name: 'Technology Select SPDR' },
  XLE: { logoUrl: '', color: '#00529B', name: 'Energy Select SPDR' },
  XLV: { logoUrl: '', color: '#00529B', name: 'Health Care Select SPDR' },
  XLI: { logoUrl: '', color: '#00529B', name: 'Industrial Select SPDR' },
  // Tech Giants
  AAPL: { logoUrl: '', color: '#000000', name: 'Apple Inc.' },
  MSFT: { logoUrl: '', color: '#00A4EF', name: 'Microsoft' },
  GOOGL: { logoUrl: '', color: '#4285F4', name: 'Alphabet' },
  GOOG: { logoUrl: '', color: '#4285F4', name: 'Alphabet' },
  AMZN: { logoUrl: '', color: '#FF9900', name: 'Amazon' },
  META: { logoUrl: '', color: '#0668E1', name: 'Meta Platforms' },
  NVDA: { logoUrl: '', color: '#76B900', name: 'NVIDIA' },
  TSLA: { logoUrl: '', color: '#E31937', name: 'Tesla' },
  AMD: { logoUrl: '', color: '#ED1C24', name: 'AMD' },
  INTC: { logoUrl: '', color: '#0071C5', name: 'Intel' },
  CRM: { logoUrl: '', color: '#00A1E0', name: 'Salesforce' },
  ORCL: { logoUrl: '', color: '#F80000', name: 'Oracle' },
  ADBE: { logoUrl: '', color: '#FF0000', name: 'Adobe' },
  NFLX: { logoUrl: '', color: '#E50914', name: 'Netflix' },
  // Finance
  JPM: { logoUrl: '', color: '#0F3D66', name: 'JPMorgan Chase' },
  BAC: { logoUrl: '', color: '#012169', name: 'Bank of America' },
  WFC: { logoUrl: '', color: '#D71E28', name: 'Wells Fargo' },
  GS: { logoUrl: '', color: '#7399C6', name: 'Goldman Sachs' },
  MS: { logoUrl: '', color: '#002B5C', name: 'Morgan Stanley' },
  C: { logoUrl: '', color: '#003B70', name: 'Citigroup' },
  V: { logoUrl: '', color: '#1A1F71', name: 'Visa' },
  MA: { logoUrl: '', color: '#EB001B', name: 'Mastercard' },
  PYPL: { logoUrl: '', color: '#003087', name: 'PayPal' },
  // Healthcare
  JNJ: { logoUrl: '', color: '#D51900', name: 'Johnson & Johnson' },
  UNH: { logoUrl: '', color: '#0063A6', name: 'UnitedHealth Group' },
  PFE: { logoUrl: '', color: '#0093D0', name: 'Pfizer' },
  ABBV: { logoUrl: '', color: '#071D49', name: 'AbbVie' },
  MRK: { logoUrl: '', color: '#009DAB', name: 'Merck' },
  LLY: { logoUrl: '', color: '#D52B1E', name: 'Eli Lilly' },
  // Consumer
  WMT: { logoUrl: '', color: '#0071CE', name: 'Walmart' },
  KO: { logoUrl: '', color: '#F40009', name: 'Coca-Cola' },
  PEP: { logoUrl: '', color: '#004B93', name: 'PepsiCo' },
  MCD: { logoUrl: '', color: '#FFC72C', name: "McDonald's" },
  NKE: { logoUrl: '', color: '#000000', name: 'Nike' },
  DIS: { logoUrl: '', color: '#113CCF', name: 'Walt Disney' },
  // Energy
  XOM: { logoUrl: '', color: '#ED1C24', name: 'Exxon Mobil' },
  CVX: { logoUrl: '', color: '#0066B2', name: 'Chevron' },
  COP: { logoUrl: '', color: '#ED1C24', name: 'ConocoPhillips' },
  // Industrial
  BA: { logoUrl: '', color: '#0033A0', name: 'Boeing' },
  CAT: { logoUrl: '', color: '#FFCD11', name: 'Caterpillar' },
  GE: { logoUrl: '', color: '#3B73B9', name: 'General Electric' },
  HON: { logoUrl: '', color: '#E10600', name: 'Honeywell' },
  UPS: { logoUrl: '', color: '#351C15', name: 'UPS' },
  // Telecom
  T: { logoUrl: '', color: '#00A8E0', name: 'AT&T' },
  VZ: { logoUrl: '', color: '#CD040B', name: 'Verizon' },
  TMUS: { logoUrl: '', color: '#E20074', name: 'T-Mobile' },
  // Crypto Related
  COIN: { logoUrl: '', color: '#0052FF', name: 'Coinbase' },
  MSTR: { logoUrl: '', color: '#C4373C', name: 'MicroStrategy' },
  MARA: { logoUrl: '', color: '#000000', name: 'Marathon Digital' },
  RIOT: { logoUrl: '', color: '#0033A0', name: 'Riot Platforms' },
  // BIST (Borsa Istanbul)
  THYAO: { logoUrl: '', color: '#C8102E', name: 'Turkish Airlines' },
  GARAN: { logoUrl: '', color: '#00854A', name: 'Garanti BBVA' },
  AKBNK: { logoUrl: '', color: '#E3000B', name: 'Akbank' },
  SISE: { logoUrl: '', color: '#004E9E', name: 'Sisecam' },
  EREGL: { logoUrl: '', color: '#003A70', name: 'Eregli Demir Celik' },
  KCHOL: { logoUrl: '', color: '#003DA5', name: 'Koc Holding' },
  SAHOL: { logoUrl: '', color: '#003C71', name: 'Sabanci Holding' },
  ISCTR: { logoUrl: '', color: '#0038A8', name: 'Is Bankasi' },
  YKBNK: { logoUrl: '', color: '#004990', name: 'Yapi Kredi' },
  HALKB: { logoUrl: '', color: '#004B87', name: 'Halk Bankasi' },
  VAKBN: { logoUrl: '', color: '#FFD100', name: 'Vakifbank' },
  TOASO: { logoUrl: '', color: '#1B3C87', name: 'Tofas Oto' },
  TAVHL: { logoUrl: '', color: '#003B73', name: 'TAV Havalimanlari' },
  TKFEN: { logoUrl: '', color: '#E31937', name: 'Tekfen Holding' },
  TUPRS: { logoUrl: '', color: '#E31E24', name: 'Tupras' },
  BIMAS: { logoUrl: '', color: '#ED1C24', name: 'BIM Magazalar' },
  ASELS: { logoUrl: '', color: '#003366', name: 'Aselsan' },
  PGSUS: { logoUrl: '', color: '#FFD700', name: 'Pegasus Airlines' },
  ENKAI: { logoUrl: '', color: '#003399', name: 'Enka Insaat' },
  ARCLK: { logoUrl: '', color: '#E2001A', name: 'Arcelik' },
};

const FALLBACK_METAL_LOGOS: Record<string, AssetLogoInfo> = {
  XAUUSD: { logoUrl: '', color: '#FFD700', name: 'Gold' },
  XAGUSD: { logoUrl: '', color: '#C0C0C0', name: 'Silver' },
  GLD: { logoUrl: '', color: '#FFD700', name: 'SPDR Gold Shares' },
  SLV: { logoUrl: '', color: '#C0C0C0', name: 'iShares Silver Trust' },
  IAU: { logoUrl: '', color: '#FFD700', name: 'iShares Gold Trust' },
  PSLV: { logoUrl: '', color: '#C0C0C0', name: 'Sprott Physical Silver' },
  XPTUSD: { logoUrl: '', color: '#E5E4E2', name: 'Platinum' },
  XPDUSD: { logoUrl: '', color: '#CED0DD', name: 'Palladium' },
  PPLT: { logoUrl: '', color: '#E5E4E2', name: 'abrdn Platinum ETF' },
  PALL: { logoUrl: '', color: '#CED0DD', name: 'abrdn Palladium ETF' },
  GDX: { logoUrl: '', color: '#FFD700', name: 'VanEck Gold Miners ETF' },
  GDXJ: { logoUrl: '', color: '#FFD700', name: 'VanEck Junior Gold Miners' },
  SIL: { logoUrl: '', color: '#C0C0C0', name: 'Global X Silver Miners ETF' },
};

const FALLBACK_BOND_LOGOS: Record<string, AssetLogoInfo> = {
  TLT: { logoUrl: '', color: '#003087', name: 'iShares 20+ Year Treasury' },
  IEF: { logoUrl: '', color: '#003087', name: 'iShares 7-10 Year Treasury' },
  SHY: { logoUrl: '', color: '#003087', name: 'iShares 1-3 Year Treasury' },
  BND: { logoUrl: '', color: '#8B2332', name: 'Vanguard Total Bond Market' },
  AGG: { logoUrl: '', color: '#003087', name: 'iShares Core US Aggregate' },
  LQD: { logoUrl: '', color: '#003087', name: 'iShares iBoxx Investment Grade' },
  HYG: { logoUrl: '', color: '#003087', name: 'iShares iBoxx High Yield' },
  TIP: { logoUrl: '', color: '#003087', name: 'iShares TIPS Bond ETF' },
  MUB: { logoUrl: '', color: '#003087', name: 'iShares National Muni Bond' },
  EMB: { logoUrl: '', color: '#003087', name: 'iShares J.P. Morgan EM Bond' },
  US10Y: { logoUrl: '', color: '#2563EB', name: '10-Year Treasury Yield' },
  US2Y: { logoUrl: '', color: '#2563EB', name: '2-Year Treasury Yield' },
  US30Y: { logoUrl: '', color: '#2563EB', name: '30-Year Treasury Yield' },
  US5Y: { logoUrl: '', color: '#2563EB', name: '5-Year Treasury Yield' },
};

const FALLBACK_CACHE: LogoCache = {
  crypto: FALLBACK_CRYPTO_LOGOS,
  stocks: FALLBACK_STOCK_LOGOS,
  metals: FALLBACK_METAL_LOGOS,
  bonds: FALLBACK_BOND_LOGOS,
  version: 1,
  lastUpdated: new Date().toISOString(),
};

// ===========================================
// In-memory cache - initialized with hardcoded data
// so logos are available from first render
// ===========================================

let memoryCache: LogoCache | null = FALLBACK_CACHE;
let cacheLoadPromise: Promise<LogoCache> | null = null;

// Track symbols already looked up from internet to avoid duplicate fetches
const fetchAttempted = new Set<string>();
const pendingFetches = new Map<string, Promise<string | null>>();

// ===========================================
// localStorage helpers
// ===========================================

function getFromLocalStorage(): LogoCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as LogoCache;

    // Check if cache is expired
    const lastUpdated = new Date(parsed.lastUpdated).getTime();
    if (Date.now() - lastUpdated > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveToLocalStorage(cache: LogoCache): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    localStorage.setItem(CACHE_VERSION_KEY, String(cache.version));
  } catch (error) {
    console.error('[AssetLogosCache] Failed to save to localStorage:', error);
  }
}

// ===========================================
// API fetch
// ===========================================

async function fetchLogosFromAPI(): Promise<LogoCache> {
  try {
    // Use direct fetch for public API endpoint (no auth required)
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env['NEXT_PUBLIC_API_URL'] || '';

    // Try API URL first (production), fallback to same origin
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || baseUrl;
    const response = await fetch(`${apiUrl}/api/asset-logos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const json = await response.json();

    if (!json.success || !json.data) {
      throw new Error('Invalid API response');
    }

    return json.data as LogoCache;
  } catch (error) {
    console.error('[AssetLogosCache] Failed to fetch from API:', error);
    throw error;
  }
}

// ===========================================
// Cache initialization
// ===========================================

/**
 * Load logos cache - from memory, localStorage, or API
 */
export async function loadLogosCache(): Promise<LogoCache> {
  // Return from memory if available
  if (memoryCache) {
    return memoryCache;
  }

  // Return existing promise if already loading
  if (cacheLoadPromise) {
    return cacheLoadPromise;
  }

  // Start loading
  cacheLoadPromise = (async () => {
    // Try localStorage first
    const localCache = getFromLocalStorage();
    if (localCache) {
      memoryCache = localCache;
      return localCache;
    }

    // Fetch from API
    try {
      const apiCache = await fetchLogosFromAPI();
      memoryCache = apiCache;
      saveToLocalStorage(apiCache);
      return apiCache;
    } catch {
      // Use fallback cache when API fails (common logos still work)
      console.warn('[AssetLogosCache] API failed, using fallback logos');
      memoryCache = FALLBACK_CACHE;
      return FALLBACK_CACHE;
    }
  })();

  const result = await cacheLoadPromise;
  cacheLoadPromise = null;
  return result;
}

/**
 * Force refresh cache from API
 */
export async function refreshLogosCache(): Promise<LogoCache> {
  try {
    const apiCache = await fetchLogosFromAPI();
    memoryCache = apiCache;
    saveToLocalStorage(apiCache);
    return apiCache;
  } catch {
    // Use existing cache or fallback
    return memoryCache || FALLBACK_CACHE;
  }
}

/**
 * Clear cache (for logout, etc.)
 */
export function clearLogosCache(): void {
  memoryCache = null;
  cacheLoadPromise = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
  }
}

// ===========================================
// Logo retrieval
// ===========================================

/**
 * Detect asset class from symbol
 */
export function detectAssetClass(symbol: string): AssetClass {
  const upper = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');

  // Check memory cache first
  if (memoryCache) {
    if (memoryCache.crypto[upper]) return 'crypto';
    if (memoryCache.stocks[upper]) return 'stocks';
    if (memoryCache.metals[upper]) return 'metals';
    if (memoryCache.bonds[upper]) return 'bonds';
  }

  // Pattern-based detection
  if (upper.includes('USD') && (upper.startsWith('XAU') || upper.startsWith('XAG') || upper.startsWith('XPT') || upper.startsWith('XPD'))) {
    return 'metals';
  }
  if (upper.endsWith('Y') && upper.startsWith('US')) {
    return 'bonds';
  }
  if (['GLD', 'SLV', 'IAU', 'PSLV', 'PPLT', 'PALL', 'GDX', 'GDXJ', 'SIL'].includes(upper)) {
    return 'metals';
  }
  if (['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG', 'TIP', 'MUB', 'EMB'].includes(upper)) {
    return 'bonds';
  }

  // Known stocks (expand as needed)
  const knownStocks = [
    'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN',
    'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'JPM', 'BAC', 'WFC', 'GS', 'MS',
    'JNJ', 'UNH', 'PFE', 'WMT', 'KO', 'PEP', 'MCD', 'NKE', 'DIS', 'XOM',
    'CVX', 'BA', 'CAT', 'GE', 'T', 'VZ', 'COIN', 'MSTR', 'MARA', 'RIOT',
    'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'CRM', 'ORCL', 'ADBE', 'NFLX',
    'C', 'V', 'MA', 'PYPL', 'ABBV', 'MRK', 'LLY', 'COP', 'HON', 'UPS', 'TMUS',
    // BIST (Borsa Istanbul)
    'THYAO', 'GARAN', 'AKBNK', 'SISE', 'EREGL', 'KCHOL', 'SAHOL', 'ISCTR',
    'YKBNK', 'HALKB', 'VAKBN', 'TOASO', 'TAVHL', 'TKFEN', 'TUPRS', 'BIMAS',
    'ASELS', 'PGSUS', 'ENKAI', 'ARCLK',
  ];
  if (knownStocks.includes(upper)) {
    return 'stocks';
  }

  // Default to crypto
  return 'crypto';
}

/**
 * Get logo info for a symbol (synchronous - uses cache)
 */
export function getAssetLogo(symbol: string, assetClass?: AssetClass): CachedLogoInfo {
  // Strip common trading pair suffixes (SOLUSDT → SOL, BTCUSD → BTC)
  const upper = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');
  const detectedClass = assetClass || detectAssetClass(upper);

  // Try memory cache
  if (memoryCache) {
    const logos = memoryCache[detectedClass];
    if (logos && logos[upper]) {
      return {
        ...logos[upper],
        assetClass: detectedClass,
        isDefault: false,
      };
    }

    // Try other classes if not found
    if (!assetClass) {
      for (const cls of ['crypto', 'stocks', 'metals', 'bonds'] as AssetClass[]) {
        if (memoryCache[cls]?.[upper]) {
          return {
            ...memoryCache[cls][upper],
            assetClass: cls,
            isDefault: false,
          };
        }
      }
    }
  }

  // Return default
  return {
    logoUrl: '',
    color: DEFAULT_COLOR,
    name: upper,
    assetClass: detectedClass,
    isDefault: true,
  };
}

/**
 * Get logo info for a symbol (async - ensures cache is loaded)
 */
export async function getAssetLogoAsync(symbol: string, assetClass?: AssetClass): Promise<CachedLogoInfo> {
  await loadLogosCache();
  return getAssetLogo(symbol, assetClass);
}

/**
 * Get multiple logos at once
 */
export function getAssetLogos(symbols: string[]): Record<string, CachedLogoInfo> {
  const result: Record<string, CachedLogoInfo> = {};

  for (const symbol of symbols) {
    result[symbol.toUpperCase()] = getAssetLogo(symbol);
  }

  return result;
}

/**
 * Get all logos for an asset class
 */
export function getAssetClassLogos(assetClass: AssetClass): Record<string, AssetLogoInfo> {
  if (memoryCache && memoryCache[assetClass]) {
    return memoryCache[assetClass];
  }
  return {};
}

/**
 * Check if cache is loaded
 */
export function isCacheLoaded(): boolean {
  return memoryCache !== null;
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  isLoaded: boolean;
  cryptoCount: number;
  stocksCount: number;
  metalsCount: number;
  bondsCount: number;
  totalCount: number;
  version: number;
  lastUpdated: string | null;
} {
  if (!memoryCache) {
    return {
      isLoaded: false,
      cryptoCount: 0,
      stocksCount: 0,
      metalsCount: 0,
      bondsCount: 0,
      totalCount: 0,
      version: 0,
      lastUpdated: null,
    };
  }

  return {
    isLoaded: true,
    cryptoCount: Object.keys(memoryCache.crypto).length,
    stocksCount: Object.keys(memoryCache.stocks).length,
    metalsCount: Object.keys(memoryCache.metals).length,
    bondsCount: Object.keys(memoryCache.bonds).length,
    totalCount:
      Object.keys(memoryCache.crypto).length +
      Object.keys(memoryCache.stocks).length +
      Object.keys(memoryCache.metals).length +
      Object.keys(memoryCache.bonds).length,
    version: memoryCache.version,
    lastUpdated: memoryCache.lastUpdated,
  };
}

// ===========================================
// SVG Generation (fallback for missing logos)
// ===========================================

/**
 * Generate SVG data URL for a symbol (used when logoUrl is empty)
 */
export function generateFallbackSvg(symbol: string, color: string = DEFAULT_COLOR): string {
  const displaySymbol = symbol.toUpperCase().slice(0, 2);
  const fontSize = displaySymbol.length > 2 ? 28 : 32;

  // Adjust color brightness for gradient
  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  // Determine text color based on background brightness
  const getBrightness = (hex: string): number => {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    return (R * 299 + G * 587 + B * 114) / 1000;
  };

  const textColor = getBrightness(color) > 128 ? '#000000' : '#FFFFFF';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustColor(color, -20)};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad)" stroke="${adjustColor(color, -30)}" stroke-width="2"/>
      <text x="50" y="58" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" font-weight="bold" font-family="system-ui, -apple-system, sans-serif">${displaySymbol}</text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Fetch a single asset's logo from CoinGecko search API
 * Used for symbols not in the hardcoded list
 * Returns the logo URL or null if not found
 */
export async function fetchAndCacheLogo(symbol: string, assetClass?: AssetClass): Promise<string | null> {
  const clean = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');

  // Already have it in cache
  const existing = getLogoUrl(clean, assetClass);
  if (existing) return existing;

  // Already attempted this symbol
  if (fetchAttempted.has(clean)) return null;

  // Return pending promise if already fetching
  if (pendingFetches.has(clean)) return pendingFetches.get(clean)!;

  const fetchPromise = (async (): Promise<string | null> => {
    fetchAttempted.add(clean);

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(clean.toLowerCase())}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const coins: Array<{ symbol?: string; large?: string; thumb?: string; name?: string }> = data.coins || [];

      // Find exact symbol match
      const match = coins.find((c) => c.symbol?.toUpperCase() === clean);
      if (!match) return null;

      const logoUrl = match.large || match.thumb;
      if (!logoUrl) return null;

      const name = match.name || clean;
      const detectedClass = assetClass || detectAssetClass(clean);

      // Add to in-memory cache
      if (memoryCache) {
        memoryCache[detectedClass][clean] = { logoUrl, color: DEFAULT_COLOR, name };
        saveToLocalStorage(memoryCache);
      }

      return logoUrl;
    } catch {
      return null;
    } finally {
      pendingFetches.delete(clean);
    }
  })();

  pendingFetches.set(clean, fetchPromise);
  return fetchPromise;
}

/**
 * Get logo URL for a symbol - returns actual URL or empty string
 */
export function getLogoUrl(symbol: string, assetClass?: AssetClass): string {
  const cleanSymbol = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');
  const logoInfo = getAssetLogo(cleanSymbol, assetClass);

  if (logoInfo.logoUrl && logoInfo.logoUrl.length > 0) {
    return logoInfo.logoUrl;
  }

  return '';
}

/**
 * Get logo URL async (ensures cache is loaded first)
 */
export async function getLogoUrlAsync(symbol: string, assetClass?: AssetClass): Promise<string> {
  await loadLogosCache();
  return getLogoUrl(symbol, assetClass);
}
