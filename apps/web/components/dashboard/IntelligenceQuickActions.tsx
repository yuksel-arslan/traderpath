'use client';

import Link from 'next/link';

const actions = [
  {
    label: 'New Analysis',
    href: '/analyze',
    color: '#00F5A0',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: 'Capital Flow',
    href: '/flow',
    color: '#00D4FF',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: 'Signals',
    href: '/signals',
    color: '#FFB800',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/reports',
    color: '#A855F7',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

export function IntelligenceQuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="rounded-lg p-3 text-center transition-all hover:scale-105"
          style={{
            background: `${a.color}10`,
            border: `1px solid ${a.color}20`,
          }}
        >
          <div className="flex justify-center mb-1" style={{ color: a.color }}>
            {a.icon}
          </div>
          <div className="text-[10px] font-medium" style={{ color: a.color }}>
            {a.label}
          </div>
        </Link>
      ))}
    </div>
  );
}
