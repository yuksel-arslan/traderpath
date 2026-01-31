'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  TrendingUp,
  Coins,
  Gift,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  FileText,
  Server,
  Brain,
  TrendingDown,
  BookOpen,
  Calendar,
  Bot,
  Globe,
  Crown,
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { InterfacePreferenceModal } from '../../components/common/InterfacePreferenceModal';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { cn } from '../../lib/utils';
import { authFetch, clearAuthToken } from '../../lib/api';

// Lazy load PriceTicker
const PriceTicker = dynamic(
  () => import('../../components/common/PriceTicker').then(mod => ({ default: mod.PriceTicker })),
  { ssr: false, loading: () => <div className="w-full h-10 bg-card/50 border-b border-border/50" /> }
);

// Direct navigation items (no dropdown)
const directNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Capital Flow', href: '/capital-flow', icon: Globe },
];

// Dropdown navigation groups
const dropdownNav = [
  {
    name: 'Analyze',
    icon: TrendingUp,
    items: [
      { name: 'New Analysis', href: '/analyze', icon: TrendingUp },
      { name: 'Top Coins', href: '/top-coins', icon: Crown },
    ],
  },
  {
    name: 'AI Chat',
    icon: Brain,
    items: [
      { name: 'Concierge', href: '/concierge', icon: Bot },
      { name: 'AI Experts', href: '/ai-expert', icon: Brain },
    ],
  },
  {
    name: 'Tools',
    icon: Settings,
    items: [
      { name: 'History', href: '/reports', icon: FileText },
      { name: 'Scheduled', href: '/scheduled', icon: Calendar },
      { name: 'Alerts', href: '/alerts', icon: Bell },
    ],
  },
];

// End navigation items (after dropdowns)
const endNav = [
  { name: 'Rewards', href: '/rewards', icon: Gift },
];

// All flat items for mobile menu
const allNavItems = [
  ...directNav,
  { name: 'New Analysis', href: '/analyze', icon: TrendingUp },
  { name: 'Top Coins', href: '/top-coins', icon: Crown },
  { name: 'Concierge', href: '/concierge', icon: Bot },
  { name: 'AI Experts', href: '/ai-expert', icon: Brain },
  { name: 'History', href: '/reports', icon: FileText },
  { name: 'Scheduled', href: '/scheduled', icon: Calendar },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  ...endNav,
];

// User menu items (Settings, Admin, Logout)
const userMenuNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Server },
];

