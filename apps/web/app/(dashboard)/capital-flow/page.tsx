'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /capital-flow to /intelligence?view=flow
// Capital Flow is now integrated into the unified Intelligence page
export default function CapitalFlowRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/intelligence?view=flow');
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
