'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Auto-verify if token is present
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus('verifying');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Verification failed');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Failed to resend:', err);
    } finally {
      setIsResending(false);
    }
  };

  // Waiting for email (no token)
  if (!token) {
    return (
      <>
        <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a verification link to{' '}
            {email ? <strong>{email}</strong> : 'your email address'}.
            Please click the link to verify your account.
          </p>

          <div className="space-y-3">
            {email && (
              <button
                onClick={handleResendEmail}
                disabled={isResending || resendSuccess}
                className="w-full py-2 border rounded-lg font-medium hover:bg-accent transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResending && <Loader2 className="w-4 h-4 animate-spin" />}
                {resendSuccess ? 'Email Sent!' : isResending ? 'Sending...' : 'Resend Email'}
              </button>
            )}
            <Link
              href="/login"
              className="block w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition text-center"
            >
              Back to Login
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Didn&apos;t receive the email? Check your spam folder.
          </p>
        </div>
      </>
    );
  }

  // Verifying
  if (status === 'verifying') {
    return (
      <>
        <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Verifying Your Email</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <>
        <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
          <p className="text-muted-foreground mb-6">
            Your email has been successfully verified. You can now access all features.
          </p>
          <Link
            href="/dashboard"
            className="block w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition text-center"
          >
            Go to Capital Flow
          </Link>
        </div>
      </>
    );
  }

  // Error
  return (
    <>
      <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
        <p className="text-muted-foreground mb-6">
          {errorMessage || 'The verification link is invalid or has expired.'}
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition text-center"
          >
            Back to Login
          </Link>
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Create New Account
          </Link>
        </div>
      </div>
    </>
  );
}
