'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertCircle, Clock, Activity, Server, Database, Globe, Zap, RefreshCw } from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

const SERVICES = [
  {
    name: 'Web Application',
    description: 'Main TraderPath web interface',
    status: 'operational',
    uptime: '99.99%',
    icon: Globe,
  },
  {
    name: 'Analysis Engine',
    description: '7-step analysis processing',
    status: 'operational',
    uptime: '99.95%',
    icon: Activity,
  },
  {
    name: 'AI Services',
    description: 'AI Expert Panel and Concierge',
    status: 'operational',
    uptime: '99.90%',
    icon: Zap,
  },
  {
    name: 'Database',
    description: 'User data and analysis storage',
    status: 'operational',
    uptime: '99.99%',
    icon: Database,
  },
  {
    name: 'API Gateway',
    description: 'External API integrations',
    status: 'operational',
    uptime: '99.95%',
    icon: Server,
  },
  {
    name: 'Payment Processing',
    description: 'Stripe payment integration',
    status: 'operational',
    uptime: '99.99%',
    icon: Server,
  },
];

const RECENT_INCIDENTS = [
  {
    date: 'January 20, 2026',
    title: 'Scheduled Maintenance Completed',
    description: 'Database optimization and performance improvements were successfully completed.',
    status: 'resolved',
    duration: '30 minutes',
  },
  {
    date: 'January 15, 2026',
    title: 'AI Service Degradation',
    description: 'Some users experienced slower response times from AI Expert services. Issue was identified and resolved.',
    status: 'resolved',
    duration: '45 minutes',
  },
  {
    date: 'January 10, 2026',
    title: 'API Rate Limiting Adjustment',
    description: 'Implemented improved rate limiting to ensure fair usage during high traffic periods.',
    status: 'resolved',
    duration: 'N/A',
  },
];

const SCHEDULED_MAINTENANCE = [
  {
    date: 'February 1, 2026',
    time: '02:00 - 04:00 UTC',
    description: 'Infrastructure upgrade for improved performance',
    impact: 'Minimal - Some features may be temporarily unavailable',
  },
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
  const allOperational = SERVICES.every((s) => s.status === 'operational');

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
                  Last checked: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <button className="p-2 hover:bg-background rounded-lg transition" title="Refresh">
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Services</h2>
          <div className="space-y-3">
            {SERVICES.map((service, index) => {
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
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    Math.random() > 0.02 ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ height: `${85 + Math.random() * 15}%` }}
                  title={`Day ${i + 1}`}
                />
              ))}
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

        {/* Scheduled Maintenance */}
        {SCHEDULED_MAINTENANCE.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Scheduled Maintenance</h2>
            <div className="space-y-4">
              {SCHEDULED_MAINTENANCE.map((maintenance, index) => (
                <div
                  key={index}
                  className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <Clock className="w-6 h-6 text-blue-500 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{maintenance.date}</h3>
                        <span className="text-sm text-muted-foreground">
                          {maintenance.time}
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-2">{maintenance.description}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Expected impact: {maintenance.impact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Incidents */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recent Incidents</h2>
          {RECENT_INCIDENTS.length > 0 ? (
            <div className="space-y-4">
              {RECENT_INCIDENTS.map((incident, index) => (
                <div key={index} className="bg-card border rounded-xl p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{incident.title}</h3>
                    <span className="text-sm text-muted-foreground">{incident.date}</span>
                  </div>
                  <p className="text-muted-foreground mb-3">{incident.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Resolved
                    </span>
                    {incident.duration !== 'N/A' && (
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
