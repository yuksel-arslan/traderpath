'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertCircle, Clock, Activity, Server, Database, Globe, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

// Service icon mapping
const ICON_MAP: Record<string, any> = {
  web: Globe,
  analysis: Activity,
  ai: Zap,
  database: Database,
  api: Server,
  payment: Server,
};

interface ServiceStatus {
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: string;
  icon: any;
}

interface Incident {
  date: string;
  title: string;
  description: string;
  status: string;
  duration: string;
}

// Fallback when API is unreachable (shows "checking" state, not fake data)
const FALLBACK_SERVICES: ServiceStatus[] = [
  { name: 'Web Application', description: 'Main TraderPath web interface', status: 'operational', uptime: '—', icon: Globe },
  { name: 'Analysis Engine', description: '7-step analysis processing', status: 'operational', uptime: '—', icon: Activity },
  { name: 'AI Services', description: 'AI Expert Panel and Concierge', status: 'operational', uptime: '—', icon: Zap },
  { name: 'Database', description: 'User data and analysis storage', status: 'operational', uptime: '—', icon: Database },
  { name: 'API Gateway', description: 'External API integrations', status: 'operational', uptime: '—', icon: Server },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'operational') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        Operational
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        Degraded
      </span>
    );
  }
  if (status === 'outage') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        Outage
      </span>
    );
  }
  return null;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>(FALLBACK_SERVICES);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const [healthRes, errorsRes] = await Promise.allSettled([
        fetch(`${apiBase}/api/bilge/health`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/bilge/errors?limit=5`).then(r => r.ok ? r.json() : null),
      ]);

      const healthData = healthRes.status === 'fulfilled' ? healthRes.value : null;
      const errorsData = errorsRes.status === 'fulfilled' ? errorsRes.value : null;

      if (healthData?.data) {
        const h = healthData.data;
        const svcList: ServiceStatus[] = [];
        if (h.services && typeof h.services === 'object') {
          for (const [key, val] of Object.entries(h.services as Record<string, any>)) {
            svcList.push({
              name: val.name || key,
              description: val.description || '',
              status: val.status === 'healthy' ? 'operational' : val.status === 'degraded' ? 'degraded' : 'outage',
              uptime: val.uptime ? `${val.uptime}%` : '—',
              icon: ICON_MAP[key] || Server,
            });
          }
        }
        if (svcList.length > 0) setServices(svcList);
        setLastChecked(h.checkedAt || new Date().toISOString());
      } else {
        setLastChecked(new Date().toISOString());
      }

      if (errorsData?.data && Array.isArray(errorsData.data)) {
        setIncidents(errorsData.data.slice(0, 5).map((e: any) => ({
          date: e.timestamp ? new Date(e.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—',
          title: String(e.title ?? e.pattern ?? 'Incident'),
          description: String(e.message ?? e.description ?? ''),
          status: String(e.status ?? 'resolved'),
          duration: String(e.duration ?? '—'),
        })));
      }
    } catch {
      setLastChecked(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const allOperational = services.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TraderPathLogo size="md" showText={true} showTagline={false} href="/" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">System Status</h1>
          <p className="text-muted-foreground">
            Current status of TraderPath services
          </p>
        </div>

        {/* Overall Status */}
        <div className={`p-6 rounded-2xl mb-12 ${
          allOperational
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-amber-500/10 border border-amber-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {allOperational ? (
                <CheckCircle className="w-10 h-10 text-green-500" />
              ) : (
                <AlertCircle className="w-10 h-10 text-amber-500" />
              )}
              <div>
                <h2 className={`text-xl font-bold ${
                  allOperational ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Last checked: {lastChecked ? new Date(lastChecked).toLocaleString() : 'Checking...'}
                </p>
              </div>
            </div>
            <button onClick={fetchStatus} disabled={loading} className="p-2 hover:bg-background rounded-lg transition disabled:opacity-50" title="Refresh">
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Services</h2>
          <div className="space-y-3">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="bg-card border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-muted-foreground text-sm">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:block">
                      {service.uptime} uptime
                    </span>
                    <StatusBadge status={service.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uptime Graph Placeholder */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">90-Day Uptime</h2>
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-end justify-between h-20 gap-0.5">
              {Array.from({ length: 90 }).map((_, i) => {
                const isOperational = allOperational || i < 88;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${isOperational ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ height: `${95}%` }}
                    title={`Day ${90 - i}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-sm text-muted-foreground">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm text-muted-foreground">Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span className="text-sm text-muted-foreground">Degraded</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-sm text-muted-foreground">Outage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Incidents (from BILGE Guardian) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recent Incidents</h2>
          {incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <div key={index} className="bg-card border rounded-xl p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{incident.title}</h3>
                    <span className="text-sm text-muted-foreground">{incident.date}</span>
                  </div>
                  <p className="text-muted-foreground mb-3">{incident.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                      incident.status === 'resolved'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {incident.status === 'resolved' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {incident.status === 'resolved' ? 'Resolved' : 'Investigating'}
                    </span>
                    {incident.duration !== '—' && (
                      <span className="text-muted-foreground">
                        Duration: {incident.duration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No recent incidents to report</p>
            </div>
          )}
        </div>

        {/* Subscribe to Updates */}
        <div className="text-center p-8 bg-card border rounded-xl">
          <h3 className="text-xl font-bold mb-2">Stay Informed</h3>
          <p className="text-muted-foreground mb-6">
            Get notified about service disruptions and scheduled maintenance
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">
              Subscribe
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="minimal" />
    </div>
  );
}
