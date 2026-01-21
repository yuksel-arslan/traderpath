import { RefreshCw } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );
}
