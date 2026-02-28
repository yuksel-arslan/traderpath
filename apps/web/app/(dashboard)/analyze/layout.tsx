'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Target, Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';

const TABS = [
  { name: 'Auto', href: '/analyze', icon: Zap, description: 'AI Pipeline' },
  { name: 'Tailored', href: '/analyze/tailored', icon: Target, description: 'Custom' },
  { name: 'Scheduled', href: '/analyze/scheduled', icon: Calendar, description: 'Recurring' },
];

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/analyze') return pathname === '/analyze';
    return pathname.startsWith(href);
  };

  // Don't show tabs on detail pages
  const isDetailPage = pathname.startsWith('/analyze/details/');
  if (isDetailPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto pt-6 px-4 sm:px-6">
        {/* Header + Tabs */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
              ANALYZER
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1">
            {TABS.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch={true}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    active
                      ? 'bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                  <span className="hidden sm:inline text-[9px] opacity-50">{tab.description}</span>
                </Link>
              );
            })}
          </nav>
        </header>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
