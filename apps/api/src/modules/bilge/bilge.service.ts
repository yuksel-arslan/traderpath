/**
 * BILGE Guardian System - Main Service
 *
 * AI Development Architect & Operations Guardian
 * Handles error collection, pattern matching, and orchestration
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  CollectedError,
  ErrorPattern,
  ErrorSeverity,
  ErrorCategory,
  WeeklyReport,
  UserFeedback,
  InnovationIdea,
  GuardianHealthStatus,
  BilgeConfig,
  BILGE_REDIS_KEYS,
  FeedbackCategory,
  FeedbackStatus,
  IdeaStatus,
} from './types';
import { INITIAL_PATTERNS, matchErrorToPattern, getSeverityEmoji } from './pattern-database';
import {
  sendNotification,
  createErrorNotificationMessage,
  sendCriticalAlert,
} from './notification.service';
import { callGeminiWithRetry } from '../../core/gemini';

// Redis client will be injected
let redisClient: Redis | null = null;

/**
 * Initialize BILGE service with Redis client
 */
export function initializeBilgeService(redis: Redis): void {
  redisClient = redis;
  console.log('[BILGE] Guardian service initialized');

  // Load initial patterns into Redis if not exists
  loadInitialPatterns();
}

/**
 * Load initial patterns into Redis
 */
async function loadInitialPatterns(): Promise<void> {
  if (!redisClient) return;

  try {
    const existingPatterns = await redisClient.get(BILGE_REDIS_KEYS.PATTERNS);
    if (!existingPatterns) {
      await redisClient.set(BILGE_REDIS_KEYS.PATTERNS, JSON.stringify(INITIAL_PATTERNS));
      console.log('[BILGE] Initial patterns loaded');
    }
  } catch (error) {
    console.error('[BILGE] Error loading patterns:', error);
  }
}

/**
 * Get all patterns from Redis
 */
export async function getPatterns(): Promise<ErrorPattern[]> {
  if (!redisClient) return INITIAL_PATTERNS;

  try {
    const data = await redisClient.get(BILGE_REDIS_KEYS.PATTERNS);
    return data ? JSON.parse(data) : INITIAL_PATTERNS;
  } catch (error) {
    console.error('[BILGE] Error getting patterns:', error);
    return INITIAL_PATTERNS;
  }
}

/**
 * Collect and process an error
 */
export async function collectError(params: {
  message: string;
  stack?: string;
  code?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  project?: string;
}): Promise<CollectedError> {
  const project = params.project || 'traderpath';
  const environment = (process.env['NODE_ENV'] as any) || 'development';

  // Match error to pattern
  const pattern = matchErrorToPattern(params.message, params.code, params.endpoint);

  // Determine severity and category
  const severity: ErrorSeverity = pattern?.severity || determineSeverity(params.message);
  const category: ErrorCategory = pattern?.category || determineCategory(params.message);

  // Check for recurring error
  const existingError = await findExistingError(params.message, project);

  const error: CollectedError = existingError
    ? {
        ...existingError,
        lastSeen: new Date(),
        occurrenceCount: existingError.occurrenceCount + 1,
        isRecurring: true,
      }
    : {
        id: uuidv4(),
        timestamp: new Date(),
        project,
        message: params.message,
        stack: params.stack,
        code: params.code,
        severity,
        category,
        endpoint: params.endpoint,
        method: params.method,
        userId: params.userId,
        requestId: params.requestId,
        environment,
        nodeVersion: process.version,
        patternId: pattern?.id,
        isRecurring: false,
        occurrenceCount: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        status: 'new',
      };

  // Store error in Redis
  await storeError(error);

  // Update pattern match count
  if (pattern) {
    await updatePatternMatchCount(pattern.id);
  }

  // Check if notification should be sent
  if (shouldNotify(error, pattern)) {
    const message = createErrorNotificationMessage(error, pattern?.name, pattern?.suggestedFix);
    const channels = pattern?.notifyChannels || ['slack', 'discord'];

    // Send critical alerts through all channels
    if (severity === 'critical') {
      await sendCriticalAlert(error, pattern?.name, pattern?.suggestedFix);
    } else {
      await sendNotification(message, channels);
    }
  }

  console.log(`[BILGE] Error collected: ${error.id} (${severity})`);

  return error;
}

