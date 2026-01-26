'use client';

import Link from 'next/link';
import { ArrowLeft, Clock, User, TrendingUp, Brain, Shield, Zap, ChevronRight, ArrowRight, BookOpen } from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

const FEATURED_POST = {
  title: 'Understanding Market Manipulation: How Our AI Detects Pump & Dump Schemes',
  excerpt: 'Learn how TraderPath\'s advanced algorithms identify manipulation patterns and protect traders from common market traps.',
  author: 'Alex Chen',
  date: 'January 24, 2026',
  readTime: '8 min read',
  category: 'Technology',
  image: '/images/blog/manipulation-detection.jpg',
};

const BLOG_POSTS = [
  {
    title: 'The 7-Step Analysis Framework: A Deep Dive',
    excerpt: 'Discover how our comprehensive analysis system evaluates market conditions, technical indicators, and risk factors.',
    author: 'Sarah Kim',
    date: 'January 22, 2026',
    readTime: '6 min read',
    category: 'Education',
    icon: BookOpen,
  },
  {
    title: 'Crypto Market Outlook: Q1 2026 Predictions',
    excerpt: 'Our AI experts analyze current market trends and provide insights for the upcoming quarter.',
    author: 'Marcus Johnson',
    date: 'January 20, 2026',
    readTime: '10 min read',
    category: 'Market Analysis',
    icon: TrendingUp,
  },
  {
    title: 'Risk Management Strategies for Volatile Markets',
    excerpt: 'Essential risk management techniques every crypto trader should implement to protect their portfolio.',
    author: 'Elena Rodriguez',
    date: 'January 18, 2026',
    readTime: '7 min read',
    category: 'Trading',
    icon: Shield,
  },
  {
    title: 'How AI is Transforming Cryptocurrency Trading',
    excerpt: 'Exploring the role of artificial intelligence in modern trading analysis and decision-making.',
    author: 'Sarah Kim',
    date: 'January 15, 2026',
    readTime: '9 min read',
    category: 'Technology',
    icon: Brain,
  },
  {
    title: 'Understanding Support and Resistance Levels',
    excerpt: 'A beginner\'s guide to identifying key price levels and using them in your trading strategy.',
    author: 'Alex Chen',
    date: 'January 12, 2026',
    readTime: '5 min read',
    category: 'Education',
    icon: TrendingUp,
  },
  {
    title: 'New Feature: AI Concierge - Your Personal Trading Assistant',
    excerpt: 'Introducing our latest feature that lets you analyze markets using natural language commands.',
    author: 'Marcus Johnson',
    date: 'January 10, 2026',
    readTime: '4 min read',
    category: 'Product Updates',
    icon: Zap,
  },
];

const CATEGORIES = [
  { name: 'All', count: 24 },
  { name: 'Education', count: 8 },
  { name: 'Market Analysis', count: 6 },
  { name: 'Technology', count: 5 },
  { name: 'Trading', count: 3 },
  { name: 'Product Updates', count: 2 },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TraderPathLogo size="md" showText={true} showTagline={false} href="/" />
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="px-4 py-2 text-muted-foreground hover:text-foreground transition">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            TraderPath{' '}
            <span className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
              Blog
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Insights, tutorials, and market analysis to help you become a better trader
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map((category) => (
            <button
              key={category.name}
              className={`px-4 py-2 rounded-full text-sm transition ${
                category.name === 'All'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>

        {/* Featured Post */}
        <div className="mb-16">
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 md:p-12 flex items-center justify-center">
                <div className="w-full max-w-md aspect-video bg-gradient-to-br from-primary/30 to-primary/10 rounded-lg flex items-center justify-center">
                  <Brain className="w-24 h-24 text-primary/50" />
                </div>
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4 w-fit">
                  Featured
                </span>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {FEATURED_POST.title}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {FEATURED_POST.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {FEATURED_POST.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {FEATURED_POST.readTime}
                  </span>
                </div>
                <button className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">
                  Read Article
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, index) => {
              const Icon = post.icon;
              return (
                <article
                  key={index}
                  className="bg-card border rounded-xl p-6 hover:border-primary/50 transition group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Load More */}
        <div className="text-center mb-16">
          <button className="px-6 py-3 border rounded-lg font-semibold hover:bg-accent transition inline-flex items-center gap-2">
            Load More Articles
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Newsletter CTA */}
        <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-6">
            Get the latest trading insights and platform updates delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2">
              Subscribe
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No spam, unsubscribe anytime. By subscribing, you agree to our Privacy Policy.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 <span className="text-red-500 font-semibold">Trader</span><span className="text-green-500 font-semibold">Path</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-foreground transition">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
