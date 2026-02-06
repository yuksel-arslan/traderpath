/**
 * Citation Service
 *
 * Manages source citations throughout the RAG pipeline.
 * Validates, scores, deduplicates, and formats citations.
 */

import { nanoid } from 'nanoid';
import { Citation, TrustedSource } from '../types';
import { AssetClass } from '../../analysis/types/asset-metrics.types';
import {
  lookupSource,
  isBlockedDomain,
  getReliabilityScore,
  TIER_SCORES,
} from './sources/source-allowlist';

// ============================================================================
// CITATION SERVICE
// ============================================================================

export class CitationService {
  /**
   * Create a citation from raw data
   * Validates the source against the allowlist
   */
  createCitation(data: {
    url: string;
    title: string;
    publishedAt?: string;
    excerpt?: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    category?: 'news' | 'data' | 'research' | 'economic_event';
  }): Citation | null {
    // Block untrustworthy sources
    if (isBlockedDomain(data.url)) return null;

    const source = lookupSource(data.url);
    const reliability = getReliabilityScore(data.url);

    return {
      id: nanoid(),
      source: this.extractDomain(data.url),
      sourceName: source?.name || this.extractDomain(data.url),
      title: data.title,
      url: data.url,
      publishedAt: data.publishedAt || new Date().toISOString(),
      reliability,
      relevance: 50, // Default, will be scored later
      excerpt: data.excerpt,
      sentiment: data.sentiment,
      category: data.category || 'news',
    };
  }

  /**
   * Score a citation's relevance to a specific symbol and asset class
   */
  scoreCitation(
    citation: Citation,
    symbol: string,
    assetClass: AssetClass,
  ): Citation {
    let relevance = 50; // Base

    // Boost if source specializes in this asset class
    const source = lookupSource(citation.url);
    if (source && source.assetClasses.includes(assetClass)) {
      relevance += 15;
    }

    // Boost if title/excerpt mentions the symbol
    const symbolLower = symbol.toLowerCase();
    const titleLower = citation.title.toLowerCase();
    if (titleLower.includes(symbolLower)) {
      relevance += 20;
    }
    if (citation.excerpt?.toLowerCase().includes(symbolLower)) {
      relevance += 10;
    }

    // Boost for recency (last 24 hours = +10, last 7 days = +5)
    const ageHours = (Date.now() - new Date(citation.publishedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) relevance += 10;
    else if (ageHours < 168) relevance += 5;

    // Penalty for low reliability
    if (citation.reliability < 50) relevance -= 15;

    // Cap at 0-100
    citation.relevance = Math.max(0, Math.min(100, relevance));
    return citation;
  }

  /**
   * Deduplicate citations by URL (keep highest relevance)
   */
  deduplicateCitations(citations: Citation[]): Citation[] {
    const seen = new Map<string, Citation>();
    for (const c of citations) {
      const key = c.url.toLowerCase().replace(/\/$/, '');
      const existing = seen.get(key);
      if (!existing || c.relevance > existing.relevance) {
        seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Sort citations by relevance (highest first), then reliability
   */
  sortCitations(citations: Citation[]): Citation[] {
    return [...citations].sort((a, b) => {
      const relevanceDiff = b.relevance - a.relevance;
      if (relevanceDiff !== 0) return relevanceDiff;
      return b.reliability - a.reliability;
    });
  }

  /**
   * Filter citations: remove blocked, score, dedup, sort, limit
   */
  processCitations(
    citations: Citation[],
    symbol: string,
    assetClass: AssetClass,
    limit: number = 10,
  ): Citation[] {
    const scored = citations
      .filter(c => !isBlockedDomain(c.url))
      .map(c => this.scoreCitation(c, symbol, assetClass));

    const deduped = this.deduplicateCitations(scored);
    const sorted = this.sortCitations(deduped);
    return sorted.slice(0, limit);
  }

  /**
   * Format citations for display in reports
   */
  formatForDisplay(citations: Citation[], limit: number = 5): string[] {
    return citations.slice(0, limit).map((c, i) => {
      const sentiment = c.sentiment ? ` (${c.sentiment})` : '';
      return `[${i + 1}] ${c.sourceName}: "${c.title}"${sentiment}`;
    });
  }

  /**
   * Format citations for PDF/HTML reports
   */
  formatForPDF(citations: Citation[]): string {
    if (citations.length === 0) return '';

    const items = citations.slice(0, 8).map((c, i) => {
      const date = new Date(c.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `<div style="margin-bottom:4px;font-size:9px;color:#666;">
        [${i + 1}] <strong>${c.sourceName}</strong> — ${c.title} (${date})
        ${c.excerpt ? `<br/><em>"${c.excerpt}"</em>` : ''}
      </div>`;
    });

    return `<div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:8px;">
      <div style="font-size:10px;font-weight:bold;margin-bottom:6px;color:#374151;">Sources</div>
      ${items.join('')}
    </div>`;
  }

  /**
   * Check cross-validation: does more than one source support a claim?
   */
  checkCrossValidation(
    citations: Citation[],
    sentiment: 'bullish' | 'bearish' | 'neutral',
  ): { validated: boolean; agreeing: number; total: number } {
    const withSentiment = citations.filter(c => c.sentiment != null);
    const agreeing = withSentiment.filter(c => c.sentiment === sentiment).length;
    return {
      validated: agreeing >= 2 || withSentiment.length <= 1,
      agreeing,
      total: withSentiment.length,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}

// Singleton export
export const citationService = new CitationService();
