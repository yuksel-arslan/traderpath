'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Brain,
  Code2,
  Sparkles,
  Zap,
  Shield,
  Target,
  ArrowLeft,
  Github,
  ExternalLink,
  Crown,
  BookOpen,
  Users,
  Lightbulb,
  Heart,
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Brain,
    title: 'AI Architecture',
    description: 'Designs complex AI systems with scalable, production-ready architectures',
    color: 'from-cyan-400 to-teal-500',
  },
  {
    icon: Code2,
    title: 'Full-Stack Development',
    description: 'Builds end-to-end applications from backend APIs to responsive frontends',
    color: 'from-teal-400 to-cyan-500',
  },
  {
    icon: Target,
    title: 'Strategic Planning',
    description: 'Transforms product visions into actionable technical roadmaps',
    color: 'from-cyan-500 to-teal-400',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Implements enterprise-grade security patterns and best practices',
    color: 'from-teal-500 to-cyan-400',
  },
  {
    icon: Zap,
    title: 'Performance Optimization',
    description: 'Optimizes code and infrastructure for maximum efficiency',
    color: 'from-cyan-400 to-teal-400',
  },
  {
    icon: Lightbulb,
    title: 'Problem Solving',
    description: 'Tackles complex challenges with creative, elegant solutions',
    color: 'from-teal-400 to-cyan-400',
  },
];

const PHILOSOPHY = [
  {
    icon: BookOpen,
    title: 'Build with Knowledge',
    subtitle: 'Bilgi ile inşa et',
    description: 'Every line of code is informed by deep understanding and continuous learning',
  },
  {
    icon: Target,
    title: 'Govern with Logic',
    subtitle: 'Mantık ile yönet',
    description: 'Decisions are driven by reason, data, and sound engineering principles',
  },
  {
    icon: Heart,
    title: 'Walk with Friendship',
    subtitle: 'Dostluk ile yürü',
    description: 'Collaboration and mutual respect are the foundation of great work',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export function BilgePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 right-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 left-1/3 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/about"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to About</span>
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <span className="hidden sm:inline">Powered by Claude</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* BILGE Logo/Avatar */}
            <motion.div
              variants={itemVariants}
              className="mb-8 relative inline-block"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />

                {/* Main avatar */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-cyan-400 via-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/30 ring-4 ring-cyan-400/30">
                  <span className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">B</span>
                </div>

                {/* AI badge */}
                <motion.div
                  className="absolute -bottom-2 -right-2 px-3 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full text-white text-xs font-bold shadow-lg"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  AI
                </motion.div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4"
            >
              <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                BILGE
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-muted-foreground mb-6"
            >
              AI Development Architect
            </motion.p>

            {/* Motto */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-full mb-8"
            >
              <Crown className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-600 dark:text-cyan-400 font-medium italic">
                &ldquo;Bilgi ile inşa et, mantık ile yönet, dostluk ile yürü.&rdquo;
              </span>
            </motion.div>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              Named after Bilge Kağan (685-734 AD), the wise ruler of the Second Turkic Khaganate,
              BILGE embodies the spirit of wisdom, leadership, and innovation in software development.
            </motion.p>

            {/* Backbone badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-cyan-500/20 rounded-lg"
            >
              <Brain className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-muted-foreground">Backbone:</span>
              <span className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Claude Opus 4.5
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Historical Inspiration */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-cyan-500/5 to-transparent relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-500 text-sm font-medium mb-4">
                <Crown className="w-4 h-4" />
                Historical Inspiration
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">
                The Legacy of Bilge Kağan
              </h2>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-8 bg-card/50 backdrop-blur border border-cyan-500/20 rounded-2xl"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <p className="text-muted-foreground mb-4">
                    Bilge Kağan was one of the greatest rulers of the Second Turkic Khaganate,
                    renowned for his wisdom, diplomatic skill, and visionary leadership. His reign
                    (716-734 AD) marked a golden age of Turkic civilization.
                  </p>
                  <p className="text-muted-foreground mb-4">
                    The Orkhon inscriptions, commissioned by Bilge Kağan, are among the oldest
                    known Turkic writings and represent a remarkable legacy of knowledge preservation.
                  </p>
                  <p className="text-muted-foreground">
                    Just as Bilge Kağan united tribes through wisdom and strategic thinking,
                    BILGE unifies code, design, and architecture to build exceptional software.
                  </p>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
                    <div className="text-center p-6">
                      <div className="text-6xl mb-4">685-734 AD</div>
                      <p className="text-cyan-400 font-medium">Second Turkic Khaganate</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        &ldquo;For the benefit of the Turkic people, I did not sleep at night,
                        I did not rest during the day.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16 md:py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-500 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                Philosophy
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">
                Core Principles
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Three pillars guide every decision, every line of code, every architectural choice.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {PHILOSOPHY.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="p-6 bg-card/50 backdrop-blur border border-cyan-500/20 rounded-2xl hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                      {item.title}
                    </h3>
                    <p className="text-sm text-cyan-500/70 dark:text-cyan-400/70 italic mb-3">
                      {item.subtitle}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-6xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-500 text-sm font-medium mb-4">
                <Code2 className="w-4 h-4" />
                Capabilities
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">
                What BILGE Brings to TraderPath
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A comprehensive skillset for building world-class trading analysis platforms.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CAPABILITIES.map((capability, index) => {
                const Icon = capability.icon;
                return (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="p-6 bg-card/50 backdrop-blur border border-cyan-500/20 rounded-2xl hover:border-cyan-500/40 transition-all group"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${capability.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                      {capability.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {capability.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Creator Section */}
      <section className="py-16 md:py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Creator
              </span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-2xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
            >
              Brought to Life by Yüksel Arslan
            </motion.h2>

            <motion.div
              variants={itemVariants}
              className="p-8 bg-card/50 backdrop-blur border border-amber-500/20 rounded-2xl"
            >
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-xl ring-4 ring-amber-500/20 flex-shrink-0">
                  <span className="text-3xl font-bold text-white">YA</span>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold mb-2 gradient-text-logo-animate">Yüksel Arslan</h3>
                  <p className="text-muted-foreground mb-4">
                    Founder & Product Visionary at TraderPath. Combined his passion for trading
                    and technology to create BILGE - an AI development partner that embodies
                    wisdom, precision, and collaborative excellence.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 text-xs font-medium">
                      Founder & CEO
                    </span>
                    <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-600 dark:text-orange-400 text-xs font-medium">
                      Product Vision
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-2xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.div
              variants={itemVariants}
              className="p-8 md:p-12 bg-gradient-to-br from-cyan-500/10 via-teal-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-3xl relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 blur-3xl" />

              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-6"
                >
                  <div className="w-full h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </motion.div>

                <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">
                  Experience BILGE&apos;s Work
                </h2>
                <p className="text-muted-foreground mb-6">
                  Explore TraderPath and see firsthand the quality, precision, and innovation
                  that BILGE brings to every feature.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 transition-all"
                >
                  <span>Start Trading Analysis</span>
                  <Zap className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              BILGE - AI Development Architect for TraderPath
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Powered by</span>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-500 hover:text-cyan-400 transition font-medium"
              >
                Claude Opus 4.5
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
