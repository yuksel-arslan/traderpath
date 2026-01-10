'use client';

// ===========================================
// Credit Balance Component
// ===========================================

import { useState } from 'react';
import { Gem, Plus, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/utils';
import { getAuthToken } from '../../lib/api';
import Link from 'next/link';

interface CreditBalanceData {
  balance: number;
}

async function fetchBalance(): Promise<CreditBalanceData> {
  const token = await getAuthToken();

  if (!token) {
    return { balance: 0 };
  }

  try {
    const response = await fetch('/api/credits/balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      return { balance: result.data?.balance || 0 };
    }

    return { balance: 0 };
  } catch (error) {
    console.error('Failed to fetch credit balance:', error);
    return { balance: 0 };
  }
}

export function CreditBalance() {
  const [showDropdown, setShowDropdown] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['credits'],
    queryFn: fetchBalance,
    staleTime: 5 * 60 * 1000, // 5 minutes - credits don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnMount: false, // Don't refetch on navigation
    refetchOnWindowFocus: false,
  });

  // Refetch when dropdown opens (if data is stale)
  const handleDropdownToggle = () => {
    if (!showDropdown) {
      refetch(); // Refresh when opening
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="relative">
      <button
        onClick={handleDropdownToggle}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full',
          'bg-gradient-to-r from-amber-500/10 to-yellow-500/10',
          'border border-amber-500/20',
          'hover:border-amber-500/40 transition-all'
        )}
      >
        <Gem className="w-5 h-5 text-amber-500" />
        <span className="font-semibold text-amber-600">
          {isLoading ? '...' : data?.balance || 0}
        </span>
        <Plus className="w-4 h-4 text-amber-500" />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-lg shadow-lg z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Your Balance</span>
              <span className="text-2xl font-bold text-amber-600">
                {data?.balance || 0}
              </span>
            </div>

            <div className="space-y-2">
              <Link
                href="/credits"
                onClick={() => setShowDropdown(false)}
                className="block w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg font-medium hover:opacity-90 transition text-center"
              >
                Buy Credits
              </Link>
              <Link
                href="/credits?tab=history"
                onClick={() => setShowDropdown(false)}
                className="w-full py-2 px-4 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4" />
                View History
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
