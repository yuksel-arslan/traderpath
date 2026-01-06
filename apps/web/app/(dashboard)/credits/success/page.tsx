'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, XCircle, ArrowRight, Gem } from 'lucide-react';

interface SessionStatus {
  status: string;
  paymentStatus: string;
  customerEmail: string;
  amountTotal: number;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/payments/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const data = await response.json();
      setSession(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error || session?.paymentStatus !== 'paid') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Verification Failed
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            {error || 'Your payment could not be verified. If you were charged, please contact support.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/credits"
              className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition"
            >
              Try Again
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mb-2">
          Thank you for your purchase. Your credits have been added to your account.
        </p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">
          Confirmation sent to {session?.customerEmail}
        </p>

        {/* Amount Paid */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 inline-flex items-center gap-3">
          <Gem className="w-6 h-6 text-amber-500" />
          <div className="text-left">
            <p className="text-sm text-gray-500 dark:text-slate-400">Amount Paid</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              ${((session?.amountTotal || 0) / 100).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition"
          >
            Start Analyzing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
