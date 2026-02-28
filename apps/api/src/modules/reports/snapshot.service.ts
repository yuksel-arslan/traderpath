// ===========================================
// Snapshot Service
// Generates PNG snapshots from HTML templates
// Uses Puppeteer for server-side rendering
// ===========================================

import { logger } from '../../core/logger';
import {
  getExecutiveSummaryPages,
  getDetailedAnalysisPages,
  type SnapshotType,
} from './snapshot-templates';
import { generateCandlestickSVG } from './svg-chart-generator';

interface SnapshotResult {
  id: string;
  title: string;
  buffer: Buffer;
  width: number;
  height: number;
}

interface SnapshotOptions {
  width?: number;
  scale?: number;
}

class SnapshotService {
  private browser: unknown | null = null;
  private browserPromise: Promise<unknown> | null = null;

  /**
   * Get or launch a Puppeteer browser instance
   */
  private async getBrowser(): Promise<unknown> {
    if (this.browser) return this.browser;
    if (this.browserPromise) return this.browserPromise;

    this.browserPromise = (async () => {
      try {
        // Dynamic import to avoid issues if puppeteer is not installed
        const puppeteer = await import('puppeteer');
        const launchOptions: Record<string, unknown> = {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--font-render-hinting=none',
          ],
        };
        // Use system Chromium if available (Docker/Railway)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        const browser = await puppeteer.default.launch(launchOptions);
        this.browser = browser;
        logger.info('[SnapshotService] Puppeteer browser launched');
        return browser;
      } catch (err) {
        logger.error('[SnapshotService] Failed to launch Puppeteer:', err);
        this.browserPromise = null;
        throw err;
      }
    })();

    return this.browserPromise;
  }

  /**
   * Render HTML to PNG buffer using Puppeteer
   */
  private async renderHtmlToPng(html: string, options: SnapshotOptions = {}): Promise<Buffer> {
    const { width = 800, scale = 2 } = options;
    const browser = await this.getBrowser() as { newPage: () => Promise<unknown> };
    const page = await browser.newPage() as {
      setViewport: (opts: { width: number; height: number; deviceScaleFactor: number }) => Promise<void>;
      setContent: (html: string, opts: { waitUntil: string }) => Promise<void>;
      evaluate: (fn: () => unknown) => Promise<unknown>;
      screenshot: (opts: { type: string; fullPage: boolean; omitBackground: boolean }) => Promise<Buffer>;
      close: () => Promise<void>;
    };

    try {
      await page.setViewport({
        width,
        height: 600,
        deviceScaleFactor: scale,
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Get actual content height
      const bodyHeight = await page.evaluate(() => {
        const body = document.body;
        return body.scrollHeight;
      }) as number;

      // Resize viewport to match content
      await page.setViewport({
        width,
        height: bodyHeight,
        deviceScaleFactor: scale,
      });

      const buffer = await page.screenshot({
        type: 'png',
        fullPage: true,
        omitBackground: false,
      });

      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate chart SVG for report
   */
  private generateChartSvg(reportData: Record<string, unknown>): string | undefined {
    try {
      const assetScan = reportData.assetScan as Record<string, unknown> | undefined;
      const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;
      const chartCandles = assetScan?.chartCandles as Array<{
        timestamp: number; open: number; high: number; low: number; close: number; volume: number;
      }> | undefined;

      if (!chartCandles || chartCandles.length === 0) return undefined;

      const levels: Array<{ price: number; color: string; label: string; dashArray?: string }> = [];

      // Entry
      const avgEntry = tradePlan?.averageEntry as number | undefined;
      if (avgEntry) {
        levels.push({ price: avgEntry, color: '#FFB800', label: 'Entry' });
      }

      // Stop Loss
      const slObj = tradePlan?.stopLoss as { price: number } | undefined;
      if (slObj?.price) {
        levels.push({ price: slObj.price, color: '#FF4757', label: 'SL' });
      }

      // Take Profits
      const tps = tradePlan?.takeProfits as Array<{ price: number }> | undefined;
      if (tps) {
        tps.filter(Boolean).forEach((tp, i) => {
          if (tp.price) {
            levels.push({ price: tp.price, color: '#00F5A0', label: `TP${i + 1}` });
          }
        });
      }

      return generateCandlestickSVG(chartCandles.slice(-50), {
        width: 750,
        height: 280,
        title: `${(reportData.symbol as string) || ''}/USDT`,
        subtitle: `Last ${Math.min(50, chartCandles.length)} candles`,
        levels,
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Generate Executive Summary snapshots (3-4 PNGs)
   */
  async generateExecutiveSummary(reportData: Record<string, unknown>): Promise<SnapshotResult[]> {
    const pages = getExecutiveSummaryPages();
    const chartSvg = this.generateChartSvg(reportData);
    const results: SnapshotResult[] = [];

    for (const page of pages) {
      try {
        const html = page.generate(reportData as never, chartSvg);
        const buffer = await this.renderHtmlToPng(html);
        results.push({
          id: page.id,
          title: page.title,
          buffer,
          width: 800,
          height: 0, // Will be determined by content
        });
      } catch (err) {
        logger.error(`[SnapshotService] Failed to generate ${page.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Generate Detailed Analysis snapshots (6-8 PNGs)
   */
  async generateDetailedAnalysis(reportData: Record<string, unknown>): Promise<SnapshotResult[]> {
    const pages = getDetailedAnalysisPages();
    const chartSvg = this.generateChartSvg(reportData);
    const results: SnapshotResult[] = [];

    for (const page of pages) {
      try {
        const html = page.generate(reportData as never, chartSvg);
        const buffer = await this.renderHtmlToPng(html);
        results.push({
          id: page.id,
          title: page.title,
          buffer,
          width: 800,
          height: 0,
        });
      } catch (err) {
        logger.error(`[SnapshotService] Failed to generate ${page.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Generate snapshots based on type
   */
  async generateSnapshots(
    reportData: Record<string, unknown>,
    type: SnapshotType = 'executive'
  ): Promise<SnapshotResult[]> {
    logger.info(`[SnapshotService] Generating ${type} snapshots for ${(reportData.symbol as string) || 'unknown'}`);

    try {
      if (type === 'detailed') {
        return await this.generateDetailedAnalysis(reportData);
      }
      return await this.generateExecutiveSummary(reportData);
    } catch (err) {
      logger.error('[SnapshotService] Snapshot generation failed:', err);
      return [];
    }
  }

  /**
   * Check if Puppeteer is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await import('puppeteer');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        await (this.browser as { close: () => Promise<void> }).close();
      } catch {
        // Ignore close errors
      }
      this.browser = null;
      this.browserPromise = null;
    }
  }
}

export const snapshotService = new SnapshotService();
export type { SnapshotResult, SnapshotType };
