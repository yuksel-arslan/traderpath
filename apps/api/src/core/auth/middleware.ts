// ===========================================
// Authentication Middleware
// Re-exports Firebase authentication
// ===========================================

// Export Firebase middleware as the default authentication
export { firebaseAuth as authenticate, optionalFirebaseAuth as optionalAuth } from './firebase-middleware';

// Re-export types
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      level: number;
      isAdmin?: boolean;
      firebaseUid?: string;
    };
  }
}
