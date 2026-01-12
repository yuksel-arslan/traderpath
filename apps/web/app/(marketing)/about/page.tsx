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
} from 'lucide-react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

const TEAM = [
  {
    name: 'Alex Chen',
    role: 'Founder & CEO',
    description: 'Former quant trader with 10+ years in crypto markets',
    avatar: 'AC',
  },
  {
    name: 'Sarah Kim',
    role: 'Head of AI',
    description: 'ML researcher specializing in financial forecasting',
    avatar: 'SK',
  },
  {
    name: 'Marcus Johnson',
    role: 'Lead Engineer',
    description: 'Full-stack developer with blockchain expertise',
    avatar: 'MJ',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Head of Product',
    description: 'Product strategist focused on trader experience',
    avatar: 'ER',
  },
];

const VALUES = [
  {
    icon: Shield,
    title: 'Transparency',
    description: 'We believe in clear, honest communication about what our analysis can and cannot do.',
  },
  {
    icon: Target,
    title: 'Accuracy',
    description: 'Our algorithms are continuously refined to provide the most reliable market insights.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'We build for traders, with traders. Your feedback shapes our product.',
  },
  {
    icon: Lock,
    title: 'Security',
    description: 'Your data and funds are protected with enterprise-grade security measures.',
  },
];

const MILESTONES = [
  { year: '2023 Q1', event: 'TraderPath founded' },
  { year: '2023 Q3', event: 'Beta launch with 1,000 users' },
  { year: '2023 Q4', event: 'Manipulation detection engine released' },
  { year: '2024 Q1', event: '10,000+ active traders' },
  { year: '2024 Q2', event: 'AI-powered insights integration' },
  { year: '2024 Q4', event: '50,000+ analyses completed' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
            TraderPath
          </Link>
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

      {/* Hero */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Empowering Traders with{' '}
            <span className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
              Intelligent Analysis
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            TraderPath was born from a simple idea: trading decisions should be based on
            comprehensive analysis, not gut feelings or FOMO.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                We&apos;re on a mission to democratize professional-grade trading analysis.
                The same tools used by institutional traders should be available to everyone.
              </p>
              <p className="text-muted-foreground">
                Through our 7-step analysis system, we help traders understand not just
                <em> what</em> to trade, but <em>why</em> and <em>when</em>. We believe
                informed traders are successful traders.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Brain, label: 'AI-Powered', value: 'Analysis' },
                { icon: Globe, label: 'Real-time', value: 'Data' },
                { icon: TrendingUp, label: '87%', value: 'Accuracy' },
                { icon: Zap, label: '< 3s', value: 'Response' },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-card rounded-lg border p-4 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
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

      {/* Team */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Meet Our Team</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            A diverse group of traders, engineers, and researchers united by a passion
            for making trading more accessible and informed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {TEAM.map((member, index) => (
              <div key={index} className="bg-card rounded-lg border p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">{member.avatar}</span>
                </div>
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-primary text-sm mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Journey</h2>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              {MILESTONES.map((milestone, index) => (
                <div key={index} className="relative pl-12 pb-8 last:pb-0">
                  <div className="absolute left-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{milestone.year}</p>
                  <p className="font-medium">{milestone.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Join Our Community</h2>
            <p className="text-muted-foreground mb-6">
              Be part of a growing community of traders making smarter decisions every day.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 TraderPath. All rights reserved. Trading involves risk.</p>
        </div>
      </footer>
    </div>
  );
}
