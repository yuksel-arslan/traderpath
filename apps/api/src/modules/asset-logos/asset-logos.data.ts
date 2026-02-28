// ===========================================
// Asset Logos Data
// Comprehensive logo URLs and brand colors for all supported assets
// ===========================================

export interface AssetLogoInfo {
  logoUrl: string;
  color: string;
  name: string;
}

export type AssetLogosMap = Record<string, AssetLogoInfo>;

// ===========================================
// CRYPTO LOGOS
// Source: CoinGecko CDN (coin-images.coingecko.com)
// ===========================================

export const CRYPTO_LOGOS: AssetLogosMap = {
  // Major Cryptos
  BTC: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png',
    color: '#F7931A',
    name: 'Bitcoin',
  },
  ETH: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png',
    color: '#627EEA',
    name: 'Ethereum',
  },
  BNB: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    color: '#F3BA2F',
    name: 'BNB',
  },
  SOL: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/4128/small/solana.png',
    color: '#9945FF',
    name: 'Solana',
  },
  XRP: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    color: '#23292F',
    name: 'XRP',
  },
  ADA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/975/small/cardano.png',
    color: '#0033AD',
    name: 'Cardano',
  },
  DOGE: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png',
    color: '#C2A633',
    name: 'Dogecoin',
  },
  AVAX: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    color: '#E84142',
    name: 'Avalanche',
  },
  DOT: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12171/small/polkadot.png',
    color: '#E6007A',
    name: 'Polkadot',
  },
  MATIC: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/4713/small/polygon.png',
    color: '#8247E5',
    name: 'Polygon',
  },
  LINK: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    color: '#375BD2',
    name: 'Chainlink',
  },
  UNI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12504/small/uniswap-uni.png',
    color: '#FF007A',
    name: 'Uniswap',
  },
  ATOM: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    color: '#2E3148',
    name: 'Cosmos',
  },
  LTC: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/2/small/litecoin.png',
    color: '#345D9D',
    name: 'Litecoin',
  },
  FIL: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12817/small/filecoin.png',
    color: '#0090FF',
    name: 'Filecoin',
  },
  NEAR: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/10365/small/near.jpg',
    color: '#000000',
    name: 'NEAR Protocol',
  },
  APT: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/26455/small/aptos_round.png',
    color: '#4DA2FF',
    name: 'Aptos',
  },
  ARB: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    color: '#28A0F0',
    name: 'Arbitrum',
  },
  OP: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/25244/small/Optimism.png',
    color: '#FF0420',
    name: 'Optimism',
  },
  INJ: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
    color: '#00F2EA',
    name: 'Injective',
  },
  SUI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
    color: '#6FBCF0',
    name: 'Sui',
  },
  SEI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
    color: '#9B1C1C',
    name: 'Sei',
  },
  TIA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31967/small/tia.jpg',
    color: '#7B2BF9',
    name: 'Celestia',
  },

  // Meme Coins
  PEPE: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
    color: '#479F53',
    name: 'Pepe',
  },
  SHIB: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/11939/small/shiba.png',
    color: '#FFA409',
    name: 'Shiba Inu',
  },
  WIF: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
    color: '#B17236',
    name: 'dogwifhat',
  },
  BONK: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/28600/small/bonk.jpg',
    color: '#F8A527',
    name: 'Bonk',
  },
  FLOKI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/16746/small/FLOKI.png',
    color: '#F79420',
    name: 'Floki',
  },

  // AI & DePIN Tokens
  RENDER: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/11636/small/rndr.png',
    color: '#000000',
    name: 'Render',
  },
  RNDR: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/11636/small/rndr.png',
    color: '#000000',
    name: 'Render',
  },
  FET: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/5681/small/Fetch.jpg',
    color: '#1D2951',
    name: 'Fetch.ai',
  },
  AGIX: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/2138/small/singularitynet.png',
    color: '#6916FF',
    name: 'SingularityNET',
  },
  OCEAN: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/3687/small/ocean-protocol-logo.jpg',
    color: '#141414',
    name: 'Ocean Protocol',
  },
  TAO: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
    color: '#000000',
    name: 'Bittensor',
  },
  WLD: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31069/small/worldcoin.jpeg',
    color: '#000000',
    name: 'Worldcoin',
  },

  // DeFi Tokens
  AAVE: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12645/small/AAVE.png',
    color: '#B6509E',
    name: 'Aave',
  },
  MKR: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/1364/small/Mark_Maker.png',
    color: '#1AAB9B',
    name: 'Maker',
  },
  CRV: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12124/small/Curve.png',
    color: '#0000FF',
    name: 'Curve DAO',
  },
  COMP: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/10775/small/COMP.png',
    color: '#00D395',
    name: 'Compound',
  },
  SNX: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/3406/small/SNX.png',
    color: '#00D1FF',
    name: 'Synthetix',
  },
  YFI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/11849/small/yearn-finance-yfi.png',
    color: '#006AE3',
    name: 'yearn.finance',
  },
  SUSHI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
    color: '#FA52A0',
    name: 'SushiSwap',
  },
  '1INCH': {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/13469/small/1inch-token.png',
    color: '#1B314F',
    name: '1inch',
  },
  LDO: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/13573/small/Lido_DAO.png',
    color: '#00A3FF',
    name: 'Lido DAO',
  },
  BAL: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/11683/small/Balancer.png',
    color: '#1E1E1E',
    name: 'Balancer',
  },

  // Gaming & Metaverse
  SAND: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12129/small/sandbox_logo.jpg',
    color: '#04ADEF',
    name: 'The Sandbox',
  },
  MANA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/878/small/decentraland-mana.png',
    color: '#FF2D55',
    name: 'Decentraland',
  },
  AXS: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/13029/small/axie_infinity_logo.png',
    color: '#0055D5',
    name: 'Axie Infinity',
  },
  GALA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png',
    color: '#000000',
    name: 'Gala',
  },
  ENJ: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/1102/small/enjin-coin-logo.png',
    color: '#7866D5',
    name: 'Enjin Coin',
  },
  IMX: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png',
    color: '#00BFFF',
    name: 'Immutable',
  },
  ILV: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/14468/small/illuvium.png',
    color: '#A855F7',
    name: 'Illuvium',
  },

  // Other Major Cryptos
  TRX: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/1094/small/tron-logo.png',
    color: '#EF0027',
    name: 'TRON',
  },
  TON: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/17980/small/ton_symbol.png',
    color: '#0098EA',
    name: 'Toncoin',
  },
  ICP: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png',
    color: '#29ABE2',
    name: 'Internet Computer',
  },
  BCH: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
    color: '#8DC351',
    name: 'Bitcoin Cash',
  },
  ETC: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
    color: '#328332',
    name: 'Ethereum Classic',
  },
  XLM: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
    color: '#000000',
    name: 'Stellar',
  },
  HBAR: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/3688/small/hbar.png',
    color: '#000000',
    name: 'Hedera',
  },
  VET: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/1167/small/VeChain-Logo-768x725.png',
    color: '#15BDFF',
    name: 'VeChain',
  },
  FTM: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/4001/small/Fantom_round.png',
    color: '#1969FF',
    name: 'Fantom',
  },
  ALGO: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/4380/small/download.png',
    color: '#000000',
    name: 'Algorand',
  },
  THETA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/2538/small/theta-token-logo.png',
    color: '#2AB8E6',
    name: 'Theta Network',
  },
  XTZ: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/976/small/Tezos-logo.png',
    color: '#2C7DF7',
    name: 'Tezos',
  },
  CHZ: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/8834/small/CHZ_Token_updated.png',
    color: '#CD0124',
    name: 'Chiliz',
  },

  // Solana Ecosystem
  JUP: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/34188/small/jup.png',
    color: '#C8FF00',
    name: 'Jupiter',
  },
  PYTH: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31924/small/pyth.png',
    color: '#6B47ED',
    name: 'Pyth Network',
  },
  RAY: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg',
    color: '#5A6FFF',
    name: 'Raydium',
  },
  ORCA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/17547/small/Orca_Logo.png',
    color: '#FFD15C',
    name: 'Orca',
  },

  // Layer 2 & Scaling
  STRK: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/26433/small/starknet.png',
    color: '#EC796B',
    name: 'Starknet',
  },
  MANTA: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/34289/small/manta.jpg',
    color: '#0080FF',
    name: 'Manta Network',
  },
  METIS: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/15595/small/metis.PNG',
    color: '#00D2FF',
    name: 'Metis',
  },
  ZK: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/38043/small/ZKsyncIcon.png',
    color: '#8C8DFC',
    name: 'zkSync',
  },

  // Other Notable
  ORDI: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/30162/small/ordi.png',
    color: '#000000',
    name: 'ORDI',
  },
  STX: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/2069/small/Stacks_logo_full.png',
    color: '#5546FF',
    name: 'Stacks',
  },
  RUNE: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/6595/small/RUNE.png',
    color: '#33FF99',
    name: 'THORChain',
  },
  KAS: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/25751/small/kaspa-icon-exchanges.png',
    color: '#49EACB',
    name: 'Kaspa',
  },
  EGLD: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/12335/small/multiversx-symbol.png',
    color: '#000000',
    name: 'MultiversX',
  },
  QNT: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg',
    color: '#000000',
    name: 'Quant',
  },
  GRT: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/13397/small/Graph_Token.png',
    color: '#6747ED',
    name: 'The Graph',
  },
  FLR: {
    logoUrl: 'https://coin-images.coingecko.com/coins/images/28624/small/FLR-icon200x200.png',
    color: '#E62058',
    name: 'Flare',
  },
};

