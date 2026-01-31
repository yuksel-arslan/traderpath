'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { FirstLoginModal } from '../../../components/modals/FirstLoginModal';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [firstLoginBonus, setFirstLoginBonus] = useState(0);
  const [welcomeName, setWelcomeName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Check if email is from Gmail
  const isGoogleEmail = (email: string) => {
    const domain = email.toLowerCase().split('@')[1];
    return domain === 'gmail.com' || domain === 'googlemail.com';
  };

  // Check for success/error messages from URL
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Account created! Please check your email to verify your account before signing in.');
    }
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! You can now sign in.');
    }
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_not_configured: 'Google login is not configured. Please contact support.',
        no_code: 'Authorization failed. Please try again.',
        token_exchange_failed: 'Failed to authenticate with Google. Please try again.',
        no_email: 'Could not get email from Google. Please check your Google account.',
        backend_error: 'Server error during login. Please try again.',
        no_token: 'Authentication failed. Please try again.',
        oauth_error: 'OAuth error occurred. Please try again.',
        SERVER_ERROR: 'Google OAuth server error. Please check OAuth configuration or try again later.',
        access_denied: 'Access denied. Please grant permissions to continue.',
        invalid_request: 'Invalid OAuth request. Please try again.',
        redirect_uri_mismatch: 'OAuth redirect URI mismatch. Please contact support.',
      };
      setError(errorMessages[errorParam] || `Login error: ${errorParam}`);
    }
  }, [searchParams]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setEmailNotVerified(false);

    // Require terms acceptance
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsLoading(true);

    // SECURITY: Redirect Gmail users to Google OAuth
    if (isGoogleEmail(email)) {
      setIsLoading(false);
      setError('Gmail users must sign in with Google for security. Click the Google button below.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle email not verified error specially
        if (data.error?.code === 'EMAIL_NOT_VERIFIED') {
          setEmailNotVerified(true);
          setVerificationEmail(data.error?.email || email);
          setError('');
        } else {
          setError(data.error?.message || 'Invalid email or password');
        }
      } else {
        // Check if this is first login
        if (data.data?.isFirstLogin && data.data?.firstLoginBonus) {
          setFirstLoginBonus(data.data.firstLoginBonus);
          setWelcomeName(data.data.user?.name || '');
          setShowWelcomeModal(true);
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    }

    setIsLoading(false);
  };

  // Handle OAuth Sign-In
  const handleOAuthClick = (provider: string) => {
    // Require terms acceptance
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoadingProvider(provider);
    setError('');
    window.location.href = `/api/auth/${provider}`;
  };

  // Handle welcome modal close
  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text-logo-animate">Welcome back!</span>
        </h1>
        <p className="text-slate-600 dark:text-muted-foreground mt-2">Sign in to your account to continue</p>
      </div>

      <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {successMessage}
              </div>
            )}

            {/* Email Not Verified Warning */}
            {emailNotVerified && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600">Email verification required</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please check your inbox at <strong>{verificationEmail}</strong> and click the verification link.
                      A new verification email has been sent.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Check your spam folder if you don&apos;t see it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-muted-foreground">
                <input type="checkbox" className="rounded border-slate-300 dark:border-border text-teal-500 focus:ring-teal-500" />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-teal-600 dark:text-primary hover:text-teal-700 dark:hover:text-primary/80 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Terms Acceptance */}
            <div className="p-3 bg-slate-100 dark:bg-accent/50 rounded-xl border border-slate-200 dark:border-border">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms-login"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-slate-300 dark:border-border text-teal-500 focus:ring-teal-500"
                />
                <label htmlFor="terms-login" className="text-sm text-slate-600 dark:text-muted-foreground cursor-pointer">
                  <span className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="font-medium text-slate-700 dark:text-foreground">Terms & Conditions</span>
                  </span>
                  By signing in, I agree to the{' '}
                  <Link href="/terms" className="text-teal-600 dark:text-primary hover:underline font-medium" target="_blank">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-teal-600 dark:text-primary hover:underline font-medium" target="_blank">
                    Privacy Policy
                  </Link>
                  , including the{' '}
                  <Link href="/terms#daily-pass" className="text-teal-600 dark:text-primary hover:underline font-medium" target="_blank">
                    Daily Pass pricing
                  </Link>
                  .
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-card text-slate-500 dark:text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleOAuthClick('google')}
                disabled={loadingProvider !== null}
                className="py-3 border border-slate-200 dark:border-border rounded-xl font-medium bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:border-slate-300 dark:hover:border-border"
                title="Continue with Google"
              >
                {loadingProvider === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={() => handleOAuthClick('github')}
                disabled={loadingProvider !== null}
                className="py-3 border border-slate-200 dark:border-border rounded-xl font-medium bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:border-slate-300 dark:hover:border-border text-slate-700 dark:text-current"
                title="Continue with GitHub"
              >
                {loadingProvider === 'github' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                )}
              </button>

              {/* X (Twitter) */}
              <button
                type="button"
                onClick={() => handleOAuthClick('twitter')}
                disabled={loadingProvider !== null}
                className="py-3 border border-slate-200 dark:border-border rounded-xl font-medium bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:border-slate-300 dark:hover:border-border text-slate-700 dark:text-current"
                title="Continue with X"
              >
                {loadingProvider === 'twitter' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-teal-600 dark:text-primary hover:text-teal-700 dark:hover:text-primary/80 font-semibold transition-colors">
            Sign up
          </Link>
        </p>
      </div>

      {/* First Login Welcome Modal */}
      <FirstLoginModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        bonusCredits={firstLoginBonus}
        userName={welcomeName}
      />
    </>
  );
}
