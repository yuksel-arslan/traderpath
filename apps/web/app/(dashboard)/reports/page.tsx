'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Download,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Report {
  id: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string | null;
  generatedAt: string;
  expiresAt: string;
  downloadCount: number;
}

interface ReportsResponse {
  success: boolean;
  data: {
    reports: Report[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/reports?limit=${pagination.limit}&offset=${pagination.offset}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data: ReportsResponse = await response.json();
        if (data.success) {
          setReports(data.data.reports);
          setPagination(data.data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [pagination.offset]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setReports(reports.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch full report data
      const response = await fetch(`/api/reports/${report.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.reportData) {
          // Dynamic import PDF generator
          const { generateAnalysisReport } = await import('../../../components/reports/AnalysisReport');
          await generateAnalysisReport(data.data.reportData);
        }
      }
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report');
    }
  };

  const getVerdictColor = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes('strong buy') || v.includes('buy')) return 'text-green-500 bg-green-500/10';
    if (v.includes('strong sell') || v.includes('sell')) return 'text-red-500 bg-red-500/10';
    if (v.includes('hold') || v.includes('wait')) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-gray-500 bg-gray-500/10';
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days remaining`;
    if (hours > 0) return `${hours} hours remaining`;
    return 'Expiring soon';
  };

  const filteredReports = reports
    .filter(r =>
      r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filter === 'all' || r.direction === filter)
    );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Reports</h1>
          <p className="text-muted-foreground">Your saved analysis reports</p>
        </div>
        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search coin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'long', label: 'Long' },
            { value: 'short', label: 'Short' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
          <p className="text-muted-foreground mb-4">
            You can create reports from the analysis page
          </p>
          <button
            onClick={() => router.push('/analyze')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Start Analysis
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-card border rounded-lg p-4 hover:shadow-lg transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Report Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 via-amber-500 to-green-500 flex items-center justify-center text-white font-bold">
                    {report.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{report.symbol}</h3>
                      {report.direction && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          report.direction === 'long'
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {report.direction === 'long' ? (
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                          )}
                          {report.direction.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.generatedAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Verdict & Score */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={cn(
                      "px-3 py-1 rounded-lg text-sm font-medium",
                      getVerdictColor(report.verdict)
                    )}>
                      {report.verdict}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Verdict</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{report.score}</div>
                    <p className="text-xs text-muted-foreground">/100</p>
                  </div>
                </div>

                {/* Expiration */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className={cn(
                    new Date(report.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  )}>
                    {getTimeRemaining(report.expiresAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(report)}
                    className="p-2 rounded-lg hover:bg-accent transition"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Download count */}
              {report.downloadCount > 0 && (
                <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                  Downloaded {report.downloadCount} times
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
            disabled={pagination.offset === 0}
            className="px-4 py-2 bg-card border rounded-lg hover:bg-accent transition disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-muted-foreground">
            {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-4 py-2 bg-card border rounded-lg hover:bg-accent transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-medium text-blue-500 mb-1">Report Validity</p>
            <p>
              Reports are automatically deleted after the period you set in your settings.
              Default validity period is 50 periods (approximately 8 days for 4-hour chart).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
