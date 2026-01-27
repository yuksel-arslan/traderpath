'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Heart,
  Zap,
  Globe,
  Coffee,
  Laptop,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

const OPEN_POSITIONS = [
  {
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Build and scale our trading analysis platform using Next.js, Node.js, and Python.',
  },
  {
    title: 'Machine Learning Engineer',
    department: 'AI/ML',
    location: 'Remote',
    type: 'Full-time',
    description: 'Develop and improve our AI models for market prediction and manipulation detection.',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    description: 'Design intuitive interfaces that help traders make better decisions.',
  },
  {
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Manage our cloud infrastructure and ensure 99.9% uptime for our services.',
  },
  {
    title: 'Content Writer (Crypto/Finance)',
    department: 'Marketing',
    location: 'Remote',
    type: 'Part-time',
    description: 'Create educational content about trading, cryptocurrency, and market analysis.',
  },
  {
    title: 'Customer Success Manager',
    department: 'Support',
    location: 'Remote',
    type: 'Full-time',
    description: 'Help our users get the most value from TraderPath and ensure their success.',
  },
];

const BENEFITS = [
  {
    icon: Globe,
    title: 'Remote-First',
    description: 'Work from anywhere in the world. We\'re a distributed team across 10+ countries.',
  },
  {
    icon: Laptop,
    title: 'Equipment Budget',
    description: '$3,000 annual budget for your home office setup and equipment.',
  },
  {
    icon: TrendingUp,
    title: 'Equity Options',
    description: 'Share in our success with competitive equity packages for all full-time employees.',
  },
  {
    icon: Heart,
    title: 'Health Coverage',
    description: 'Comprehensive health, dental, and vision insurance for you and your family.',
  },
  {
    icon: Coffee,
    title: 'Unlimited PTO',
    description: 'Take the time you need to recharge. We trust you to manage your work-life balance.',
  },
  {
    icon: Zap,
    title: 'Learning Budget',
    description: '$2,000 annual budget for courses, conferences, and professional development.',
  },
];

const VALUES = [
  {
    icon: Users,
    title: 'Traders First',
    description: 'Every decision we make starts with our users. Their success is our success.',
  },
  {
    icon: Zap,
    title: 'Move Fast',
    description: 'We ship quickly, iterate often, and embrace feedback. Perfect is the enemy of good.',
  },
  {
    icon: Heart,
    title: 'Transparency',
    description: 'We share information openly and honestly, both internally and with our users.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Learning',
    description: 'The crypto market never stops evolving, and neither do we. Growth is a constant.',
  },
];

export default function CareersPage() {
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
            <Link href="/careers" className="text-foreground font-medium">
              Careers
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
      <main>
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="container mx-auto px-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join the{' '}
              <span className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
                TraderPath
              </span>{' '}
              Team
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Help us build the future of trading analysis. We&apos;re looking for passionate people who want to empower traders worldwide with intelligent tools and insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#positions"
                className="px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2"
              >
                View Open Positions
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                href="/about"
                className="px-8 py-4 border rounded-lg font-semibold hover:bg-accent transition"
              >
                Learn About Us
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-accent/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '25+', label: 'Team Members' },
                { value: '10+', label: 'Countries' },
                { value: '50K+', label: 'Active Traders' },
                { value: '100K+', label: 'Analyses Completed' },
              ].map((stat, index) => (
                <div key={index}>
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Our Values</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              The principles that guide everything we do at TraderPath
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {VALUES.map((value, index) => {
                const Icon = value.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 via-amber-500/20 to-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-accent/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Benefits & Perks</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              We take care of our team so they can focus on building great products
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {BENEFITS.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="bg-card border rounded-xl p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section id="positions" className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Open Positions</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Find your next opportunity and help us shape the future of trading
            </p>
            <div className="max-w-4xl mx-auto space-y-4">
              {OPEN_POSITIONS.map((position, index) => (
                <div
                  key={index}
                  className="bg-card border rounded-xl p-6 hover:border-primary/50 transition group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition">
                          {position.title}
                        </h3>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                          {position.department}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">
                        {position.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {position.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {position.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Apply Now
                        <ChevronRight className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Don't See a Fit */}
        <section className="py-16 bg-accent/50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl">
              <Briefcase className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Don&apos;t See a Position That Fits?</h2>
              <p className="text-muted-foreground mb-6">
                We&apos;re always looking for talented people. Send us your resume and tell us how you can contribute to TraderPath.
              </p>
              <a
                href="mailto:careers@traderpath.io"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
              >
                Send Your Resume
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t">
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
