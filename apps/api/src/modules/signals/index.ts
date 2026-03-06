/**
 * Signals Module
 * Proactive Signal System for TraderPath
 *
 * Hourly Capital Flow → Asset Analysis (7-Step + MLIS Pro) → Telegram Signals
 */

export { signalService, SignalService } from './signal.service';
export { signalRoutes } from './signal.routes';
export { signalSubscriptionService, SIGNAL_TIER_CONFIG } from './signal-subscription.service';
export { default as signalSubscriptionRoutes } from './signal-subscription.routes';
export {
  requireSignalSubscription,
  requireMarketAccess,
  attachSignalSubscription,
} from './signal-subscription.middleware';
export {
  startSignalGeneratorJob,
  stopSignalGeneratorJob,
  runSignalGenerationManually,
  generateSignals,
  startAutoEdgeJob,
  stopAutoEdgeJob,
  runAutoEdgeManually,
  generateAutoEdgeSignal,
} from './signal-generator.job';
export {
  startSignalOutcomeTracker,
  stopSignalOutcomeTracker,
  runSignalOutcomeTrackerManually,
  trackSignalOutcomes,
} from './signal-outcome-tracker.job';
export {
  formatTelegramSignal,
  formatSignalUpdate,
  formatDailySummary,
  formatCapitalFlowAlert,
} from './telegram-formatter';
export { signalMonitoring } from './signal-monitoring.service';
export * from './types';
