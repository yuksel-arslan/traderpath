'use client';

import { ScoreRing, PulseDot } from '@/components/ui/intelligence';

interface Agent {
  name: string;
  role: string;
  status: 'active' | 'idle' | 'offline';
  lastScore: number;
}

const AGENTS: Agent[] = [
  { name: 'ARIA', role: 'Technical', status: 'active', lastScore: 82 },
  { name: 'NEXUS', role: 'Risk', status: 'active', lastScore: 76 },
  { name: 'ORACLE', role: 'On-Chain', status: 'active', lastScore: 88 },
  { name: 'SENTINEL', role: 'Security', status: 'active', lastScore: 91 },
];

export function AgentPanel() {
  return (
    <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
        AI Agent Council
      </span>
      <div className="mt-3 space-y-2">
        {AGENTS.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/50 dark:bg-white/[0.03]"
          >
            <PulseDot
              color={agent.status === 'active' ? '#00F5A0' : '#666'}
              size={6}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {agent.name}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-white/35">
                  {agent.role}
                </span>
              </div>
            </div>
            <ScoreRing score={agent.lastScore} size={32} strokeWidth={2.5} />
          </div>
        ))}
      </div>
    </div>
  );
}
