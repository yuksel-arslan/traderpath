'use client';

interface UserStats {
  accuracy: number;
  goSignals: number;
  avoidSignals: number;
  activeCount: number;
  activeProfitable: number;
  avgScore: number;
}

interface PerformanceData {
  summary: {
    winRate: number;
    totalTrades: number;
    activeTrades: number;
  };
}

interface BehavioralScoreProps {
  userStats: UserStats | null;
  performanceData: PerformanceData | null;
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color =
    pct >= 70 ? 'bg-green-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CircleScore({ value, size = 56 }: { value: number; size?: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 50 50" className="-rotate-90">
        <circle cx="25" cy="25" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-800" />
        <circle
          cx="25"
          cy="25"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
          {Math.round(pct)}
        </span>
      </div>
    </div>
  );
}

export function BehavioralScore({ userStats, performanceData }: BehavioralScoreProps) {
  if (!userStats) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-[#111111]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Behavioral Score
        </h3>
        <p className="text-sm text-gray-500">Complete analyses to unlock trading psychology metrics.</p>
      </div>
    );
  }

  const winRate = performanceData?.summary?.winRate ?? userStats.accuracy;
  const totalSignals = userStats.goSignals + userStats.avoidSignals;

  // Selectivity: higher avoid ratio = more disciplined
  const selectivity =
    totalSignals > 0 ? Math.min((userStats.avoidSignals / totalSignals) * 200, 100) : 50;

  // Profitability of active trades
  const profitability =
    userStats.activeCount > 0
      ? (userStats.activeProfitable / userStats.activeCount) * 100
      : winRate;

  // Composite discipline score
  const disciplineScore = Math.round(
    winRate * 0.45 + selectivity * 0.30 + Math.min(profitability, 100) * 0.25
  );

  const overallLabel =
    disciplineScore >= 75
      ? 'Excellent'
      : disciplineScore >= 60
      ? 'Good'
      : disciplineScore >= 40
      ? 'Improving'
      : 'Needs Work';

  const overallColor =
    disciplineScore >= 75
      ? 'text-green-500'
      : disciplineScore >= 60
      ? 'text-yellow-500'
      : 'text-red-500';

  const metrics = [
    {
      label: 'Win Rate',
      value: winRate,
      display: winRate > 0 ? `${winRate.toFixed(0)}%` : '—',
    },
    {
      label: 'Selectivity',
      value: selectivity,
      display: totalSignals > 0 ? `${Math.round(selectivity)}%` : '—',
    },
    {
      label: 'Trade Health',
      value: profitability,
      display: userStats.activeCount > 0 ? `${Math.round(profitability)}%` : '—',
    },
  ];

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Behavioral Score
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">Your trading psychology metrics</p>
      </div>

      {/* Discipline score + label */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <CircleScore value={disciplineScore} size={60} />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Discipline Score</p>
          <p className={`text-lg font-semibold ${overallColor}`}>{overallLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Based on {totalSignals} signal decisions
          </p>
        </div>
      </div>

      {/* Metric bars */}
      <div className="px-6 py-5 space-y-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{m.label}</span>
              <span className="text-xs font-semibold font-mono text-gray-900 dark:text-gray-100">
                {m.display}
              </span>
            </div>
            <ScoreBar value={m.value} />
          </div>
        ))}
      </div>
    </div>
  );
}
