'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Trophy, Star, Sparkles, Gift, Coins, PartyPopper, Zap, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CelebrationReason =
  | 'daily_login'
  | 'streak_bonus'
  | 'spin_jackpot'
  | 'quiz_correct'
  | 'achievement_unlocked'
  | 'level_up'
  | 'trade_type_bonus'
  | 'referral_bonus'
  | 'first_analysis'
  | 'analysis_milestone'
  | 'scan_complete';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  reason: CelebrationReason;
  title?: string;
  subtitle?: string;
  streakDays?: number;
  achievementName?: string;
  newLevel?: string;
  milestone?: number;
}

// Confetti colors
const CONFETTI_COLORS = ['#5EEDC3', '#EF5A6F', '#FBBF24', '#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F97316'];

// Confetti particle
function ConfettiParticle({ delay, left, color }: { delay: number; left: number; color: string }) {
  const size = Math.random() * 12 + 6;
  const duration = Math.random() * 2 + 3;
  const rotation = Math.random() * 360;

  return (
    <div
      className="absolute animate-confetti-fall pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-20px',
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      <div
        className="rounded-sm animate-confetti-spin"
        style={{
          width: size,
          height: size * 0.4,
          backgroundColor: color,
          transform: `rotate(${rotation}deg)`,
          animationDuration: `${Math.random() * 2 + 1}s`,
        }}
      />
    </div>
  );
}

// Balloon component
function Balloon({ delay, left, color }: { delay: number; left: number; color: string }) {
  return (
    <div
      className="absolute animate-balloon-rise pointer-events-none"
      style={{
        left: `${left}%`,
        bottom: '-100px',
        animationDelay: `${delay}s`,
      }}
    >
      <div className="relative">
        {/* Balloon body */}
        <div
          className="w-12 h-14 rounded-full relative"
          style={{ backgroundColor: color }}
        >
          {/* Balloon highlight */}
          <div className="absolute top-2 left-2 w-4 h-6 bg-white/30 rounded-full transform -rotate-45" />
          {/* Balloon knot */}
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-b-full"
            style={{ backgroundColor: color }}
          />
        </div>
        {/* Balloon string */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-20 bg-slate-400/50" />
      </div>
    </div>
  );
}

// Floating star
function FloatingStar({ delay, size, left, top }: { delay: number; size: number; left: number; top: number }) {
  return (
    <Star
      className="absolute text-yellow-400 animate-pulse-scale pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        opacity: 0.6,
      }}
      fill="currentColor"
    />
  );
}

// Get celebration content based on reason
function getCelebrationContent(reason: CelebrationReason, credits: number, props: CelebrationModalProps) {
  switch (reason) {
    case 'daily_login':
      return {
        icon: Gift,
        title: props.title || 'Daily Login Bonus!',
        subtitle: props.subtitle || 'Welcome back! Here\'s your daily reward.',
        gradient: 'from-teal-500 to-emerald-500',
        iconBg: 'from-teal-400 to-teal-600',
      };
    case 'streak_bonus':
      return {
        icon: Zap,
        title: props.title || `${props.streakDays}-Day Streak!`,
        subtitle: props.subtitle || `Incredible! You've logged in ${props.streakDays} days in a row!`,
        gradient: 'from-orange-500 to-red-500',
        iconBg: 'from-orange-400 to-red-500',
      };
    case 'spin_jackpot':
      return {
        icon: PartyPopper,
        title: props.title || 'JACKPOT!',
        subtitle: props.subtitle || 'You hit the jackpot on the daily spin!',
        gradient: 'from-yellow-400 to-orange-500',
        iconBg: 'from-yellow-400 to-orange-500',
      };
    case 'quiz_correct':
      return {
        icon: Star,
        title: props.title || 'Correct Answer!',
        subtitle: props.subtitle || 'Great job! You answered correctly.',
        gradient: 'from-purple-500 to-pink-500',
        iconBg: 'from-purple-400 to-pink-500',
      };
    case 'achievement_unlocked':
      return {
        icon: Trophy,
        title: props.title || 'Achievement Unlocked!',
        subtitle: props.subtitle || props.achievementName || 'You\'ve earned a new achievement!',
        gradient: 'from-amber-500 to-yellow-400',
        iconBg: 'from-amber-400 to-yellow-500',
      };
    case 'level_up':
      return {
        icon: Sparkles,
        title: props.title || 'Level Up!',
        subtitle: props.subtitle || `Congratulations! You're now ${props.newLevel}!`,
        gradient: 'from-blue-500 to-cyan-500',
        iconBg: 'from-blue-400 to-cyan-500',
      };
    case 'trade_type_bonus':
      return {
        icon: Coins,
        title: props.title || 'Analysis Bonus!',
        subtitle: props.subtitle || 'Bonus credits for completing your analysis!',
        gradient: 'from-green-500 to-emerald-500',
        iconBg: 'from-green-400 to-emerald-500',
      };
    case 'referral_bonus':
      return {
        icon: Gift,
        title: props.title || 'Referral Bonus!',
        subtitle: props.subtitle || 'Thank you for inviting a friend!',
        gradient: 'from-pink-500 to-rose-500',
        iconBg: 'from-pink-400 to-rose-500',
      };
    case 'first_analysis':
      return {
        icon: Trophy,
        title: props.title || 'First Analysis Complete!',
        subtitle: props.subtitle || 'Congratulations on your first analysis!',
        gradient: 'from-teal-500 to-blue-500',
        iconBg: 'from-teal-400 to-blue-500',
      };
    case 'analysis_milestone':
      return {
        icon: Star,
        title: props.title || `${props.milestone} Analyses Milestone!`,
        subtitle: props.subtitle || `You've completed ${props.milestone} analyses!`,
        gradient: 'from-violet-500 to-purple-500',
        iconBg: 'from-violet-400 to-purple-500',
      };
    case 'scan_complete':
      return {
        icon: Search,
        title: props.title || 'Scan Complete!',
        subtitle: props.subtitle || 'Top coins have been analyzed successfully!',
        gradient: 'from-amber-500 to-orange-500',
        iconBg: 'from-amber-400 to-orange-500',
      };
    default:
      return {
        icon: Gift,
        title: props.title || 'Bonus Credits!',
        subtitle: props.subtitle || 'You\'ve earned bonus credits!',
        gradient: 'from-teal-500 to-emerald-500',
        iconBg: 'from-teal-400 to-teal-600',
      };
  }
}

