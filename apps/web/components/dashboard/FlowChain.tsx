'use client';

import Link from 'next/link';
import { ScoreRing, PulseDot, FlowArrow } from '@/components/ui/intelligence';
import { CoinIcon } from '@/components/common/CoinIcon';

interface FlowStep {
  id: string;
  label: string;
  status: 'bullish' | 'bearish' | 'neutral' | 'ready';
  value: string;
  detail: string;
  score: number;
  /** Compact asset names for the "Top Asset" step */
  assetNames?: string[];
  /** BUY / SELL / WAIT / AVOID for the "Trade Plan" step */
  direction?: 'BUY' | 'SELL' | 'WAIT' | 'AVOID';
}

interface SuggestedAsset {
  symbol: string;
  name: string;
  market: string;
  sector?: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

interface SectorFlow {
  name: string;
  flow7d: number;
  trending: 'up' | 'down' | 'stable';
  topAssets: string[];
}

interface FlowChainProps {
  capitalFlow: {
    liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
    markets: {
      market: string;
      flow7d: number;
      phase: string;
      rotationSignal: string | null;
      sectors?: SectorFlow[];
    }[];
    recommendation: {
      primaryMarket: string;
      phase: string;
      action: string;
      confidence: number;
      reason: string;
      sectors?: string[];
      suggestedAssets?: SuggestedAsset[];
    };
    timestamp?: string;
    dataSource?: 'live' | 'cached' | 'fallback';
  } | null;
}

const statusColors: Record<string, string> = {
  bullish: '#00F5A0',
  bearish: '#FF4757',
  neutral: '#FFB800',
  ready: '#00D4FF',
};

const directionConfig: Record<string, { color: string; bg: string }> = {
  BUY:   { color: '#00F5A0', bg: 'rgba(0,245,160,0.12)' },
  SELL:  { color: '#FF4757', bg: 'rgba(255,71,87,0.12)' },
  WAIT:  { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  AVOID: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)' },
};

function buildFlowSteps(
  capitalFlow: FlowChainProps['capitalFlow']
): FlowStep[] {
  if (!capitalFlow) {
    return [
      { id: 'flow', label: 'Capital Flow', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
      { id: 'sector', label: 'Sector', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
      { id: 'asset', label: 'Top Asset', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
      { id: 'plan', label: 'Trade Plan', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
    ];
  }

  const bias = capitalFlow.liquidityBias;
  const biasStatus = bias === 'risk_on' ? 'bullish' : bias === 'risk_off' ? 'bearish' : 'neutral';
  const topMarket = [...capitalFlow.markets].sort((a, b) => b.flow7d - a.flow7d)[0];
  const flowValue = topMarket
    ? `${topMarket.flow7d >= 0 ? '+' : ''}$${Math.abs(topMarket.flow7d).toFixed(1)}B`
    : '--';
  const flowScore = Math.min(100, Math.max(0, Math.round(capitalFlow.recommendation.confidence)));

  // Sector: Use recommended sector name from capital flow
  const sectorName = capitalFlow.recommendation.sectors?.[0] || capitalFlow.recommendation.primaryMarket || '--';
  const sectorScore = Math.min(100, Math.max(0, flowScore - 5));

  // Find matching sector data from the primary market to get trending info
  const primaryMarketData = capitalFlow.markets.find(
    (m) => m.market === capitalFlow.recommendation.primaryMarket
  );
  const matchingSector = primaryMarketData?.sectors?.find(
    (s) => s.name === sectorName
  );
  const sectorTrending = matchingSector?.trending;
  const sectorStatus: FlowStep['status'] = sectorTrending === 'up' ? 'bullish' : sectorTrending === 'down' ? 'bearish' : biasStatus;

  // Asset: Use suggestedAssets from capital flow recommendation (NOT recent analyses)
  const suggestedAssets = capitalFlow.recommendation.suggestedAssets || [];
  const topAsset = suggestedAssets[0];

  // Fallback: if no suggestedAssets, try topAssets from the matching sector
  const fallbackAsset = !topAsset && matchingSector?.topAssets?.[0]
    ? matchingSector.topAssets[0]
    : null;

  const assetSymbol = topAsset?.symbol?.replace(/USDT$/i, '') || fallbackAsset || '--';
  const assetRisk = topAsset?.riskLevel;
  const assetConfidence = assetRisk === 'low' ? 80 : assetRisk === 'medium' ? 60 : assetRisk === 'high' ? 40 : 0;
  const assetScore = topAsset ? Math.min(100, Math.max(0, assetConfidence)) : 0;
  const assetCount = suggestedAssets.length;
  const assetDetail = assetCount > 1
    ? `${assetCount} assets recommended`
    : topAsset
      ? `${topAsset.sector || sectorName} · ${topAsset.riskLevel} risk`
      : fallbackAsset
        ? `${sectorName} sector top asset`
        : 'No recommendation';

  // Collect asset names for compact display inside the Top Asset card
  const allAssetNames = suggestedAssets.length > 0
    ? suggestedAssets.slice(0, 5).map((a) => a.symbol.replace(/USDT$/i, ''))
    : matchingSector?.topAssets?.slice(0, 5).map((a) => a.replace(/USDT$/i, '')) || [];

  // Trade Plan: Use capital flow recommendation action and direction
  const action = capitalFlow.recommendation.action;
  const hasPlan = topAsset && action !== 'avoid';

  // Determine trade direction: BUY/SELL/WAIT/AVOID
  let direction: FlowStep['direction'] = 'WAIT';
  if (action === 'avoid') {
    direction = 'AVOID';
  } else if (action === 'wait') {
    direction = 'WAIT';
  } else if (action === 'analyze') {
    direction = bias === 'risk_on' ? 'BUY' : bias === 'risk_off' ? 'SELL' : 'WAIT';
  }

  const planValue = hasPlan
    ? `${direction} ${assetSymbol}`
    : direction === 'AVOID'
      ? 'AVOID'
      : direction === 'WAIT'
        ? 'WAIT'
        : '--';
  const planDetail = topAsset?.reason?.slice(0, 50) || capitalFlow.recommendation.reason?.slice(0, 50) || 'Run capital flow analysis';
  const planStatus: FlowStep['status'] = direction === 'BUY' ? 'bullish' : direction === 'SELL' ? 'bearish' : direction === 'WAIT' ? 'neutral' : 'bearish';

  return [
    {
      id: 'flow',
      label: 'Capital Flow',
      status: biasStatus,
      value: flowValue,
      detail: topMarket ? `${topMarket.market} · ${topMarket.phase} phase` : 'No data',
      score: flowScore,
    },
    {
      id: 'sector',
      label: 'Sector',
      status: sectorStatus,
      value: sectorName,
      detail: matchingSector
        ? `${matchingSector.trending} trend · ${matchingSector.flow7d >= 0 ? '+' : ''}${matchingSector.flow7d.toFixed(1)}% 7d`
        : capitalFlow.recommendation.reason?.slice(0, 40) || 'Sector rotation data',
      score: sectorScore,
    },
    {
      id: 'asset',
      label: 'Top Asset',
      status: assetScore >= 60 ? 'bullish' : assetScore >= 40 ? 'neutral' : topAsset ? 'bearish' : 'neutral',
      value: assetSymbol,
      detail: assetDetail,
      score: assetScore,
      assetNames: allAssetNames,
    },
    {
      id: 'plan',
      label: 'Trade Plan',
      status: hasPlan ? planStatus : 'neutral',
      value: planValue,
      detail: planDetail,
      score: hasPlan ? flowScore : 0,
      direction,
    },
  ];
}


function getDataSourceInfo(capitalFlow: FlowChainProps['capitalFlow']): {
  label: string;
  color: string;
  isStale: boolean;
} {
  if (!capitalFlow) {
    return { label: 'Loading', color: '#FFB800', isStale: false };
  }

  const source = capitalFlow.dataSource;
  const timestamp = capitalFlow.timestamp ? new Date(capitalFlow.timestamp) : null;
  const ageMinutes = timestamp ? (Date.now() - timestamp.getTime()) / 60_000 : Infinity;

  if (source === 'fallback') {
    return { label: 'Offline Data', color: '#FF4757', isStale: true };
  }
  if (source === 'cached' && ageMinutes > 30) {
    return { label: `Cached (${Math.round(ageMinutes)}m ago)`, color: '#FFB800', isStale: true };
  }
  if (source === 'cached') {
    return { label: 'Cached', color: '#00D4FF', isStale: false };
  }
  return { label: 'Live', color: '#00F5A0', isStale: false };
}

export function FlowChain({ capitalFlow }: FlowChainProps) {
  const steps = buildFlowSteps(capitalFlow);
  const sourceInfo = getDataSourceInfo(capitalFlow);

  return (
    <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
            Flow &rarr; Action Pipeline
          </span>
          <PulseDot color={sourceInfo.isStale ? '#FF4757' : '#00F5A0'} size={6} />
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            color: sourceInfo.color,
            background: `${sourceInfo.color}18`,
            border: `1px solid ${sourceInfo.color}30`,
          }}
        >
          {sourceInfo.label}
        </span>
      </div>
      {sourceInfo.isStale && (
        <div
          className="text-[11px] mb-3 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(255,71,87,0.08)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.15)' }}
        >
          {sourceInfo.label === 'Offline Data'
            ? 'External APIs are disabled or unavailable — showing static fallback data. Check DISABLE_EXTERNAL_APIS env and API keys.'
            : 'Data may be stale. Market conditions could have changed.'}
        </div>
      )}
      {/* Desktop: horizontal, Mobile: vertical */}
      <div className="hidden lg:flex items-stretch gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div
              className="rounded-lg p-3 flex-1 min-w-[140px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${statusColors[step.status]}30`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/35">
                  {step.label}
                </span>
                <ScoreRing score={step.score} size={32} strokeWidth={2.5} color={statusColors[step.status]} />
              </div>
              <div className="text-sm font-bold" style={{ color: statusColors[step.status] }}>
                {step.value}
              </div>
              <div className="text-[11px] mt-1 text-gray-500 dark:text-white/40 truncate">
                {step.detail}
              </div>

              {/* Asset names inline */}
              {step.assetNames && step.assetNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {step.assetNames.map((name) => (
                    <Link
                      key={name}
                      href={`/analyze?symbol=${name}USDT&timeframe=4h`}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-medium text-gray-600 dark:text-white/60 hover:bg-white/[0.12] hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <CoinIcon symbol={name} size={14} />
                      {name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Direction badge */}
              {step.direction && (
                <div className="mt-2">
                  <span
                    className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider"
                    style={{
                      color: directionConfig[step.direction]?.color || '#FFB800',
                      background: directionConfig[step.direction]?.bg || 'rgba(255,184,0,0.12)',
                    }}
                  >
                    {step.direction}
                  </span>
                </div>
              )}
            </div>
            {i < steps.length - 1 && <FlowArrow color={statusColors[step.status]} />}
          </div>
        ))}
      </div>
      {/* Mobile: vertical stack */}
      <div className="lg:hidden space-y-3">
        {steps.map((step, i) => (
          <div key={step.id}>
            <div
              className="rounded-lg p-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${statusColors[step.status]}30`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/35">
                  {step.label}
                </span>
                <ScoreRing score={step.score} size={32} strokeWidth={2.5} color={statusColors[step.status]} />
              </div>
              <div className="text-sm font-bold" style={{ color: statusColors[step.status] }}>
                {step.value}
              </div>
              <div className="text-[11px] mt-1 text-gray-500 dark:text-white/40">
                {step.detail}
              </div>

              {/* Asset names inline */}
              {step.assetNames && step.assetNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {step.assetNames.map((name) => (
                    <Link
                      key={name}
                      href={`/analyze?symbol=${name}USDT&timeframe=4h`}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-medium text-gray-600 dark:text-white/60 active:bg-white/[0.12] transition-colors"
                    >
                      <CoinIcon symbol={name} size={14} />
                      {name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Direction badge */}
              {step.direction && (
                <div className="mt-2">
                  <span
                    className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider"
                    style={{
                      color: directionConfig[step.direction]?.color || '#FFB800',
                      background: directionConfig[step.direction]?.bg || 'rgba(255,184,0,0.12)',
                    }}
                  >
                    {step.direction}
                  </span>
                </div>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
                  <path d="M8 0V20M8 20L2 14M8 20L14 14" stroke={statusColors[step.status]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
