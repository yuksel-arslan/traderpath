/**
 * Signals Module
 * Proactive Signal System for TraderPath
 *
 * Hourly Capital Flow → Asset Analysis (7-Step + MLIS Pro) → Telegram Signals
 */

export { signalService, SignalService } from './signal.service';
export { signalRoutes } from './signal.routes';
export {
  startSignalGeneratorJob,
  stopSignalGeneratorJob,
  runSignalGenerationManually,
  generateSignals,
} from './signal-generator.job';
export {
  formatTelegramSignal,
  formatSignalUpdate,
  formatDailySummary,
  formatCapitalFlowAlert,
} from './telegram-formatter';
export * from './types';
