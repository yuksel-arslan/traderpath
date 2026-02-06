/**
 * RAG Module Exports
 *
 * Retrieval-Augmented Generation layer for TraderPath.
 * Enriches existing 7-Step + MLIS Pro analysis with:
 *   - Web Research (fast/news/deep)
 *   - AI Forecast Bands (P10/P50/P90)
 *   - Multi-Strategy Plans (4 strategies)
 *   - Plan Validation (gatekeeper)
 *   - Citation Management
 */

// Types
export * from './types';

// Services
export { ragOrchestrator } from './rag-orchestrator.service';
export { webResearchService } from './web-research/web-research.service';
export { forecastBandService } from './forecast/forecast-band.service';
export { multiStrategyService } from './strategy/multi-strategy.service';
export { planValidationService } from './validation/plan-validation.service';
export { citationService } from './web-research/citation.service';

// Routes
export { ragRoutes } from './rag.routes';
