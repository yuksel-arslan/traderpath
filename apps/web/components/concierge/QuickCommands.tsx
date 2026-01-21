'use client';

import { Flame, Diamond, Bitcoin, BarChart3 } from 'lucide-react';
import { QuickCommand } from './useConcierge';

interface QuickCommandsProps {
  commands: QuickCommand[];
  onCommand: (command: string) => void;
  isLoading?: boolean;
}

function getIcon(id: string) {
  switch (id) {
    case 'top-movers':
      return <Flame className="w-4 h-4" />;
    case 'favorites':
      return <Diamond className="w-4 h-4" />;
    case 'btc-quick':
      return <Bitcoin className="w-4 h-4" />;
    case 'status':
      return <BarChart3 className="w-4 h-4" />;
    default:
      return null;
  }
}

export function QuickCommands({
  commands,
  onCommand,
  isLoading,
}: QuickCommandsProps) {
  if (commands.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {commands.map((cmd) => (
        <button
          key={cmd.id}
          onClick={() => onCommand(cmd.command)}
          disabled={isLoading}
          className="group flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={cmd.description}
        >
          <span className="text-teal-500 group-hover:scale-110 transition-transform">
            {getIcon(cmd.id)}
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {cmd.label}
          </span>
        </button>
      ))}
    </div>
  );
}