// ===========================================
// STOCK LOGOS
// Source: Logo.dev (company logos) or local SVG
// ===========================================

export const STOCK_LOGOS: AssetLogosMap = {
  // Major Index ETFs
  SPY: {
    logoUrl: '',
    color: '#00529B',
    name: 'SPDR S&P 500 ETF',
  },
  QQQ: {
    logoUrl: '',
    color: '#002D72',
    name: 'Invesco QQQ Trust',
  },
  DIA: {
    logoUrl: '',
    color: '#00529B',
    name: 'SPDR Dow Jones ETF',
  },
  IWM: {
    logoUrl: '',
    color: '#000000',
    name: 'iShares Russell 2000',
  },
  VTI: {
    logoUrl: '',
    color: '#8B2332',
    name: 'Vanguard Total Stock',
  },

  // Sector ETFs
  XLF: {
    logoUrl: '',
    color: '#00529B',
    name: 'Financial Select SPDR',
  },
  XLK: {
    logoUrl: '',
    color: '#00529B',
    name: 'Technology Select SPDR',
  },
  XLE: {
    logoUrl: '',
    color: '#00529B',
    name: 'Energy Select SPDR',
  },
  XLV: {
    logoUrl: '',
    color: '#00529B',
    name: 'Health Care Select SPDR',
  },
  XLI: {
    logoUrl: '',
    color: '#00529B',
    name: 'Industrial Select SPDR',
  },

  // Tech Giants
  AAPL: {
    logoUrl: '',
    color: '#000000',
    name: 'Apple Inc.',
  },
  MSFT: {
    logoUrl: '',
    color: '#00A4EF',
    name: 'Microsoft Corporation',
  },
  GOOGL: {
    logoUrl: '',
    color: '#4285F4',
    name: 'Alphabet Inc.',
  },
  GOOG: {
    logoUrl: '',
    color: '#4285F4',
    name: 'Alphabet Inc.',
  },
  AMZN: {
    logoUrl: '',
    color: '#FF9900',
    name: 'Amazon.com Inc.',
  },
  META: {
    logoUrl: '',
    color: '#0668E1',
    name: 'Meta Platforms Inc.',
  },
  NVDA: {
    logoUrl: '',
    color: '#76B900',
    name: 'NVIDIA Corporation',
  },
  TSLA: {
    logoUrl: '',
    color: '#E31937',
    name: 'Tesla Inc.',
  },
  AMD: {
    logoUrl: '',
    color: '#ED1C24',
    name: 'Advanced Micro Devices',
  },
  INTC: {
    logoUrl: '',
    color: '#0071C5',
    name: 'Intel Corporation',
  },
  CRM: {
    logoUrl: '',
    color: '#00A1E0',
    name: 'Salesforce Inc.',
  },
  ORCL: {
    logoUrl: '',
    color: '#F80000',
    name: 'Oracle Corporation',
  },
  ADBE: {
    logoUrl: '',
    color: '#FF0000',
    name: 'Adobe Inc.',
  },
  NFLX: {
    logoUrl: '',
    color: '#E50914',
    name: 'Netflix Inc.',
  },

  // Finance
  JPM: {
    logoUrl: '',
    color: '#0F3D66',
    name: 'JPMorgan Chase & Co.',
  },
  BAC: {
    logoUrl: '',
    color: '#012169',
    name: 'Bank of America',
  },
  WFC: {
    logoUrl: '',
    color: '#D71E28',
    name: 'Wells Fargo & Co.',
  },
  GS: {
    logoUrl: '',
    color: '#7399C6',
    name: 'Goldman Sachs',
  },
  MS: {
    logoUrl: '',
    color: '#002B5C',
    name: 'Morgan Stanley',
  },
  C: {
    logoUrl: '',
    color: '#003B70',
    name: 'Citigroup Inc.',
  },
  V: {
    logoUrl: '',
    color: '#1A1F71',
    name: 'Visa Inc.',
  },
  MA: {
    logoUrl: '',
    color: '#EB001B',
    name: 'Mastercard Inc.',
  },
  PYPL: {
    logoUrl: '',
    color: '#003087',
    name: 'PayPal Holdings',
  },

  // Healthcare
  JNJ: {
    logoUrl: '',
    color: '#D51900',
    name: 'Johnson & Johnson',
  },
  UNH: {
    logoUrl: '',
    color: '#0063A6',
    name: 'UnitedHealth Group',
  },
  PFE: {
    logoUrl: '',
    color: '#0093D0',
    name: 'Pfizer Inc.',
  },
  ABBV: {
    logoUrl: '',
    color: '#071D49',
    name: 'AbbVie Inc.',
  },
  MRK: {
    logoUrl: '',
    color: '#009DAB',
    name: 'Merck & Co.',
  },
  LLY: {
    logoUrl: '',
    color: '#D52B1E',
    name: 'Eli Lilly and Company',
  },

  // Consumer
  WMT: {
    logoUrl: '',
    color: '#0071CE',
    name: 'Walmart Inc.',
  },
  KO: {
    logoUrl: '',
    color: '#F40009',
    name: 'The Coca-Cola Company',
  },
  PEP: {
    logoUrl: '',
    color: '#004B93',
    name: 'PepsiCo Inc.',
  },
  MCD: {
    logoUrl: '',
    color: '#FFC72C',
    name: "McDonald's Corporation",
  },
  NKE: {
    logoUrl: '',
    color: '#000000',
    name: 'Nike Inc.',
  },
  DIS: {
    logoUrl: '',
    color: '#113CCF',
    name: 'The Walt Disney Company',
  },

  // Energy
  XOM: {
    logoUrl: '',
    color: '#ED1C24',
    name: 'Exxon Mobil Corporation',
  },
  CVX: {
    logoUrl: '',
    color: '#0066B2',
    name: 'Chevron Corporation',
  },
  COP: {
    logoUrl: '',
    color: '#ED1C24',
    name: 'ConocoPhillips',
  },

  // Industrial
  BA: {
    logoUrl: '',
    color: '#0033A0',
    name: 'The Boeing Company',
  },
  CAT: {
    logoUrl: '',
    color: '#FFCD11',
    name: 'Caterpillar Inc.',
  },
  GE: {
    logoUrl: '',
    color: '#3B73B9',
    name: 'General Electric',
  },
  HON: {
    logoUrl: '',
    color: '#E10600',
    name: 'Honeywell International',
  },
  UPS: {
    logoUrl: '',
    color: '#351C15',
    name: 'United Parcel Service',
  },

  // Telecom
  T: {
    logoUrl: '',
    color: '#00A8E0',
    name: 'AT&T Inc.',
  },
  VZ: {
    logoUrl: '',
    color: '#CD040B',
    name: 'Verizon Communications',
  },
  TMUS: {
    logoUrl: '',
    color: '#E20074',
    name: 'T-Mobile US',
  },

  // Crypto Related
  COIN: {
    logoUrl: '',
    color: '#0052FF',
    name: 'Coinbase Global',
  },
  MSTR: {
    logoUrl: '',
    color: '#C4373C',
    name: 'MicroStrategy',
  },
  MARA: {
    logoUrl: '',
    color: '#000000',
    name: 'Marathon Digital Holdings',
  },
  RIOT: {
    logoUrl: '',
    color: '#0033A0',
    name: 'Riot Platforms',
  },

  // BIST (Borsa Istanbul)
  THYAO: {
    logoUrl: '',
    color: '#C8102E',
    name: 'Turkish Airlines',
  },
  GARAN: {
    logoUrl: '',
    color: '#00854A',
    name: 'Garanti BBVA',
  },
  AKBNK: {
    logoUrl: '',
    color: '#E3000B',
    name: 'Akbank',
  },
  SISE: {
    logoUrl: '',
    color: '#004E9E',
    name: 'Sisecam',
  },
  EREGL: {
    logoUrl: '',
    color: '#003A70',
    name: 'Eregli Demir Celik',
  },
  KCHOL: {
    logoUrl: '',
    color: '#003DA5',
    name: 'Koc Holding',
  },
  SAHOL: {
    logoUrl: '',
    color: '#003C71',
    name: 'Sabanci Holding',
  },
  ISCTR: {
    logoUrl: '',
    color: '#0038A8',
    name: 'Is Bankasi',
  },
  YKBNK: {
    logoUrl: '',
    color: '#004990',
    name: 'Yapi Kredi',
  },
  HALKB: {
    logoUrl: '',
    color: '#004B87',
    name: 'Halk Bankasi',
  },
  VAKBN: {
    logoUrl: '',
    color: '#FFD100',
    name: 'Vakifbank',
  },
  TOASO: {
    logoUrl: '',
    color: '#1B3C87',
    name: 'Tofas Oto',
  },
  TAVHL: {
    logoUrl: '',
    color: '#003B73',
    name: 'TAV Havalimanlari',
  },
  TKFEN: {
    logoUrl: '',
    color: '#E31937',
    name: 'Tekfen Holding',
  },
  TUPRS: {
    logoUrl: '',
    color: '#E31E24',
    name: 'Tupras',
  },
  BIMAS: {
    logoUrl: '',
    color: '#ED1C24',
    name: 'BIM Magazalar',
  },
  ASELS: {
    logoUrl: '',
    color: '#003366',
    name: 'Aselsan',
  },
  PGSUS: {
    logoUrl: '',
    color: '#FFD700',
    name: 'Pegasus Airlines',
  },
  ENKAI: {
    logoUrl: '',
    color: '#003399',
    name: 'Enka Insaat',
  },
  ARCLK: {
    logoUrl: '',
    color: '#E2001A',
    name: 'Arcelik',
  },
};

