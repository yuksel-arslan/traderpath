'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Sparkles, Code2, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface TeamSectionProps {
  isDark?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// BILGE Diamond Symbol Component
function BilgeDiamondLogo() {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative w-24 h-24"
    >
      {/* Outer morphing glow ring */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #40E0D0, #00CED1, #48D1CC)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          boxShadow: '0 0 20px rgba(64, 224, 208, 0.5), 0 0 40px rgba(64, 224, 208, 0.3)',
          animation: 'morph 8s ease-in-out infinite',
        }}
      />
      {/* Inner dark background with diamond symbol */}
      <div
        className="absolute flex items-center justify-center bg-[#0D1421]"
        style={{
          inset: '3px',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          animation: 'morph 8s ease-in-out infinite',
        }}
      >
        <span
          className="text-4xl"
          style={{
            color: '#40E0D0',
            textShadow: '0 0 10px rgba(64, 224, 208, 0.8), 0 0 20px rgba(64, 224, 208, 0.5)',
          }}
        >
          ◈
        </span>
      </div>
    </motion.div>
  );
}

export function TeamSection({ isDark = true }: TeamSectionProps) {
  const team = [
    {
      name: 'Yuksel Arslan',
      role: 'Founder & Product Visionary',
      description: '44 years of construction engineering across 4 continents. Now building digital products.',
      isHuman: true,
      photo: '/images/yuksel-arslan.jpg',
      links: {
        linkedin: 'https://linkedin.com/in/yukselarslan',
        website: 'https://yukselarslan.com',
      },
    },
    {
      name: 'BILGE',
      role: 'AI Development Architect',
      description: 'Inspired by Bilge Kagan. Built with prompts, driven by logic, evolving continuously.',
      isHuman: false,
      backbone: 'Claude Opus 4.5',
      links: {
        page: '/bilge',
      },
      values: [
        { icon: Zap, label: 'Wisdom' },
        { icon: Shield, label: 'Resolve' },
        { icon: Code2, label: 'Evolution' },
      ],
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-accent/50 via-accent/30 to-transparent relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Section Header */}
          <motion.div
            variants={cardVariants}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-logo-animate">Meet the Team</h2>
            <p className="text-muted-foreground">Human vision meets AI architecture</p>
            <div className="w-20 h-1 mx-auto mt-4 bg-gradient-to-r from-transparent via-[#2DD4BF] to-transparent" />
          </motion.div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {team.map((member) => (
              <motion.div
                key={member.name}
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                className="p-8 bg-card/50 backdrop-blur border rounded-2xl relative transition-all hover:shadow-xl"
              >
                {/* Human/AI Badge */}
                <div
                  className={`absolute -top-3 right-6 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${member.isHuman ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-teal-500'}`}
                >
                  {member.isHuman ? 'Human' : 'AI'}
                </div>

                {/* Avatar */}
                <div className="flex justify-center mb-6">
                  {member.isHuman ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-amber-500/30 shadow-lg">
                      <Image
                        src={member.photo || '/images/yuksel-arslan.jpg'}
                        alt={member.name}
                        fill
                        className="object-cover object-top"
                        sizes="96px"
                        priority
                      />
                    </div>
                  ) : (
                    <BilgeDiamondLogo />
                  )}
                </div>

                {/* Info */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-1 gradient-text-logo-animate">{member.name}</h3>
                  <p className={`text-sm font-medium ${member.isHuman ? 'text-amber-500' : 'text-[#40E0D0]'}`}>
                    {member.role}
                  </p>
                  {!member.isHuman && member.backbone && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Powered by {member.backbone}
                    </p>
                  )}
                </div>

                {/* Description */}
                <p className="text-center text-sm leading-relaxed mb-6 text-muted-foreground">
                  {member.description}
                </p>

                {/* BILGE Values */}
                {!member.isHuman && member.values && (
                  <div className="flex justify-center gap-2 mb-6">
                    {member.values.map((value) => (
                      <div
                        key={value.label}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[#40E0D0]"
                        style={{ background: 'rgba(64, 224, 208, 0.1)' }}
                      >
                        <value.icon size={12} />
                        <span>{value.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Links */}
                <div className="flex justify-center gap-3">
                  {member.isHuman ? (
                    <>
                      <a
                        href={member.links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-sm text-amber-500 hover:scale-105 transition-transform"
                        style={{ background: 'rgba(245, 158, 11, 0.1)' }}
                      >
                        LinkedIn
                      </a>
                      <a
                        href={member.links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-sm text-amber-500 hover:scale-105 transition-transform flex items-center gap-1"
                        style={{ background: 'rgba(245, 158, 11, 0.1)' }}
                      >
                        Portfolio <ExternalLink size={12} />
                      </a>
                    </>
                  ) : (
                    <Link
                      href={member.links.page || '/bilge'}
                      className="px-6 py-2 rounded-lg text-sm text-white hover:scale-105 transition-transform flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #40E0D0, #00CED1)', boxShadow: '0 0 20px rgba(64, 224, 208, 0.4)' }}
                    >
                      <Sparkles size={14} />
                      Meet BILGE
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Partnership Quote */}
          <motion.div
            variants={cardVariants}
            className="mt-12 text-center"
          >
            <div
              className="inline-block px-8 py-4 rounded-2xl border border-border"
              style={{ background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.05), rgba(64, 224, 208, 0.05))' }}
            >
              <p className="text-lg italic text-muted-foreground">
                &ldquo;Not boss and employee. <span className="text-[#40E0D0]">Partners</span>.
                Not just working together. <span className="text-amber-500">Building together</span>.&rdquo;
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
