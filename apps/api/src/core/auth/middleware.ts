// ===========================================
// Authentication Middleware
// Re-exports Firebase authentication
// ===========================================

// Export Firebase middleware as the default authentication
export { firebaseAuth as authenticate, optionalFirebaseAuth as optionalAuth } from './firebase-middleware';

// User type is declared in src/index.ts