/**
 * Find existing error with same message
 */
async function findExistingError(
  message: string,
  project: string
): Promise<CollectedError | null> {
  if (!redisClient) return null;

  try {
    const errorsData = await redisClient.get(`${BILGE_REDIS_KEYS.ERRORS}:${project}`);
    if (!errorsData) return null;

    const errors: CollectedError[] = JSON.parse(errorsData);

    // Find error with similar message (within last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (
      errors.find(
        (e) =>
          e.message === message &&
          new Date(e.lastSeen).getTime() > cutoff &&
          e.status !== 'resolved'
      ) || null
    );
  } catch (error) {
    console.error('[BILGE] Error finding existing error:', error);
    return null;
  }
}

/**
 * Store error in Redis
 */
async function storeError(error: CollectedError): Promise<void> {
  if (!redisClient) return;

  try {
    const key = `${BILGE_REDIS_KEYS.ERRORS}:${error.project}`;
    const errorsData = await redisClient.get(key);
    let errors: CollectedError[] = errorsData ? JSON.parse(errorsData) : [];

    // Update or add error
    const existingIndex = errors.findIndex((e) => e.id === error.id);
    if (existingIndex >= 0) {
      errors[existingIndex] = error;
    } else {
      errors.unshift(error);
    }

    // Keep only last 1000 errors
    if (errors.length > 1000) {
      errors = errors.slice(0, 1000);
    }

    await redisClient.set(key, JSON.stringify(errors));

    // Update metrics
    await updateMetrics(error);
  } catch (err) {
    console.error('[BILGE] Error storing error:', err);
  }
}

/**
 * Update pattern match count
 */
async function updatePatternMatchCount(patternId: string): Promise<void> {
  if (!redisClient) return;

  try {
    const patternsData = await redisClient.get(BILGE_REDIS_KEYS.PATTERNS);
    if (!patternsData) return;

    const patterns: ErrorPattern[] = JSON.parse(patternsData);
    const pattern = patterns.find((p) => p.id === patternId);

    if (pattern) {
      pattern.matchCount += 1;
      pattern.lastMatched = new Date();
      await redisClient.set(BILGE_REDIS_KEYS.PATTERNS, JSON.stringify(patterns));
    }
  } catch (error) {
    console.error('[BILGE] Error updating pattern count:', error);
  }
}

/**
 * Determine if notification should be sent
 */
function shouldNotify(error: CollectedError, pattern: ErrorPattern | null): boolean {
  // Always notify for critical errors
  if (error.severity === 'critical') return true;

  // Check pattern auto-notify setting
  if (pattern && pattern.autoNotify) return true;

  // Don't notify for low severity recurring errors
  if (error.severity === 'low' && error.isRecurring) return false;

  // Notify for high severity errors
  if (error.severity === 'high') return true;

  // Notify for first occurrence of medium severity
  if (error.severity === 'medium' && !error.isRecurring) return true;

  return false;
}

/**
 * Determine severity from error message
 */
function determineSeverity(message: string): ErrorSeverity {
  const lowered = message.toLowerCase();

  if (
    lowered.includes('critical') ||
    lowered.includes('fatal') ||
    lowered.includes('crash') ||
    lowered.includes('out of memory')
  ) {
    return 'critical';
  }

  if (
    lowered.includes('error') ||
    lowered.includes('failed') ||
    lowered.includes('unauthorized')
  ) {
    return 'high';
  }

  if (
    lowered.includes('warning') ||
    lowered.includes('timeout') ||
    lowered.includes('retry')
  ) {
    return 'medium';
  }

  return 'low';
}

/**
 * Determine category from error message
 */
