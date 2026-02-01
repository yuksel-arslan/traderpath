/**
 * BILGE Guardian System
 *
 * AI Development Architect & Operations Guardian
 * Powered by Claude Opus 4.5
 *
 * Features:
 * - Error Collection & Pattern Recognition
 * - Multi-Channel Notifications (Slack, Discord, SMS, WhatsApp)
 * - Weekly Reports
 * - User Feedback System
 * - Innovation Engine
 */

// Types
export * from './types';

// Pattern Database
export { INITIAL_PATTERNS, matchErrorToPattern, getSeverityColor, getSeverityEmoji } from './pattern-database';

// Notification Service
export {
  sendSlackNotification,
  sendDiscordNotification,
  sendSMSNotification,
  sendWhatsAppNotification,
  sendNotification,
  createErrorNotificationMessage,
  sendCriticalAlert,
} from './notification.service';

// Main Service
export {
  initializeBilgeService,
  collectError,
  getErrors,
  getPatterns,
  getHealthStatus,
  generateWeeklyReport,
  submitFeedback,
  getFeedbacks,
  updateFeedbackStatus,
  getInnovationIdeas,
  generateInnovationIdea,
  resolveError,
} from './bilge.service';

// Middleware
export {
  requestIdMiddleware,
  errorCollectorMiddleware,
  asyncHandler,
  reportError,
  installGlobalErrorHandlers,
  requestLoggerMiddleware,
} from './error-collector.middleware';

// Routes
export { default as bilgeRoutes } from './bilge.routes';

// Cron Jobs
export { startBilgeWeeklyReportJob, stopBilgeWeeklyReportJob } from './bilge-cron.job';
