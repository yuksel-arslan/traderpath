// ===========================================
// Authentication Middleware
// Re-exports JWT authentication
// ===========================================

// Export JWT middleware as the default authentication
export { authenticate, optionalAuth } from './jwt-middleware';

// User type is declared in src/index.ts
