'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Target,
  Clock,
  Zap,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  ChevronRight,
  Globe,
  FileText,
  AlertTriangle,
  TrendingDown,
  Lock,
  Eye,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  ChevronDown,
  Play
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TradePathLogo } from '../../components/common/TradePathLogo';
import { CREDIT_PACKAGES } from '../../lib/pricing-config';
import { LiveAnalysisPreview } from '../../components/marketing/LiveAnalysisPreview';

// Coins to display in the ticker
const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

const FEATURES = [
  {
    icon: Globe,
    title: 'Market Pulse',
    description: 'Real-time analysis of overall market sentiment and conditions',
  },
  {
    icon: Target,
    title: 'Asset Scanner',
    description: 'Deep-dive technical analysis of specific cryptocurrencies',
  },
  {
    icon: Shield,
    title: 'Safety Check',
    description: 'Detect manipulation and whale activities before they affect you',
  },
  {
    icon: Clock,
    title: 'Timing Analysis',
    description: 'Find the optimal entry and exit points for your trades',
  },
  {
    icon: FileText,
    title: 'Trade Plan',
    description: 'Get a complete trading strategy with targets and stop-losses',
  },
  {
    icon: AlertTriangle,
    title: 'Trap Check',
    description: 'Identify liquidation zones and avoid common trading traps',
  },
  {
    icon: CheckCircle,
    title: 'Final Verdict',
    description: 'AI-powered final recommendation with GO/WAIT/AVOID decision',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alex M.',
    role: 'Day Trader',
    content: 'TradePath helped me avoid 3 manipulation traps in just one week. The Safety Check feature is incredible.',
    rating: 5,
  },
  {
    name: 'Sarah K.',
    role: 'Crypto Investor',
    content: 'Finally, an analysis tool that explains WHY I should or shouldn\'t enter a trade. Game changer!',
    rating: 5,
  },
  {
    name: 'Michael R.',
    role: 'Swing Trader',
    content: 'The 7-step analysis gives me confidence in my trading decisions. Worth every credit.',
    rating: 5,
  },
];


const FAQS = [
  {
    question: 'What is TradePath and how does it work?',
    answer: 'TradePath is an AI-powered trading analysis platform that runs your chosen cryptocurrency through 7 specialized analysis steps. In about 60 seconds, you get a complete trade plan with entry points, targets, stop-losses, and a final verdict on whether to trade or wait.',
  },
  {
    question: 'Do I need to connect my exchange or wallet?',
    answer: 'No! TradePath is purely an analysis tool. We never ask for your trading keys, wallet addresses, or exchange credentials. Your funds stay safe in your own accounts.',
  },
  {
    question: 'How accurate is the analysis?',
    answer: 'Our backtesting shows an 87% accuracy rate on trade direction predictions. However, we always recommend using our analysis as one input in your trading decisions, not as financial advice.',
  },
  {
    question: 'What cryptocurrencies can I analyze?',
    answer: 'We support 50+ major cryptocurrencies including BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, and many more. We continuously add new coins based on user demand.',
  },
  {
    question: 'How does the credit system work?',
    answer: 'You purchase credits upfront and spend them as you analyze. A full 7-step analysis costs 25 credits. You can also earn free credits daily through login bonuses, quizzes, and other activities.',
  },
  {
    question: 'Can I get a refund if I\'m not satisfied?',
    answer: 'Yes! We offer a 7-day money-back guarantee on your first credit purchase. If TradePath doesn\'t meet your expectations, contact support for a full refund.',
  },
];


