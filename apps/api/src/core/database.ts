// ===========================================
// Database Client
// Using JSON file storage (temporary solution)
// ===========================================

// Re-export from json-database
export { prisma, jsonDb } from './json-database';

// Connection test
export async function testConnection(): Promise<boolean> {
  return true; // JSON always works
}

// Close (no-op for JSON)
export async function closeDatabase(): Promise<void> {
  // Nothing to close for JSON file storage
}
