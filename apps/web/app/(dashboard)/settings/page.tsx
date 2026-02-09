'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Shield,
  Palette,
  CreditCard,
  LogOut,
  ChevronRight,
  Smartphone,
  Mail,
  Key,
  Eye,
  EyeOff,
  Check,
  Copy,
  FileText,
  Clock,
  Info,
  Loader2,
  Send,
  MessageSquare,
  Tv,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  QrCode,
  X,
  Activity,
  Moon,
  Sun,
} from 'lucide-react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { authFetch } from '../../../lib/api';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../../lib/cloudinary';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  sendTestNotification,
} from '../../../lib/push-notifications';
import {
  useSubscription,
  getTierDisplayName,
  getTierColor,
} from '../../../hooks/useSubscription';

// Format credits with thousand separators (1000087 → 1,000,087)
function formatCredits(num: number): string {
  return num.toLocaleString('en-US');
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  streakDays: number;
  referralCode: string;
  credits: number;
  isAdmin: boolean;
}

interface TwoFactorSetup {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

interface CreditTransaction {
  id: string;
  type: 'PURCHASE' | 'REWARD' | 'SPEND' | 'REFUND' | 'BONUS';
  amount: number;
  description: string;
  createdAt: string;
  metadata?: {
    analysisId?: string;
    packageName?: string;
    rewardType?: string;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    priceAlerts: true,
    marketing: false,
  });
  const [webhookSettings, setWebhookSettings] = useState({
    telegram: { enabled: false, chatId: '', botToken: '' },
    discord: { enabled: false, webhookUrl: '' },
    tradingView: { enabled: false, webhookUrl: '' },
  });
  const [isSavingWebhooks, setIsSavingWebhooks] = useState(false);
  const [webhookSaveStatus, setWebhookSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportValidityPeriods, setReportValidityPeriods] = useState(50);
  const [isSavingReportSettings, setIsSavingReportSettings] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  // Push Notification State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile edit state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  // Billing state
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);

  // Signal Preferences State
  const [signalPreferences, setSignalPreferences] = useState({
    enabledMarkets: ['crypto', 'stocks', 'metals', 'bonds'],
    enabledAssetClasses: [] as string[],
    minConfidence: 70,
    minClassicScore: 7.0,
    requireMlisConfirm: true,
    allowedVerdicts: ['GO', 'CONDITIONAL_GO'],
    telegramEnabled: false,
    telegramChatId: '',
    discordEnabled: false,
    discordWebhookUrl: '',
    emailEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: 22,
    quietHoursEnd: 7,
  });
  const [isLoadingSignalPrefs, setIsLoadingSignalPrefs] = useState(true);
  const [isSavingSignalPrefs, setIsSavingSignalPrefs] = useState(false);
  const [signalPrefsSaveStatus, setSignalPrefsSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Subscription hook
  const {
    subscription,
    loading: subscriptionLoading,
    openBillingPortal,
    cancelSubscription,
    resumeSubscription,
    actionLoading: subscriptionActionLoading,
    isSubscribed,
    isPaidTier,
  } = useSubscription();

  const handleAvatarButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSaveProfile = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    setIsSavingProfile(true);
    setProfileSaveError('');
    setProfileSaveSuccess(false);

    try {
      const response = await authFetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: fullName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update profile');
      }

      // Update local state
      setUser(prev => prev ? { ...prev, name: fullName } : null);

      // Invalidate user-info cache so the header name updates across all pages
      queryClient.invalidateQueries({ queryKey: ['user-info'] });

      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Fetch user profile and settings on mount - parallel fetching for speed
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch all data in parallel for faster loading
        const [userResponse, settingsResponse, alertSettingsResponse, twoFactorResponse] = await Promise.all([
          authFetch('/api/auth/me'),
          authFetch('/api/user/settings'),
          authFetch('/api/alerts/settings'),
          authFetch('/api/auth/2fa/status').catch(() => null),
        ]);

        // Process user profile
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.data) {
            const profileData: UserProfile = {
              ...userData.data.user,
              credits: userData.data.credits?.balance ?? 0,
            };
            setUser(profileData);
            // Initialize name fields
            const name = profileData.name || '';
            const nameParts = name.split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
          }
        } else if (userResponse.status === 401) {
          setIsLoadingUser(false);
          return;
        }

        // Process settings
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.success && settingsData.data) {
            if (settingsData.data.reportValidityPeriods) {
              setReportValidityPeriods(settingsData.data.reportValidityPeriods);
            }
          }
        }

        // Process notification/webhook settings
        if (alertSettingsResponse.ok) {
          const alertData = await alertSettingsResponse.json();
          if (alertData.success && alertData.data?.settings) {
            const s = alertData.data.settings;
            setWebhookSettings({
              telegram: {
                enabled: s.telegram?.enabled || false,
                chatId: s.telegram?.chatId || '',
                botToken: s.telegram?.botToken || '',
              },
              discord: {
                enabled: s.discord?.enabled || false,
                webhookUrl: s.discord?.webhookUrl || '',
              },
              tradingView: {
                enabled: s.tradingView?.enabled || false,
                webhookUrl: s.tradingView?.webhookUrl || '',
              },
            });
          }
        }

        // Process 2FA status
        if (twoFactorResponse?.ok) {
          const twoFactorData = await twoFactorResponse.json();
          if (twoFactorData.success) {
            setTwoFactorEnabled(twoFactorData.data?.enabled || false);
          }
        }
        setTwoFactorLoading(false);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoadingUser(false);
        setTwoFactorLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Check push notification status on mount
  useEffect(() => {
    const checkPushStatus = async () => {
      setPushSupported(isPushSupported());
      setPushPermission(getNotificationPermission());

      if (isPushSupported()) {
        const subscribed = await isSubscribedToPush();
        setPushSubscribed(subscribed);
        setNotifications(prev => ({ ...prev, push: subscribed }));
      }
    };

    checkPushStatus();
  }, []);

  // Fetch transaction history when billing section is active
  useEffect(() => {
    if (activeSection !== 'billing') return;

    const fetchTransactions = async () => {
      setIsLoadingTransactions(true);
      try {
        const response = await authFetch('/api/credits/history?limit=5');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTransactions(data.data.transactions || []);
            setTotalTransactions(data.data.total || 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [activeSection]);

  // Handle push notification toggle
  const handlePushToggle = async () => {
    if (!pushSupported) {
      setPushError('Push notifications are not supported in your browser');
      return;
    }

    setPushLoading(true);
    setPushError(null);

    try {
      if (pushSubscribed) {
        // Unsubscribe
        const success = await unsubscribeFromPush();
        if (success) {
          setPushSubscribed(false);
          setNotifications(prev => ({ ...prev, push: false }));
        }
      } else {
        // Subscribe
        const subscription = await subscribeToPush();
        if (subscription) {
          setPushSubscribed(true);
          setPushPermission('granted');
          setNotifications(prev => ({ ...prev, push: true }));
        } else {
          setPushError('Failed to enable push notifications. Please check your browser settings.');
        }
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Failed to toggle push notifications');
    } finally {
      setPushLoading(false);
    }
  };

  // Handle test notification
  const handleTestPush = async () => {
    if (!pushSubscribed) {
      setPushError('Please enable push notifications first');
      return;
    }

    try {
      await sendTestNotification();
    } catch (err) {
      setPushError('Failed to send test notification');
    }
  };

  // 2FA Functions
  const handleSetup2FA = async () => {
    setTwoFactorError('');
    setShowSetup2FA(true);

    try {
      const response = await authFetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to setup 2FA');
      }

      setTwoFactorSetup(data.data);
      setBackupCodes(data.data.backupCodes || []);
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Setup failed');
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFactorError('Please enter a 6-digit code');
      return;
    }

    setIsEnabling2FA(true);
    setTwoFactorError('');

    try {
      const response = await authFetch('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to enable 2FA');
      }

      setTwoFactorEnabled(true);
      setShowSetup2FA(false);
      setShowBackupCodes(true);
      setVerificationCode('');
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setTwoFactorError('Password is required');
      return;
    }

    setIsDisabling2FA(true);
    setTwoFactorError('');

    try {
      const response = await authFetch('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to disable 2FA');
      }

      setTwoFactorEnabled(false);
      setShowDisable2FA(false);
      setDisablePassword('');
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Both fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const response = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      setAvatarError('Avatar upload is not configured. Please contact support.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError('');

    try {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file, 'traderpath-avatars');

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Update user profile with new avatar URL
      const response = await authFetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: uploadResult.url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update profile');
      }

      // Update local state
      setUser(prev => prev ? { ...prev, avatarUrl: uploadResult.url! } : null);

      // Invalidate user-info cache so the header avatar updates across all pages
      queryClient.invalidateQueries({ queryKey: ['user-info'] });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setIsUploadingAvatar(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getFirstName = (name: string | null) => {
    if (!name) return '';
    return name.split(' ')[0] || '';
  };

  const getLastName = (name: string | null) => {
    if (!name) return '';
    const parts = name.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'signals', label: 'Signals', icon: Activity },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const handleSaveReportSettings = async () => {
    setIsSavingReportSettings(true);
    try {
      await authFetch('/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ reportValidityPeriods }),
      });
    } catch (error) {
      console.error('Failed to save report settings:', error);
    } finally {
      setIsSavingReportSettings(false);
    }
  };

  const handleSaveWebhookSettings = async () => {
    setIsSavingWebhooks(true);
    setWebhookSaveStatus('idle');
    try {
      const response = await authFetch('/api/alerts/settings', {
        method: 'PATCH',
        body: JSON.stringify(webhookSettings),
      });

      if (response.ok) {
        setWebhookSaveStatus('success');
        setTimeout(() => setWebhookSaveStatus('idle'), 3000);
      } else {
        setWebhookSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save webhook settings:', error);
      setWebhookSaveStatus('error');
    } finally {
      setIsSavingWebhooks(false);
    }
  };

  const handleTestWebhook = async (channel: 'telegram' | 'discord' | 'tradingview') => {
    try {
      const response = await authFetch('/api/alerts/test', {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });

      if (response.ok) {
        alert(`Test notification sent to ${channel}!`);
      } else {
        alert(`Failed to send test notification. Please check your settings.`);
      }
    } catch (error) {
      alert(`Failed to send test notification.`);
    }
  };

  // Fetch signal preferences when signals section is active
  useEffect(() => {
    if (activeSection !== 'signals') return;

    const fetchSignalPreferences = async () => {
      setIsLoadingSignalPrefs(true);
      try {
        const response = await authFetch('/api/v1/signals/preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSignalPreferences({
              enabledMarkets: data.data.enabledMarkets || ['crypto', 'stocks', 'metals', 'bonds'],
              enabledAssetClasses: data.data.enabledAssetClasses || [],
              minConfidence: data.data.minConfidence || 70,
              minClassicScore: data.data.minClassicScore || 7.0,
              requireMlisConfirm: data.data.requireMlisConfirm ?? true,
              allowedVerdicts: data.data.allowedVerdicts || ['GO', 'CONDITIONAL_GO'],
              telegramEnabled: data.data.telegramEnabled || false,
              telegramChatId: data.data.telegramChatId || '',
              discordEnabled: data.data.discordEnabled || false,
              discordWebhookUrl: data.data.discordWebhookUrl || '',
              emailEnabled: data.data.emailEnabled || false,
              quietHoursEnabled: data.data.quietHoursEnabled || false,
              quietHoursStart: data.data.quietHoursStart ?? 22,
              quietHoursEnd: data.data.quietHoursEnd ?? 7,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch signal preferences:', error);
      } finally {
        setIsLoadingSignalPrefs(false);
      }
    };

    fetchSignalPreferences();
  }, [activeSection]);

  const handleSaveSignalPreferences = async () => {
    setIsSavingSignalPrefs(true);
    setSignalPrefsSaveStatus('idle');
    try {
      const response = await authFetch('/api/v1/signals/preferences', {
        method: 'PATCH',
        body: JSON.stringify(signalPreferences),
      });

      if (response.ok) {
        setSignalPrefsSaveStatus('success');
        setTimeout(() => setSignalPrefsSaveStatus('idle'), 3000);
      } else {
        setSignalPrefsSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save signal preferences:', error);
      setSignalPrefsSaveStatus('error');
    } finally {
      setIsSavingSignalPrefs(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base ${
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">{section.label}</span>
                </button>
              );
            })}
            <div className="hidden md:block">
              <hr className="my-4" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition whitespace-nowrap text-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <div className="bg-card border rounded-lg p-6">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>

                {isLoadingUser ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : user ? (
                  <>
                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name || user.email}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {getInitials(user.name, user.email)}
                          </div>
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleAvatarUpload}
                          className="sr-only"
                          disabled={isUploadingAvatar}
                        />
                        <button
                          type="button"
                          onClick={handleAvatarButtonClick}
                          disabled={isUploadingAvatar}
                          className={`px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition ${
                            isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                        </button>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPG, PNG, GIF or WebP. Max 2MB.
                        </p>
                        {avatarError && (
                          <p className="text-sm text-destructive mt-1">{avatarError}</p>
                        )}
                      </div>
                    </div>

                    {/* Admin Badge */}
                    {user.isAdmin && (
                      <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-500" />
                        <span className="text-amber-500 font-medium">Admin Account</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">First Name</label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Enter first name"
                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Last Name</label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Enter last name"
                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          value={user.email}
                          readOnly
                          className="w-full px-4 py-2 bg-muted border rounded-lg text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Referral Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={user.referralCode}
                            readOnly
                            className="flex-1 px-4 py-2 bg-background border rounded-lg font-sans"
                          />
                          <button
                            onClick={handleCopyReferral}
                            className="px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition flex items-center gap-2"
                          >
                            {copied ? (
                              <>
                                <Check className="w-4 h-4 text-green-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* User Stats */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-background rounded-lg">
                          <p className="text-2xl font-bold text-primary">{user.level}</p>
                          <p className="text-sm text-muted-foreground">Level</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <p className="text-2xl font-bold text-primary">{formatCredits(user.credits)}</p>
                          <p className="text-sm text-muted-foreground">Credits</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <p className="text-2xl font-bold text-primary">{user.streakDays}</p>
                          <p className="text-sm text-muted-foreground">Day Streak</p>
                        </div>
                      </div>

                      {profileSaveError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          {profileSaveError}
                        </div>
                      )}
                      {profileSaveSuccess && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Profile saved successfully!
                        </div>
                      )}

                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSavingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Failed to load user profile. Please try again.
                  </div>
                )}
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

                  {/* Push Error */}
                  {pushError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {pushError}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Browser Push Notifications */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${pushSubscribed ? 'bg-green-500/10' : 'bg-accent'}`}>
                          <Smartphone className={`w-5 h-5 ${pushSubscribed ? 'text-green-500' : ''}`} />
                        </div>
                        <div>
                          <p className="font-medium">Browser Push Notifications</p>
                          <p className="text-sm text-muted-foreground">
                            {!pushSupported
                              ? 'Not supported in your browser'
                              : pushPermission === 'denied'
                              ? 'Permission denied - check browser settings'
                              : pushSubscribed
                              ? 'Enabled - you will receive alerts'
                              : 'Get real-time alerts in your browser'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pushSubscribed && (
                          <button
                            onClick={handleTestPush}
                            className="text-xs text-primary hover:underline"
                          >
                            Test
                          </button>
                        )}
                        <button
                          onClick={handlePushToggle}
                          disabled={!pushSupported || pushPermission === 'denied' || pushLoading}
                          className={`w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            pushSubscribed ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          {pushLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                pushSubscribed ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Price Alerts */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent rounded-full">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">Price Alerts</p>
                          <p className="text-sm text-muted-foreground">
                            Get notified when prices hit your targets
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            priceAlerts: !notifications.priceAlerts,
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          notifications.priceAlerts ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            notifications.priceAlerts ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Webhook Integrations */}
                <div>
                  <h2 className="text-xl font-semibold mb-2">Alert Integrations</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Connect external services to receive price alerts when your trade plan levels are hit
                  </p>

                  <div className="space-y-6">
                    {/* Telegram */}
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-full">
                            <Send className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">Telegram</p>
                            <p className="text-sm text-muted-foreground">
                              Receive instant alerts via Telegram bot
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setWebhookSettings({
                            ...webhookSettings,
                            telegram: { ...webhookSettings.telegram, enabled: !webhookSettings.telegram.enabled }
                          })}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            webhookSettings.telegram.enabled ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            webhookSettings.telegram.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {webhookSettings.telegram.enabled && (
                        <div className="space-y-3 pt-3 border-t">
                          <div>
                            <label className="block text-sm font-medium mb-1">Bot Token</label>
                            <input
                              type="text"
                              value={webhookSettings.telegram.botToken}
                              onChange={(e) => setWebhookSettings({
                                ...webhookSettings,
                                telegram: { ...webhookSettings.telegram, botToken: e.target.value }
                              })}
                              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                              className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Chat ID</label>
                            <input
                              type="text"
                              value={webhookSettings.telegram.chatId}
                              onChange={(e) => setWebhookSettings({
                                ...webhookSettings,
                                telegram: { ...webhookSettings.telegram, chatId: e.target.value }
                              })}
                              placeholder="-1001234567890"
                              className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-blue-500/5 rounded-lg">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              Create a bot via @BotFather, get token, then send /start to your bot and get chat ID from @userinfobot
                            </p>
                          </div>
                          <button
                            onClick={() => handleTestWebhook('telegram')}
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Send Test Message
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Discord */}
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-full">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-medium">Discord</p>
                            <p className="text-sm text-muted-foreground">
                              Send alerts to a Discord channel
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setWebhookSettings({
                            ...webhookSettings,
                            discord: { ...webhookSettings.discord, enabled: !webhookSettings.discord.enabled }
                          })}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            webhookSettings.discord.enabled ? 'bg-indigo-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            webhookSettings.discord.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {webhookSettings.discord.enabled && (
                        <div className="space-y-3 pt-3 border-t">
                          <div>
                            <label className="block text-sm font-medium mb-1">Webhook URL</label>
                            <input
                              type="url"
                              value={webhookSettings.discord.webhookUrl}
                              onChange={(e) => setWebhookSettings({
                                ...webhookSettings,
                                discord: { ...webhookSettings.discord, webhookUrl: e.target.value }
                              })}
                              placeholder="https://discord.com/api/webhooks/..."
                              className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-indigo-500/5 rounded-lg">
                            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">
                              Server Settings → Integrations → Webhooks → Create Webhook → Copy URL
                            </p>
                          </div>
                          <button
                            onClick={() => handleTestWebhook('discord')}
                            className="text-sm text-indigo-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Send Test Message
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TradingView */}
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-full">
                            <Tv className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-medium">TradingView Webhook</p>
                            <p className="text-sm text-muted-foreground">
                              Trigger TradingView alerts or custom automation
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setWebhookSettings({
                            ...webhookSettings,
                            tradingView: { ...webhookSettings.tradingView, enabled: !webhookSettings.tradingView.enabled }
                          })}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            webhookSettings.tradingView.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            webhookSettings.tradingView.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {webhookSettings.tradingView.enabled && (
                        <div className="space-y-3 pt-3 border-t">
                          <div>
                            <label className="block text-sm font-medium mb-1">Webhook URL</label>
                            <input
                              type="url"
                              value={webhookSettings.tradingView.webhookUrl}
                              onChange={(e) => setWebhookSettings({
                                ...webhookSettings,
                                tradingView: { ...webhookSettings.tradingView, webhookUrl: e.target.value }
                              })}
                              placeholder="https://your-webhook-endpoint.com/tradingview"
                              className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-emerald-500/5 rounded-lg">
                            <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              Use with 3commas, Cornix, or any webhook-compatible service
                            </p>
                          </div>
                          <button
                            onClick={() => handleTestWebhook('tradingview')}
                            className="text-sm text-emerald-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Send Test Webhook
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={handleSaveWebhookSettings}
                      disabled={isSavingWebhooks}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
                    >
                      {isSavingWebhooks ? 'Saving...' : 'Save Integration Settings'}
                    </button>
                    {webhookSaveStatus === 'success' && (
                      <span className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Settings saved!
                      </span>
                    )}
                    {webhookSaveStatus === 'error' && (
                      <span className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Failed to save
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Signals Section */}
            {activeSection === 'signals' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Signal Preferences</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure which types of signals you want to receive and how you want to be notified
                  </p>

                  {isLoadingSignalPrefs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Enabled Markets */}
                      <div className="p-4 bg-background rounded-lg border">
                        <h3 className="font-medium mb-4">Markets</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select which markets you want to receive signals for
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {['crypto', 'stocks', 'metals', 'bonds'].map((market) => (
                            <label
                              key={market}
                              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition"
                            >
                              <input
                                type="checkbox"
                                checked={signalPreferences.enabledMarkets.includes(market)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSignalPreferences({
                                      ...signalPreferences,
                                      enabledMarkets: [...signalPreferences.enabledMarkets, market]
                                    });
                                  } else {
                                    setSignalPreferences({
                                      ...signalPreferences,
                                      enabledMarkets: signalPreferences.enabledMarkets.filter(m => m !== market)
                                    });
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="capitalize">{market}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Quality Filters */}
                      <div className="p-4 bg-background rounded-lg border">
                        <h3 className="font-medium mb-4">Quality Filters</h3>
                        <div className="space-y-4">
                          {/* Minimum Confidence */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">Minimum Confidence</label>
                              <span className="text-sm text-primary font-semibold">{signalPreferences.minConfidence}%</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="100"
                              step="5"
                              value={signalPreferences.minConfidence}
                              onChange={(e) => setSignalPreferences({
                                ...signalPreferences,
                                minConfidence: parseInt(e.target.value)
                              })}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>50%</span>
                              <span>100%</span>
                            </div>
                          </div>

                          {/* Minimum Classic Score */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">Minimum Classic Score</label>
                              <span className="text-sm text-primary font-semibold">{signalPreferences.minClassicScore.toFixed(1)}/10</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="10"
                              step="0.5"
                              value={signalPreferences.minClassicScore}
                              onChange={(e) => setSignalPreferences({
                                ...signalPreferences,
                                minClassicScore: parseFloat(e.target.value)
                              })}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>5.0</span>
                              <span>10.0</span>
                            </div>
                          </div>

                          {/* Require MLIS Confirmation */}
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">Require MLIS Pro Confirmation</p>
                              <p className="text-xs text-muted-foreground">Only receive signals confirmed by MLIS Pro</p>
                            </div>
                            <button
                              onClick={() => setSignalPreferences({
                                ...signalPreferences,
                                requireMlisConfirm: !signalPreferences.requireMlisConfirm
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                signalPreferences.requireMlisConfirm ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                signalPreferences.requireMlisConfirm ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Allowed Verdicts */}
                      <div className="p-4 bg-background rounded-lg border">
                        <h3 className="font-medium mb-4">Allowed Verdicts</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select which verdict types you want to receive
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'GO', label: 'GO', color: 'text-green-500 bg-green-500/10' },
                            { value: 'CONDITIONAL_GO', label: 'Conditional GO', color: 'text-amber-500 bg-amber-500/10' },
                            { value: 'WAIT', label: 'WAIT', color: 'text-orange-500 bg-orange-500/10' },
                            { value: 'AVOID', label: 'AVOID', color: 'text-red-500 bg-red-500/10' },
                          ].map((verdict) => (
                            <label
                              key={verdict.value}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition ${verdict.color}`}
                            >
                              <input
                                type="checkbox"
                                checked={signalPreferences.allowedVerdicts.includes(verdict.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSignalPreferences({
                                      ...signalPreferences,
                                      allowedVerdicts: [...signalPreferences.allowedVerdicts, verdict.value]
                                    });
                                  } else {
                                    setSignalPreferences({
                                      ...signalPreferences,
                                      allowedVerdicts: signalPreferences.allowedVerdicts.filter(v => v !== verdict.value)
                                    });
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 focus:ring-primary"
                              />
                              <span className="font-medium">{verdict.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Notification Channels */}
                      <div className="p-4 bg-background rounded-lg border">
                        <h3 className="font-medium mb-4">Notification Channels</h3>
                        <div className="space-y-4">
                          {/* Telegram */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Send className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">Telegram</span>
                              </div>
                              <button
                                onClick={() => setSignalPreferences({
                                  ...signalPreferences,
                                  telegramEnabled: !signalPreferences.telegramEnabled
                                })}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                  signalPreferences.telegramEnabled ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                              >
                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  signalPreferences.telegramEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                            {signalPreferences.telegramEnabled && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Chat ID</label>
                                <input
                                  type="text"
                                  value={signalPreferences.telegramChatId}
                                  onChange={(e) => setSignalPreferences({
                                    ...signalPreferences,
                                    telegramChatId: e.target.value
                                  })}
                                  placeholder="-1001234567890"
                                  className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Get your chat ID from @userinfobot on Telegram
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Discord */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                <span className="font-medium">Discord</span>
                              </div>
                              <button
                                onClick={() => setSignalPreferences({
                                  ...signalPreferences,
                                  discordEnabled: !signalPreferences.discordEnabled
                                })}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                  signalPreferences.discordEnabled ? 'bg-indigo-500' : 'bg-gray-300'
                                }`}
                              >
                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  signalPreferences.discordEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                            {signalPreferences.discordEnabled && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Webhook URL</label>
                                <input
                                  type="url"
                                  value={signalPreferences.discordWebhookUrl}
                                  onChange={(e) => setSignalPreferences({
                                    ...signalPreferences,
                                    discordWebhookUrl: e.target.value
                                  })}
                                  placeholder="https://discord.com/api/webhooks/..."
                                  className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Create a webhook in your Discord server settings
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Email */}
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-emerald-500" />
                              <span className="font-medium">Email</span>
                            </div>
                            <button
                              onClick={() => setSignalPreferences({
                                ...signalPreferences,
                                emailEnabled: !signalPreferences.emailEnabled
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                signalPreferences.emailEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                signalPreferences.emailEnabled ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Quiet Hours */}
                      <div className="p-4 bg-background rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-primary" />
                            <h3 className="font-medium">Quiet Hours</h3>
                          </div>
                          <button
                            onClick={() => setSignalPreferences({
                              ...signalPreferences,
                              quietHoursEnabled: !signalPreferences.quietHoursEnabled
                            })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              signalPreferences.quietHoursEnabled ? 'bg-primary' : 'bg-gray-300'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              signalPreferences.quietHoursEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>

                        {signalPreferences.quietHoursEnabled && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Signals will not be sent during these hours
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Start Hour (UTC)</label>
                                <select
                                  value={signalPreferences.quietHoursStart}
                                  onChange={(e) => setSignalPreferences({
                                    ...signalPreferences,
                                    quietHoursStart: parseInt(e.target.value)
                                  })}
                                  className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>
                                      {i.toString().padStart(2, '0')}:00
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">End Hour (UTC)</label>
                                <select
                                  value={signalPreferences.quietHoursEnd}
                                  onChange={(e) => setSignalPreferences({
                                    ...signalPreferences,
                                    quietHoursEnd: parseInt(e.target.value)
                                  })}
                                  className="w-full px-3 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>
                                      {i.toString().padStart(2, '0')}:00
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Save Button */}
                      <div className="flex items-center gap-4 pt-4">
                        <button
                          onClick={handleSaveSignalPreferences}
                          disabled={isSavingSignalPrefs}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSavingSignalPrefs && <Loader2 className="w-4 h-4 animate-spin" />}
                          {isSavingSignalPrefs ? 'Saving...' : 'Save Preferences'}
                        </button>
                        {signalPrefsSaveStatus === 'success' && (
                          <span className="text-sm text-green-500 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Settings saved!
                          </span>
                        )}
                        {signalPrefsSaveStatus === 'error' && (
                          <span className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Failed to save
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reports Section */}
            {activeSection === 'reports' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Report Settings</h2>

                <div className="space-y-6">
                  {/* Report Validity */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-start gap-3 mb-4">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">Report Validity Period</h3>
                        <p className="text-sm text-muted-foreground">
                          Reports will be automatically deleted after this many periods (candles)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Validity Period (in candles)
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            min="10"
                            max="500"
                            value={reportValidityPeriods}
                            onChange={(e) => setReportValidityPeriods(parseInt(e.target.value) || 50)}
                            className="w-32 px-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-sm text-muted-foreground">periods</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-500">
                          <p className="font-medium mb-1">How validity works:</p>
                          <ul className="list-disc list-inside space-y-1 text-blue-400">
                            <li>4h timeframe: {reportValidityPeriods} periods = {Math.round(reportValidityPeriods * 4 / 24)} days</li>
                            <li>1h timeframe: {reportValidityPeriods} periods = {Math.round(reportValidityPeriods / 24)} days</li>
                            <li>1d timeframe: {reportValidityPeriods} periods = {reportValidityPeriods} days</li>
                          </ul>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveReportSettings}
                        disabled={isSavingReportSettings}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
                      >
                        {isSavingReportSettings ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Report Storage Info */}
                  <div className="p-4 bg-background rounded-lg">
                    <h3 className="font-medium mb-4">Storage Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reports are stored:</span>
                        <span>In your account</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auto-cleanup:</span>
                        <span className="text-green-500">Enabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expired reports:</span>
                        <span>Automatically deleted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Security Settings</h2>

                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="p-4 bg-background rounded-lg">
                    <h3 className="font-medium mb-4">Change Password</h3>
                    <div className="space-y-4">
                      {passwordError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          {passwordError}
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Password changed successfully!
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full pl-10 pr-10 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">New Password</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full pl-10 pr-10 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Auth */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {twoFactorEnabled ? (
                          <div className="p-2 bg-green-500/10 rounded-full">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-500/10 rounded-full">
                            <Shield className="w-5 h-5 text-amber-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">Two-Factor Authentication</h3>
                          <p className="text-sm text-muted-foreground">
                            {twoFactorEnabled
                              ? '2FA is enabled - your account is protected'
                              : 'Add an extra layer of security to your account'}
                          </p>
                        </div>
                      </div>
                      {twoFactorLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : twoFactorEnabled ? (
                        <button
                          onClick={() => setShowDisable2FA(true)}
                          className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10 transition"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={handleSetup2FA}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                        >
                          Enable
                        </button>
                      )}
                    </div>

                    {twoFactorEnabled && (
                      <div className="flex items-center gap-2 p-3 bg-green-500/5 rounded-lg">
                        <Info className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Your account is protected with two-factor authentication.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Active Sessions */}
                  <div className="p-4 bg-background rounded-lg">
                    <h3 className="font-medium mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Current Device</p>
                            <p className="text-sm text-muted-foreground">
                              This session
                            </p>
                          </div>
                        </div>
                        <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2FA Setup Modal */}
                {showSetup2FA && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Setup Two-Factor Authentication</h3>
                        <button
                          onClick={() => {
                            setShowSetup2FA(false);
                            setTwoFactorSetup(null);
                            setVerificationCode('');
                            setTwoFactorError('');
                          }}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {twoFactorError && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          {twoFactorError}
                        </div>
                      )}

                      {!twoFactorSetup ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </p>
                            <div className="bg-white p-4 rounded-lg inline-block">
                              <img
                                src={twoFactorSetup.qrCodeUrl}
                                alt="2FA QR Code"
                                className="w-48 h-48"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Manual entry key:</p>
                            <code className="text-sm font-sans break-all">{twoFactorSetup.secret}</code>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Enter 6-digit code from your app
                            </label>
                            <input
                              type="text"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              className="w-full px-4 py-2 bg-background border rounded-lg text-center text-2xl tracking-widest font-sans focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              maxLength={6}
                            />
                          </div>

                          <button
                            onClick={handleEnable2FA}
                            disabled={isEnabling2FA || verificationCode.length !== 6}
                            className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isEnabling2FA && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEnabling2FA ? 'Verifying...' : 'Enable 2FA'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Backup Codes Modal */}
                {showBackupCodes && backupCodes.length > 0 && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border rounded-lg p-6 max-w-md w-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Backup Codes</h3>
                        <button
                          onClick={() => setShowBackupCodes(false)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Save these backup codes in a secure location. Each code can only be used once.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {backupCodes.map((code, index) => (
                          <div
                            key={index}
                            className="p-2 bg-muted rounded font-sans text-sm text-center"
                          >
                            {code}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(backupCodes.join('\n'));
                        }}
                        className="w-full py-2 border rounded-lg font-medium hover:bg-accent transition flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy All Codes
                      </button>
                    </div>
                  </div>
                )}

                {/* Disable 2FA Modal */}
                {showDisable2FA && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border rounded-lg p-6 max-w-md w-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Disable Two-Factor Authentication</h3>
                        <button
                          onClick={() => {
                            setShowDisable2FA(false);
                            setDisablePassword('');
                            setTwoFactorError('');
                          }}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Disabling 2FA will make your account less secure. Are you sure?
                          </p>
                        </div>
                      </div>

                      {twoFactorError && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          {twoFactorError}
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                          Enter your password to confirm
                        </label>
                        <input
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder="Your password"
                          className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowDisable2FA(false);
                            setDisablePassword('');
                            setTwoFactorError('');
                          }}
                          className="flex-1 py-2 border rounded-lg font-medium hover:bg-accent transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDisable2FA}
                          disabled={isDisabling2FA || !disablePassword}
                          className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isDisabling2FA && <Loader2 className="w-4 h-4 animate-spin" />}
                          {isDisabling2FA ? 'Disabling...' : 'Disable 2FA'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>

                <div className="space-y-6">
                  {/* Theme */}
                  <div className="p-4 bg-background rounded-lg">
                    <h3 className="font-medium mb-4">Theme</h3>
                    <ThemeToggle variant="buttons" />
                  </div>
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === 'billing' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Billing & Subscription</h2>

                <div className="space-y-6">
                  {/* Current Subscription */}
                  {subscriptionLoading ? (
                    <div className="p-4 bg-background rounded-lg flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : subscription && subscription.tier !== 'free' && isSubscribed ? (
                    <div className={`p-4 rounded-lg border-2 ${
                      getTierColor(subscription.tier) === 'blue' ? 'bg-blue-500/5 border-blue-500/30' :
                      getTierColor(subscription.tier) === 'purple' ? 'bg-purple-500/5 border-purple-500/30' :
                      getTierColor(subscription.tier) === 'amber' ? 'bg-amber-500/5 border-amber-500/30' :
                      'bg-slate-500/5 border-slate-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm text-muted-foreground">Current Plan</p>
                            {subscription.cancelAtPeriodEnd && (
                              <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-600 rounded-full">
                                Cancels Soon
                              </span>
                            )}
                          </div>
                          <p className={`text-2xl font-bold ${
                            getTierColor(subscription.tier) === 'blue' ? 'text-blue-500' :
                            getTierColor(subscription.tier) === 'purple' ? 'text-purple-500' :
                            getTierColor(subscription.tier) === 'amber' ? 'text-amber-500' :
                            'text-slate-500'
                          }`}>
                            {getTierDisplayName(subscription.tier)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {subscription.dailyCredits.toLocaleString()} credits/day
                          </p>
                          {subscription.currentPeriodEnd && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {subscription.cancelAtPeriodEnd ? 'Access until: ' : 'Renews: '}
                              {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={async () => {
                              const url = await openBillingPortal();
                              if (url) window.location.href = url;
                            }}
                            disabled={subscriptionActionLoading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
                          >
                            {subscriptionActionLoading ? 'Loading...' : 'Manage Billing'}
                          </button>
                          {subscription.cancelAtPeriodEnd ? (
                            <button
                              onClick={resumeSubscription}
                              disabled={subscriptionActionLoading}
                              className="px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-500/10 transition disabled:opacity-50"
                            >
                              Resume Subscription
                            </button>
                          ) : (
                            <button
                              onClick={cancelSubscription}
                              disabled={subscriptionActionLoading}
                              className="px-4 py-2 text-sm text-muted-foreground hover:text-red-500 transition disabled:opacity-50"
                            >
                              Cancel Subscription
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Plan</p>
                          <p className="text-xl font-bold">Free</p>
                          <p className="text-sm text-muted-foreground">
                            Upgrade to unlock daily credits and premium features
                          </p>
                        </div>
                        <button
                          onClick={() => router.push('/pricing')}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Credit Balance */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Credit Balance</p>
                        <p className="text-2xl font-bold">{formatCredits(user?.credits ?? 0)} Credits</p>
                      </div>
                      <button
                        onClick={() => router.push('/pricing')}
                        className="px-4 py-2 border rounded-lg hover:bg-accent transition"
                      >
                        Buy Credits
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Payment Methods</h3>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Secure Checkout</p>
                        <p>
                          We use Lemon Squeezy for secure payment processing. Your payment details are handled directly by our payment provider - we never store your card information.
                        </p>
                        <button
                          onClick={() => router.push('/pricing')}
                          className="mt-2 text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Purchase Credits
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Transaction History</h3>
                      {totalTransactions > 5 && (
                        <button
                          onClick={() => router.push('/transactions')}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          View All ({totalTransactions})
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isLoadingTransactions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No transactions yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your credit purchases and usage will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === 'PURCHASE' || tx.type === 'REWARD' || tx.type === 'BONUS' || tx.type === 'REFUND'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {tx.type === 'PURCHASE' || tx.type === 'REWARD' || tx.type === 'BONUS' || tx.type === 'REFUND' ? (
                                  <span className="text-lg font-bold">+</span>
                                ) : (
                                  <span className="text-lg font-bold">-</span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{tx.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <span className={`font-semibold ${
                              tx.type === 'PURCHASE' || tx.type === 'REWARD' || tx.type === 'BONUS' || tx.type === 'REFUND'
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}>
                              {tx.type === 'PURCHASE' || tx.type === 'REWARD' || tx.type === 'BONUS' || tx.type === 'REFUND' ? '+' : '-'}
                              {formatCredits(Math.abs(tx.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