// ===========================================
// METAL LOGOS
// Source: Local SVG (no external logos for commodities)
// ===========================================

export const METAL_LOGOS: AssetLogosMap = {
  // Precious Metals
  XAUUSD: {
    logoUrl: '', // Will use generated SVG
    color: '#FFD700',
    name: 'Gold',
  },
  XAGUSD: {
    logoUrl: '', // Will use generated SVG
    color: '#C0C0C0',
    name: 'Silver',
  },
  GLD: {
    logoUrl: '',
    color: '#FFD700',
    name: 'SPDR Gold Shares',
  },
  SLV: {
    logoUrl: '',
    color: '#C0C0C0',
    name: 'iShares Silver Trust',
  },
  IAU: {
    logoUrl: '',
    color: '#FFD700',
    name: 'iShares Gold Trust',
  },
  PSLV: {
    logoUrl: '',
    color: '#C0C0C0',
    name: 'Sprott Physical Silver',
  },

  // Platinum & Palladium
  XPTUSD: {
    logoUrl: '', // Will use generated SVG
    color: '#E5E4E2',
    name: 'Platinum',
  },
  XPDUSD: {
    logoUrl: '', // Will use generated SVG
    color: '#CED0DD',
    name: 'Palladium',
  },
  PPLT: {
    logoUrl: '',
    color: '#E5E4E2',
    name: 'abrdn Platinum ETF',
  },
  PALL: {
    logoUrl: '',
    color: '#CED0DD',
    name: 'abrdn Palladium ETF',
  },

  // Mining ETFs
  GDX: {
    logoUrl: '',
    color: '#FFD700',
    name: 'VanEck Gold Miners ETF',
  },
  GDXJ: {
    logoUrl: '',
    color: '#FFD700',
    name: 'VanEck Junior Gold Miners',
  },
  SIL: {
    logoUrl: '',
    color: '#C0C0C0',
    name: 'Global X Silver Miners ETF',
  },
};

