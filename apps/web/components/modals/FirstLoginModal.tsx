'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Gift, Sparkles, Rocket, Star, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FirstLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  bonusCredits?: number;
  userName?: string;
}

// Confetti particle component
function ConfettiParticle({ delay, left }: { delay: number; left: number }) {
  const colors = ['#5EEDC3', '#EF5A6F', '#FBBF24', '#8B5CF6', '#3B82F6', '#EC4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 10 + 5;
  const duration = Math.random() * 2 + 3;

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
          height: size,
          backgroundColor: color,
          animationDuration: `${Math.random() * 2 + 1}s`,
        }}
      />
    </div>
  );
}

// Floating star animation
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

export function FirstLoginModal({ isOpen, onClose, bonusCredits = 100, userName }: FirstLoginModalProps) {
  const [confetti, setConfetti] = useState<{ id: number; delay: number; left: number }[]>([]);
  const [stars, setStars] = useState<{ id: number; delay: number; size: number; left: number; top: number }[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [count, setCount] = useState(0);

  // Generate confetti particles
  useEffect(() => {
    if (isOpen) {
      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        delay: Math.random() * 3,
        left: Math.random() * 100,
      }));
      setConfetti(newConfetti);

      const newStars = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        size: Math.random() * 20 + 10,
        left: Math.random() * 100,
        top: Math.random() * 100,
      }));
      setStars(newStars);

      // Show content with delay for dramatic effect
      setTimeout(() => setShowContent(true), 300);
    } else {
      setShowContent(false);
      setCount(0);
    }
  }, [isOpen]);

  // Animated counter for credits
  useEffect(() => {
    if (showContent && count < bonusCredits) {
      const increment = Math.ceil(bonusCredits / 30);
      const timer = setTimeout(() => {
        setCount(prev => Math.min(prev + increment, bonusCredits));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [showContent, count, bonusCredits]);

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
          <ConfettiParticle key={particle.id} delay={particle.delay} left={particle.left} />
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
          'relative z-10 w-full max-w-md mx-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden transition-all duration-500',
          showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        )}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-transparent to-pink-500/20 pointer-events-none" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition z-10"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Animated icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center animate-bounce-slow">
              <Gift className="w-12 h-12 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-spin-slow" />
            <Zap className="absolute -bottom-1 -left-2 w-6 h-6 text-yellow-400 animate-pulse" />
          </div>

          {/* Welcome text */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome{userName ? `, ${userName}` : ''}! 🎉
          </h2>
          <p className="text-slate-400 mb-6">
            You&apos;ve earned your first login bonus!
          </p>

          {/* Credit counter */}
          <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/50">
            <p className="text-sm text-slate-400 mb-2">Bonus Credits</p>
            <div className="flex items-center justify-center gap-2">
              <Rocket className="w-8 h-8 text-teal-400 animate-bounce" />
              <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                +{count}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Added to your account</p>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
              <p className="text-2xl font-bold text-white">7</p>
              <p className="text-xs text-slate-400">Analysis Steps</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
              <p className="text-2xl font-bold text-white">35</p>
              <p className="text-xs text-slate-400">Credits/Analysis</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/25"
          >
            Start Analyzing
          </button>

          <p className="text-xs text-slate-500 mt-4">
            Earn more credits daily through rewards!
          </p>
        </div>
      </div>
    </div>
  );
}
