'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
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
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { cn } from '../../lib/utils';
import { authFetch, clearAuthToken } from '../../lib/api';

// Lazy load PriceTicker
const PriceTicker = dynamic(
  () => import('../../components/common/PriceTicker').then(mod => ({ default: mod.PriceTicker })),
  { ssr: false, loading: () => <div className="w-full h-10 bg-card/50 border-b border-border/50" /> }
);

// Main navigation items
const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analyze', href: '/analyze', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'AI Experts', href: '/ai-expert', icon: Brain },
  { name: 'Pricing', href: '/pricing', icon: Coins },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Alerts', href: '/alerts', icon: Bell },
];

// User menu items (Settings, Admin, Logout)
const userMenuNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Server },
];

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
  image?: string;
  isAdmin?: boolean;
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
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <TraderPathLogo size="md" showText showTagline href="/dashboard" className="hidden sm:flex" />
            <TraderPathLogo size="md" showText={false} href="/dashboard" className="sm:hidden" />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {mainNav.map((item) => (
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

              <ThemeToggle variant="icon" />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    {user?.image ? (
                      <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-primary-foreground" />
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
                    className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ zIndex: 9999 }}
                  >
                    {/* User info */}
                    {user && (
                      <div className="p-3 border-b border-border">
                        <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                className="p-2 rounded-lg hover:bg-accent md:hidden"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden border-t border-border animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="py-3 space-y-1">
                {[...mainNav, ...userMenuNav.filter(item => item.name !== 'Admin' || isAdmin)].map((item) => (
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
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
