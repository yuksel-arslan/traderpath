'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, Eye, EyeOff, CheckCircle, XCircle, Loader2, ArrowLeft, Check } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Validate token on mount
  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setIsValidating(false);
      setTokenValid(false);
    }
  }, [token]);

  const validateToken = async (resetToken: string) => {
    try {
      const res = await fetch(`/api/auth/validate-reset-token?token=${resetToken}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setErrorMessage(data.error?.message || 'Invalid or expired reset link');
      }
    } catch {
      setTokenValid(false);
      setErrorMessage('Failed to validate reset link');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordStrong) {
      setErrorMessage('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      setStatus('success');
      setTimeout(() => router.push('/login?message=password_reset'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
              TraderPath
            </h1>
          </div>

          <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Validating Link</h2>
            <p className="text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
              TraderPath
            </h1>
          </div>

          <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invalid Reset Link</h2>
            <p className="text-muted-foreground mb-6">
              {errorMessage || 'This password reset link is invalid or has expired.'}
            </p>
            <div className="space-y-3">
              <Link
                href="/forgot-password"
                className="block w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition text-center"
              >
                Request New Link
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
              TraderPath
            </h1>
          </div>

          <div className="bg-card border rounded-lg p-6 shadow-lg text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully reset. Redirecting to login...
            </p>
            <Link
              href="/login"
              className="block w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition text-center"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
            TraderPath
          </h1>
          <p className="text-muted-foreground mt-2">Create new password</p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Reset Your Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && status === 'error' && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full pl-10 pr-10 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'length', label: '8+ characters' },
                { key: 'uppercase', label: 'Uppercase letter' },
                { key: 'lowercase', label: 'Lowercase letter' },
                { key: 'number', label: 'Number' },
              ].map((req) => (
                <div
                  key={req.key}
                  className={`flex items-center gap-1 ${
                    passwordChecks[req.key as keyof typeof passwordChecks]
                      ? 'text-green-500'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  {req.label}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className={`w-full pl-10 pr-10 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${
                    confirmPassword && !passwordsMatch ? 'border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordStrong || !passwordsMatch}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
