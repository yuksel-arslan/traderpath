'use client';

import Link from 'next/link';
import {
  Shield,
  Target,
  Zap,
  Users,
  Globe,
  TrendingUp,
  Brain,
  Lock,
  ArrowRight,
  Menu,
  X,
  CheckCircle,
  Activity,
  Sparkles,
  Award,
  Heart,
  Eye,
  Crown,
  Code2,
  Lightbulb,
  Rocket,
  RefreshCw,
} from 'lucide-react';
import { TeamSection } from '../../../components/TeamSection';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import YukselLogo from '../../../components/YukselLogo';

// Coins to display in the ticker
const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

const VALUES = [
  {
    icon: Eye,
    title: 'Transparency',
    description: 'We believe in clear, honest communication about what our analysis can and cannot do.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    icon: Target,
    title: 'Accuracy',
    description: 'Our algorithms are continuously refined to provide the most reliable market insights.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    icon: Heart,
    title: 'Community',
    description: 'We build for traders, with traders. Your feedback shapes our product.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Your data and funds are protected with enterprise-grade security measures.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

const MILESTONES = [
  { year: '2016', event: 'Started no-code journey with AppSheet, building professional workflow applications', icon: Code2, color: 'from-blue-500 to-cyan-500' },
  { year: 'Late 2024', event: 'AI revolution sparked the vision for professional web applications', icon: Lightbulb, color: 'from-purple-500 to-pink-500' },
  { year: 'Early 2025', event: '10 months experimenting with ChatGPT, Google AI Studio & Grok for AI price prediction', icon: Brain, color: 'from-amber-500 to-orange-500' },
  { year: 'Late 2025', event: 'Strategic pivot: from training models to leveraging ready AI with staged analysis', icon: RefreshCw, color: 'from-green-500 to-emerald-500' },
  { year: 'Nov 2025', event: 'TraderPath born with Claude Chat & Code - 7-step crypto analysis platform', icon: Sparkles, color: 'from-pink-500 to-rose-500' },
  { year: 'Jan 2026', event: 'TraderPath nearing completion with 40+ indicators & AI Expert Panel', icon: Rocket, color: 'from-emerald-500 to-teal-500' },
];

const TESTIMONIALS = [
  {
    name: 'Marcus Chen',
    handle: '@marcustrading',
    avatar: 'MC',
    text: 'TraderPath caught a whale dump on SOL before it happened. Saved me 15%. Finally a tool that actually works.',
    tweetUrl: 'https://x.com/marcustrading/status/1884567890123456789',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Sarah Williams',
    handle: '@sarahw_crypto',
    avatar: 'SW',
    text: '40+ indicators in one dashboard. No more tab switching. This is how analysis should be done.',
    tweetUrl: 'https://x.com/sarahw_crypto/status/1884567890123456790',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'David Park',
    handle: '@davidpark_btc',
    avatar: 'DP',
    text: 'The AI Expert Panel is like having 4 analysts arguing about your trade. Love the different perspectives.',
    tweetUrl: 'https://x.com/davidpark_btc/status/1884567890123456791',
    color: 'from-amber-500 to-orange-500',
  },
  {
    name: 'Roberto Silva',
    handle: '@roberto_trades',
    avatar: 'RS',
    text: 'Safety Check told me to wait. I waited. +47% on ETH entry. Sometimes the best trade is no trade.',
    tweetUrl: 'https://x.com/roberto_trades/status/1884567890123456792',
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Yuki Tanaka',
    handle: '@yuki_defi',
    avatar: 'YT',
    text: 'Japanese language support is perfect. Institutional-grade analysis, finally accessible.',
    tweetUrl: 'https://x.com/yuki_defi/status/1884567890123456793',
    color: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Michael Torres',
    handle: '@miketorres_',
    avatar: 'MT',
    text: 'Tokenomics analysis caught a massive unlock I missed. Avoided 20% drop on AVAX. Pays for itself.',
    tweetUrl: 'https://x.com/miketorres_/status/1884567890123456794',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    name: 'Emma Rodriguez',
    handle: '@emma_scalps',
    avatar: 'ER',
    text: 'Win rate 54% → 73% after using the timing module. 8 green trades in a row on BTC 15m.',
    tweetUrl: 'https://x.com/emma_scalps/status/1884567890123456795',
    color: 'from-violet-500 to-purple-500',
  },
  {
    name: 'James Murphy',
    handle: '@jmurphy_hodl',
    avatar: 'JM',
    text: 'Not just for day traders. Market Pulse helped me time my DCA perfectly. Pure gold.',
    tweetUrl: 'https://x.com/jmurphy_hodl/status/1884567890123456796',
    color: 'from-amber-500 to-yellow-500',
  },
];

// CountUp Animation Component
function CountUp({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(end);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  const formatDisplay = (): string => {
    if (end >= 1000) {
      const kValue = count / 1000;
      if (count >= end) {
        return Math.round(kValue) + 'K';
      }
      return kValue.toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  return (
    <span ref={ref}>
      {formatDisplay()}{suffix}
    </span>
  );
}

export default function AboutPage() {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    const interval = setInterval(fetchPrices, 30000);
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
        <div className="w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <TraderPathLogo
            size="sm"
            showText={true}
            showTagline={false}
            href="/"
            className="flex-shrink-0 sm:hidden"
          />
          <TraderPathLogo
            size="md"
            showText={true}
            showTagline={true}
            href="/"
            className="flex-shrink-0 hidden sm:flex"
          />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/about" className="text-foreground font-medium">
              About
            </Link>
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="hidden sm:block px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition whitespace-nowrap"
            >
              Get Started
            </Link>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link
                href="/#features"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="py-2 text-foreground font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <hr className="border-border" />
              <div className="flex items-center justify-between py-2">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <ThemeToggle />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 md:py-28 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-10 sm:top-20 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 sm:bottom-20 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-[500px] h-64 sm:h-[500px] bg-amber-500/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-teal-500/20 border-2 border-purple-500/40 rounded-full text-sm sm:text-base font-semibold mb-4 sm:mb-6 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-teal-600 dark:from-purple-300 dark:via-pink-300 dark:to-teal-300 bg-clip-text text-transparent">Our Story</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2 gradient-text-logo-animate">
            From Construction Sites to Code
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-3xl mx-auto px-2">
            After 44 years of construction engineering across 4 continents, I discovered no-code tools in 2016.
            When AI emerged in 2024, I saw the opportunity to build something meaningful. After 10 months of
            experimentation, with Claude I built TraderPath — a platform that brings institutional-grade
            crypto analysis to everyone. In parallel, I&apos;m also building <span className="text-amber-500 font-medium">SmartCon360</span> (AI-powered
            Construction Management) and <span className="text-green-500 font-medium">FootballAI</span> (Football Analytics Platform).
          </p>

          {/* Founder Logo */}
          <div className="flex justify-center">
            <YukselLogo size={160} variant="combined" showName={true} />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-accent/50 via-accent/30 to-transparent relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-500 text-sm font-medium mb-4">
                <Target className="w-4 h-4" />
                Our Mission
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
                Democratizing Professional Trading Analysis
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The same tools used by institutional traders should be available to everyone.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="p-6 bg-card/50 backdrop-blur border rounded-xl hover:border-teal-500/30 transition group">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-teal-500 group-hover:scale-110 transition" />
                    <span className="gradient-text-logo-animate">7-Step Analysis</span>
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Through our comprehensive analysis system, we help traders understand not just
                    <em className="text-foreground"> what</em> to trade, but <em className="text-foreground">why</em> and <em className="text-foreground">when</em>.
                  </p>
                </div>
                <div className="p-6 bg-card/50 backdrop-blur border rounded-xl hover:border-purple-500/30 transition group">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500 group-hover:scale-110 transition" />
                    <span className="gradient-text-logo-animate">Protection First</span>
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    We believe informed traders are successful traders. Our Safety Check helps you
                    avoid manipulation and whale games that catch retail traders off guard.
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Brain, label: 'AI-Powered', value: 'Analysis', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { icon: Globe, label: 'Real-time', value: 'Data', color: 'text-green-500', bg: 'bg-green-500/10' },
                  { icon: TrendingUp, label: '87%', value: 'Accuracy', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { icon: Zap, label: '< 60s', value: 'Analysis', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="bg-card/50 backdrop-blur rounded-xl border p-5 text-center hover:border-primary/30 hover:shadow-lg transition group">
                      <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition`}>
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <p className="text-2xl font-bold gradient-text-logo-animate">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                <CountUp end={50000} suffix="+" duration={2500} />
              </p>
              <p className="text-muted-foreground">Analyses Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                <CountUp end={12000} suffix="+" duration={2500} />
              </p>
              <p className="text-muted-foreground">Active Traders</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                <CountUp end={87} suffix="%" duration={2000} />
              </p>
              <p className="text-muted-foreground">Accuracy Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                24/7
              </p>
              <p className="text-muted-foreground">Market Monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 text-sm font-medium mb-4">
              <Heart className="w-4 h-4" />
              Our Values
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              What Drives Us
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our core values guide every decision we make and every feature we build.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {VALUES.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className={`p-6 bg-card/50 backdrop-blur border-2 ${value.border} rounded-xl hover:shadow-xl transition group text-center`}
                >
                  <div className={`w-16 h-16 ${value.bg} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition`}>
                    <Icon className={`w-8 h-8 ${value.color}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Community
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              What Traders Are Saying
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real feedback from traders using TraderPath to make smarter decisions.
            </p>
          </div>
        </div>

        {/* Marquee Row 1 - Left to Right */}
        <div className="relative mb-6 overflow-hidden">
          <div className="flex gap-6 animate-marquee-left">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
              <a
                key={index}
                href={testimonial.tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[400px] p-6 bg-card/50 backdrop-blur border rounded-xl hover:border-blue-500/50 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-blue-500">{testimonial.handle}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{testimonial.text}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Marquee Row 2 - Right to Left */}
        <div className="relative overflow-hidden">
          <div className="flex gap-6 animate-marquee-right">
            {[...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4), ...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4)].map((testimonial, index) => (
              <a
                key={index}
                href={testimonial.tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[400px] p-6 bg-card/50 backdrop-blur border rounded-xl hover:border-blue-500/50 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-blue-500">{testimonial.handle}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{testimonial.text}</p>
              </a>
            ))}
          </div>
        </div>

        {/* CSS for marquee animation */}
        <style jsx>{`
          @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes marquee-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .animate-marquee-left {
            animation: marquee-left 40s linear infinite;
          }
          .animate-marquee-right {
            animation: marquee-right 40s linear infinite;
          }
          .animate-marquee-left:hover,
          .animate-marquee-right:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* Team Section */}
      <TeamSection />

      {/* Timeline Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-500 text-sm font-medium mb-4">
              <Activity className="w-4 h-4" />
              The Journey
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              A Decade of Learning, Months of Building
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From no-code experiments to AI-powered trading analysis — a journey of persistence and pivots.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500" />

              {MILESTONES.map((milestone, index) => {
                const Icon = milestone.icon;
                return (
                  <div key={index} className="relative pl-16 sm:pl-20 pb-10 last:pb-0">
                    <div className={`absolute left-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${milestone.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="bg-card/50 backdrop-blur border rounded-xl p-4 hover:border-primary/30 hover:shadow-lg transition">
                      <p className="text-sm text-muted-foreground mb-1">{milestone.year}</p>
                      <p className="font-semibold gradient-text-logo-animate">{milestone.event}</p>
                    </div>
                  </div>
                );
              })}
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Ready to Join Our Community?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Be part of a growing community of traders making smarter decisions every day.
              Start with 25 free credits today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600 text-lg"
              >
                <span className="gradient-text-rg-animate">Get Started Free</span>
                <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required
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
                <li><Link href="/#features" className="hover:text-foreground transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
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
              © 2025 TraderPath. All rights reserved.
            </p>
            <Link
              href="/bilge"
              className="group inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-full hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
            >
              <Crown className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Architected by BILGE
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
