'use client';

import { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    priceAlerts: true,
    marketing: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportValidityPeriods, setReportValidityPeriods] = useState(50);
  const [isSavingReportSettings, setIsSavingReportSettings] = useState(false);

  // Fetch user settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch('/api/user/settings', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.reportValidityPeriods) {
            setReportValidityPeriods(data.data.reportValidityPeriods);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('TRADE-ABC123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reportValidityPeriods }),
      });
    } catch (error) {
      console.error('Failed to save report settings:', error);
    } finally {
      setIsSavingReportSettings(false);
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
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition">
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

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    JD
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition">
                      Change Avatar
                    </button>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <input
                        type="text"
                        defaultValue="John"
                        className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <input
                        type="text"
                        defaultValue="Doe"
                        className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue="john@example.com"
                      className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Referral Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value="TRADE-ABC123"
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

                  <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  {[
                    {
                      id: 'email',
                      label: 'Email Notifications',
                      description: 'Receive important updates via email',
                      icon: Mail,
                    },
                    {
                      id: 'push',
                      label: 'Push Notifications',
                      description: 'Get real-time alerts on your device',
                      icon: Smartphone,
                    },
                    {
                      id: 'priceAlerts',
                      label: 'Price Alerts',
                      description: 'Get notified when prices hit your targets',
                      icon: Bell,
                    },
                    {
                      id: 'marketing',
                      label: 'Marketing Emails',
                      description: 'Receive news, updates and special offers',
                      icon: Globe,
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
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
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
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                        Update Password
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Auth */}
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button className="px-4 py-2 border rounded-lg hover:bg-accent transition">
                        Enable
                      </button>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="p-4 bg-background rounded-lg">
                    <h3 className="font-medium mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Chrome on Windows</p>
                            <p className="text-sm text-muted-foreground">
                              Current session
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
                        <p className="text-2xl font-bold">156 Credits</p>
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
