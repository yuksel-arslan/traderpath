/**
 * TraderPath Economic Calendar Service
 * =====================================
 *
 * Fetches and analyzes economic events that impact crypto markets.
 *
 * Data Sources:
 * - Primary: Finnhub API (free tier available)
 * - Fallback: Hardcoded major recurring events
 *
 * Key Events Tracked:
 * - FOMC (Federal Reserve decisions)
 * - CPI (Consumer Price Index)
 * - NFP (Non-Farm Payrolls)
 * - GDP releases
 * - Interest rate decisions (Fed, ECB, BoE, BoJ)
 * - Crypto-specific events (ETF decisions, regulatory)
 */

import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EventImpact = 'high' | 'medium' | 'low';
export type EventCategory = 'monetary_policy' | 'employment' | 'inflation' | 'growth' | 'crypto_specific' | 'other';

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  date: string; // ISO date
  time: string; // HH:MM UTC
  impact: EventImpact;
  category: EventCategory;
  previous?: string;
  forecast?: string;
  actual?: string;
  description?: string;
  cryptoRelevance: 'direct' | 'indirect' | 'minimal';
  tradingImplication: string;
}

export interface EconomicCalendarResult {
  events: EconomicEvent[];
  todayHighImpact: EconomicEvent[];
  next24hHighImpact: EconomicEvent[];
  weekHighImpact: EconomicEvent[];
  riskLevel: 'high' | 'medium' | 'low';
  riskReason: string;
  tradingAdvice: string;
  lastUpdated: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Major recurring events that heavily impact crypto
const CRYPTO_RELEVANT_EVENTS = [
  'FOMC', 'Fed', 'Interest Rate', 'CPI', 'Inflation',
  'NFP', 'Non-Farm', 'Employment', 'Unemployment',
  'GDP', 'PCE', 'PPI', 'Retail Sales',
  'ECB', 'BoE', 'BoJ', 'Central Bank',
  'Bitcoin', 'Crypto', 'SEC', 'ETF'
];

// Known high-impact events for 2025-2026
const SCHEDULED_FOMC_DATES_2025 = [
  '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18',
  '2025-07-30', '2025-09-17', '2025-11-05', '2025-12-17'
];

const SCHEDULED_FOMC_DATES_2026 = [
  '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16'
];

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// ============================================================================
// ECONOMIC CALENDAR SERVICE
// ============================================================================

class EconomicCalendarService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY;
  }

  /**
   * Get economic calendar for the next 7 days
   */
  async getUpcomingEvents(): Promise<EconomicCalendarResult> {
    const cacheKey = 'economic_calendar';
    const cached = getCached<EconomicCalendarResult>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let events: EconomicEvent[] = [];

    // Try Finnhub API first
    if (this.apiKey) {
      try {
        events = await this.fetchFromFinnhub(now, weekFromNow);
      } catch (error) {
        console.warn('[EconomicCalendar] Finnhub fetch failed:', error);
      }
    }

    // Add hardcoded major events as fallback/supplement
    const hardcodedEvents = this.getHardcodedEvents(now, weekFromNow);

    // Merge and deduplicate
    const eventMap = new Map<string, EconomicEvent>();
    for (const event of [...events, ...hardcodedEvents]) {
      const key = `${event.date}-${event.title}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    }

    events = Array.from(eventMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Categorize events
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayHighImpact = events.filter(e =>
      e.date === todayStr && e.impact === 'high'
    );

    const next24hHighImpact = events.filter(e =>
      (e.date === todayStr || e.date === tomorrow) && e.impact === 'high'
    );

    const weekHighImpact = events.filter(e => e.impact === 'high');

    // Calculate risk level
    const { riskLevel, riskReason, tradingAdvice } = this.calculateRiskLevel(
      todayHighImpact,
      next24hHighImpact,
      weekHighImpact
    );

    const result: EconomicCalendarResult = {
      events,
      todayHighImpact,
      next24hHighImpact,
      weekHighImpact,
      riskLevel,
      riskReason,
      tradingAdvice,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 1 hour
    setCache(cacheKey, result, 60 * 60 * 1000);

    return result;
  }

  /**
   * Fetch events from Finnhub API
   */
  private async fetchFromFinnhub(from: Date, to: Date): Promise<EconomicEvent[]> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const response = await axios.get(`${FINNHUB_BASE_URL}/calendar/economic`, {
      params: {
        from: fromStr,
        to: toStr,
        token: this.apiKey,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data.economicCalendar || !Array.isArray(data.economicCalendar)) {
      return [];
    }

    return data.economicCalendar
      .filter((e: any) => this.isCryptoRelevant(e.event))
      .map((e: any) => this.transformFinnhubEvent(e));
  }

  /**
   * Transform Finnhub event to our format
   */
  private transformFinnhubEvent(e: any): EconomicEvent {
    const impact = this.determineImpact(e.event, e.impact);
    const category = this.determineCategory(e.event);
    const cryptoRelevance = this.determineCryptoRelevance(e.event);

    return {
      id: `finnhub-${e.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: e.event,
      country: e.country || 'US',
      date: e.date,
      time: e.time || '00:00',
      impact,
      category,
      previous: e.prev?.toString(),
      forecast: e.estimate?.toString(),
      actual: e.actual?.toString(),
      cryptoRelevance,
      tradingImplication: this.getTradingImplication(e.event, impact),
    };
  }

  /**
   * Get hardcoded major events
   */
  private getHardcodedEvents(from: Date, to: Date): EconomicEvent[] {
    const events: EconomicEvent[] = [];
    const fromTime = from.getTime();
    const toTime = to.getTime();

    // Add FOMC meetings
    const allFomcDates = [...SCHEDULED_FOMC_DATES_2025, ...SCHEDULED_FOMC_DATES_2026];
    for (const dateStr of allFomcDates) {
      const eventDate = new Date(dateStr);
      if (eventDate.getTime() >= fromTime && eventDate.getTime() <= toTime) {
        events.push({
          id: `fomc-${dateStr}`,
          title: 'FOMC Interest Rate Decision',
          country: 'US',
          date: dateStr,
          time: '18:00',
          impact: 'high',
          category: 'monetary_policy',
          cryptoRelevance: 'direct',
          tradingImplication: 'High volatility expected. Consider reducing position sizes or waiting for announcement.',
          description: 'Federal Reserve interest rate decision and policy statement.',
        });
      }
    }

    // Add monthly CPI (usually 2nd week of month)
    const currentMonth = from.getMonth();
    const currentYear = from.getFullYear();
    for (let i = 0; i < 2; i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const cpiDate = new Date(year, month, 12); // Approximate CPI date

      if (cpiDate.getTime() >= fromTime && cpiDate.getTime() <= toTime) {
        const dateStr = cpiDate.toISOString().split('T')[0];
        events.push({
          id: `cpi-${dateStr}`,
          title: 'US CPI (Consumer Price Index)',
          country: 'US',
          date: dateStr,
          time: '12:30',
          impact: 'high',
          category: 'inflation',
          cryptoRelevance: 'direct',
          tradingImplication: 'Inflation data directly impacts Fed policy expectations. Hot CPI = bearish for risk assets.',
          description: 'Monthly inflation report measuring consumer price changes.',
        });
      }
    }

    // Add monthly NFP (first Friday of month)
    for (let i = 0; i < 2; i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const firstDay = new Date(year, month, 1);
      const firstFriday = new Date(year, month, 1 + ((5 - firstDay.getDay() + 7) % 7));

      if (firstFriday.getTime() >= fromTime && firstFriday.getTime() <= toTime) {
        const dateStr = firstFriday.toISOString().split('T')[0];
        events.push({
          id: `nfp-${dateStr}`,
          title: 'US Non-Farm Payrolls (NFP)',
          country: 'US',
          date: dateStr,
          time: '12:30',
          impact: 'high',
          category: 'employment',
          cryptoRelevance: 'indirect',
          tradingImplication: 'Strong jobs = hawkish Fed = bearish crypto. Weak jobs = dovish Fed = bullish crypto.',
          description: 'Monthly employment report showing job creation.',
        });
      }
    }

    return events;
  }

  /**
   * Check if event is relevant to crypto
   */
  private isCryptoRelevant(eventTitle: string): boolean {
    const title = eventTitle.toLowerCase();
    return CRYPTO_RELEVANT_EVENTS.some(keyword =>
      title.includes(keyword.toLowerCase())
    );
  }

  /**
   * Determine event impact level
   */
  private determineImpact(eventTitle: string, apiImpact?: number): EventImpact {
    const title = eventTitle.toLowerCase();

    // High impact events
    if (title.includes('fomc') || title.includes('fed') ||
        title.includes('interest rate') || title.includes('cpi') ||
        title.includes('nfp') || title.includes('non-farm') ||
        title.includes('gdp')) {
      return 'high';
    }

    // Medium impact
    if (title.includes('ppi') || title.includes('retail sales') ||
        title.includes('unemployment') || title.includes('pce')) {
      return 'medium';
    }

    // Use API impact if available (Finnhub uses 1-3 scale)
    if (apiImpact) {
      if (apiImpact >= 3) return 'high';
      if (apiImpact >= 2) return 'medium';
    }

    return 'low';
  }

  /**
   * Determine event category
   */
  private determineCategory(eventTitle: string): EventCategory {
    const title = eventTitle.toLowerCase();

    if (title.includes('fomc') || title.includes('fed') ||
        title.includes('interest rate') || title.includes('ecb') ||
        title.includes('boe') || title.includes('boj') ||
        title.includes('central bank')) {
      return 'monetary_policy';
    }

    if (title.includes('nfp') || title.includes('employment') ||
        title.includes('unemployment') || title.includes('jobless') ||
        title.includes('payroll')) {
      return 'employment';
    }

    if (title.includes('cpi') || title.includes('ppi') ||
        title.includes('inflation') || title.includes('pce')) {
      return 'inflation';
    }

    if (title.includes('gdp') || title.includes('growth')) {
      return 'growth';
    }

    if (title.includes('bitcoin') || title.includes('crypto') ||
        title.includes('sec') || title.includes('etf')) {
      return 'crypto_specific';
    }

    return 'other';
  }

  /**
   * Determine crypto relevance
   */
  private determineCryptoRelevance(eventTitle: string): 'direct' | 'indirect' | 'minimal' {
    const title = eventTitle.toLowerCase();

    // Direct impact on crypto
    if (title.includes('fomc') || title.includes('fed') ||
        title.includes('interest rate') || title.includes('cpi') ||
        title.includes('bitcoin') || title.includes('crypto') ||
        title.includes('sec') || title.includes('etf')) {
      return 'direct';
    }

    // Indirect impact
    if (title.includes('nfp') || title.includes('gdp') ||
        title.includes('unemployment') || title.includes('ppi')) {
      return 'indirect';
    }

    return 'minimal';
  }

  /**
   * Get trading implication text
   */
  private getTradingImplication(eventTitle: string, impact: EventImpact): string {
    const title = eventTitle.toLowerCase();

    if (title.includes('fomc') || title.includes('interest rate')) {
      return 'High volatility expected. Consider reducing position sizes 24h before. Rate hike = bearish, rate cut = bullish.';
    }

    if (title.includes('cpi') || title.includes('inflation')) {
      return 'Inflation data impacts Fed policy expectations. Higher than expected = bearish for risk assets.';
    }

    if (title.includes('nfp') || title.includes('employment')) {
      return 'Employment data affects rate expectations. Strong jobs = hawkish Fed = potential bearish pressure.';
    }

    if (title.includes('gdp')) {
      return 'Growth data impacts risk sentiment. Strong GDP can be mixed - good for economy but may keep rates higher.';
    }

    if (impact === 'high') {
      return 'High-impact event. Consider reducing leverage and position sizes.';
    }

    if (impact === 'medium') {
      return 'Medium-impact event. Monitor price action around announcement time.';
    }

    return 'Low-impact event. Minimal effect expected on crypto markets.';
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(
    todayHigh: EconomicEvent[],
    next24hHigh: EconomicEvent[],
    weekHigh: EconomicEvent[]
  ): { riskLevel: 'high' | 'medium' | 'low'; riskReason: string; tradingAdvice: string } {
    // High risk: FOMC or multiple high-impact events today
    if (todayHigh.some(e => e.title.toLowerCase().includes('fomc'))) {
      return {
        riskLevel: 'high',
        riskReason: 'FOMC decision today - extreme volatility expected',
        tradingAdvice: 'Avoid new positions. Consider closing or hedging existing positions. Wait for dust to settle.',
      };
    }

    if (todayHigh.length >= 2) {
      return {
        riskLevel: 'high',
        riskReason: `${todayHigh.length} high-impact events today`,
        tradingAdvice: 'Reduce position sizes. Use wider stops or avoid trading during announcements.',
      };
    }

    if (todayHigh.length === 1) {
      return {
        riskLevel: 'medium',
        riskReason: `High-impact event today: ${todayHigh[0].title}`,
        tradingAdvice: 'Be cautious around announcement time. Consider reduced position sizes.',
      };
    }

    // Medium risk: High impact tomorrow or multiple this week
    if (next24hHigh.length > 0) {
      return {
        riskLevel: 'medium',
        riskReason: `${next24hHigh.length} high-impact event(s) in next 24h`,
        tradingAdvice: 'Plan positions with upcoming events in mind. Avoid holding through announcements.',
      };
    }

    if (weekHigh.length >= 3) {
      return {
        riskLevel: 'medium',
        riskReason: `${weekHigh.length} high-impact events this week`,
        tradingAdvice: 'Active week for economic data. Be prepared for volatility spikes.',
      };
    }

    // Low risk
    return {
      riskLevel: 'low',
      riskReason: weekHigh.length > 0
        ? `${weekHigh.length} high-impact event(s) this week, none imminent`
        : 'No major economic events in the near term',
      tradingAdvice: 'Normal trading conditions. Standard risk management applies.',
    };
  }

  /**
   * Get a summary suitable for analysis
   */
  async getAnalysisSummary(): Promise<{
    riskLevel: 'high' | 'medium' | 'low';
    todayEvents: string[];
    upcomingMajor: string[];
    tradingAdvice: string;
    score: number; // 0-100 where 100 = no risk, 0 = high risk
  }> {
    const calendar = await this.getUpcomingEvents();

    const todayEvents = calendar.todayHighImpact.map(e =>
      `${e.title} at ${e.time} UTC`
    );

    const upcomingMajor = calendar.weekHighImpact
      .filter(e => e.date !== new Date().toISOString().split('T')[0])
      .slice(0, 3)
      .map(e => `${e.title} on ${e.date}`);

    // Score: 100 = safe, 0 = very risky
    let score = 100;
    if (calendar.riskLevel === 'high') score = 20;
    else if (calendar.riskLevel === 'medium') score = 60;
    else score = 90;

    // Adjust for number of events
    score -= calendar.todayHighImpact.length * 15;
    score -= calendar.next24hHighImpact.length * 5;
    score = Math.max(0, Math.min(100, score));

    return {
      riskLevel: calendar.riskLevel,
      todayEvents,
      upcomingMajor,
      tradingAdvice: calendar.tradingAdvice,
      score,
    };
  }
}

export const economicCalendarService = new EconomicCalendarService();
export default economicCalendarService;
