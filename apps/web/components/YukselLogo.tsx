'use client';

import { motion } from 'framer-motion';

interface YukselLogoProps {
  size?: number;
  isDark?: boolean;
  showName?: boolean;
  variant?: 'construction' | 'software' | 'combined';
}

export default function YukselLogo({
  size = 120,
  isDark = true,
  showName = true,
  variant = 'combined'
}: YukselLogoProps) {

  const colors = {
    construction: {
      gradient: '#FF6B35, #FFB347, #E85D2C',
      text: '#FF6B35, #FFB347',
      particle: '#FFB347',
      glow: '#FF6B35',
    },
    software: {
      gradient: '#40E0D0, #00FFFF, #00CED1',
      text: '#40E0D0, #00FFFF',
      particle: '#00FFFF',
      glow: '#40E0D0',
    },
    combined: {
      gradient: '#FF6B35, #FFD700, #40E0D0',
      text: '#FF6B35, #40E0D0',
      particle: '#FFD700',
      glow: '#FF6B35',
    },
  };

  const c = colors[variant];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Morphic Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 1, type: 'spring', bounce: 0.4 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Outer Morphing Shape */}
        <div
          className="absolute inset-0 animate-morph"
          style={{
            background: `linear-gradient(135deg, ${c.gradient})`,
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            boxShadow: `0 0 30px ${c.glow}, 0 0 60px ${c.glow}50`,
            animation: 'morph 8s ease-in-out infinite, glow-pulse 2s ease-in-out infinite',
          }}
        />

        {/* Inner Shape */}
        <div
          className="absolute flex items-center justify-center animate-morph"
          style={{
            inset: size * 0.08,
            background: isDark ? '#030712' : '#FAFAFA',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            animation: 'morph 8s ease-in-out infinite',
          }}
        >
          {variant === 'construction' ? (
            <svg
              width={size * 0.4}
              height={size * 0.4}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M50 15 L85 85 L15 85 Z"
                stroke="#FF6B35"
                strokeWidth="4"
                fill="none"
                style={{ filter: 'drop-shadow(0 0 10px #FF6B35)' }}
              />
              <line x1="50" y1="40" x2="50" y2="70" stroke="#FF6B35" strokeWidth="3" />
              <line x1="35" y1="58" x2="65" y2="58" stroke="#FF6B35" strokeWidth="3" />
            </svg>
          ) : variant === 'software' ? (
            <span
              className="font-mono font-bold"
              style={{
                fontSize: size * 0.28,
                color: '#40E0D0',
                textShadow: '0 0 20px #40E0D0',
              }}
            >
              {'</>'}
            </span>
          ) : (
            <span
              className="font-bold tracking-tight"
              style={{
                fontSize: size * 0.35,
                fontFamily: 'serif',
                background: `linear-gradient(135deg, ${c.text})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 15px ${c.glow}80)`,
              }}
            >
              YA
            </span>
          )}
        </div>

        {/* Orbiting Particle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          <div
            className="absolute rounded-full"
            style={{
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: size * 0.06,
              height: size * 0.06,
              background: c.particle,
              boxShadow: `0 0 10px ${c.particle}, 0 0 20px ${c.particle}`,
            }}
          />
        </motion.div>

        {/* Second Orbit for Combined */}
        {variant === 'combined' && (
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <div
              className="absolute rounded-full"
              style={{
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: size * 0.04,
                height: size * 0.04,
                background: '#40E0D0',
                boxShadow: '0 0 10px #40E0D0',
              }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Name */}
      {showName && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <h1
            className="text-2xl md:text-3xl font-bold tracking-wide"
            style={{
              fontFamily: 'serif',
              background: `linear-gradient(135deg, ${c.text})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            YUKSEL ARSLAN
          </h1>
          <p className={`text-xs tracking-[0.2em] uppercase mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {variant === 'construction' ? 'Construction Engineer' :
             variant === 'software' ? 'Software Developer' :
             'Engineer • Developer • Visionary'}
          </p>
        </motion.div>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes morph {
          0%, 100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
          25% { border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%; }
          50% { border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%; }
          75% { border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%; }
        }

        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px ${c.glow}, 0 0 40px ${c.glow}50;
          }
          50% {
            box-shadow: 0 0 30px ${c.glow}, 0 0 60px ${c.glow}60;
          }
        }
      `}</style>
    </div>
  );
}
