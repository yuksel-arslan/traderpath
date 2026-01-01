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
  TrendingDown
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';

// TradePath Logo Component with Trading Colors
function TradePathLogo({ className = '', size = 'default' }: { className?: string; size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small: { wrapper: 'w-8 h-8', arrow: 'w-4 h-4' },
    default: { wrapper: 'w-10 h-10', arrow: 'w-5 h-5' },
    large: { wrapper: 'w-16 h-16', arrow: 'w-8 h-8' }
  };
  const s = sizes[size];

  return (
    <div className={`relative ${s.wrapper} ${className}`}>
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tradingGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        {/* Path/Road shape */}
        <path
          d="M20 4 L32 36 L26 36 L20 16 L14 36 L8 36 Z"
          fill="url(#tradingGradient)"
        />
        {/* Arrow overlay */}
        <path
          d="M20 8 L26 18 L22 18 L22 28 L18 28 L18 18 L14 18 Z"
          fill="white"
          fillOpacity="0.9"
        />
      </svg>
    </div>
  );
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
    description: 'Deep-dive analysis of specific cryptocurrencies',
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

const PRICING = [
  {
    name: 'Starter',
    credits: 25,
    price: 14.99,
    features: ['25 analysis credits', 'All 7 analysis steps', 'PDF reports', 'Email support'],
  },
  {
    name: 'Popular',
    credits: 60,
    price: 29.99,
    popular: true,
    features: ['60 + 5 bonus credits', 'All 7 analysis steps', 'Priority analysis queue', 'Priority support'],
  },
  {
    name: 'Pro',
    credits: 150,
    price: 59.99,
    features: ['150 + 20 bonus credits', 'All 7 analysis steps', 'AI chat support', 'API access'],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <TradePathLogo size="small" />
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
                TradePath
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1 hidden sm:block">From Charts to Clarity</span>
            </div>
          </Link>
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
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-sm mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Trading Analysis
          </div>
          <div className="flex justify-center mb-8">
            <TradePathLogo size="large" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            From Analysis to Action{' '}
            <span className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
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
              className="px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
            >
              Start Free Analysis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 border rounded-lg font-semibold hover:bg-accent transition"
            >
              See How It Works
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
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
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
              Complete Trading Analysis Suite
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our 7-step analysis system covers every aspect of trading, from market
              conditions to specific entry points.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-card border rounded-lg hover:shadow-lg transition group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 via-amber-500/20 to-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Icon className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
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
                    <th className="text-center p-4 font-semibold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">TradePath</th>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Select a Coin',
                description: 'Choose from our supported cryptocurrencies to analyze',
              },
              {
                step: 2,
                title: 'Run Analysis',
                description: 'Our AI processes market data through 7 specialized steps',
              },
              {
                step: 3,
                title: 'Trade with Confidence',
                description: 'Get clear recommendations with entry, targets, and stop-loss',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-green-500/25">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
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
            {PRICING.map((plan, index) => (
              <div
                key={index}
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

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Trade Smarter?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of traders using TradePath to make informed decisions.
              Start with 25 free credits today.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition shadow-lg shadow-green-500/25"
            >
              Create Free Account
              <ChevronRight className="w-5 h-5" />
            </Link>
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