// FAQ Accordion Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-accent/50 transition"
      >
        <span className="font-semibold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          {question}
        </span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const symbols = TICKER_SYMBOLS.map(s => `"${s}USDT"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`
      );
      if (response.ok) {
        const data = await response.json();
        const prices: LivePrice[] = data.map((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
          const symbol = item.symbol.replace('USDT', '');
          const price = parseFloat(item.lastPrice);
          const change = parseFloat(item.priceChangePercent);
          return {
            symbol,
            price: price >= 1000
              ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : price >= 1
                ? price.toFixed(2)
                : price.toFixed(4),
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            up: change >= 0,
          };
        });
        setLivePrices(prices);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return (
    <div className="min-h-screen bg-background">
      {/* Live Price Ticker */}
      <div className="bg-accent/50 border-b py-2 overflow-hidden">
        <div className="flex gap-8 ticker-scroll whitespace-nowrap">
          {isLoadingPrices ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Loading prices...
            </div>
          ) : (
            [...livePrices, ...livePrices].map((coin, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{coin.symbol}</span>
                <span className="text-muted-foreground">${coin.price}</span>
                <span className={coin.up ? 'text-green-500' : 'text-red-500'}>
                  {coin.change}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TradePathLogo size="md" showText showTagline href="/" />
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition">
              How it Works
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-6 shimmer">
            <Zap className="w-4 h-4" />
            AI-Powered Trading Analysis
          </div>
          <div className="flex justify-center mb-8">
            <div className="float">
              <TradePathLogo size="xl" showText={false} />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            From Analysis to Action{' '}
            <span className="gradient-text-animate">
              in 60 Seconds
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop drowning in charts. Our AI-powered 7-step analysis gives you clear
            buy/sell decisions with exact entry points, targets, and stop-losses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
            >
              <span className="gradient-text-rg-animate">Start Free Analysis</span>
              <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
            </Link>
            <a
              href="#see-it-in-action"
              className="px-8 py-4 border rounded-lg font-semibold hover:bg-accent transition flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              See It In Action
            </a>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Get 25 free credits on signup. No credit card required.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '50K+', label: 'Analyses Completed' },
              { value: '12K+', label: 'Active Traders' },
              { value: '87%', label: 'Accuracy Rate' },
              { value: '24/7', label: 'Market Monitoring' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold gradient-text">
                  {stat.value}
                </p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              7-Step Analysis Suite
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Complete trading analysis covering every aspect, from market conditions to final verdict.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            {/* Steps 1-3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {FEATURES.slice(0, 3).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-5 bg-card border rounded-lg hover:border-primary/50 transition group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Step {index + 1}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
            {/* Steps 4-6 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {FEATURES.slice(3, 6).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-5 bg-card border rounded-lg hover:border-primary/50 transition group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Step {index + 4}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
            {/* Step 7 - Final Verdict (Full Width) */}
            <div className="w-full">
              {FEATURES.slice(6).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-6 bg-card border rounded-lg hover:border-primary/50 transition group ring-2 ring-green-500/20 border-green-500/30"
                  >
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                        <Icon className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground font-medium">Step 7</span>
                        <h3 className="font-semibold text-lg">{feature.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Why TradePath Section */}
      <section className="py-20 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose TradePath?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how TradePath compares to traditional analysis tools
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full bg-card border rounded-lg overflow-hidden">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Traditional Tools</th>
                    <th className="text-center p-4 font-semibold gradient-text">TradePath</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Time to Decision', traditional: 'Hours of chart analysis', tradepath: '60 seconds' },
                    { feature: 'Manipulation Detection', traditional: 'Manual research required', tradepath: 'AI-powered auto-detection' },
                    { feature: 'Entry/Exit Points', traditional: 'Self-calculated', tradepath: 'Precise levels provided' },
                    { feature: 'Risk Management', traditional: 'DIY stop-loss', tradepath: 'Complete trade plan included' },
                    { feature: 'Learning Curve', traditional: 'Months to master', tradepath: 'Start immediately' },
                    { feature: 'Pricing', traditional: '$50-300/month subscriptions', tradepath: 'Pay per analysis' },
                  ].map((row, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="p-4 text-center text-muted-foreground">{row.traditional}</td>
                      <td className="p-4 text-center text-green-500 font-medium">{row.tradepath}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-card border rounded-lg text-center">
                <div className="text-3xl font-bold text-red-500 mb-2">7</div>
                <p className="text-muted-foreground">Analysis steps in one click</p>
              </div>
              <div className="p-4 bg-card border rounded-lg text-center">
                <div className="text-3xl font-bold text-amber-500 mb-2">60s</div>
                <p className="text-muted-foreground">From question to trade plan</p>
              </div>
              <div className="p-4 bg-card border rounded-lg text-center">
                <div className="text-3xl font-bold text-green-500 mb-2">$0.50</div>
                <p className="text-muted-foreground">Per comprehensive analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How TradePath Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get from market confusion to trading confidence in minutes
            </p>
          </div>

          {/* Integrated Flow */}
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Step 1: Select */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-amber-500/25">
                1
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Select Your Coin</h3>
                <p className="text-muted-foreground text-sm">Choose from 30+ supported cryptocurrencies</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-border" />
            </div>

            {/* Step 2: 7-Step Analysis */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-amber-500/25">
                2
              </div>
              <div className="w-full">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold mb-1">AI Runs 7-Step Analysis</h3>
                  <p className="text-muted-foreground text-sm">Each coin goes through specialized checks</p>
                </div>

                {/* 7 Steps Grid */}
                <div className="bg-card border rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {[
                      { name: 'Market Pulse', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                      { name: 'Asset Scan', icon: BarChart3, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                      { name: 'Safety', icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10' },
                      { name: 'Timing', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                      { name: 'Trade Plan', icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                      { name: 'Trap Check', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                      { name: 'Verdict', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={idx} className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-accent/50 transition">
                          <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center mb-1`}>
                            <Icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <span className="text-[11px] font-medium">{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-border" />
            </div>

            {/* Step 3: Trade */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-amber-500/25">
                3
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Trade with Confidence</h3>
                <p className="text-muted-foreground text-sm">Get clear GO/WAIT/AVOID verdicts with exact entry, TP, and SL levels</p>
              </div>
            </div>
          </div>

          {/* How We Measure Success */}
          <div className="mt-16 pt-16 border-t border-border">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-3">How We Measure Success</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Honest metrics that reflect real trading outcomes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* TP/SL Based */}
              <div className="bg-card border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-green-500" />
                </div>
                <h4 className="font-semibold mb-2">TP/SL Based</h4>
                <p className="text-sm text-muted-foreground">
                  A trade is <span className="text-green-500 font-medium">successful</span> when Take Profit is hit,
                  <span className="text-red-500 font-medium"> failed</span> when Stop Loss is hit.
                </p>
              </div>

              {/* Real Outcomes */}
              <div className="bg-card border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-semibold mb-2">Real Outcomes</h4>
                <p className="text-sm text-muted-foreground">
                  We monitor prices and automatically verify when TP or SL levels are reached.
                  Every outcome is tracked.
                </p>
              </div>

              {/* No Cherry-Picking */}
              <div className="bg-card border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <h4 className="font-semibold mb-2">No Cherry-Picking</h4>
                <p className="text-sm text-muted-foreground">
                  All predictions are recorded. We don&apos;t hide failures.
                  What you see is our real track record.
                </p>
              </div>
            </div>

            <p className="text-center mt-8 text-muted-foreground italic text-sm">
              &quot;Professional traders measure success by TP/SL outcomes, not arbitrary time periods.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Live Analysis Preview */}
      <section id="see-it-in-action" className="py-20 bg-accent/50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See TradePath in Action
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Here's a real example of our 7-step analysis for Bitcoin
            </p>
          </div>

          {/* Live Analysis Card - Real BTC Data */}
          <LiveAnalysisPreview />
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Trading Command Center
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A clean, intuitive dashboard designed for traders who want results, not complexity
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl">
              {/* Dashboard Header */}
              <div className="bg-accent/50 p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-lg"></div>
                    <span className="font-bold gradient-text">TradePath</span>
                  </div>
                  <nav className="hidden md:flex items-center gap-4 ml-8">
                    <span className="text-sm font-medium text-primary">Dashboard</span>
                    <span className="text-sm text-muted-foreground">Analyze</span>
                    <span className="text-sm text-muted-foreground">Reports</span>
                    <span className="text-sm text-muted-foreground">Alerts</span>
                  </nav>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-sm font-medium">
                    125 Credits
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-full"></div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Stats */}
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Analyses</p>
                    <p className="text-2xl font-bold">147</p>
                  </div>
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-green-500">73%</p>
                  </div>
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Active Alerts</p>
                    <p className="text-2xl font-bold text-cyan-500">5</p>
                  </div>
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Credits Left</p>
                    <p className="text-2xl font-bold">125</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4 bg-gradient-to-br from-red-500/10 via-amber-500/10 to-green-500/10 rounded-lg border border-amber-500/20">
                  <h4 className="font-semibold mb-3">Quick Analysis</h4>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">BTC</span>
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">ETH</span>
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">SOL</span>
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">+50</span>
                  </div>
                </div>

                {/* Recent Analyses */}
                <div className="md:col-span-3">
                  <h4 className="font-semibold mb-4">Recent Analyses</h4>
                  <div className="space-y-3">
                    {[
                      { coin: 'BTC', verdict: 'LONG', score: 87, time: '2 hours ago', profit: '+4.2%' },
                      { coin: 'ETH', verdict: 'SHORT', score: 72, time: '5 hours ago', profit: '+2.8%' },
                      { coin: 'SOL', verdict: 'WAIT', score: 55, time: '1 day ago', profit: '—' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center font-bold text-sm">
                            {item.coin.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{item.coin}/USDT</p>
                            <p className="text-xs text-muted-foreground">{item.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.verdict === 'LONG' ? 'bg-green-500/20 text-green-500' :
                            item.verdict === 'SHORT' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {item.verdict}
                          </span>
                          <span className="font-bold">{item.score}/100</span>
                          <span className={`font-medium ${item.profit.startsWith('+') ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {item.profit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA under dashboard */}
            <div className="text-center mt-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-[1.02] transition shadow-lg border border-slate-300 dark:border-slate-600"
              >
                <span className="gradient-text-rg-animate">Start Your Free Dashboard</span>
                <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">No Trading Keys Required</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">12,000+ Active Traders</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Traders Worldwide
            </h2>
            <p className="text-muted-foreground">
              See what our users have to say about TradePath
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="p-6 bg-card border rounded-lg">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">&ldquo;{testimonial.content}&rdquo;</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Credit-Based Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you use. No subscriptions, no hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CREDIT_PACKAGES.map((plan, index) => (
              <div
                key={plan.id}
                className={`p-6 bg-card border rounded-lg relative ${
                  plan.popular ? 'border-primary ring-2 ring-primary' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {plan.credits} credits
                  </span>
                </p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full py-3 rounded-lg font-semibold text-center transition ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border hover:bg-accent'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about TradePath
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* As Seen On / Media */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground text-sm mb-8">TRUSTED BY TRADERS FROM</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {/* Placeholder logos - replace with actual partner/media logos */}
            <div className="text-2xl font-bold text-muted-foreground">Binance</div>
            <div className="text-2xl font-bold text-muted-foreground">Coinbase</div>
            <div className="text-2xl font-bold text-muted-foreground">Kraken</div>
            <div className="text-2xl font-bold text-muted-foreground">KuCoin</div>
            <div className="text-2xl font-bold text-muted-foreground">Bybit</div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            *Users from these platforms trust TradePath for their trading analysis
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-green-500/5"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center p-8 md:p-12 bg-card border rounded-2xl shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-6">
              <Zap className="w-4 h-4" />
              Limited Time: 25 Free Credits
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Trade{' '}
              <span className="gradient-text-animate">Smarter?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join 12,000+ traders who already use TradePath to make informed decisions.
              Start with 25 free credits today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600 text-lg"
              >
                <span className="gradient-text-rg-animate">Start Free Analysis</span>
                <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • 7-day money-back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition">Pricing</a></li>
                <li><Link href="/credits" className="hover:text-foreground transition">Credits</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground transition">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition">Terms</Link></li>
                <li><Link href="/disclaimer" className="hover:text-foreground transition">Disclaimer</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/help" className="hover:text-foreground transition">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition">Contact</Link></li>
                <li><Link href="/status" className="hover:text-foreground transition">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 TradePath. All rights reserved.
            </p>
            <p className="text-muted-foreground text-sm">
              Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
