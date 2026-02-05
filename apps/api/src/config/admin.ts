/**
 * Admin Configuration
 * Centralized admin access control
 */

/**
 * Get admin emails from environment variable or use default
 * Format: ADMIN_EMAILS="email1@example.com,email2@example.com"
 */
export function getAdminEmails(): string[] {
  const envAdmins = process.env['ADMIN_EMAILS'];

  if (envAdmins) {
    return envAdmins
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);
  }

  // Fallback to default admin
  return ['contact@yukselarslan.com'];
}

/**
 * Check if an email is an admin
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Get admin emails list (for display purposes)
 */
export const ADMIN_EMAILS = getAdminEmails();
