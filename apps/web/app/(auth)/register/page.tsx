'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Gift, Check, X } from 'lucide-react';
import Script from 'next/script';

// API URL configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// Helper to store auth token securely
function storeAuthToken(token: string) {
  localStorage.setItem('accessToken', token);
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `accessToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

// Helper to store user data
function storeUserData(user: Record<string, unknown>) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Password strength checker
function getPasswordStrength(password: string): { score: number; checks: { hasLength: boolean; hasUpper: boolean; hasLower: boolean; hasNumber: boolean } } {
  const checks = {
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  // Handle Google Sign-In callback
  const handleGoogleCredential = useCallback(async (credential: string) => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Google sign-up failed');
      }

      if (data.data?.token) {
        storeAuthToken(data.data.token);
        storeUserData(data.data.user);
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err instanceof Error ? err.message : 'Google sign-up failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [router]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (googleLoaded && window.google && GOOGLE_CLIENT_ID) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              handleGoogleCredential(response.credential);
            }
          },
        });
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
      }
    }
  }, [googleLoaded, handleGoogleCredential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (passwordStrength.score < 4) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          referralCode: referralCode.trim().toUpperCase() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      // Auto-login after registration
      if (data.data?.token) {
        storeAuthToken(data.data.token);
        storeUserData(data.data.user);
        router.push('/dashboard');
      } else {
        // Redirect to login with success message
        router.push('/login?registered=true');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Please use email and password.');
      return;
    }

    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In is still loading. Please wait a moment and try again.');
    }
  };

  const PasswordCheck = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
      {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  return (
    <>
      {GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleLoaded(true)}
          onError={() => console.error('Failed to load Google Sign-In script')}
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
              TradePath
            </h1>
            <p className="text-muted-foreground mt-2">Create your account</p>
          </div>

          <div className="bg-card border rounded-lg p-6 shadow-lg">
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <Gift className="w-5 h-5" />
                <span className="font-medium">Get 25 free credits on signup!</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    autoComplete="new-password"
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
                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength.score >= level
                              ? passwordStrength.score === 4
                                ? 'bg-green-500'
                                : passwordStrength.score >= 3
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      <PasswordCheck passed={passwordStrength.checks.hasLength} label="8+ characters" />
                      <PasswordCheck passed={passwordStrength.checks.hasUpper} label="Uppercase letter" />
                      <PasswordCheck passed={passwordStrength.checks.hasLower} label="Lowercase letter" />
                      <PasswordCheck passed={passwordStrength.checks.hasNumber} label="Number" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Referral Code <span className="text-muted-foreground">(optional)</span>
                </label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter code for +20 bonus credits"
                    maxLength={8}
                    className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none uppercase"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || passwordStrength.score < 4 || !agreedToTerms}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isGoogleLoading}
                className="mt-4 w-full py-3 border rounded-lg font-medium hover:bg-accent transition flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Signing up...' : 'Continue with Google'}</span>
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
