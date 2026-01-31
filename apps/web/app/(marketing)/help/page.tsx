'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Search,
  CreditCard,
  BarChart3,
  FileText,
  Bell,
  Shield,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Mail,
  BookOpen,
} from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

const CATEGORIES = [
  {
    icon: BarChart3,
    title: 'Getting Started',
    description: 'Learn the basics of using TraderPath',
    articles: [
      'How to create your first analysis',
      'Understanding the 7-step analysis process',
      'Reading your analysis results',
      'Choosing the right timeframe',
    ],
  },
  {
    icon: CreditCard,
    title: 'Credits & Billing',
    description: 'Manage your credits and payments',
    articles: [
      'How credits work',
      'Purchasing credit packages',
      'Refund policy',
      'Managing your subscription',
    ],
  },
  {
    icon: FileText,
    title: 'Reports & Exports',
    description: 'Generate and share your analysis',
    articles: [
      'Downloading PDF reports',
      'Sending reports via email',
      'Understanding report types',
      'Exporting to TradingView',
    ],
  },
  {
    icon: Bell,
    title: 'Alerts & Notifications',
    description: 'Stay informed about your trades',
    articles: [
      'Setting up price alerts',
      'Configuring notifications',
      'Telegram integration',
      'Discord webhooks',
    ],
  },
  {
    icon: Shield,
    title: 'Account & Security',
    description: 'Protect your account',
    articles: [
      'Changing your password',
      'Enabling two-factor authentication',
      'Managing connected accounts',
      'Deleting your account',
    ],
  },
  {
    icon: Settings,
    title: 'AI Concierge',
    description: 'Use natural language commands',
    articles: [
      'Introduction to AI Concierge',
      'Supported commands',
      'Voice input setup',
      'Troubleshooting common issues',
    ],
  },
];

const FAQS = [
  {
    question: 'How many credits does an analysis cost?',
    answer: 'Each analysis costs 25 credits. You can earn bonus credits through various activities on the platform, such as completing your first analysis (3-credit bonus) or referring friends.',
  },
  {
    question: 'What timeframes are available for analysis?',
    answer: 'TraderPath supports multiple timeframes: 5m, 15m, 30m, 1h, 2h, 4h (Day Trading), 1D, and 1W (Swing Trading). The system automatically recommends the appropriate strategy based on your selected timeframe.',
  },
  {
    question: 'How accurate are the predictions?',
    answer: 'Our platform accuracy is currently around 87% for completed trades. However, past performance does not guarantee future results. We recommend always using proper risk management and conducting your own research.',
  },
  {
    question: 'Can I get a refund for unused credits?',
    answer: 'Yes, we offer a 7-day money-back guarantee for unused credits. Bonus credits are non-refundable. Contact our support team to request a refund.',
  },
  {
    question: 'How do I export analysis to TradingView?',
    answer: 'After completing an analysis, click the "Pine Script" button on the analysis detail page. This will generate a TradingView Pine Script with your entry, stop-loss, and take-profit levels that you can paste into TradingView.',
  },
  {
    question: 'What is the AI Concierge?',
    answer: 'AI Concierge is our natural language interface that lets you perform analyses using simple commands like "Analyze BTC" or "How is ETH doing?". It supports both text and voice input in multiple languages.',
  },
  {
    question: 'Why is my analysis showing "AVOID"?',
    answer: 'An AVOID verdict indicates unfavorable market conditions. This could be due to high volatility, manipulation detection, upcoming high-impact economic events, or poor risk/reward ratios. We recommend waiting for better conditions.',
  },
  {
    question: 'How do scheduled analyses work?',
    answer: 'Scheduled analyses let you automate recurring analysis for your favorite coins. You can set daily, weekly, or monthly schedules. Each scheduled analysis costs 25 credits and results are delivered via email, Telegram, or Discord.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium pr-4">{question}</span>
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

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TraderPathLogo size="md" showText={true} showTagline={false} href="/" />
          <div className="flex items-center gap-4">
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
      <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">How can we help?</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Search our knowledge base or browse categories below
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Browse by Category</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CATEGORIES.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="bg-card border rounded-xl p-6 hover:border-primary/50 transition cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition">
                    {category.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.articles.slice(0, 3).map((article, articleIndex) => (
                      <li
                        key={articleIndex}
                        className="text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                        {article}
                      </li>
                    ))}
                  </ul>
                  {category.articles.length > 3 && (
                    <p className="text-sm text-primary mt-3 font-medium">
                      +{category.articles.length - 3} more articles
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-center mb-12">
            Quick answers to common questions
          </p>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Quick Links</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: BookOpen,
                title: 'Documentation',
                description: 'Detailed guides and API reference',
                href: '/docs',
              },
              {
                icon: MessageSquare,
                title: 'Community',
                description: 'Join our Discord community',
                href: '#',
                external: true,
              },
              {
                icon: Mail,
                title: 'Email Support',
                description: 'Contact our support team',
                href: '/contact',
              },
              {
                icon: ExternalLink,
                title: 'System Status',
                description: 'Check platform uptime',
                href: '/status',
              },
            ].map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={index}
                  href={link.href}
                  className="flex flex-col items-center text-center p-6 bg-card border rounded-xl hover:border-primary/50 transition group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition">
                    {link.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">{link.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              Our support team is available to assist you with any questions or issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
              >
                Contact Support
              </Link>
              <a
                href="mailto:support@traderpath.io"
                className="px-6 py-3 border rounded-lg font-semibold hover:bg-accent transition"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer variant="minimal" />
    </div>
  );
}