// ===========================================
// BOND LOGOS
// Source: Fund provider logos
// ===========================================

export const BOND_LOGOS: AssetLogosMap = {
  // Treasury ETFs
  TLT: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares 20+ Year Treasury',
  },
  IEF: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares 7-10 Year Treasury',
  },
  SHY: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares 1-3 Year Treasury',
  },
  BND: {
    logoUrl: '',
    color: '#8B2332',
    name: 'Vanguard Total Bond Market',
  },
  AGG: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares Core US Aggregate',
  },
  LQD: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares iBoxx Investment Grade',
  },
  HYG: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares iBoxx High Yield',
  },
  TIP: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares TIPS Bond ETF',
  },
  MUB: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares National Muni Bond',
  },
  EMB: {
    logoUrl: '',
    color: '#003087',
    name: 'iShares J.P. Morgan EM Bond',
  },

  // Treasury Yields (use generated SVG)
  US10Y: {
    logoUrl: '', // Will use generated SVG
    color: '#2563EB',
    name: '10-Year Treasury Yield',
  },
  US2Y: {
    logoUrl: '', // Will use generated SVG
    color: '#2563EB',
    name: '2-Year Treasury Yield',
  },
  US30Y: {
    logoUrl: '', // Will use generated SVG
    color: '#2563EB',
    name: '30-Year Treasury Yield',
  },
  US5Y: {
    logoUrl: '', // Will use generated SVG
    color: '#2563EB',
    name: '5-Year Treasury Yield',
  },
};

