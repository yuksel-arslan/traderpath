/**
 * BILGE Guardian System - Type Definitions
 *
 * AI Development Architect & Operations Guardian
 * Powered by Claude Opus 4.5
 */

// Error Severity Levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error Categories
export type ErrorCategory =
  | 'api_failure'
  | 'database_error'
  | 'authentication'
  | 'validation'
  | 'timeout'
  | 'rate_limit'
  | 'external_service'
  | 'business_logic'
  | 'security'
  | 'unknown';

// Notification Channels
export type NotificationChannel = 'slack' | 'discord' | 'sms' | 'whatsapp' | 'email';

// Feedback Categories
export type FeedbackCategory =
  | 'bug_report'
  | 'feature_request'
  | 'ux_feedback'
  | 'documentation'
  | 'general'
  | 'praise';

// Feedback Status
export type FeedbackStatus =
  | 'new'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'responded'
  | 'in_progress'
  | 'resolved';

// Innovation Idea Status
export type IdeaStatus =
  | 'proposed'
  | 'under_review'
  | 'approved'
  | 'in_development'
  | 'completed'
  | 'rejected';

// Collected Error Interface
export interface CollectedError {
  id: string;
  timestamp: Date;
  project: string;

  // Error Details
  message: string;
  stack?: string;
  code?: string;

  // Classification
  severity: ErrorSeverity;
  category: ErrorCategory;

  // Context
  endpoint?: string;
  method?: string;
  userId?: string;
  requestId?: string;

  // Environment
  environment: 'development' | 'staging' | 'production';
  nodeVersion?: string;

  // Pattern matching
  patternId?: string;
  isRecurring: boolean;
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;

  // Resolution
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

// Error Pattern Interface
export interface ErrorPattern {
  id: string;
  name: string;
  description: string;

  // Matching
  messagePattern: string; // RegExp pattern
  codePattern?: string;
  endpointPattern?: string;

  // Classification
  category: ErrorCategory;
  severity: ErrorSeverity;

  // Response
  suggestedFix: string;
  autoNotify: boolean;
  notifyChannels: NotificationChannel[];

  // Stats
  matchCount: number;
  lastMatched?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Weekly Report Interface
export interface WeeklyReport {
  id: string;
  project: string;
  weekStart: Date;
  weekEnd: Date;
  generatedAt: Date;

  // Summary
  summary: {
    totalErrors: number;
    criticalErrors: number;
    resolvedErrors: number;
    avgResponseTime: number;
    uptime: number;
  };

  // Top Issues
  topIssues: Array<{
    patternId: string;
    patternName: string;
    count: number;
    severity: ErrorSeverity;
    status: string;
  }>;

  // Trends
  trends: {
    errorTrend: 'increasing' | 'stable' | 'decreasing';
    comparedToLastWeek: number; // percentage
    mostAffectedEndpoint?: string;
  };

  // Recommendations
  recommendations: string[];

  // User Feedback Summary
  feedbackSummary: {
    total: number;
    byCategory: Record<FeedbackCategory, number>;
    avgSentiment: number;
  };
}

// User Feedback Interface
export interface UserFeedback {
  id: string;
  project: string;

  // User
  userId: string;
  userEmail: string;
  userTier?: string;

  // Content
  category: FeedbackCategory;
  message: string;
  attachments?: string[];

  // BILGE Analysis
  bilgeAnalysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    priority: 'low' | 'medium' | 'high';
    similarFeedbackCount: number;
    suggestedAction: string;
    suggestedResponse: string;
  };

  // Status
  status: FeedbackStatus;

  // Admin Response
  adminResponse?: {
    respondedBy: string;
    respondedAt: Date;
    response: string;
    isCustomResponse: boolean;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Innovation Idea Interface
export interface InnovationIdea {
  id: string;
  project: string;

  // Content
  title: string;
  description: string;
  rationale: string;

  // Technical Details
  technicalDetails?: {
    estimatedEffort: string;
    complexity: 'low' | 'medium' | 'high';
    dependencies: string[];
    suggestedImplementation: string;
  };

  // Impact Assessment
  impact?: {
    userBenefit: string;
    businessValue: string;
    technicalDebt: string;
  };

  // Source
  source: 'pattern_analysis' | 'user_feedback' | 'performance_data' | 'manual';
  sourceReference?: string;

  // Status
  status: IdeaStatus;

  // Admin Review
  adminReview?: {
    reviewedBy: string;
    reviewedAt: Date;
    decision: 'approved' | 'rejected' | 'deferred';
    notes: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Notification Message Interface
export interface NotificationMessage {
  channel: NotificationChannel;
  severity: ErrorSeverity;

  // Content
  title: string;
  message: string;

  // Metadata
  project: string;
  errorId?: string;
  patternId?: string;

  // Links
  dashboardLink?: string;
  detailsLink?: string;

  // Timestamp
  timestamp: Date;
}

// Guardian Health Status
export interface GuardianHealthStatus {
  project: string;
  status: 'healthy' | 'warning' | 'critical';

  // Metrics
  metrics: {
    errorsLast24h: number;
    criticalErrorsLast24h: number;
    avgResponseTime: number;
    uptime: number;
    pendingFeedback: number;
  };

  // Active Issues
  activeIssues: number;

  // Last Check
  lastCheck: Date;
  nextCheck: Date;
}

// BILGE Configuration
export interface BilgeConfig {
  project: string;
  enabled: boolean;

  // Notification Settings
  notifications: {
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    discord: {
      enabled: boolean;
      webhookUrl?: string;
    };
    sms: {
      enabled: boolean;
      phoneNumbers?: string[];
    };
    whatsapp: {
      enabled: boolean;
      phoneNumbers?: string[];
    };
  };

  // Alert Thresholds
  thresholds: {
    criticalErrorsPerHour: number;
    responseTimeMs: number;
    errorRatePercent: number;
  };

  // Weekly Report
  weeklyReport: {
    enabled: boolean;
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    hour: number; // 0-23 UTC
  };

  // Innovation Engine
  innovationEngine: {
    enabled: boolean;
    autoSuggest: boolean;
  };
}

// Redis Keys
export const BILGE_REDIS_KEYS = {
  ERRORS: 'bilge:errors',
  PATTERNS: 'bilge:patterns',
  CONFIG: 'bilge:config',
  HEALTH: 'bilge:health',
  WEEKLY_REPORT: 'bilge:weekly',
  FEEDBACK: 'bilge:feedback',
  IDEAS: 'bilge:ideas',
  METRICS: 'bilge:metrics',
} as const;
