// ===========================================
// Asset-Specific Analyzers Index
// ===========================================

export { metalsAnalyzer, MetalsAnalyzerService } from './metals-analyzer.service';
export { stocksAnalyzer, StocksAnalyzerService } from './stocks-analyzer.service';
export { bondsAnalyzer, BondsAnalyzerService } from './bonds-analyzer.service';
// export { cryptoAnalyzer, CryptoAnalyzerService } from './crypto-analyzer.service';

// Orchestrator - routes to appropriate analyzer
export { assetAnalyzerOrchestrator, AssetAnalyzerOrchestrator } from './asset-analyzer-orchestrator';

// Re-export types
export * from '../../types/asset-metrics.types';
