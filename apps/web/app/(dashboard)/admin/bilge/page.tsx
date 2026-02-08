'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Bug,
  Lightbulb,
  MessageSquare,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Check,
  X,
  Send,
  Zap,
  Server,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';

// Types
interface GuardianHealth {
  project: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    errorsLast24h: number;
    criticalErrorsLast24h: number;
    avgResponseTime: number;
    uptime: number;
    pendingFeedback: number;
  };
  activeIssues: number;
  lastCheck: string;
  nextCheck: string;
}

interface CollectedError {
  id: string;
  timestamp: string;
  project: string;
  message: string;
  stack?: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  patternId?: string;
  isRecurring: boolean;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  suggestedFix: string;
  matchCount: number;
  lastMatched?: string;
}

interface UserFeedback {
  id: string;
  project: string;
  userId: string;
  userEmail: string;
  category: string;
  message: string;
  status: string;
  bilgeAnalysis?: {
    sentiment: string;
    priority: string;
    suggestedAction: string;
    suggestedResponse: string;
  };
  adminResponse?: {
    respondedBy: string;
    respondedAt: string;
    response: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface InnovationIdea {
  id: string;
  project: string;
  title: string;
  description: string;
  rationale: string;
  source: string;
  status: string;
  technicalDetails?: {
    estimatedEffort: string;
    complexity: string;
  };
  impact?: {
    userBenefit: string;
    businessValue: string;
  };
  createdAt: string;
}

interface WeeklyReport {
  id: string;
  project: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  summary: {
    totalErrors: number;
    criticalErrors: number;
    resolvedErrors: number;
    avgResponseTime: number;
    uptime: number;
  };
  topIssues: Array<{
    patternId: string;
    patternName: string;
    count: number;
    severity: string;
  }>;
  trends: {
    errorTrend: 'increasing' | 'stable' | 'decreasing';
    comparedToLastWeek: number;
    mostAffectedEndpoint?: string;
  };
  recommendations: string[];
}

export default function BilgeAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'errors' | 'patterns' | 'feedback' | 'ideas' | 'reports'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [health, setHealth] = useState<GuardianHealth | null>(null);
  const [errors, setErrors] = useState<CollectedError[]>([]);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [ideas, setIdeas] = useState<InnovationIdea[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedError, setSelectedError] = useState<CollectedError | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const dashboardRes = await authFetch('/api/bilge/dashboard');

      if (dashboardRes.status === 403) {
        setError('Admin access required');
        return;
      }

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        if (data.success) {
          setHealth(data.data.health);
          setErrors(data.data.recentErrors || []);
          setPatterns(data.data.patterns || []);
          setFeedbacks(data.data.pendingFeedback || []);
          setIdeas(data.data.proposedIdeas || []);
        }
      }
    } catch (err) {
      setError('Failed to fetch BILGE data');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchErrors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await authFetch(`/api/bilge/errors?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setErrors(data.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [severityFilter, statusFilter]);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await authFetch('/api/bilge/feedback?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedbacks(data.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await authFetch('/api/bilge/ideas?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIdeas(data.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchWeeklyReport = useCallback(async () => {
    try {
      const res = await authFetch('/api/bilge/reports/weekly');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWeeklyReport(data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(), 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'errors') fetchErrors();
    if (activeTab === 'feedback') fetchFeedbacks();
    if (activeTab === 'ideas') fetchIdeas();
    if (activeTab === 'reports') fetchWeeklyReport();
  }, [activeTab, fetchErrors, fetchFeedbacks, fetchIdeas, fetchWeeklyReport]);

  const handleResolveError = async (errorId: string, resolution: string) => {
    try {
      const res = await authFetch(`/api/bilge/errors/${errorId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution }),
      });

      if (res.ok) {
        fetchErrors();
        setSelectedError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondToFeedback = async (feedbackId: string) => {
    if (!responseText.trim()) return;

    setIsResponding(true);
    try {
      const res = await authFetch(`/api/bilge/feedback/${feedbackId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: responseText }),
      });

      if (res.ok) {
        fetchFeedbacks();
        setSelectedFeedback(null);
        setResponseText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResponding(false);
    }
  };

  const handleApproveFeedback = async (feedbackId: string) => {
    try {
      const res = await authFetch(`/api/bilge/feedback/${feedbackId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectFeedback = async (feedbackId: string) => {
    try {
      const res = await authFetch(`/api/bilge/feedback/${feedbackId}/reject`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateIdea = async () => {
    try {
      const res = await authFetch('/api/bilge/ideas/generate', {
        method: 'POST',
        body: JSON.stringify({
          source: 'manual',
          context: 'Generate an innovative feature idea based on current platform capabilities and user needs.',
        }),
      });

      if (res.ok) {
        fetchIdeas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'new':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'investigating':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'resolved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'ignored':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#40E0D0]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Admin
            </Link>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-[#40E0D0] text-4xl" style={{ textShadow: '0 0 20px rgba(64, 224, 208, 0.5)' }}>
              &#9672;
            </span>
            <span
              className="font-serif"
              style={{
                background: 'linear-gradient(135deg, #40E0D0, #00FFFF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BILGE Guardian
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">AI Development Architect & Operations Guardian</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[#40E0D0] text-black rounded-lg hover:bg-[#40E0D0]/90 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'errors', label: 'Errors', icon: Bug },
          { id: 'patterns', label: 'Patterns', icon: Shield },
          { id: 'feedback', label: 'Feedback', icon: MessageSquare },
          { id: 'ideas', label: 'Ideas', icon: Lightbulb },
          { id: 'reports', label: 'Weekly Report', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#40E0D0] text-[#40E0D0]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {/* Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className={`p-4 rounded-lg border ${getStatusColor(health?.status || 'unknown')}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Guardian Status</span>
                {getStatusIcon(health?.status || 'unknown')}
              </div>
              <p className="text-2xl font-bold capitalize">{health?.status || 'Unknown'}</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Errors (24h)</span>
                <Bug className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{health?.metrics.errorsLast24h || 0}</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Critical (24h)</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-500">{health?.metrics.criticalErrorsLast24h || 0}</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Active Issues</span>
                <Activity className="w-4 h-4 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold">{health?.activeIssues || 0}</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Uptime</span>
                <Server className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{health?.metrics.uptime || 99.9}%</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Pending Feedback</span>
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{feedbacks.length}</p>
            </div>
          </div>

          {/* Recent Errors & Top Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Errors */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bug className="w-5 h-5 text-orange-500" />
                Recent Errors
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {errors.slice(0, 10).map((err) => (
                  <div
                    key={err.id}
                    className="p-3 bg-background border rounded-lg hover:bg-accent/50 cursor-pointer transition"
                    onClick={() => setSelectedError(err)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(err.severity)}`}>
                        {err.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(err.lastSeen).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{err.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(err.status)}`}>
                        {err.status}
                      </span>
                      {err.occurrenceCount > 1 && (
                        <span className="text-xs text-muted-foreground">
                          x{err.occurrenceCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {errors.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No errors recorded</p>
                )}
              </div>
            </div>

            {/* Top Patterns */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#40E0D0]" />
                Error Patterns
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {patterns.map((pattern) => (
                  <div key={pattern.id} className="p-3 bg-background border rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{pattern.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(pattern.severity)}`}>
                        {pattern.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{pattern.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Matched: <span className="font-mono">{pattern.matchCount}</span> times
                      </span>
                      {pattern.lastMatched && (
                        <span className="text-muted-foreground">
                          Last: {new Date(pattern.lastMatched).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Feedback & Innovation Ideas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Feedback */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Pending Feedback
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {feedbacks.filter((f) => f.status === 'new').slice(0, 5).map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-3 bg-background border rounded-lg hover:bg-accent/50 cursor-pointer transition"
                    onClick={() => setSelectedFeedback(feedback)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-500 rounded">
                        {feedback.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm truncate">{feedback.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{feedback.userEmail}</p>
                  </div>
                ))}
                {feedbacks.filter((f) => f.status === 'new').length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No pending feedback</p>
                )}
              </div>
            </div>

            {/* Innovation Ideas */}
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Innovation Ideas
                </h3>
                <button
                  onClick={handleGenerateIdea}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition"
                >
                  <Zap className="w-4 h-4" />
                  Generate
                </button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {ideas.slice(0, 5).map((idea) => (
                  <div key={idea.id} className="p-3 bg-background border rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{idea.title}</span>
                      <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-500 rounded">
                        {idea.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{idea.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{idea.source.replace('_', ' ')}</span>
                      {idea.technicalDetails?.complexity && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{idea.technicalDetails.complexity} complexity</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {ideas.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No ideas yet</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent outline-none"
              />
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent outline-none"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent outline-none"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {errors
              .filter((err) =>
                searchQuery ? (err.message || '').toLowerCase().includes((searchQuery || '').toLowerCase()) : true
              )
              .map((err) => (
                <div
                  key={err.id}
                  className="p-4 hover:bg-accent/50 cursor-pointer transition"
                  onClick={() => setSelectedError(err)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(err.severity)}`}>
                        {err.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(err.status)}`}>
                        {err.status}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-gray-500/10 text-gray-500 rounded">
                        {err.category}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(err.lastSeen).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium mb-1">{err.message}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {err.endpoint && <span>{err.method} {err.endpoint}</span>}
                    {err.occurrenceCount > 1 && (
                      <span className="text-orange-500">x{err.occurrenceCount} occurrences</span>
                    )}
                    {err.patternId && (
                      <span className="text-[#40E0D0]">Pattern matched</span>
                    )}
                  </div>
                </div>
              ))}
            {errors.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No errors found</p>
            )}
          </div>
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(pattern.severity)}`}>
                  {pattern.severity.toUpperCase()}
                </span>
                <span className="text-sm font-mono">{pattern.matchCount} matches</span>
              </div>
              <h3 className="font-semibold mb-1">{pattern.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs font-medium text-[#40E0D0] mb-1">Suggested Fix:</p>
                <p className="text-xs text-muted-foreground">{pattern.suggestedFix}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="bg-card border rounded-lg">
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="p-4 hover:bg-accent/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-500 rounded">
                      {feedback.category}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(feedback.status)}`}>
                      {feedback.status}
                    </span>
                    {feedback.bilgeAnalysis?.priority && (
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        feedback.bilgeAnalysis.priority === 'high'
                          ? 'bg-red-500/10 text-red-500'
                          : feedback.bilgeAnalysis.priority === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {feedback.bilgeAnalysis.priority} priority
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mb-2">{feedback.message}</p>
                <p className="text-sm text-muted-foreground mb-3">{feedback.userEmail}</p>

                {feedback.bilgeAnalysis && (
                  <div className="p-3 bg-background/50 rounded-lg mb-3 border border-[#40E0D0]/20">
                    <p className="text-xs font-medium text-[#40E0D0] mb-1">BILGE Analysis:</p>
                    <p className="text-xs text-muted-foreground">{feedback.bilgeAnalysis.suggestedAction}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Suggested Response:</span> {feedback.bilgeAnalysis.suggestedResponse}
                    </p>
                  </div>
                )}

                {feedback.adminResponse && (
                  <div className="p-3 bg-green-500/10 rounded-lg mb-3">
                    <p className="text-xs font-medium text-green-500 mb-1">Admin Response:</p>
                    <p className="text-xs">{feedback.adminResponse.response}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {feedback.adminResponse.respondedBy} on {new Date(feedback.adminResponse.respondedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {feedback.status === 'new' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveFeedback(feedback.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectFeedback(feedback.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => setSelectedFeedback(feedback)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Respond
                    </button>
                  </div>
                )}
              </div>
            ))}
            {feedbacks.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No feedback yet</p>
            )}
          </div>
        </div>
      )}

      {/* Ideas Tab */}
      {activeTab === 'ideas' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleGenerateIdea}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition"
            >
              <Zap className="w-4 h-4" />
              Generate New Idea
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => (
              <div key={idea.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-500 rounded">
                    {idea.status}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {idea.source.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-semibold mb-2">{idea.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{idea.description}</p>
                <div className="p-3 bg-background rounded-lg mb-3">
                  <p className="text-xs font-medium mb-1">Rationale:</p>
                  <p className="text-xs text-muted-foreground">{idea.rationale}</p>
                </div>
                {idea.technicalDetails && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="capitalize">{idea.technicalDetails.complexity} complexity</span>
                    <span>{idea.technicalDetails.estimatedEffort}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && weeklyReport && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Weekly Report</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(weeklyReport.weekStart).toLocaleDateString()} - {new Date(weeklyReport.weekEnd).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={fetchWeeklyReport}
                className="flex items-center gap-2 px-4 py-2 bg-[#40E0D0] text-black rounded-lg hover:bg-[#40E0D0]/90 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="p-4 bg-background rounded-lg text-center">
                <p className="text-2xl font-bold">{weeklyReport.summary.totalErrors}</p>
                <p className="text-sm text-muted-foreground">Total Errors</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <p className="text-2xl font-bold text-red-500">{weeklyReport.summary.criticalErrors}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <p className="text-2xl font-bold text-green-500">{weeklyReport.summary.resolvedErrors}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <p className="text-2xl font-bold">{weeklyReport.summary.uptime}%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <div className="flex items-center justify-center gap-2">
                  {getTrendIcon(weeklyReport.trends.errorTrend)}
                  <p className="text-2xl font-bold">{weeklyReport.trends.comparedToLastWeek}%</p>
                </div>
                <p className="text-sm text-muted-foreground">vs Last Week</p>
              </div>
            </div>

            {/* Top Issues */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Top Issues</h4>
              <div className="space-y-2">
                {weeklyReport.topIssues.map((issue, index) => (
                  <div
                    key={issue.patternId}
                    className="flex items-center justify-between p-3 bg-background rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-muted rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{issue.patternName}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <span className="font-mono text-muted-foreground">{issue.count} occurrences</span>
                  </div>
                ))}
                {weeklyReport.topIssues.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No significant issues this week</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-semibold mb-3">BILGE Recommendations</h4>
              <div className="space-y-2">
                {weeklyReport.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[#40E0D0]/10 rounded-lg border border-[#40E0D0]/20">
                    <Lightbulb className="w-5 h-5 text-[#40E0D0] flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
                {weeklyReport.recommendations.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No recommendations</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedError(null)} />
          <div className="relative bg-card border rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedError(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-4">Error Details</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(selectedError.severity)}`}>
                  {selectedError.severity.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(selectedError.status)}`}>
                  {selectedError.status}
                </span>
                <span className="px-2 py-0.5 text-xs bg-gray-500/10 text-gray-500 rounded">
                  {selectedError.category}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Message</p>
                <p className="font-mono text-sm bg-background p-3 rounded-lg">{selectedError.message}</p>
              </div>

              {selectedError.stack && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stack Trace</p>
                  <pre className="font-mono text-xs bg-background p-3 rounded-lg overflow-x-auto max-h-[200px]">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Endpoint</p>
                  <p className="font-mono text-sm">{selectedError.method} {selectedError.endpoint || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Occurrences</p>
                  <p className="font-mono text-sm">{selectedError.occurrenceCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">First Seen</p>
                  <p className="font-mono text-sm">{new Date(selectedError.firstSeen).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Seen</p>
                  <p className="font-mono text-sm">{new Date(selectedError.lastSeen).toLocaleString()}</p>
                </div>
              </div>

              {selectedError.status !== 'resolved' && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Resolve Error</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter resolution description..."
                      className="flex-1 px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent outline-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleResolveError(selectedError.id, e.currentTarget.value);
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          handleResolveError(selectedError.id, input.value);
                        }
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Response Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedFeedback(null)} />
          <div className="relative bg-card border rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-4">Respond to Feedback</h3>

            <div className="mb-4 p-3 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{selectedFeedback.userEmail}</p>
              <p className="mt-1">{selectedFeedback.message}</p>
            </div>

            {selectedFeedback.bilgeAnalysis?.suggestedResponse && (
              <div className="mb-4 p-3 bg-[#40E0D0]/10 rounded-lg border border-[#40E0D0]/20">
                <p className="text-xs font-medium text-[#40E0D0] mb-1">BILGE Suggested Response:</p>
                <p className="text-sm">{selectedFeedback.bilgeAnalysis.suggestedResponse}</p>
                <button
                  onClick={() => setResponseText(selectedFeedback.bilgeAnalysis?.suggestedResponse || '')}
                  className="mt-2 text-xs text-[#40E0D0] hover:underline"
                >
                  Use this response
                </button>
              </div>
            )}

            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response..."
              rows={4}
              className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent outline-none resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-accent transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespondToFeedback(selectedFeedback.id)}
                disabled={!responseText.trim() || isResponding}
                className="flex-1 px-4 py-2 bg-[#40E0D0] text-black rounded-lg hover:bg-[#40E0D0]/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResponding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Response
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
