// ===========================================
// Features Page for SEO
// ===========================================

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features - AI Trading Analysis Tools',
  description: 'Discover TraderPath features: AI-powered market analysis, whale manipulation detection, multi-timeframe signals, automated trade plans, and real-time alerts.',
  keywords: [
    'crypto trading tools',
    'AI trading analysis',
    'whale detection',
    'trading signals',
    'technical analysis',
    'crypto alerts',
    'trade plan generator',
  ],
};

const features = [
  {
    icon: '🎯',
    title: '7-Step Analysis',
    description: 'Comprehensive methodology covering market pulse, asset scanning, safety checks, timing, trade planning, trap detection, and final verdict.',
  },
  {
    icon: '🐋',
    title: 'Whale Detection',
    description: 'Real-time monitoring of large transactions and whale wallet movements to identify potential market manipulation.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Insights',
    description: 'Advanced AI analyzes 50+ data points to generate actionable trading recommendations with confidence scores.',
  },
  {
    icon: '📊',
    title: 'Multi-Timeframe Analysis',
    description: 'Analyze markets across 1m, 5m, 15m, 1h, 4h, and daily timeframes for scalping, day trading, or swing trading.',
  },
  {
    icon: '🛡️',
    title: 'Manipulation Detection',
    description: 'Identify pump & dump schemes, wash trading, and other manipulation tactics before they affect your trades.',
  },
  {
    icon: '📋',
    title: 'Automated Trade Plans',
    description: 'Get precise entry prices, stop losses, and multiple take profit targets with calculated risk/reward ratios.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Alerts',
    description: 'Receive instant notifications via email, Telegram, or Discord when your analysis conditions are met.',
  },
  {
    icon: '📈',
    title: 'Performance Tracking',
    description: 'Track your analysis accuracy with outcome monitoring - see how predictions match actual market movements.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-red-500">Trader</span>
            <span className="text-yellow-500">Path</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-medium hover:text-primary transition">
              Login
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Professional Trading Tools
            <br />
            <span className="text-primary">Powered by AI</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From confusion to conviction. TraderPath combines AI analysis with whale detection
            to give you the edge in crypto trading.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, i) => (
            <div key={i} className="bg-card border rounded-xl p-6 hover:border-primary/50 transition">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <section className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How TraderPath Works</h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Select Your Coin', desc: 'Choose from 100+ cryptocurrencies including BTC, ETH, SOL, and more.' },
              { step: 2, title: 'Choose Trade Type', desc: 'Select scalping (1-15min), day trading (1-8h), or swing trading (2-14 days).' },
              { step: 3, title: 'AI Analysis Runs', desc: 'Our AI analyzes market data, whale activity, and 50+ indicators in seconds.' },
              { step: 4, title: 'Get Your Verdict', desc: 'Receive a clear GO/WAIT/AVOID recommendation with a complete trade plan.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center p-8 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl border">
          <h2 className="text-2xl font-bold mb-4">Ready to Trade Smarter?</h2>
          <p className="text-muted-foreground mb-6">
            Get 25 free credits when you sign up. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
          >
            Start Free Analysis
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/features" className="hover:text-foreground">Features</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </div>
          <p>TraderPath - Professional Crypto Trading Analysis</p>
        </div>
      </footer>
    </div>
  );
}