function determineCategory(message: string): ErrorCategory {
  const lowered = message.toLowerCase();

  if (lowered.includes('database') || lowered.includes('prisma') || lowered.includes('sql')) {
    return 'database_error';
  }

  if (lowered.includes('auth') || lowered.includes('jwt') || lowered.includes('token')) {
    return 'authentication';
  }

  if (lowered.includes('timeout') || lowered.includes('etimedout')) {
    return 'timeout';
  }

  if (lowered.includes('rate') || lowered.includes('429') || lowered.includes('limit')) {
    return 'rate_limit';
  }

  if (lowered.includes('validation') || lowered.includes('invalid')) {
    return 'validation';
  }

  if (lowered.includes('cors') || lowered.includes('security') || lowered.includes('forbidden')) {
    return 'security';
  }

  return 'unknown';
}

/**
 * Update metrics in Redis
 */
async function updateMetrics(error: CollectedError): Promise<void> {
  if (!redisClient) return;

  try {
    const key = `${BILGE_REDIS_KEYS.METRICS}:${error.project}`;
    const today = new Date().toISOString().split('T')[0];
    const hourKey = `${key}:${today}:${new Date().getHours()}`;

    // Increment hourly counter
    await redisClient.incr(hourKey);
    await redisClient.expire(hourKey, 86400 * 7); // 7 days TTL

    // Increment severity counter
    const severityKey = `${key}:severity:${error.severity}`;
    await redisClient.incr(severityKey);
    await redisClient.expire(severityKey, 86400 * 30); // 30 days TTL

    // Increment category counter
    const categoryKey = `${key}:category:${error.category}`;
    await redisClient.incr(categoryKey);
    await redisClient.expire(categoryKey, 86400 * 30);
  } catch (err) {
    console.error('[BILGE] Error updating metrics:', err);
  }
}

/**
 * Get errors for a project
 */
export async function getErrors(
  project: string,
  options?: {
    limit?: number;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    status?: string;
  }
): Promise<CollectedError[]> {
  if (!redisClient) return [];

  try {
    const key = `${BILGE_REDIS_KEYS.ERRORS}:${project}`;
    const errorsData = await redisClient.get(key);
    if (!errorsData) return [];

    let errors: CollectedError[] = JSON.parse(errorsData);

    // Apply filters
    if (options?.severity) {
      errors = errors.filter((e) => e.severity === options.severity);
    }

    if (options?.category) {
      errors = errors.filter((e) => e.category === options.category);
    }

    if (options?.status) {
      errors = errors.filter((e) => e.status === options.status);
    }

    // Apply limit
    if (options?.limit) {
      errors = errors.slice(0, options.limit);
    }

    return errors;
  } catch (error) {
    console.error('[BILGE] Error getting errors:', error);
    return [];
  }
}

/**
 * Get health status for a project
 */
export async function getHealthStatus(project: string): Promise<GuardianHealthStatus> {
  const errors = await getErrors(project);

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const errorsLast24h = errors.filter(
    (e) => new Date(e.lastSeen).getTime() > last24h
  ).length;

  const criticalErrorsLast24h = errors.filter(
    (e) => new Date(e.lastSeen).getTime() > last24h && e.severity === 'critical'
  ).length;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (criticalErrorsLast24h > 0) {
    status = 'critical';
  } else if (errorsLast24h > 10) {
    status = 'warning';
  }

  return {
    project,
    status,
    metrics: {
      errorsLast24h,
      criticalErrorsLast24h,
      avgResponseTime: 0, // TODO: Implement response time tracking
      uptime: 99.9, // TODO: Implement uptime tracking
      pendingFeedback: 0, // TODO: Implement feedback count
    },
    activeIssues: errors.filter((e) => e.status === 'new' || e.status === 'investigating')
      .length,
    lastCheck: new Date(),
    nextCheck: new Date(now + 60000), // 1 minute
  };
}

/**
 * Generate weekly report
 */
