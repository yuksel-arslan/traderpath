'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Key,
  Eye,
  EyeOff,
  Check,
  Copy
} from 'lucide-react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    priceAlerts: true,
    marketing: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('TRADE-ABC123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

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
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setDarkMode(false)}
                        className={`p-4 rounded-lg border-2 transition ${
                          !darkMode
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Sun className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                        <p className="font-medium">Light</p>
                      </button>
                      <button
                        onClick={() => setDarkMode(true)}
                        className={`p-4 rounded-lg border-2 transition ${
                          darkMode
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Moon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="font-medium">Dark</p>
                      </button>
                    </div>
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
