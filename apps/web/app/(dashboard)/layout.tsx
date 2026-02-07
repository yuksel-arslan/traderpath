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
  Server,
  Brain,
  BookOpen,
  Calendar,
  Bot,
  Globe,
  Activity,
  Compass,
  FileText,
  Sparkles,
  Inbox,
  ShieldAlert,
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
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
  { name: 'Intelligence', href: '/intelligence', icon: Sparkles },
  { name: 'Analyze', href: '/analyze', icon: TrendingUp },
  { name: 'Report', href: '/report', icon: FileText },
];

// Dropdown navigation groups
const dropdownNav = [
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
      { name: 'Notifications', href: '/notifications', icon: Inbox },
      { name: 'Signals', href: '/signals', icon: Activity },
      { name: 'Scheduled', href: '/scheduled', icon: Calendar },
      { name: 'Alerts', href: '/alerts', icon: Bell },
      { name: 'Smart Alerts', href: '/alerts/smart', icon: ShieldAlert },
    ],
  },
];

// End navigation items (after dropdowns)
const endNav = [
  { name: 'Trader Program', href: '/rewards', icon: Gift },
  { name: 'Profile', href: '/profile', icon: User },
];

// User menu items (Settings, Admin, Logout)
const userMenuNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Server },
];

// NavDropdown Component for grouped navigation (Desktop)
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

// MobileNavGroup Component for collapsible groups (Mobile)
function MobileNavGroup({
  name,
  icon: Icon,
  items,
  isActive,
  onItemClick,
}: {
  name: string;
  icon: any;
  items: { name: string; href: string; icon: any }[];
  isActive: (href: string) => boolean;
  onItemClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveItem = items.some((item) => isActive(item.href));

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          hasActiveItem
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="w-4 h-4" />
          {name}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="ml-7 mt-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={onItemClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
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
      )}
    </div>
  );
}

// User type
interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  level?: number;
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
  const { data: user, isLoading: isUserLoading } = useQuery<UserInfo | null>({
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

  // Redirect to login if user is not authenticated (safety net beyond middleware)
  useEffect(() => {
    if (!isUserLoading && user === null) {
      // Clear any stale cookies
      document.cookie = 'auth-session=; path=/; max-age=0';
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Get admin status from user
  const isAdmin = user?.isAdmin || false;

  // Fetch notification unread count (lightweight, always fetched)
  const { data: unreadCountData } = useQuery<{ total: number }>({
    queryKey: ['notification-unread-counts'],
    queryFn: async () => {
      const res = await authFetch('/api/notifications/unread-count');
      if (!res.ok) return { total: 0 };
      const json = await res.json();
      return json.data || { total: 0 };
    },
    staleTime: 60_000,
    retry: false,
  });

  const totalUnread = unreadCountData?.total ?? 0;

  // Fetch recent notifications only when dropdown is open
  const { data: recentNotifications } = useQuery<{ id: string; type: string; title: string; message: string; read: boolean; createdAt: string }[]>({
    queryKey: ['notifications-dropdown'],
    queryFn: async () => {
      const res = await authFetch('/api/notifications?limit=5');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.notifications || [];
    },
    staleTime: 30_000,
    enabled: notificationMenuOpen,
    retry: false,
  });

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
                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center bg-primary text-primary-foreground animate-pulse">
                      {totalUnread > 9 ? '9+' : totalUnread}
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
                          href="/notifications"
                          onClick={() => setNotificationMenuOpen(false)}
                          className="text-xs text-primary hover:underline"
                        >
                          View All
                        </Link>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {(!recentNotifications || recentNotifications.length === 0) ? (
                          <div className="p-6 text-center">
                            <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {recentNotifications.map((n) => (
                              <Link
                                key={n.id}
                                href="/notifications"
                                onClick={() => setNotificationMenuOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 p-3 hover:bg-accent transition-colors",
                                  !n.read && "bg-primary/5"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                  n.type === 'BRIEFING' ? 'bg-amber-500/10' :
                                  n.type === 'ALERT' ? 'bg-red-500/10' :
                                  n.type === 'SIGNAL' ? 'bg-teal-500/10' :
                                  n.type === 'REWARD' ? 'bg-purple-500/10' :
                                  'bg-blue-500/10'
                                )}>
                                  <Bell className={cn(
                                    "w-4 h-4",
                                    n.type === 'BRIEFING' ? 'text-amber-500' :
                                    n.type === 'ALERT' ? 'text-red-500' :
                                    n.type === 'SIGNAL' ? 'text-teal-500' :
                                    n.type === 'REWARD' ? 'text-purple-500' :
                                    'text-blue-500'
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm truncate", !n.read ? "font-semibold" : "font-medium text-muted-foreground")}>{n.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                                </div>
                                {!n.read && <div className="w-2 h-2 rounded-full bg-[#5EEDC3] shrink-0" />}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-2 border-t border-border">
                        <Link
                          href="/notifications"
                          onClick={() => setNotificationMenuOpen(false)}
                          className="flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                        >
                          <Bell className="w-4 h-4" />
                          View All Notifications
                        </Link>
                      </div>
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
                {/* Direct nav items */}
                {directNav.map((item) => (
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

                {/* Collapsible groups (synced with header dropdowns) */}
                {dropdownNav.map((group) => (
                  <MobileNavGroup
                    key={group.name}
                    name={group.name}
                    icon={group.icon}
                    items={group.items}
                    isActive={isActive}
                    onItemClick={() => setMobileMenuOpen(false)}
                  />
                ))}

                {/* End nav items */}
                {endNav.map((item) => (
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

                {/* Divider */}
                <div className="border-t border-border my-2" />

                {/* User menu items (Settings, Admin) */}
                {userMenuNav
                  .filter(item => item.name !== 'Admin' || isAdmin)
                  .map((item) => (
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

                {/* Language Selector */}
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

    </div>
  );
}
