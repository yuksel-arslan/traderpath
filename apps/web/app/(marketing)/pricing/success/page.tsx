'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, XCircle, ArrowRight, Gem, Clock } from 'lucide-react';
import { authFetch } from '../../../../lib/api';

interface VerificationStatus {
  status: 'completed' | 'pending';
  creditsAdded?: number;
  message: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get('checkout_id');

  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    verifyPayment();
  }, [checkoutId, retryCount]);

  const verifyPayment = async () => {
    try {
      // Call verify endpoint - it checks for recent purchase transactions
      const response = await authFetch(`/api/payments/verify/${checkoutId || 'check'}`);

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const data = await response.json();
      setVerification(data.data);

      // If pending and we haven't retried too many times, retry after a delay
      if (data.data?.status === 'pending' && retryCount < 5) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, 3000); // Retry every 3 seconds
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'Your payment could not be verified. If you were charged, please contact support.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition"
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

  // Payment still processing
  if (verification?.status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Processing Payment...</h1>
          <p className="text-muted-foreground mb-6">
            {verification.message}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking status...
          </div>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="text-primary hover:underline"
            >
              Go to Dashboard and check your balance
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Payment successful
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          {verification?.message || 'Thank you for your purchase. Your credits have been added to your account.'}
        </p>

        {/* Credits Added */}
        {verification?.creditsAdded && (
          <div className="bg-accent rounded-xl p-4 mb-6 inline-flex items-center gap-3">
            <Gem className="w-6 h-6 text-amber-500" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Credits Added</p>
              <p className="text-xl font-bold text-emerald-500">
                +{verification.creditsAdded}
              </p>
            </div>
          </div>
        )}

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
