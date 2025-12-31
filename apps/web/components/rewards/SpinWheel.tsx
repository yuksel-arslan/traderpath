'use client';

// ===========================================
// Spin Wheel Component
// Daily lucky spin for earning credits
// ===========================================

import { useState, useRef } from 'react';
import { Gem, RotateCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SpinWheelProps {
  onSpin?: (result: number) => void;
  disabled?: boolean;
  className?: string;
}

const SEGMENTS = [
  { value: 1, color: '#3b82f6', label: '1' },
  { value: 2, color: '#8b5cf6', label: '2' },
  { value: 3, color: '#06b6d4', label: '3' },
  { value: 1, color: '#10b981', label: '1' },
  { value: 5, color: '#f59e0b', label: '5' },
  { value: 2, color: '#ef4444', label: '2' },
  { value: 3, color: '#ec4899', label: '3' },
  { value: 10, color: '#fbbf24', label: '10' },
];

export function SpinWheel({ onSpin, disabled = false, className }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = async () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setResult(null);

    // Calculate random result with weighted probability
    const weights = SEGMENTS.map((s) => {
      if (s.value === 10) return 1;
      if (s.value === 5) return 2;
      if (s.value === 3) return 3;
      if (s.value === 2) return 4;
      return 5;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    const selectedValue = SEGMENTS[selectedIndex].value;

    // Calculate rotation to land on selected segment
    const segmentAngle = 360 / SEGMENTS.length;
    const targetAngle = 360 - (selectedIndex * segmentAngle + segmentAngle / 2);
    const spins = 5 + Math.random() * 3;
    const finalRotation = rotation + spins * 360 + targetAngle;

    setRotation(finalRotation);

    // Wait for animation to complete
    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedValue);
      onSpin?.(selectedValue);
    }, 4000);
  };

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Wheel Container */}
      <div className="relative w-72 h-72 md:w-80 md:h-80">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-500 drop-shadow-lg" />
        </div>

        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-2 shadow-2xl">
          {/* Wheel */}
          <motion.div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden relative"
            style={{ rotate: rotation }}
            animate={{ rotate: rotation }}
            transition={{
              duration: 4,
              ease: [0.17, 0.67, 0.12, 0.99],
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {SEGMENTS.map((segment, index) => {
                const startAngle = index * segmentAngle;
                const endAngle = (index + 1) * segmentAngle;
                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                const largeArc = segmentAngle > 180 ? 1 : 0;

                const midAngle = (startAngle + endAngle) / 2 - 90;
                const midRad = midAngle * (Math.PI / 180);
                const textX = 50 + 32 * Math.cos(midRad);
                const textY = 50 + 32 * Math.sin(midRad);

                return (
                  <g key={index}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${(startAngle + endAngle) / 2}, ${textX}, ${textY})`}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg flex items-center justify-center">
                <Gem className="w-8 h-8 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Glow Effect */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-pulse" />
        )}
      </div>

      {/* Spin Button */}
      <motion.button
        onClick={handleSpin}
        disabled={isSpinning || disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={cn(
          'mt-6 px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all',
          disabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg'
        )}
      >
        <RotateCw className={cn('w-5 h-5', isSpinning && 'animate-spin')} />
        {isSpinning ? 'Spinning...' : disabled ? 'Already Spun Today' : 'Spin Now!'}
      </motion.button>

      {/* Result Modal */}
      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-card rounded-2xl p-8 text-center shadow-2xl border max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
              <p className="text-muted-foreground mb-4">You won</p>
              <div className="flex items-center justify-center gap-2 text-4xl font-bold text-amber-500 mb-6">
                <Gem className="w-10 h-10" />
                <span>{result}</span>
                <span className="text-lg text-muted-foreground">credits</span>
              </div>
              <button
                onClick={() => setResult(null)}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
