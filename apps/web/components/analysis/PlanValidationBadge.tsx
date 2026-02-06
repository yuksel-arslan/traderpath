'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';

interface PlanValidation {
  passed: boolean;
  blockers: number;
  warnings: number;
  summary: string;
  checks?: ValidationCheck[];
}

interface ValidationCheck {
  ruleId: string;
  ruleName: string;
  severity: 'block' | 'warn' | 'info';
  passed: boolean;
  message: string;
  actual?: string | number;
  threshold?: string | number;
}

interface PlanValidationBadgeProps {
  validation: PlanValidation | null;
  capitalFlowAligned?: boolean;
}

function getBadgeConfig(validation: PlanValidation) {
  if (validation.blockers > 0) {
    return {
      label: 'Plan Blocked',
      count: validation.blockers,
      countLabel: validation.blockers === 1 ? 'blocker' : 'blockers',
      icon: XCircle,
      bgClass: 'bg-red-500/10 dark:bg-red-500/15',
      borderClass: 'border-red-500/30 dark:border-red-500/40',
      textClass: 'text-red-600 dark:text-red-400',
      iconClass: 'text-red-500',
    };
  }

  if (validation.warnings > 0) {
    return {
      label: 'Plan Validated with Warnings',
      count: validation.warnings,
      countLabel: validation.warnings === 1 ? 'warning' : 'warnings',
      icon: AlertTriangle,
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
      borderClass: 'border-amber-500/30 dark:border-amber-500/40',
      textClass: 'text-amber-600 dark:text-amber-400',
      iconClass: 'text-amber-500',
    };
  }

  return {
    label: 'Plan Validated',
    count: 0,
    countLabel: '',
    icon: CheckCircle,
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    borderClass: 'border-emerald-500/30 dark:border-emerald-500/40',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    iconClass: 'text-emerald-500',
  };
}

function getCheckIcon(check: ValidationCheck) {
  if (check.passed) {
    return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />;
  }
  if (check.severity === 'block') {
    return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
  }
  if (check.severity === 'warn') {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />;
  }
  return <Info className="h-4 w-4 shrink-0 text-blue-500" />;
}

export function PlanValidationBadge({
  validation,
  capitalFlowAligned,
}: PlanValidationBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!validation) {
    return null;
  }

  const config = getBadgeConfig(validation);
  const BadgeIcon = config.icon;
  const hasDetails =
    (validation.checks && validation.checks.length > 0) ||
    validation.summary;

  return (
    <div
      className={`rounded-lg border ${config.borderClass} ${config.bgClass} overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((prev) => !prev)}
        className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 px-3.5 py-2.5 ${
          hasDetails ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <BadgeIcon className={`h-5 w-5 ${config.iconClass}`} />

        <div className="flex items-center gap-2 text-left">
          <span
            className={`text-sm font-semibold ${config.textClass}`}
          >
            {config.label}
          </span>
          {config.count > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${config.bgClass} ${config.textClass}`}
            >
              {config.count} {config.countLabel}
            </span>
          )}
          {capitalFlowAligned !== undefined && (
            <span
              className={`ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                capitalFlowAligned
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              <Globe className="h-3 w-3" />
              {capitalFlowAligned ? 'Flow Aligned' : 'Flow Misaligned'}
            </span>
          )}
        </div>

        {hasDetails && (
          <span className="text-slate-400 dark:text-slate-500">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-slate-200/50 px-3.5 pb-3 pt-2.5 dark:border-slate-700/50">
          {validation.checks && validation.checks.length > 0 && (
            <ul className="space-y-1.5">
              {validation.checks.map((check) => (
                <li
                  key={check.ruleId}
                  className="grid grid-cols-[auto_1fr] items-start gap-2"
                >
                  {getCheckIcon(check)}
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {check.ruleName}
                    </span>
                    <span className="mx-1.5 text-xs text-slate-400 dark:text-slate-500">
                      —
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {check.message}
                    </span>
                    {check.actual !== undefined &&
                      check.threshold !== undefined && (
                        <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">
                          ({String(check.actual)} / {String(check.threshold)})
                        </span>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {validation.summary && (
            <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {validation.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
