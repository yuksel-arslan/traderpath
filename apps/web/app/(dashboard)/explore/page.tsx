'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /explore to /intelligence?view=top-coins
// Explore is now integrated into the unified Intelligence page
export default function ExploreRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/intelligence?view=top-coins');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to Intelligence...</p>
      </div>
    </div>
  );
}
