'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
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
} from 'lucide-react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { authFetch } from '../../../lib/api';

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

export default function SettingsPage() {
  const router = useRouter();
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

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Fetch user profile and settings on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const userResponse = await authFetch('/api/auth/me');

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.data) {
            // Combine user and credits data
            const profileData: UserProfile = {
              ...userData.data.user,
              credits: userData.data.credits?.balance ?? 0,
            };
            setUser(profileData);
          }
        } else if (userResponse.status === 401) {
          // Token expired or invalid - middleware will handle redirect
          setIsLoadingUser(false);
          return;
        }

        // Fetch settings
        const settingsResponse = await authFetch('/api/user/settings');

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.success && settingsData.data.reportValidityPeriods) {
            setReportValidityPeriods(settingsData.data.reportValidityPeriods);
          }
        }

        // Fetch notification/webhook settings
        const alertSettingsResponse = await authFetch('/api/alerts/settings');

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

        // Fetch 2FA status
        try {
          const twoFactorResponse = await authFetch('/api/auth/2fa/status');
          if (twoFactorResponse.ok) {
            const twoFactorData = await twoFactorResponse.json();
            if (twoFactorData.success) {
              setTwoFactorEnabled(twoFactorData.data?.enabled || false);
            }
          }
        } catch {
          console.log('2FA status not available');
        } finally {
          setTwoFactorLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoadingUser(false);
        setTwoFactorLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {section.label}
                </button>
              );
            })}
            <hr className="my-4" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
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
                      <div>
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition">
                          Change Avatar
                        </button>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPG, PNG or GIF. Max 2MB.
                        </p>
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
                            defaultValue={getFirstName(user.name)}
                            placeholder="Enter first name"
                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Last Name</label>
                          <input
                            type="text"
                            defaultValue={getLastName(user.name)}
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
                            className="flex-1 px-4 py-2 bg-background border rounded-lg font-mono"
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
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-background rounded-lg">
                          <p className="text-2xl font-bold text-primary">{user.level}</p>
                          <p className="text-sm text-muted-foreground">Level</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <p className="text-2xl font-bold text-primary">{user.credits}</p>
                          <p className="text-sm text-muted-foreground">Credits</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <p className="text-2xl font-bold text-primary">{user.streakDays}</p>
                          <p className="text-sm text-muted-foreground">Day Streak</p>
                        </div>
                      </div>

                      <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                        Save Changes
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

                  <div className="space-y-4">
                    {[
                      {
                        id: 'push',
                        label: 'Browser Push Notifications',
                        description: 'Get real-time alerts in your browser',
                        icon: Smartphone,
                      },
                      {
                        id: 'priceAlerts',
                        label: 'Price Alerts',
                        description: 'Get notified when prices hit your targets',
                        icon: Bell,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-background rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent rounded-full">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setNotifications({
                                ...notifications,
                                [item.id]: !notifications[item.id as keyof typeof notifications],
                              })
                            }
                            className={`w-12 h-6 rounded-full transition-colors ${
                              notifications[item.id as keyof typeof notifications]
                                ? 'bg-primary'
                                : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                notifications[item.id as keyof typeof notifications]
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
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
                            <code className="text-sm font-mono break-all">{twoFactorSetup.secret}</code>
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
                              className="w-full px-4 py-2 bg-background border rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
                            className="p-2 bg-muted rounded font-mono text-sm text-center"
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
                  <div>
                    <h3 className="font-medium mb-4">Theme</h3>
                    <ThemeToggle variant="buttons" />
                  </div>

                  {/* Language */}
                  <div>
                    <h3 className="font-medium mb-4">Language</h3>
                    <select className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                      <option value="en">English</option>
                      <option value="tr">Türkçe</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === 'billing' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Billing & Subscription</h2>

                <div className="space-y-6">
                  {/* Current Plan */}
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <p className="text-xl font-bold">Free Tier</p>
                        <p className="text-sm text-muted-foreground">
                          5 free analyses per day
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                        Upgrade
                      </button>
                    </div>
                  </div>

                  {/* Credit Balance */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Credit Balance</p>
                        <p className="text-2xl font-bold">{user?.credits ?? 0} Credits</p>
                      </div>
                      <button className="px-4 py-2 border rounded-lg hover:bg-accent transition">
                        Buy Credits
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Payment Methods</h3>
                      <button className="text-sm text-primary hover:underline">
                        Add New
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No payment methods added yet
                    </p>
                  </div>

                  {/* Transaction History */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Transaction History</h3>
                      <button className="text-sm text-primary hover:underline flex items-center gap-1">
                        View All
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No transactions yet
                    </p>
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
