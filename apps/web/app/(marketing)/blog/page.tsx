'use client';

import Link from 'next/link';
import {
  Clock,
  User,
  TrendingUp,
  Brain,
  Shield,
  Zap,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Menu,
  X,
  Sparkles,
  Newspaper,
  Tag,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { getAllArticles, getFeaturedArticle, BlogArticle } from '../../../lib/blog-data';

// Coins to display in the ticker
const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

const CATEGORY_ICONS: Record<string, { icon: typeof BookOpen; color: string; bg: string; border: string }> = {
  Education: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'Market Analysis': { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  Trading: { icon: Shield, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  Technology: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  'Product Updates': { icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCategoryStyle(category: string) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.Education;
}

export default function BlogPage() {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const featuredArticle = getFeaturedArticle();
  const allArticles = getAllArticles();

  // Filter articles by category
  const filteredArticles = selectedCategory === 'All'
    ? allArticles.filter(a => !a.featured)
    : allArticles.filter(a => a.category === selectedCategory && !a.featured);

  // Get category counts
  const categories = [
    { name: 'All', count: allArticles.length },
    { name: 'Education', count: allArticles.filter(a => a.category === 'Education').length },
    { name: 'Market Analysis', count: allArticles.filter(a => a.category === 'Market Analysis').length },
    { name: 'Trading', count: allArticles.filter(a => a.category === 'Trading').length },
    { name: 'Technology', count: allArticles.filter(a => a.category === 'Technology').length },
    { name: 'Product Updates', count: allArticles.filter(a => a.category === 'Product Updates').length },
  ].filter(c => c.count > 0);

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
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition">
              About
            </Link>
            <Link href="/blog" className="text-foreground font-medium">
              Blog
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
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/blog"
                className="py-2 text-foreground font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
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
      <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-10 sm:top-20 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 sm:bottom-20 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-[500px] h-64 sm:h-[500px] bg-green-500/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-green-500/20 border-2 border-blue-500/40 rounded-full text-sm sm:text-base font-semibold mb-4 sm:mb-6 shadow-lg shadow-blue-500/20">
            <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 dark:from-blue-300 dark:via-purple-300 dark:to-green-300 bg-clip-text text-transparent">Trading Insights & Education</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2 gradient-text-logo-animate">
            TraderPath Blog
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Insights, tutorials, and market analysis to help you become a better trader.
            Learn from experts and master the crypto markets.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {categories.map((category) => {
              const style = getCategoryStyle(category.name);
              const isActive = selectedCategory === category.name;
              return (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : `${style.bg} ${style.color} hover:opacity-80 border ${style.border}`
                  }`}
                >
                  {category.name === 'All' ? (
                    <Tag className="w-4 h-4" />
                  ) : (
                    (() => {
                      const Icon = style.icon;
                      return <Icon className="w-4 h-4" />;
                    })()
                  )}
                  {category.name}
                  <span className={`text-xs ${isActive ? 'bg-primary-foreground/20' : 'bg-current/10'} px-1.5 py-0.5 rounded-full`}>
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredArticle && selectedCategory === 'All' && (
        <section className="py-12 sm:py-16 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-20 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Featured Article
              </span>
            </div>

            <Link href={`/blog/${featuredArticle.slug}`} className="block group">
              <div className="bg-card/50 backdrop-blur border-2 border-amber-500/30 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-xl transition">
                <div className="grid md:grid-cols-2">
                  <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent p-8 md:p-12 flex items-center justify-center">
                    <div className="w-full max-w-md aspect-video bg-gradient-to-br from-amber-500/30 to-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
                      <Brain className="w-24 h-24 text-amber-500/50" />
                    </div>
                  </div>
                  <div className="p-8 md:p-12 flex flex-col justify-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 w-fit ${getCategoryStyle(featuredArticle.category).bg} ${getCategoryStyle(featuredArticle.category).color}`}>
                      {featuredArticle.category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-amber-500 transition gradient-text-logo-animate">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {featuredArticle.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {featuredArticle.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {featuredArticle.readTime} min read
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-2 text-amber-500 font-semibold group-hover:gap-3 transition-all">
                      Read Article
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-12 sm:py-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold gradient-text-logo-animate">
              {selectedCategory === 'All' ? 'Latest Articles' : selectedCategory}
            </h2>
            <span className="text-sm text-muted-foreground">
              {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => {
                const style = getCategoryStyle(article.category);
                const Icon = style.icon;
                return (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="block group"
                  >
                    <article className={`bg-card/50 backdrop-blur border-2 ${style.border} rounded-xl p-6 hover:shadow-xl hover:border-primary/50 transition h-full`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
                          <Icon className={`w-5 h-5 ${style.color}`} />
                        </div>
                        <span className={`text-sm font-medium ${style.color}`}>
                          {article.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition gradient-text-logo-animate line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime} min
                        </span>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No articles found in this category.</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
              >
                View All Articles
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-green-500/5"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto p-8 md:p-12 bg-card border rounded-2xl shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-sm mb-6">
              <Zap className="w-4 h-4" />
              Stay Updated
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 gradient-text-logo-animate">
              Get Trading Insights Delivered
            </h2>
            <p className="text-muted-foreground mb-8">
              Get the latest trading insights and platform updates delivered to your inbox.
              Join 10,000+ traders who stay ahead of the market.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="px-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600">
                <span className="gradient-text-rg-animate">Subscribe</span>
                <ArrowRight className="w-4 h-4 gradient-text-rg-animate" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No spam, unsubscribe anytime. By subscribing, you agree to our Privacy Policy.
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
              © 2025 TraderPath. All rights reserved.
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
