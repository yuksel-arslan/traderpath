'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'buttons' | 'dropdown';
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-accent animate-pulse" />
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-lg bg-accent hover:bg-accent/80 transition"
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : (
          <Moon className="w-5 h-5 text-blue-500" />
        )}
      </button>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setTheme('light')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
            theme === 'light'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Sun className="w-8 h-8 text-amber-500" />
          <span className="font-medium text-sm">Light</span>
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
            theme === 'dark'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Moon className="w-8 h-8 text-blue-500" />
          <span className="font-medium text-sm">Dark</span>
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
            theme === 'system'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Monitor className="w-8 h-8 text-gray-500" />
          <span className="font-medium text-sm">System</span>
        </button>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className="relative">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full px-4 py-2 bg-background border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
