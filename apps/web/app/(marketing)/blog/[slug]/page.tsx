'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar, Share2, Twitter, Linkedin, Facebook, ChevronRight, Menu, X, Zap, ArrowRight, BookOpen, TrendingUp, Brain, Shield } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { TraderPathLogo } from '../../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../../components/common/ThemeToggle';
import { getArticleBySlug, getAllArticles, BlogArticle } from '../../../../lib/blog-data';

// Coins to display in the ticker
const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCategoryColor(category: string): { color: string; bg: string; border: string } {
  switch (category) {
    case 'Education':
      return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
    case 'Market Analysis':
      return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    case 'Trading':
      return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'Technology':
      return { color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    case 'Product Updates':
      return { color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    default:
      return { color: 'text-muted-foreground', bg: 'bg-accent', border: 'border-border' };
  }
}

// Parse inline markdown (bold and code) to React elements - XSS safe
function parseInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Match **bold** and `code` patterns
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;
  let matchIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const matchText = match[0];
    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      // Bold text
      result.push(
        <strong key={`${keyPrefix}-bold-${matchIndex}`}>
          {matchText.slice(2, -2)}
        </strong>
      );
    } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
      // Code text
      result.push(
        <code key={`${keyPrefix}-code-${matchIndex}`} className="bg-accent px-1.5 py-0.5 rounded text-sm">
          {matchText.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
    matchIndex++;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} className="bg-accent rounded-lg p-4 overflow-x-auto my-4">
            <code className="text-sm">{codeContent.join('\n')}</code>
          </pre>
        );
        codeContent = [];
      }
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-2xl font-bold mt-8 mb-4 gradient-text-logo-animate">
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={index} className="my-8 border-border" />);
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={index} className="ml-4 text-muted-foreground">
          {parseInlineMarkdown(line.replace('- ', ''), `li-${index}`)}
        </li>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={index} className="font-semibold mt-4 mb-2">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    } else if (line.trim() === '') {
      elements.push(<br key={index} />);
    } else {
      // Use safe React elements instead of dangerouslySetInnerHTML
      elements.push(
        <p key={index} className="text-muted-foreground leading-relaxed mb-4">
          {parseInlineMarkdown(line, `p-${index}`)}
        </p>
      );
    }
  });

  return <div className="prose-content">{elements}</div>;
}

function RelatedArticles({ currentSlug, category }: { currentSlug: string; category: string }) {
  const allArticles = getAllArticles();
  const related = allArticles
    .filter((a) => a.slug !== currentSlug)
    .filter((a) => a.category === category || Math.random() > 0.5)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-6 gradient-text-logo-animate">Related Articles</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {related.map((article) => {
          const style = getCategoryColor(article.category);
          return (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group bg-card/50 backdrop-blur border-2 rounded-xl p-6 hover:border-primary/50 hover:shadow-xl transition"
            >
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-3 ${style.bg} ${style.color}`}>
                {article.category}
              </span>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition line-clamp-2 gradient-text-logo-animate">
                {article.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function BlogArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const article = getArticleBySlug(slug);

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

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>

        <div className="text-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 gradient-text-logo-animate">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all border border-slate-300 dark:border-slate-600"
          >
            <ArrowLeft className="w-4 h-4 gradient-text-rg-animate" />
            <span className="gradient-text-rg-animate">Back to Blog</span>
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const categoryStyle = getCategoryColor(article.category);

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

      {/* Main Content */}
      <main className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/blog" className="hover:text-foreground transition">
              Blog
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className={categoryStyle.color}>{article.category}</span>
          </nav>

          {/* Article Header */}
          <header className="mb-12">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${categoryStyle.bg} ${categoryStyle.color} border ${categoryStyle.border}`}>
              {article.category}
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight gradient-text-logo-animate">
              {article.title}
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              {article.excerpt}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{article.author}</span>
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(article.publishedAt)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {article.readTime} min read
              </span>
            </div>
          </header>

          {/* Share Buttons */}
          <div className="flex items-center gap-4 mb-12 pb-8 border-b">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share:
            </span>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:bg-blue-500/10 hover:text-blue-500 transition"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:bg-blue-600/10 hover:text-blue-600 transition"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:bg-blue-700/10 hover:text-blue-700 transition"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>

          {/* Article Content */}
          <article className="mb-12">
            <MarkdownContent content={article.content} />
          </article>

          {/* CTA Box */}
          <div className="p-8 bg-card border-2 border-amber-500/30 rounded-2xl text-center mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-green-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-6">
                <Zap className="w-4 h-4" />
                25 Free Credits
              </div>
              <h3 className="text-2xl font-bold mb-4 gradient-text-logo-animate">Ready to Start Trading Smarter?</h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of traders using TraderPath&apos;s AI-powered analysis to make better decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
                >
                  <span className="gradient-text-rg-animate">Start Free Analysis</span>
                  <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 border rounded-lg font-semibold hover:bg-accent transition"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          <RelatedArticles currentSlug={article.slug} category={article.category} />
        </div>
      </main>

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
            <p className="text-muted-foreground text-sm">
              Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
