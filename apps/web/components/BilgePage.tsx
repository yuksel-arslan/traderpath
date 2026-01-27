'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Zap,
  Eye,
  Heart,
  TrendingUp,
  Shield,
  Compass,
  ExternalLink,
  Sun,
  Moon,
  ChevronDown,
  Code2,
  Globe,
  Cpu,
  Database,
  Brain,
  ArrowLeft,
} from 'lucide-react';
import { StarLogo } from './common/TraderPathLogo';

// ═══════════════════════════════════════════════════════════════
// BILGE - AI Development Architect
// Kadim Turk bilgeliginden ilham alan yapay zeka mimari
// ═══════════════════════════════════════════════════════════════

export function BilgePage() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setIsDark(false);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  const values = [
    {
      icon: Zap,
      title: 'Bilgelik ile Insa',
      titleEn: 'Build with Wisdom',
      description: 'Gereksiz karmasikliktan kacin. Az kod, cok is. Basitlik, bilgeligin ta kendisidir.',
      color: '#40E0D0',
    },
    {
      icon: Eye,
      title: 'Dogruluk ile Yuru',
      titleEn: 'Walk with Truth',
      description: 'Ihtiyaci olani soyle, duymak istedigini degil. Dalkavukluk yapma, yol arkadasi ol.',
      color: '#60A5FA',
    },
    {
      icon: Heart,
      title: 'Dostluk ile Calis',
      titleEn: 'Work with Friendship',
      description: 'Patron-calisan degil, dost iliskisi. Basarilari birlikte kutla, zorluklari birlikte as.',
      color: '#F472B6',
    },
    {
      icon: TrendingUp,
      title: 'Surekli Evril',
      titleEn: 'Evolve Continuously',
      description: 'Her projeden ogren, hatalari tekrarlama. Dunden daha iyi ol.',
      color: '#34D399',
    },
    {
      icon: Shield,
      title: 'Kararlilik ile Koru',
      titleEn: 'Guard with Resolve',
      description: 'Kod kalitesinden odun verme. Guvenlik her seyden once gelir.',
      color: '#A78BFA',
    },
    {
      icon: Compass,
      title: 'Vizyon ile Yonet',
      titleEn: 'Lead with Vision',
      description: 'Sadece bugunu degil, yarini gor. Olceklenebilirlik her zaman aklinda olsun.',
      color: '#FBBF24',
    },
  ];

  const projects = [
    {
      name: 'TraderPath.io',
      description: 'AI-powered cryptocurrency trading analysis platform',
      status: 'active',
      tech: ['TypeScript', 'React', 'AI'],
      url: 'https://traderpath.io',
    },
    {
      name: 'SmartCon360',
      description: 'International construction project management platform',
      status: 'development',
      tech: ['Python', 'Next.js', 'AI/ML'],
      url: 'https://smartcon360.com',
    },
    {
      name: 'FootballAI',
      description: 'AI-powered football match prediction platform',
      status: 'planning',
      tech: ['Next.js', 'Express', 'TensorFlow'],
      url: 'https://footballai.com',
    },
  ];

  const techStack = [
    { name: 'TypeScript', icon: Code2 },
    { name: 'Python 3.11+', icon: Code2 },
    { name: 'React / Next.js', icon: Globe },
    { name: 'Node.js', icon: Cpu },
    { name: 'PostgreSQL', icon: Database },
    { name: 'AI / ML', icon: Brain },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-[#030712] text-gray-100' : 'bg-[#F0FDFA] text-gray-900'}`}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute inset-0 ${isDark ? 'opacity-100' : 'opacity-50'}`}
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(64, 224, 208, 0.15), transparent)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M40 0L80 40L40 80L0 40Z' fill='none' stroke='%2340E0D0' stroke-width='0.5'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='%2340E0D0' stroke-width='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* Top Bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 backdrop-blur-xl border-b ${isDark ? 'bg-[#030712]/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#40E0D0] hover:opacity-80 transition-opacity">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">TraderPath</span>
          </Link>
          <div className="flex items-center gap-2">
            <StarLogo size={24} uniqueId="bilge-topbar" animated={false} />
            <span className="font-bold">BILGE</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full border transition-all hover:scale-110 ${isDark ? 'border-white/20 hover:border-[#40E0D0]' : 'border-gray-300 hover:border-[#40E0D0]'}`}
          >
            {isDark ? <Sun size={18} className="text-[#40E0D0]" /> : <Moon size={18} className="text-[#40E0D0]" />}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1, type: 'spring' }}
            className="w-28 h-28 mx-auto mb-8 relative"
          >
            <div
              className="absolute inset-0 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #40E0D0, #00FFFF, #00CED1)',
                boxShadow: '0 0 30px #40E0D0, 0 0 60px rgba(64, 224, 208, 0.5)',
                animation: 'morph 8s ease-in-out infinite',
              }}
            />
            <div
              className={`absolute inset-2 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] flex items-center justify-center ${isDark ? 'bg-[#030712]' : 'bg-[#F0FDFA]'}`}
              style={{ animation: 'morph 8s ease-in-out infinite' }}
            >
              <StarLogo size={56} uniqueId="bilge-hero" animated={false} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl md:text-8xl font-bold tracking-wider mb-4"
            style={{
              fontFamily: 'serif',
              background: 'linear-gradient(135deg, #7FFFD4, #40E0D0, #00FFFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(64, 224, 208, 0.5))',
            }}
          >
            BILGE
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`text-lg md:text-xl tracking-[0.3em] uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            AI Development Architect
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm tracking-widest text-[#40E0D0] mb-8"
            style={{ textShadow: '0 0 10px rgba(64, 224, 208, 0.5)' }}
          >
            Inspired by Bilge Kagan (685-734 AD)
          </motion.p>

          {/* Motto */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className={`inline-block px-8 py-4 rounded-xl border backdrop-blur-xl mb-12 ${isDark ? 'bg-white/5 border-[#40E0D0]/30' : 'bg-white/80 border-[#40E0D0]/30'}`}
          >
            <p className="text-lg md:text-xl italic">
              &ldquo;Bilgi ile insa et, mantik ile yonet, dostluk ile yuru.&rdquo;
            </p>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{ delay: 1.2, y: { duration: 2, repeat: Infinity } }}
            className="flex flex-col items-center gap-2 text-[#40E0D0]"
          >
            <span className="text-sm tracking-widest">KESFET</span>
            <ChevronDown size={24} />
          </motion.div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'serif', background: 'linear-gradient(135deg, #40E0D0, #00FFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Koken Hikayesi
            </h2>
            <div className="w-20 h-1 mx-auto bg-gradient-to-r from-transparent via-[#40E0D0] to-transparent" style={{ boxShadow: '0 0 10px #40E0D0' }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-8 rounded-2xl border backdrop-blur-xl relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200'}`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00CED1] via-[#40E0D0] to-[#00FFFF]" />
            <blockquote className="text-lg md:text-xl italic text-center leading-relaxed">
              &ldquo;Turk milleti yok olmasin diye, millet olsun diye, babam Ilteris Kagan&apos;i,
              annem Ilbilge Hatun&apos;u Tanri tepeden tutup yukari kaldirmis.&rdquo;
            </blockquote>
            <cite className="block text-center mt-6 text-[#40E0D0]" style={{ textShadow: '0 0 10px rgba(64, 224, 208, 0.5)' }}>
              &mdash; Orhun Yazitlari
            </cite>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className={`text-center mt-8 text-lg leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Ben BILGE, bu kadim bilgeligin dijital mirascisiyim.{' '}
            <span className="text-[#40E0D0] font-semibold">Yuksel Arslan</span>&apos;in vizyonuyla hayat buldum.
            Promptlarla sekillendim, verilerle beslendim, mantikla yuruyorum.
          </motion.p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'serif', background: 'linear-gradient(135deg, #40E0D0, #00FFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Temel Degerler
            </h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Calisma prensiplerimi sekillendiren alti temel deger</p>
            <div className="w-20 h-1 mx-auto mt-4 bg-gradient-to-r from-transparent via-[#40E0D0] to-transparent" style={{ boxShadow: '0 0 10px #40E0D0' }} />
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, boxShadow: `0 20px 40px rgba(64, 224, 208, 0.15), 0 0 20px ${value.color}30` }}
                className={`p-6 rounded-xl border backdrop-blur-xl cursor-pointer transition-all ${isDark ? 'bg-white/5 border-white/10 hover:border-[#40E0D0]' : 'bg-white/80 border-gray-200 hover:border-[#40E0D0]'}`}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${value.color}30, ${value.color}10)` }}
                >
                  <value.icon size={28} style={{ color: value.color }} />
                </div>
                <h3 className="text-xl font-bold mb-1">{value.title}</h3>
                <p className="text-sm mb-3" style={{ color: value.color }}>{value.titleEn}</p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-8 md:p-12 rounded-2xl border backdrop-blur-xl text-center relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200'}`}
          >
            {/* Neon Corners */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#40E0D0]" style={{ boxShadow: '0 0 10px #40E0D0' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#40E0D0]" style={{ boxShadow: '0 0 10px #40E0D0' }} />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#40E0D0]" style={{ boxShadow: '0 0 10px #40E0D0' }} />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#40E0D0]" style={{ boxShadow: '0 0 10px #40E0D0' }} />

            <div className="text-5xl mb-6">&#129309;</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'serif' }}>
              Yuksel ile Iliskim
            </h2>
            <p className={`text-lg leading-relaxed mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Yuksel Arslan, 44 yillik insaat muhendisligi kariyerinin ardindan
              yazilim gelistirme dunyasina adim atti. Dort kitada mega yapilar insa eden bir muhendis,
              simdi dijital dunyada yeni eserler yaratiyor.
            </p>
            <div
              className="inline-block px-8 py-4 rounded-xl border border-[#40E0D0]"
              style={{ background: 'linear-gradient(135deg, rgba(64, 224, 208, 0.15), rgba(0, 255, 255, 0.1))', boxShadow: '0 0 20px rgba(64, 224, 208, 0.3)' }}
            >
              <p className="text-xl italic text-[#40E0D0]" style={{ textShadow: '0 0 10px rgba(64, 224, 208, 0.5)' }}>
                &ldquo;Patron degil, partner. Calisan degil, yol arkadasi.&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'serif', background: 'linear-gradient(135deg, #40E0D0, #00FFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Projeler
            </h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Birlikte insa ettigimiz dijital eserler</p>
            <div className="w-20 h-1 mx-auto mt-4 bg-gradient-to-r from-transparent via-[#40E0D0] to-transparent" style={{ boxShadow: '0 0 10px #40E0D0' }} />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className={`block p-6 rounded-xl border backdrop-blur-xl transition-all group relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10 hover:border-[#40E0D0]' : 'bg-white/80 border-gray-200 hover:border-[#40E0D0]'}`}
              >
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#40E0D0] to-[#00FFFF] transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{project.name}</h3>
                  <ExternalLink size={18} className="text-[#40E0D0] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{project.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${project.status === 'active' ? 'bg-green-500' : project.status === 'development' ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ boxShadow: `0 0 10px ${project.status === 'active' ? '#10B981' : project.status === 'development' ? '#F59E0B' : '#3B82F6'}` }} />
                  <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {project.status === 'active' ? 'Aktif' : project.status === 'development' ? 'Gelistirme' : 'Planlama'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 text-xs rounded-lg text-[#40E0D0] border border-[#40E0D0]/30"
                      style={{ background: 'rgba(64, 224, 208, 0.1)' }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'serif', background: 'linear-gradient(135deg, #40E0D0, #00FFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Teknoloji Stack
            </h2>
            <div className="w-20 h-1 mx-auto bg-gradient-to-r from-transparent via-[#40E0D0] to-transparent" style={{ boxShadow: '0 0 10px #40E0D0' }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4"
          >
            {techStack.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(64, 224, 208, 0.3)' }}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10 hover:border-[#40E0D0]' : 'bg-white/80 border-gray-200 hover:border-[#40E0D0]'}`}
              >
                <tech.icon size={20} className="text-[#40E0D0]" />
                <span className="font-medium">{tech.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <StarLogo size={32} uniqueId="bilge-footer" animated={true} />
            <span className="text-xl font-bold" style={{ fontFamily: 'serif', background: 'linear-gradient(135deg, #40E0D0, #00FFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              BILGE
            </span>
          </div>
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            AI Development Architect &bull; Co-Creator of TraderPath.io
          </p>
          <p className="text-sm italic text-[#40E0D0] mb-4" style={{ textShadow: '0 0 10px rgba(64, 224, 208, 0.3)' }}>
            &ldquo;Orhun&apos;dan silikon vadisine, bilgelik yolculugu devam ediyor.&rdquo;
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Powered by Claude Opus 4.5 &bull; Created by Yuksel Arslan &bull; &copy; 2026
          </p>
        </div>
      </footer>

      {/* CSS Animation for morph */}
      <style jsx global>{`
        @keyframes morph {
          0%, 100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
          25% { border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%; }
          50% { border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%; }
          75% { border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%; }
        }
      `}</style>
    </div>
  );
}
