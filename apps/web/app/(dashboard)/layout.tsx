'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analyze', href: '/analyze', icon: TrendingUp },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Credits', href: '/credits', icon: Coins },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    // Clear cookie
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Redirect to welcome page
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden"
          >
            <div className="flex items-center justify-between h-16 px-6 border-b border-border">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TradePath</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:bg-card lg:border-r lg:border-border">
        <div className="flex items-center h-16 px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">TradePath</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-background/80 backdrop-blur-sm border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-accent lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block">
            {/* Breadcrumb or page title can go here */}
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle variant="icon" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50"
                    >
                      <div className="p-2">
                        <Link
                          href="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm w-full text-left text-destructive"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
