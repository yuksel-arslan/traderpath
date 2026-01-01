'use client';

// ===========================================
// AI Insight Component
// Educational AI commentary displayed prominently
// ===========================================

import { Brain, Lightbulb, GraduationCap, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIInsightProps {
  title?: string;
  insight: string;
  type?: 'summary' | 'education' | 'explanation' | 'warning';
  className?: string;
}

const typeConfig = {
  summary: {
    icon: Brain,
    bgClass: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10',
    borderClass: 'border-blue-500/20',
    iconClass: 'text-purple-500',
    titleClass: 'text-purple-500',
    defaultTitle: 'AI Analysis',
  },
  education: {
    icon: GraduationCap,
    bgClass: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
    borderClass: 'border-amber-500/20',
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-500',
    defaultTitle: 'Learn: Why This Matters',
  },
  explanation: {
    icon: Lightbulb,
    bgClass: 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10',
    borderClass: 'border-cyan-500/20',
    iconClass: 'text-cyan-500',
    titleClass: 'text-cyan-500',
    defaultTitle: 'AI Explanation',
  },
  warning: {
    icon: Sparkles,
    bgClass: 'bg-gradient-to-r from-red-500/10 to-orange-500/10',
    borderClass: 'border-red-500/20',
    iconClass: 'text-red-500',
    titleClass: 'text-red-500',
    defaultTitle: 'Important Notice',
  },
};

export function AIInsight({ title, insight, type = 'summary', className }: AIInsightProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  if (!insight) return null;

  return (
    <div className={cn(
      'rounded-xl p-5 border',
      config.bgClass,
      config.borderClass,
      className
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          'bg-background/50 backdrop-blur'
        )}>
          <Icon className={cn('w-5 h-5', config.iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold mb-2', config.titleClass)}>
            {title || config.defaultTitle}
          </h4>
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {insight}
          </p>
        </div>
      </div>
    </div>
  );
}

// Educational wrapper component for step introductions
interface StepEducationProps {
  stepNumber: number;
  title: string;
  description: string;
  whyMatters: string;
  whatWeAnalyze: string[];
}

export function StepEducation({ stepNumber, title, description, whyMatters, whatWeAnalyze }: StepEducationProps) {
  return (
    <div className="space-y-4">
      {/* Main description */}
      <div className="text-lg">
        {description}
      </div>

      {/* Why it matters - Educational */}
      <AIInsight
        type="education"
        title={`Step ${stepNumber}: Why ${title} Matters`}
        insight={whyMatters}
      />

      {/* What we analyze */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          What We Analyze
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {whatWeAnalyze.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