// ===========================================
// Combined export
// ===========================================

export const ALL_ASSET_LOGOS = {
  crypto: CRYPTO_LOGOS,
  stocks: STOCK_LOGOS,
  metals: METAL_LOGOS,
  bonds: BOND_LOGOS,
};

export type AssetClass = 'crypto' | 'stocks' | 'metals' | 'bonds';

/**
 * Get logo info for a symbol
 */
export function getAssetLogoInfo(symbol: string, assetClass?: AssetClass): AssetLogoInfo | null {
  const upperSymbol = symbol.toUpperCase();

  if (assetClass) {
    const logos = ALL_ASSET_LOGOS[assetClass];
    return logos[upperSymbol] || null;
  }

  // Search all asset classes
  for (const [, logos] of Object.entries(ALL_ASSET_LOGOS)) {
    if (logos[upperSymbol]) {
      return logos[upperSymbol];
    }
  }

  return null;
}

/**
 * Detect asset class from symbol
 */
export function detectAssetClass(symbol: string): AssetClass {
  const upperSymbol = symbol.toUpperCase();

  if (CRYPTO_LOGOS[upperSymbol]) return 'crypto';
  if (STOCK_LOGOS[upperSymbol]) return 'stocks';
  if (METAL_LOGOS[upperSymbol]) return 'metals';
  if (BOND_LOGOS[upperSymbol]) return 'bonds';

  // Fallback detection by pattern
  if (upperSymbol.includes('USD') && (upperSymbol.startsWith('XAU') || upperSymbol.startsWith('XAG') || upperSymbol.startsWith('XPT') || upperSymbol.startsWith('XPD'))) {
    return 'metals';
  }
  if (upperSymbol.endsWith('Y') && upperSymbol.startsWith('US')) {
    return 'bonds';
  }

  // Default to crypto (most common use case)
  return 'crypto';
}
