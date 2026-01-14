/**
 * TFT Prediction Service Client
 * Calls the Python TFT service for price predictions
 */

interface TFTScenario {
  name: 'bull' | 'base' | 'bear';
  price: number;
  probability: number;
  change_percent?: number;
}

interface TFTPrediction {
  symbol: string;
  price_24h: number;
  price_7d: number;
  confidence: number;
  scenarios: TFTScenario[];
  model_type: 'tft' | 'statistical_fallback';
  data_points: number;
  attention_weights?: Record<string, unknown>;
}

interface TFTForecast {
  price24h: number;
  price7d: number;
  confidence: number;
  scenarios: Array<{
    name: 'bull' | 'base' | 'bear';
    price: number;
    probability: number;
  }>;
  modelType: string;
  attentionWeights?: Record<string, unknown>;
}

class TFTClientService {
  private baseUrl: string;
  private timeout: number;
  private enabled: boolean;

  constructor() {
    this.baseUrl = process.env.TFT_SERVICE_URL || 'http://localhost:8000';
    this.timeout = parseInt(process.env.TFT_TIMEOUT || '10000', 10);
    this.enabled = process.env.TFT_ENABLED !== 'false';
  }

  /**
   * Check if TFT service is available
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get prediction from TFT service
   */
  async predict(symbol: string): Promise<TFTForecast | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/predict/${symbol}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`TFT service returned ${response.status} for ${symbol}`);
        return null;
      }

      const data: TFTPrediction = await response.json();

      // Transform to internal format
      return {
        price24h: data.price_24h,
        price7d: data.price_7d,
        confidence: data.confidence,
        scenarios: data.scenarios.map(s => ({
          name: s.name,
          price: s.price,
          probability: s.probability,
        })),
        modelType: data.model_type,
        attentionWeights: data.attention_weights,
      };
    } catch (error) {
      console.warn(`TFT prediction failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get predictions for multiple symbols
   */
  async batchPredict(symbols: string[]): Promise<Map<string, TFTForecast>> {
    const results = new Map<string, TFTForecast>();

    if (!this.enabled) {
      return results;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2);

      const response = await fetch(`${this.baseUrl}/predict/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return results;
      }

      const data: Record<string, TFTPrediction> = await response.json();

      for (const [symbol, prediction] of Object.entries(data)) {
        if (prediction && !('error' in prediction)) {
          results.set(symbol, {
            price24h: prediction.price_24h,
            price7d: prediction.price_7d,
            confidence: prediction.confidence,
            scenarios: prediction.scenarios.map(s => ({
              name: s.name,
              price: s.price,
              probability: s.probability,
            })),
            modelType: prediction.model_type,
            attentionWeights: prediction.attention_weights,
          });
        }
      }
    } catch (error) {
      console.warn('TFT batch prediction failed:', error);
    }

    return results;
  }
}

// Singleton instance
let tftClient: TFTClientService | null = null;

export function getTFTClient(): TFTClientService {
  if (!tftClient) {
    tftClient = new TFTClientService();
  }
  return tftClient;
}

export type { TFTForecast, TFTScenario };
