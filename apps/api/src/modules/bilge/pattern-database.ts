/**
 * BILGE Guardian System - Pattern Database
 *
 * Initial 10 patterns for error recognition
 * Patterns are matched against incoming errors to classify and respond
 */

import { ErrorPattern, ErrorCategory, ErrorSeverity, NotificationChannel } from './types';

// Initial 10 Patterns
export const INITIAL_PATTERNS: ErrorPattern[] = [
  // Pattern 1: Database Connection Error
  {
    id: 'PAT-001',
    name: 'Database Connection Error',
    description: 'Database connection failures or timeouts',
    messagePattern: '(ECONNREFUSED|connection.*refused|database.*unavailable|prisma.*error|P1001|P1002)',
    codePattern: 'P1001|P1002|ECONNREFUSED',
    category: 'database_error',
    severity: 'critical',
    suggestedFix: `
1. Check database server status
2. Verify DATABASE_URL environment variable
3. Check network connectivity to database
4. Verify database credentials
5. Check connection pool limits
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord', 'sms'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 2: API Rate Limit
  {
    id: 'PAT-002',
    name: 'API Rate Limit Exceeded',
    description: 'External API rate limits (Binance, CoinGecko, etc.)',
    messagePattern: '(rate.*limit|429|too.*many.*requests|quota.*exceeded)',
    codePattern: '429|RATE_LIMIT',
    endpointPattern: '/api/(analysis|capital-flow|concierge)',
    category: 'rate_limit',
    severity: 'medium',
    suggestedFix: `
1. Implement exponential backoff
2. Add request caching layer
3. Consider API tier upgrade
4. Distribute requests across time
5. Use fallback data providers
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 3: Authentication Failure
  {
    id: 'PAT-003',
    name: 'Authentication Failure',
    description: 'JWT token issues or unauthorized access attempts',
    messagePattern: '(jwt.*expired|invalid.*token|unauthorized|authentication.*failed|401)',
    codePattern: '401|AUTH_ERROR',
    category: 'authentication',
    severity: 'high',
    suggestedFix: `
1. Check JWT_SECRET environment variable
2. Verify token expiration settings
3. Check for clock skew issues
4. Review refresh token logic
5. Clear browser cookies/localStorage
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 4: External Service Timeout
  {
    id: 'PAT-004',
    name: 'External Service Timeout',
    description: 'Timeout when calling external APIs (Binance, Yahoo, FRED, etc.)',
    messagePattern: '(timeout|ETIMEDOUT|ESOCKETTIMEDOUT|aborted|network.*error)',
    codePattern: 'ETIMEDOUT|ESOCKETTIMEDOUT',
    category: 'timeout',
    severity: 'medium',
    suggestedFix: `
1. Increase timeout threshold
2. Add circuit breaker pattern
3. Use fallback data source
4. Check external service status
5. Implement retry with backoff
    `.trim(),
    autoNotify: false,
    notifyChannels: ['slack'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 5: Gemini API Error
  {
    id: 'PAT-005',
    name: 'Gemini API Error',
    description: 'Google Gemini AI service errors',
    messagePattern: '(gemini.*error|google.*ai.*failed|model.*overloaded|RESOURCE_EXHAUSTED)',
    endpointPattern: '/api/(analysis|concierge|ai-expert)',
    category: 'external_service',
    severity: 'high',
    suggestedFix: `
1. Check GOOGLE_AI_API_KEY validity
2. Review Gemini usage quotas
3. Implement retry with exponential backoff
4. Consider fallback to alternative model
5. Add request queuing for rate limits
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 6: Validation Error
  {
    id: 'PAT-006',
    name: 'Input Validation Error',
    description: 'Request body or parameter validation failures',
    messagePattern: '(validation.*failed|invalid.*input|required.*field|type.*mismatch|zod.*error)',
    codePattern: 'VALIDATION_ERROR|400',
    category: 'validation',
    severity: 'low',
    suggestedFix: `
1. Review API documentation
2. Check request payload format
3. Verify required fields are present
4. Check data type constraints
5. Update client-side validation
    `.trim(),
    autoNotify: false,
    notifyChannels: [],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 7: Memory/Resource Error
  {
    id: 'PAT-007',
    name: 'Memory/Resource Exhaustion',
    description: 'Out of memory or resource limit errors',
    messagePattern: '(heap.*out.*memory|ENOMEM|memory.*limit|OOM|allocation.*failed)',
    category: 'business_logic',
    severity: 'critical',
    suggestedFix: `
1. Check memory usage patterns
2. Review memory leaks in code
3. Increase container memory limits
4. Optimize large data processing
5. Implement pagination for large queries
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord', 'sms'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 8: Binance API Error
  {
    id: 'PAT-008',
    name: 'Binance API Error',
    description: 'Binance exchange API failures',
    messagePattern: '(binance.*error|exchange.*unavailable|EAPI|symbol.*not.*found)',
    endpointPattern: '/api/analysis',
    category: 'external_service',
    severity: 'medium',
    suggestedFix: `
1. Check Binance API status page
2. Verify symbol format (e.g., BTCUSDT)
3. Check IP whitelist settings
4. Review rate limit status
5. Use Yahoo Finance fallback for non-crypto
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 9: Payment/Credit Error
  {
    id: 'PAT-009',
    name: 'Payment/Credit Error',
    description: 'Credit deduction or payment processing errors',
    messagePattern: '(insufficient.*credits|payment.*failed|lemon.*squeezy.*error|credit.*error)',
    endpointPattern: '/api/(credits|passes|payments)',
    category: 'business_logic',
    severity: 'high',
    suggestedFix: `
1. Check user credit balance
2. Verify Lemon Squeezy API key
3. Review payment webhook logs
4. Check for duplicate transactions
5. Verify credit transaction atomicity
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern 10: Security/CORS Error
  {
    id: 'PAT-010',
    name: 'Security/CORS Error',
    description: 'CORS violations or security-related errors',
    messagePattern: '(cors.*blocked|cross.*origin|forbidden|access.*denied|csrf|xss)',
    codePattern: '403|CORS_ERROR',
    category: 'security',
    severity: 'high',
    suggestedFix: `
1. Review CORS configuration
2. Check allowed origins list
3. Verify request headers
4. Review API gateway settings
5. Check for malicious request patterns
    `.trim(),
    autoNotify: true,
    notifyChannels: ['slack', 'discord'],
    matchCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Match an error against patterns
 */
export function matchErrorToPattern(
  errorMessage: string,
  errorCode?: string,
  endpoint?: string
): ErrorPattern | null {
  const normalizedMessage = errorMessage.toLowerCase();
  const normalizedCode = errorCode?.toLowerCase() || '';
  const normalizedEndpoint = endpoint?.toLowerCase() || '';

  for (const pattern of INITIAL_PATTERNS) {
    // Check message pattern
    const messageRegex = new RegExp(pattern.messagePattern, 'i');
    const messageMatch = messageRegex.test(normalizedMessage);

    // Check code pattern (if defined)
    let codeMatch = true;
    if (pattern.codePattern) {
      const codeRegex = new RegExp(pattern.codePattern, 'i');
      codeMatch = codeRegex.test(normalizedCode) || codeRegex.test(normalizedMessage);
    }

    // Check endpoint pattern (if defined)
    let endpointMatch = true;
    if (pattern.endpointPattern) {
      const endpointRegex = new RegExp(pattern.endpointPattern, 'i');
      endpointMatch = endpointRegex.test(normalizedEndpoint);
    }

    // Pattern matches if message matches AND (code matches OR endpoint matches)
    if (messageMatch && (codeMatch || endpointMatch)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Get severity color for notifications
 */
export function getSeverityColor(severity: ErrorSeverity): string {
  switch (severity) {
    case 'critical':
      return '#FF0000'; // Red
    case 'high':
      return '#FF6600'; // Orange
    case 'medium':
      return '#FFCC00'; // Yellow
    case 'low':
      return '#00CC00'; // Green
    default:
      return '#808080'; // Gray
  }
}

/**
 * Get severity emoji for notifications
 */
export function getSeverityEmoji(severity: ErrorSeverity): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: ErrorCategory): string {
  const names: Record<ErrorCategory, string> = {
    api_failure: 'API Failure',
    database_error: 'Database Error',
    authentication: 'Authentication',
    validation: 'Validation',
    timeout: 'Timeout',
    rate_limit: 'Rate Limit',
    external_service: 'External Service',
    business_logic: 'Business Logic',
    security: 'Security',
    unknown: 'Unknown',
  };
  return names[category] || 'Unknown';
}