export function CelebrationModal(props: CelebrationModalProps) {
  const { isOpen, onClose, credits, reason } = props;
  const [confetti, setConfetti] = useState<{ id: number; delay: number; left: number; color: string }[]>([]);
  const [balloons, setBalloons] = useState<{ id: number; delay: number; left: number; color: string }[]>([]);
  const [stars, setStars] = useState<{ id: number; delay: number; size: number; left: number; top: number }[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [count, setCount] = useState(0);

  const content = getCelebrationContent(reason, credits, props);
  const Icon = content.icon;

  // Generate particles on open
  useEffect(() => {
    if (isOpen) {
      // Confetti
      const newConfetti = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        delay: Math.random() * 4,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      }));
      setConfetti(newConfetti);

      // Balloons
      const newBalloons = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        left: 10 + Math.random() * 80,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      }));
      setBalloons(newBalloons);

      // Stars
      const newStars = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        size: Math.random() * 24 + 12,
        left: Math.random() * 100,
        top: Math.random() * 100,
      }));
      setStars(newStars);

      // Show content with delay
      setTimeout(() => setShowContent(true), 200);
    } else {
      setShowContent(false);
      setCount(0);
    }
  }, [isOpen]);

  // Animated counter
  useEffect(() => {
    if (showContent && count < credits) {
      const increment = Math.max(1, Math.ceil(credits / 30));
      const timer = setTimeout(() => {
        setCount(prev => Math.min(prev + increment, credits));
      }, 25);
      return () => clearTimeout(timer);
    }
  }, [showContent, count, credits]);

  // Auto close after 5 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setShowContent(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <ConfettiParticle key={particle.id} delay={particle.delay} left={particle.left} color={particle.color} />
        ))}
      </div>

      {/* Balloons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {balloons.map((balloon) => (
          <Balloon key={balloon.id} delay={balloon.delay} left={balloon.left} color={balloon.color} />
        ))}
      </div>

      {/* Floating stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <FloatingStar key={star.id} {...star} />
        ))}
      </div>

      {/* Modal Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-sm mx-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden transition-all duration-500',
          showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        )}
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${content.gradient} opacity-10 pointer-events-none`} />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition z-10"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {/* Content */}
        <div className="relative p-6 text-center">
          {/* Animated icon */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className={`absolute inset-0 bg-gradient-to-r ${content.gradient} rounded-full blur-xl opacity-50 animate-pulse`} />
            <div className={`relative w-20 h-20 bg-gradient-to-br ${content.iconBg} rounded-full flex items-center justify-center animate-bounce-slow`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-spin-slow" />
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {content.title}
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            {content.subtitle}
          </p>

          {/* Credit counter */}
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-6 h-6 text-yellow-400 animate-bounce" />
              <span className={`text-4xl sm:text-5xl font-bold bg-gradient-to-r ${content.gradient} bg-clip-text text-transparent`}>
                +{count}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Credits added to your account</p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className={`w-full py-3 bg-gradient-to-r ${content.gradient} hover:opacity-90 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg`}
          >
            Awesome!
          </button>
        </div>
      </div>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes confetti-spin {
          0% { transform: rotateX(0) rotateY(0); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }
        @keyframes balloon-rise {
          0% {
            transform: translateY(0) rotate(-5deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-50vh) rotate(5deg);
          }
          100% {
            transform: translateY(-120vh) rotate(-5deg);
            opacity: 0;
          }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        :global(.animate-confetti-fall) {
          animation: confetti-fall linear forwards;
        }
        :global(.animate-confetti-spin) {
          animation: confetti-spin linear infinite;
        }
        :global(.animate-balloon-rise) {
          animation: balloon-rise 6s ease-out forwards;
        }
        :global(.animate-pulse-scale) {
          animation: pulse-scale 2s ease-in-out infinite;
        }
        :global(.animate-bounce-slow) {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
