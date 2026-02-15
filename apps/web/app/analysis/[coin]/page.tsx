// ===========================================
// Public Analysis Page for SEO
// Shows sample analysis to attract organic traffic
// ===========================================

import { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ coin: string }>;
}

// Coin display names
const coinNames: Record<string, string> = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
  sol: 'Solana',
  bnb: 'BNB',
  xrp: 'XRP',
  ada: 'Cardano',
  doge: 'Dogecoin',
  avax: 'Avalanche',
  dot: 'Polkadot',
  matic: 'Polygon',
  link: 'Chainlink',
  uni: 'Uniswap',
  atom: 'Cosmos',
  ltc: 'Litecoin',
  etc: 'Ethereum Classic',
  xlm: 'Stellar',
  algo: 'Algorand',
  vet: 'VeChain',
  fil: 'Filecoin',
  aave: 'Aave',
  near: 'NEAR Protocol',
  apt: 'Aptos',
  arb: 'Arbitrum',
  op: 'Optimism',
  inj: 'Injective',
  sui: 'Sui',
  sei: 'Sei',
  tia: 'Celestia',
  pepe: 'Pepe',
  shib: 'Shiba Inu',
};

// Generate metadata for each coin
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { coin: coinParam } = await params;
  const coin = coinParam.toUpperCase();
  const coinName = coinNames[coinParam.toLowerCase()] || coin;

  return {
    title: `${coin}/USDT Analysis - ${coinName} Trading Signals`,
    description: `Free ${coinName} (${coin}) trading analysis with AI. Get ${coin}/USDT price prediction, whale activity detection, support/resistance levels, and actionable trade plans.`,
    keywords: [
      `${coin} analysis`,
      `${coinName} price prediction`,
      `${coin} trading signals`,
      `${coin} technical analysis`,
      `${coin} whale activity`,
      `${coin} USDT`,
      `${coinName} trading`,
      `buy ${coin}`,
      `${coin} forecast`,
    ],
    openGraph: {
      title: `${coin}/USDT Analysis - ${coinName} Trading Signals | TraderPath`,
      description: `Free ${coinName} (${coin}) trading analysis with AI. Whale detection, price targets, and trade plans.`,
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${coin}/USDT Analysis | TraderPath`,
      description: `Free ${coinName} trading analysis with AI whale detection and trade plans.`,
    },
  };
}

// Generate static params for popular coins
export async function generateStaticParams() {
  return Object.keys(coinNames).map((coin) => ({
    coin: coin,
  }));
}

export default async function PublicAnalysisPage({ params }: PageProps) {
  const { coin: coinParam } = await params;
  const coin = coinParam.toUpperCase();
  const coinName = coinNames[coinParam.toLowerCase()] || coin;

  // Sample analysis data (static for SEO)
  const sampleData = {
    marketRegime: 'Cautiously Bullish',
    fearGreed: 65,
    trend: 'Uptrend',
    riskLevel: 'Moderate',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      {/* Hero Section */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-red-500">Trader</span>
            <span className="text-yellow-500">Path</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium hover:text-primary transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {coin}/USDT Analysis
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional {coinName} trading analysis with AI-powered whale detection
            and 7-step methodology
          </p>
        </div>

        {/* Analysis Preview */}
        <div className="max-w-4xl mx-auto">
          {/* Market Overview Card */}
          <div className="bg-card border rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
              Market Pulse
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Market Regime</p>
                <p className="text-lg font-semibold text-green-500">{sampleData.marketRegime}</p>
              </div>
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Fear & Greed</p>
                <p className="text-lg font-semibold">{sampleData.fearGreed}/100</p>
              </div>
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Trend</p>
                <p className="text-lg font-semibold text-green-500">{sampleData.trend}</p>
              </div>
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <p className="text-lg font-semibold text-yellow-500">{sampleData.riskLevel}</p>
              </div>
            </div>
          </div>

          {/* Locked Steps */}
          {[
            { num: 2, title: 'Asset Scanner', desc: 'Multi-timeframe technical analysis' },
            { num: 3, title: 'Safety Check', desc: 'Whale activity & manipulation detection' },
            { num: 4, title: 'Timing Analysis', desc: 'Optimal entry timing signals' },
            { num: 5, title: 'Trade Plan', desc: 'Entry, stop loss, take profit levels' },
            { num: 6, title: 'Trap Check', desc: 'Bull/bear trap detection' },
            { num: 7, title: 'Final Verdict', desc: 'GO / WAIT / AVOID recommendation' },
          ].map((step) => (
            <div key={step.num} className="bg-card/50 border border-dashed rounded-xl p-6 mb-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Sign up to unlock</p>
                  <Link
                    href="/register"
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                  >
                    Get Full Analysis
                  </Link>
                </div>
              </div>
              <h3 className="text-lg font-semibold flex items-center gap-2 opacity-50">
                <span className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-sm font-bold">{step.num}</span>
                {step.title}
              </h3>
              <p className="text-muted-foreground mt-2 opacity-50">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto text-center mt-12 p-8 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl border">
          <h2 className="text-2xl font-bold mb-4">
            Get Full {coin} Analysis Free
          </h2>
          <p className="text-muted-foreground mb-6">
            Sign up now and receive 25 free credits to analyze any cryptocurrency.
            No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
          >
            Start Free Analysis
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* SEO Content */}
        <article className="max-w-4xl mx-auto mt-16 prose prose-invert">
          <h2>What is {coinName} ({coin})?</h2>
          <p>
            {coinName} is one of the leading cryptocurrencies in the market. Our AI-powered
            analysis platform provides comprehensive trading insights including whale activity
            detection, manipulation alerts, and actionable trade plans.
          </p>

          <h2>How TraderPath Analyzes {coin}</h2>
          <p>
            TraderPath uses a proprietary 7-step analysis methodology to evaluate {coinName}:
          </p>
          <ol>
            <li><strong>Market Pulse:</strong> Overall crypto market sentiment and regime analysis</li>
            <li><strong>Asset Scanner:</strong> Multi-timeframe technical analysis with 15+ indicators</li>
            <li><strong>Safety Check:</strong> Whale activity monitoring and manipulation detection</li>
            <li><strong>Timing Analysis:</strong> Optimal entry timing based on volume and momentum</li>
            <li><strong>Trade Plan:</strong> Precise entry, stop loss, and take profit levels</li>
            <li><strong>Trap Check:</strong> Bull trap and bear trap detection algorithms</li>
            <li><strong>Final Verdict:</strong> Clear GO/WAIT/AVOID recommendation with confidence score</li>
          </ol>

          <h2>Why Use TraderPath for {coin} Trading?</h2>
          <ul>
            <li>AI-powered analysis updated in real-time</li>
            <li>Whale manipulation detection to avoid pump & dump schemes</li>
            <li>Clear trade plans with risk management built-in</li>
            <li>Multi-timeframe analysis for scalping, day trading, and swing trading</li>
            <li>25 free credits for new users - no credit card required</li>
          </ul>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-4">
            TraderPath - Professional Crypto Trading Analysis
          </p>
          <p className="text-xs">
            This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice.
            All investments carry risk, including the potential loss of principal. Past performance does not guarantee future results.
          </p>
        </div>
      </footer>
    </div>
  );
}