// NavDropdown Component for grouped navigation
function NavDropdown({
  name,
  icon: Icon,
  items,
  isActive,
}: {
  name: string;
  icon: any;
  items: { name: string; href: string; icon: any }[];
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasActiveItem = items.some((item) => isActive(item.href));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          hasActiveItem
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        {name}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
          <div className="p-1">
            {items.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Alert type for notifications
interface PriceAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below';
  price: number;
  triggered: boolean;
  createdAt: string;
}

// User type
interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  level?: number;
  isAdmin?: boolean;
  preferredInterface?: 'ui' | 'concierge' | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);

  // Fetch user info with React Query
  const { data: user } = useQuery<UserInfo | null>({
    queryKey: ['user-info'],
    queryFn: async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            return data.data.user || data.data;
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user info rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    retry: false,
  });

  // Get admin status from user
  const isAdmin = user?.isAdmin || false;

  // Show preference modal on every new session (login)
  useEffect(() => {
    if (!user) return;

    // Check if preference modal was already shown in this session
    const preferenceShownThisSession = sessionStorage.getItem('preferenceModalShown');

    if (!preferenceShownThisSession) {
      // Show modal on new session
      setShowPreferenceModal(true);
    }
  }, [user]);

  // Handle preference selection
  const handlePreferenceSelect = async (preference: 'ui' | 'concierge') => {
    try {
      const res = await authFetch('/api/user/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredInterface: preference }),
      });

      if (res.ok) {
        // Mark as shown for this session
        sessionStorage.setItem('preferenceModalShown', 'true');
        setShowPreferenceModal(false);

        // Redirect based on selection
        if (preference === 'concierge') {
          router.push('/concierge');
        } else {
          router.push('/analyze');
        }
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };

  // Fetch alerts only when notification menu is open (no background polling)
  const { data: alertsData } = useQuery<PriceAlert[]>({
    queryKey: ['alerts-notifications'],
    queryFn: async () => {
      const res = await authFetch('/api/alerts');
      if (!res.ok) return [];
      const result = await res.json();
      const data = result.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    enabled: notificationMenuOpen, // Only fetch when dropdown is open
    refetchOnMount: false,
    retry: false,
  });

  // Ensure alerts is always an array
  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const triggeredAlerts = alerts.filter((a: PriceAlert) => a.triggered);
  const activeAlerts = alerts.filter((a: PriceAlert) => !a.triggered);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      clearAuthToken();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* Price Ticker */}
      <PriceTicker />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
        <div className="w-full px-1 sm:px-3 lg:px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <TraderPathLogo size="sm" showText={true} showTagline={false} href="/dashboard" className="flex sm:hidden" />
            <TraderPathLogo size="md" showText={true} showTagline={true} href="/dashboard" className="hidden sm:flex" />

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Direct nav items */}
              {directNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {item.name}
                </Link>
              ))}

              {/* Dropdown nav groups */}
              {dropdownNav.map((group) => (
                <NavDropdown
                  key={group.name}
                  name={group.name}
                  icon={group.icon}
                  items={group.items}
                  isActive={isActive}
                />
              ))}

              {/* End nav items */}
              {endNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
                  className="relative p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {(triggeredAlerts.length > 0 || activeAlerts.length > 0) && (
                    <span className={cn(
                      "absolute -top-0.5 -right-0.5 w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center",
                      triggeredAlerts.length > 0
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-primary text-primary-foreground"
                    )}>
                      {triggeredAlerts.length > 0 ? triggeredAlerts.length : activeAlerts.length}
                    </span>
                  )}
                </button>

                {notificationMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0"
                      style={{ zIndex: 9998 }}
                      onClick={() => setNotificationMenuOpen(false)}
                    />
                    <div
                      className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                      style={{ zIndex: 9999 }}
                    >
                      <div className="p-3 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        <Link
                          href="/alerts"
                          onClick={() => setNotificationMenuOpen(false)}
                          className="text-xs text-primary hover:underline"
                        >
                          View All
                        </Link>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {alerts.length === 0 ? (
                          <div className="p-6 text-center">
                            <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No alerts yet</p>
                            <Link
                              href="/alerts"
                              onClick={() => setNotificationMenuOpen(false)}
                              className="text-xs text-primary hover:underline mt-1 inline-block"
                            >
                              Create your first alert
                            </Link>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {triggeredAlerts.length > 0 && (
                              <div className="p-2">
                                <p className="text-xs font-semibold text-amber-500 px-2 py-1">TRIGGERED</p>
                                {triggeredAlerts.slice(0, 3).map((alert: PriceAlert) => (
                                  <Link
                                    key={alert.id}
                                    href="/alerts"
                                    onClick={() => setNotificationMenuOpen(false)}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                                  >
                                    <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center">
                                      {alert.type === 'above' ? (
                                        <TrendingUp className="w-4 h-4 text-amber-500" />
                                      ) : (
                                        <TrendingDown className="w-4 h-4 text-amber-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{alert.symbol}/USDT</p>
                                      <p className="text-xs text-muted-foreground">
                                        {alert.type === 'above' ? 'Above' : 'Below'} ${alert.price.toLocaleString()}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}

                            {activeAlerts.length > 0 && (
                              <div className="p-2">
                                <p className="text-xs font-semibold text-muted-foreground px-2 py-1">ACTIVE ALERTS</p>
                                {activeAlerts.slice(0, 3).map((alert: PriceAlert) => (
                                  <Link
                                    key={alert.id}
                                    href="/alerts"
                                    onClick={() => setNotificationMenuOpen(false)}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                                  >
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center",
                                      alert.type === 'above' ? "bg-green-500/10" : "bg-red-500/10"
                                    )}>
                                      {alert.type === 'above' ? (
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{alert.symbol}/USDT</p>
                                      <p className="text-xs text-muted-foreground">
                                        {alert.type === 'above' ? 'Above' : 'Below'} ${alert.price.toLocaleString()}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {alerts.length > 0 && (
                        <div className="p-2 border-t border-border">
                          <Link
                            href="/alerts"
                            onClick={() => setNotificationMenuOpen(false)}
                            className="flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                          >
                            <Bell className="w-4 h-4" />
                            Manage All Alerts
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <LanguageSelector compact />
              <ThemeToggle variant="icon" />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-brand-teal to-brand-coral rounded-full flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform hidden sm:block",
                    userMenuOpen && "rotate-180"
                  )} />
                </button>

                {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0"
                    style={{ zIndex: 9998 }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ zIndex: 9999 }}
                  >
                    {/* User info */}
                    {user && (
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-brand-teal to-brand-coral rounded-full flex items-center justify-center overflow-hidden shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            <p className="text-xs text-primary font-medium mt-0.5">
                              {user.isAdmin ? 'Admin' : user.level && user.level >= 10 ? 'Pro Trader' : user.level && user.level >= 5 ? 'Trader' : 'Beginner'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Settings & Admin (Admin only visible for admins) */}
                    <div className="p-2 border-b border-border">
                      {userMenuNav
                        .filter(item => item.name !== 'Admin' || isAdmin)
                        .map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          prefetch={true}
                          onClick={() => setUserMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive(item.href)
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-accent'
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-accent lg:hidden"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="lg:hidden border-t border-border animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="py-3 space-y-1">
                {[...allNavItems, ...userMenuNav.filter(item => item.name !== 'Admin' || isAdmin)].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ))}
                {/* Language Selector in Mobile Menu */}
                <div className="px-3 py-2.5 border-t border-border mt-2 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Language</span>
                    <LanguageSelector />
                  </div>
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TraderPath. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/methodology" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </footer>

      {/* Interface Preference Modal - shown to new users */}
      <InterfacePreferenceModal
        isOpen={showPreferenceModal}
        onClose={() => {
          sessionStorage.setItem('preferenceModalShown', 'true');
          setShowPreferenceModal(false);
        }}
        onSelect={handlePreferenceSelect}
      />
    </div>
  );
}