export async function generateWeeklyReport(project: string): Promise<WeeklyReport> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const errors = await getErrors(project);
  const patterns = await getPatterns();

  // Filter errors from this week
  const weekErrors = errors.filter(
    (e) => new Date(e.lastSeen).getTime() > weekStart.getTime()
  );

  // Calculate metrics
  const totalErrors = weekErrors.length;
  const criticalErrors = weekErrors.filter((e) => e.severity === 'critical').length;
  const resolvedErrors = weekErrors.filter((e) => e.status === 'resolved').length;

  // Get top issues
  const patternCounts = new Map<string, number>();
  for (const error of weekErrors) {
    if (error.patternId) {
      patternCounts.set(error.patternId, (patternCounts.get(error.patternId) || 0) + 1);
    }
  }

  const topIssues = Array.from(patternCounts.entries())
    .map(([patternId, count]) => {
      const pattern = patterns.find((p) => p.id === patternId);
      return {
        patternId,
        patternName: pattern?.name || 'Unknown',
        count,
        severity: pattern?.severity || ('unknown' as ErrorSeverity),
        status: 'active',
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate trend
  const previousWeekErrors = errors.filter(
    (e) =>
      new Date(e.lastSeen).getTime() > weekStart.getTime() - 7 * 24 * 60 * 60 * 1000 &&
      new Date(e.lastSeen).getTime() <= weekStart.getTime()
  );

  const comparedToLastWeek =
    previousWeekErrors.length > 0
      ? ((totalErrors - previousWeekErrors.length) / previousWeekErrors.length) * 100
      : 0;

  let errorTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (comparedToLastWeek > 10) errorTrend = 'increasing';
  if (comparedToLastWeek < -10) errorTrend = 'decreasing';

  // Generate recommendations using Gemini
  const recommendations = await generateRecommendations(topIssues, patterns);

  const report: WeeklyReport = {
    id: uuidv4(),
    project,
    weekStart,
    weekEnd: now,
    generatedAt: now,
    summary: {
      totalErrors,
      criticalErrors,
      resolvedErrors,
      avgResponseTime: 0,
      uptime: 99.9,
    },
    topIssues,
    trends: {
      errorTrend,
      comparedToLastWeek: Math.round(comparedToLastWeek * 100) / 100,
      mostAffectedEndpoint: getMostAffectedEndpoint(weekErrors),
    },
    recommendations,
    feedbackSummary: {
      total: 0,
      byCategory: {} as Record<FeedbackCategory, number>,
      avgSentiment: 0,
    },
  };

  // Store report
  if (redisClient) {
    const key = `${BILGE_REDIS_KEYS.WEEKLY_REPORT}:${project}`;
    const reportsData = await redisClient.get(key);
    const reports: WeeklyReport[] = reportsData ? JSON.parse(reportsData) : [];
    reports.unshift(report);
    if (reports.length > 12) reports.length = 12; // Keep last 12 weeks
    await redisClient.set(key, JSON.stringify(reports));
  }

  return report;
}

/**
 * Get most affected endpoint
 */
function getMostAffectedEndpoint(errors: CollectedError[]): string | undefined {
  const endpointCounts = new Map<string, number>();

  for (const error of errors) {
    if (error.endpoint) {
      endpointCounts.set(error.endpoint, (endpointCounts.get(error.endpoint) || 0) + 1);
    }
  }

  let maxEndpoint: string | undefined;
  let maxCount = 0;

  for (const [endpoint, count] of endpointCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxEndpoint = endpoint;
    }
  }

  return maxEndpoint;
}

/**
 * Generate recommendations using Gemini
 */
async function generateRecommendations(
  topIssues: Array<{ patternName: string; count: number; severity: ErrorSeverity }>,
  patterns: ErrorPattern[]
): Promise<string[]> {
  try {
    const issuesSummary = topIssues
      .map((i) => `- ${i.patternName}: ${i.count} occurrences (${i.severity})`)
      .join('\n');

    const prompt = `As BILGE, an AI Development Architect and Operations Guardian, analyze the following weekly error summary and provide 3-5 actionable recommendations:

Top Issues This Week:
${issuesSummary || 'No significant issues'}

Provide brief, actionable recommendations to improve system stability. Format as a simple list.`;

    const result = await callGeminiWithRetry(prompt, {
      maxOutputTokens: 300,
      temperature: 0.3,
    });

    // Parse recommendations from response
    const lines = result.text.split('\n').filter((l) => l.trim());
    return lines
      .filter((l) => l.match(/^[\d\-\*•]/))
      .map((l) => l.replace(/^[\d\-\*•\.\)]+\s*/, '').trim())
      .filter((l) => l.length > 10)
      .slice(0, 5);
  } catch (error) {
    console.error('[BILGE] Error generating recommendations:', error);
    return ['Monitor error patterns closely', 'Review critical error responses'];
  }
}

