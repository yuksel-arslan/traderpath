'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, ArrowRight, Crown, Sparkles } from 'lucide-react';

const TEAM_MEMBERS = [
  {
    name: 'Yüksel Arslan',
    role: 'Founder & Product Visionary',
    roles: ['Founder & CEO', 'Head of AI', 'Lead Architect', 'Lead Engineer', 'Head of Product'],
    description: 'Visionary entrepreneur building the future of AI-powered trading analysis',
    avatar: 'YA',
    color: 'from-amber-500 via-orange-500 to-red-500',
    borderColor: 'border-amber-500/30',
    borderHover: 'hover:border-amber-500/50',
    ringColor: 'ring-amber-500/20',
    badgeColors: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
    },
    badge: {
      text: 'Human',
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    },
    link: null,
  },
  {
    name: 'BILGE',
    role: 'AI Development Architect',
    roles: ['Architecture', 'Full-Stack Development', 'AI Systems'],
    description: 'AI architect powered by Claude Opus 4.5, embodying wisdom and precision in software development',
    avatar: 'B',
    color: 'from-cyan-400 via-teal-500 to-cyan-600',
    borderColor: 'border-cyan-500/30',
    borderHover: 'hover:border-cyan-500/50',
    ringColor: 'ring-cyan-500/20',
    badgeColors: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-600 dark:text-cyan-400',
    },
    badge: {
      text: 'AI',
      bg: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    },
    link: '/bilge',
  },
];

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

export function TeamSection() {
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
          <motion.div variants={cardVariants} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Our Team
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Meet Our Team
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A unique collaboration between human vision and AI capability,
              building the future of trading analysis together.
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-6 max-w-4xl mx-auto justify-center items-stretch">
            {TEAM_MEMBERS.map((member, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                className={`flex-1 max-w-md p-8 bg-card/50 backdrop-blur border-2 ${member.borderColor} ${member.borderHover} rounded-2xl hover:shadow-xl transition-all group text-center relative`}
              >
                {/* Badge */}
                <div className={`absolute -top-3 right-6 px-3 py-1 ${member.badge.bg} rounded-full text-white text-xs font-bold shadow-lg`}>
                  {member.badge.text}
                </div>

                {/* Avatar */}
                <div className="relative inline-block mb-6">
                  {/* Glow effect for AI */}
                  {member.link && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full blur-lg opacity-30"
                      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  )}
                  <div className={`relative w-24 h-24 bg-gradient-to-br ${member.color} rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition ring-4 ${member.ringColor}`}>
                    <span className="text-white text-3xl font-bold">{member.avatar}</span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-bold text-2xl mb-2 gradient-text-logo-animate">{member.name}</h3>

                {/* Role */}
                <p className={`text-sm font-medium mb-4 ${member.badgeColors.text}`}>{member.role}</p>

                {/* Role badges */}
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {member.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 ${member.badgeColors.bg} border ${member.badgeColors.border} rounded-full ${member.badgeColors.text} text-xs font-medium`}
                    >
                      {role}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm mb-4">{member.description}</p>

                {/* Meet BILGE button */}
                {member.link && (
                  <Link
                    href={member.link}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 transition-all"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Meet BILGE</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