/**
 * Submit user feedback
 */
export async function submitFeedback(params: {
  project: string;
  userId: string;
  userEmail: string;
  userTier?: string;
  category: FeedbackCategory;
  message: string;
  attachments?: string[];
}): Promise<UserFeedback> {
  const feedback: UserFeedback = {
    id: uuidv4(),
    project: params.project,
    userId: params.userId,
    userEmail: params.userEmail,
    userTier: params.userTier,
    category: params.category,
    message: params.message,
    attachments: params.attachments,
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Analyze feedback with BILGE
  feedback.bilgeAnalysis = await analyzeFeedback(params.message, params.category);

  // Store in Redis
  if (redisClient) {
    const key = `${BILGE_REDIS_KEYS.FEEDBACK}:${params.project}`;
    const feedbackData = await redisClient.get(key);
    const feedbacks: UserFeedback[] = feedbackData ? JSON.parse(feedbackData) : [];
    feedbacks.unshift(feedback);
    if (feedbacks.length > 500) feedbacks.length = 500;
    await redisClient.set(key, JSON.stringify(feedbacks));
  }

  console.log(`[BILGE] Feedback submitted: ${feedback.id}`);

  return feedback;
}

/**
 * Analyze feedback with Gemini
 */
async function analyzeFeedback(
  message: string,
  category: FeedbackCategory
): Promise<UserFeedback['bilgeAnalysis']> {
  try {
    const prompt = `As BILGE, analyze this user feedback:

Category: ${category}
Message: "${message}"

Respond in JSON format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "priority": "low" | "medium" | "high",
  "suggestedAction": "brief action",
  "suggestedResponse": "brief response to user"
}`;

    const result = await callGeminiWithRetry(prompt, {
      maxOutputTokens: 200,
      temperature: 0.2,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        ...analysis,
        similarFeedbackCount: 0, // TODO: Implement similarity check
      };
    }
  } catch (error) {
    console.error('[BILGE] Error analyzing feedback:', error);
  }

  return {
    sentiment: 'neutral',
    priority: 'medium',
    similarFeedbackCount: 0,
    suggestedAction: 'Review feedback manually',
    suggestedResponse: 'Thank you for your feedback!',
  };
}

/**
 * Get feedbacks for a project
 */
export async function getFeedbacks(
  project: string,
  options?: {
    limit?: number;
    status?: FeedbackStatus;
    category?: FeedbackCategory;
  }
): Promise<UserFeedback[]> {
  if (!redisClient) return [];

  try {
    const key = `${BILGE_REDIS_KEYS.FEEDBACK}:${project}`;
    const feedbackData = await redisClient.get(key);
    if (!feedbackData) return [];

    let feedbacks: UserFeedback[] = JSON.parse(feedbackData);

    if (options?.status) {
      feedbacks = feedbacks.filter((f) => f.status === options.status);
    }

    if (options?.category) {
      feedbacks = feedbacks.filter((f) => f.category === options.category);
    }

    if (options?.limit) {
      feedbacks = feedbacks.slice(0, options.limit);
    }

    return feedbacks;
  } catch (error) {
    console.error('[BILGE] Error getting feedbacks:', error);
    return [];
  }
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(
  project: string,
  feedbackId: string,
  status: FeedbackStatus,
  adminResponse?: {
    respondedBy: string;
    response: string;
    isCustomResponse: boolean;
  }
): Promise<UserFeedback | null> {
  if (!redisClient) return null;

  try {
    const key = `${BILGE_REDIS_KEYS.FEEDBACK}:${project}`;
    const feedbackData = await redisClient.get(key);
    if (!feedbackData) return null;

    const feedbacks: UserFeedback[] = JSON.parse(feedbackData);
    const feedback = feedbacks.find((f) => f.id === feedbackId);

    if (!feedback) return null;

    feedback.status = status;
    feedback.updatedAt = new Date();

    if (adminResponse) {
      feedback.adminResponse = {
        ...adminResponse,
        respondedAt: new Date(),
      };
    }

    await redisClient.set(key, JSON.stringify(feedbacks));

    return feedback;
  } catch (error) {
    console.error('[BILGE] Error updating feedback:', error);
    return null;
  }
}

/**
 * Generate innovation idea
 */
export async function generateInnovationIdea(
  project: string,
  source: InnovationIdea['source'],
  context: string
): Promise<InnovationIdea | null> {
  try {
    const prompt = `As BILGE, an AI Development Architect, generate an innovative feature idea based on this context:

Project: ${project}
Source: ${source}
Context: ${context}

Respond in JSON format:
{
  "title": "brief title",
  "description": "what the feature does",
  "rationale": "why this would be valuable",
  "complexity": "low" | "medium" | "high",
  "estimatedEffort": "time estimate",
  "userBenefit": "how users benefit",
  "businessValue": "business impact"
}`;

    const result = await callGeminiWithRetry(prompt, {
      maxOutputTokens: 400,
      temperature: 0.7,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const ideaData = JSON.parse(jsonMatch[0]);

    const idea: InnovationIdea = {
      id: uuidv4(),
      project,
      title: ideaData.title,
      description: ideaData.description,
      rationale: ideaData.rationale,
      technicalDetails: {
        estimatedEffort: ideaData.estimatedEffort,
        complexity: ideaData.complexity,
        dependencies: [],
        suggestedImplementation: '',
      },
      impact: {
        userBenefit: ideaData.userBenefit,
        businessValue: ideaData.businessValue,
        technicalDebt: 'minimal',
      },
      source,
      sourceReference: context.substring(0, 100),
      status: 'proposed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in Redis
    if (redisClient) {
      const key = `${BILGE_REDIS_KEYS.IDEAS}:${project}`;
      const ideasData = await redisClient.get(key);
      const ideas: InnovationIdea[] = ideasData ? JSON.parse(ideasData) : [];
      ideas.unshift(idea);
      if (ideas.length > 100) ideas.length = 100;
      await redisClient.set(key, JSON.stringify(ideas));
    }

    console.log(`[BILGE] Innovation idea generated: ${idea.id}`);

    return idea;
  } catch (error) {
    console.error('[BILGE] Error generating innovation idea:', error);
    return null;
  }
}

/**
 * Get innovation ideas for a project
 */
export async function getInnovationIdeas(
  project: string,
  options?: {
    limit?: number;
    status?: IdeaStatus;
  }
): Promise<InnovationIdea[]> {
  if (!redisClient) return [];

  try {
    const key = `${BILGE_REDIS_KEYS.IDEAS}:${project}`;
    const ideasData = await redisClient.get(key);
    if (!ideasData) return [];

    let ideas: InnovationIdea[] = JSON.parse(ideasData);

    if (options?.status) {
      ideas = ideas.filter((i) => i.status === options.status);
    }

    if (options?.limit) {
      ideas = ideas.slice(0, options.limit);
    }

    return ideas;
  } catch (error) {
    console.error('[BILGE] Error getting ideas:', error);
    return [];
  }
}

/**
 * Resolve an error
 */
export async function resolveError(
  project: string,
  errorId: string,
  resolvedBy: string,
  resolution: string
): Promise<CollectedError | null> {
  if (!redisClient) return null;

  try {
    const key = `${BILGE_REDIS_KEYS.ERRORS}:${project}`;
    const errorsData = await redisClient.get(key);
    if (!errorsData) return null;

    const errors: CollectedError[] = JSON.parse(errorsData);
    const error = errors.find((e) => e.id === errorId);

    if (!error) return null;

    error.status = 'resolved';
    error.resolvedAt = new Date();
    error.resolvedBy = resolvedBy;
    error.resolution = resolution;

    await redisClient.set(key, JSON.stringify(errors));

    console.log(`[BILGE] Error resolved: ${errorId}`);

    return error;
  } catch (err) {
    console.error('[BILGE] Error resolving error:', err);
    return null;
  }
}
