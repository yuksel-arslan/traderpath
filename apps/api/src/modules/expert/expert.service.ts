// ===========================================
// Expert AI Service
// Provides AI-powered answers with real examples from TradePath
// ===========================================

import { prisma } from '../../core/database';
import { config } from '../../core/config';
import { costService } from '../costs/cost.service';

// Topic categories for question classification
type TopicCategory =
  | 'TECHNICAL_ANALYSIS'
  | 'WHALE_BEHAVIOR'
  | 'RISK_MANAGEMENT'
  | 'MARKET_STRUCTURE'
  | 'MANIPULATION'
  | 'PSYCHOLOGY'
  | 'TRADE_PLAN'
  | 'ENTRY_EXIT'
  | 'GENERAL';

interface ExampleData {
  type: 'analysis' | 'quiz' | 'pattern';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

interface ExpertResponse {
  answer: string;
  examples: ExampleData[];
  relatedTopics: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Keywords for topic classification
const TOPIC_KEYWORDS: Record<TopicCategory, string[]> = {
  TECHNICAL_ANALYSIS: [
    'rsi', 'macd', 'bollinger', 'moving average', 'ma', 'ema', 'sma',
    'trend', 'destek', 'direnç', 'support', 'resistance', 'indicator',
    'gösterge', 'indikatör', 'teknik', 'technical', 'chart', 'grafik',
    'fibonacci', 'fib', 'pivot', 'atr', 'volume', 'hacim'
  ],
  WHALE_BEHAVIOR: [
    'whale', 'balina', 'büyük alıcı', 'büyük satıcı', 'akümülasyon',
    'accumulation', 'distribution', 'dağıtım', 'smart money', 'akıllı para',
    'exchange flow', 'borsa akışı', 'inflow', 'outflow', 'giriş', 'çıkış'
  ],
  RISK_MANAGEMENT: [
    'risk', 'stop loss', 'zarar durdur', 'position size', 'pozisyon boyutu',
    'risk/reward', 'risk ödül', 'sermaye', 'capital', 'kayıp', 'loss',
    'yönetim', 'management', 'portföy', 'portfolio', 'diversification'
  ],
  MARKET_STRUCTURE: [
    'btc dominance', 'dominans', 'market cap', 'piyasa değeri',
    'fear greed', 'korku açgözlülük', 'bull', 'bear', 'boğa', 'ayı',
    'market cycle', 'piyasa döngüsü', 'trend', 'regime', 'rejim',
    'altcoin season', 'altcoin sezonu'
  ],
  MANIPULATION: [
    'manipülasyon', 'manipulation', 'pump', 'dump', 'spoofing',
    'wash trading', 'fake volume', 'sahte hacim', 'iceberg',
    'layering', 'front running', 'hile', 'scam', 'dolandırıcılık'
  ],
  PSYCHOLOGY: [
    'fomo', 'fud', 'korku', 'fear', 'açgözlülük', 'greed', 'panik',
    'panic', 'sabır', 'patience', 'disiplin', 'discipline', 'duygu',
    'emotion', 'psikoloji', 'psychology', 'mental', 'zihinsel'
  ],
  TRADE_PLAN: [
    'trade plan', 'işlem planı', 'strateji', 'strategy', 'entry',
    'giriş', 'exit', 'çıkış', 'take profit', 'kar al', 'hedef',
    'target', 'dca', 'average', 'ortalama', 'trailing', 'takip'
  ],
  ENTRY_EXIT: [
    'ne zaman', 'when', 'entry', 'giriş', 'exit', 'çıkış',
    'timing', 'zamanlama', 'alım', 'buy', 'satım', 'sell',
    'bekle', 'wait', 'şimdi', 'now', 'optimal', 'en iyi'
  ],
  GENERAL: []
};

export class ExpertService {
  /**
   * Classify the topic of a question
   */
  private classifyTopic(question: string): TopicCategory {
    const lowerQuestion = question.toLowerCase();

    let bestMatch: TopicCategory = 'GENERAL';
    let bestScore = 0;

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (topic === 'GENERAL') continue;

      const score = keywords.filter(kw => lowerQuestion.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = topic as TopicCategory;
      }
    }

    return bestMatch;
  }

  /**
   * Find relevant examples from TradePath based on question topic
   */
  async findExamples(question: string, userId?: string): Promise<ExampleData[]> {
    const topic = this.classifyTopic(question);
    const examples: ExampleData[] = [];

    try {
      // 1. Get relevant quiz questions as educational examples
      const quizzes = await prisma.quiz.findMany({
        where: {
          category: topic !== 'GENERAL' ? topic : undefined,
          isActive: true,
        },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      for (const quiz of quizzes) {
        const options = quiz.options as string[];
        examples.push({
          type: 'quiz',
          title: 'Eğitim Örneği',
          description: quiz.question,
          details: {
            correctAnswer: options[quiz.correctIndex],
            explanation: quiz.explanation || '',
            category: quiz.category,
          },
        });
      }

      // 2. Get user's recent analyses as real trading examples
      if (userId) {
        const recentAnalyses = await prisma.analysis.findMany({
          where: {
            userId,
            step7Result: { not: null }, // Only completed analyses
          },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            symbol: true,
            step2Result: true, // Asset scan
            step3Result: true, // Safety check
            step5Result: true, // Trade plan
            step7Result: true, // Verdict
            createdAt: true,
          },
        });

        for (const analysis of recentAnalyses) {
          const verdict = analysis.step7Result as Record<string, unknown> | null;
          const tradePlan = analysis.step5Result as Record<string, unknown> | null;
          const safety = analysis.step3Result as Record<string, unknown> | null;

          if (verdict) {
            examples.push({
              type: 'analysis',
              title: `${analysis.symbol} Analizi`,
              description: `Gerçek analiz örneği: ${(verdict.verdict as string || 'N/A').toUpperCase()} sinyali`,
              details: {
                symbol: analysis.symbol,
                verdict: verdict.verdict,
                score: verdict.overallScore,
                direction: tradePlan?.direction || 'N/A',
                riskLevel: safety?.riskLevel || 'N/A',
                date: analysis.createdAt,
              },
            });
          }
        }
      }

      // 3. Add pattern examples based on topic
      const patternExamples = this.getPatternExamples(topic);
      examples.push(...patternExamples);

    } catch (error) {
      console.error('Error finding examples:', error);
    }

    return examples.slice(0, 5); // Return max 5 examples
  }

  /**
   * Get pattern examples for educational purposes
   */
  private getPatternExamples(topic: TopicCategory): ExampleData[] {
    const patterns: Record<TopicCategory, ExampleData[]> = {
      TECHNICAL_ANALYSIS: [
        {
          type: 'pattern',
          title: 'RSI Aşırı Satım Örneği',
          description: 'RSI 30 altına düştüğünde potansiyel alım fırsatı',
          details: {
            indicator: 'RSI',
            condition: 'RSI < 30',
            action: 'Alım fırsatı değerlendir',
            note: 'Tek başına yeterli değil, trend ve hacim ile doğrula',
          },
        },
        {
          type: 'pattern',
          title: 'MACD Kesişim Örneği',
          description: 'MACD çizgisi sinyal çizgisini yukarı keserse alım sinyali',
          details: {
            indicator: 'MACD',
            condition: 'MACD > Signal',
            action: 'Bullish momentum',
            note: 'Histogram pozitife döndüğünde güç artıyor demektir',
          },
        },
      ],
      WHALE_BEHAVIOR: [
        {
          type: 'pattern',
          title: 'Balina Akümülasyonu Örneği',
          description: 'Borsalardan büyük çıkışlar akümülasyon işareti',
          details: {
            signal: 'Exchange Outflow',
            meaning: 'Büyük yatırımcılar soğuk cüzdana çekiyor',
            action: 'Bullish sinyal olabilir',
            note: 'Net outflow > $100M güçlü sinyal',
          },
        },
      ],
      MANIPULATION: [
        {
          type: 'pattern',
          title: 'Pump & Dump Tespiti',
          description: 'Ani fiyat artışı + yüksek hacim = dikkat!',
          details: {
            warning: 'Fiyat %20+ artış + hacim 5x normal',
            risk: 'Pump & dump olasılığı yüksek',
            action: 'FOMO\'ya kapılma, bekle ve izle',
            note: 'Özellikle düşük piyasa değerli coinlerde dikkat',
          },
        },
      ],
      RISK_MANAGEMENT: [
        {
          type: 'pattern',
          title: 'Pozisyon Boyutlandırma Örneği',
          description: '1% kuralı: Her işlemde maksimum %1 risk',
          details: {
            example: '10,000$ portföy = 100$ maksimum risk',
            stopLoss: '%5 stop loss ile 2,000$ pozisyon',
            note: 'Risk/Ödül en az 1:2 olmalı',
          },
        },
      ],
      TRADE_PLAN: [
        {
          type: 'pattern',
          title: 'DCA Giriş Stratejisi',
          description: 'Kademeli alım ile ortalama maliyet düşürme',
          details: {
            entry1: '%40 - İlk giriş (mevcut fiyat)',
            entry2: '%30 - İkinci giriş (%3-5 düşüşte)',
            entry3: '%30 - Üçüncü giriş (%7-10 düşüşte)',
            note: 'Stop loss ortalama girişe göre ayarla',
          },
        },
      ],
      MARKET_STRUCTURE: [
        {
          type: 'pattern',
          title: 'BTC Dominans Etkisi',
          description: 'BTC dominans yükselirse altcoinler genelde düşer',
          details: {
            scenario1: 'BTC dominans ↑ + BTC fiyat ↑ = Altcoin satışı',
            scenario2: 'BTC dominans ↓ + BTC fiyat ↑ = Altcoin sezonu',
            action: 'Dominans trendini takip et',
          },
        },
      ],
      PSYCHOLOGY: [
        {
          type: 'pattern',
          title: 'FOMO Kontrolü',
          description: 'Pump gören coine atlama, planına sadık kal',
          details: {
            rule: 'Yeşil mumlar gördüğünde değil, kırmızı mumlar gördüğünde al',
            mindset: 'Kaçırdığın işlem değil, koruduğun sermaye önemli',
            tip: 'İşlem yapmamak da bir stratejidir',
          },
        },
      ],
      ENTRY_EXIT: [
        {
          type: 'pattern',
          title: 'Optimal Giriş Zamanlaması',
          description: 'Destek seviyesine yakın al, dirençte sat',
          details: {
            entry: 'Fiyat desteğe yakınsa ve RSI < 40',
            exit: 'Fiyat dirence yakınsa veya RSI > 70',
            confirmation: 'Hacim artışı ile doğrula',
          },
        },
      ],
      GENERAL: [],
    };

    return patterns[topic] || [];
  }

  /**
   * Generate expert answer using Gemini AI
   */
  async generateAnswer(
    question: string,
    examples: ExampleData[],
    userId?: string
  ): Promise<ExpertResponse> {
    const topic = this.classifyTopic(question);
    const startTime = Date.now();

    // Format examples for the prompt
    const examplesText = examples.map((ex, i) => {
      const detailsStr = Object.entries(ex.details)
        .map(([k, v]) => `  - ${k}: ${JSON.stringify(v)}`)
        .join('\n');
      return `Örnek ${i + 1} (${ex.type}): ${ex.title}\n${ex.description}\n${detailsStr}`;
    }).join('\n\n');

    const prompt = `Sen TradePath platformunun uzman trading eğitmenisin. Kullanıcılara kripto trading konusunda yardımcı oluyorsun.

KULLANICI SORUSU:
${question}

TESPİT EDİLEN KONU: ${topic}

TradePath'TEN GERÇEK ÖRNEKLER:
${examplesText || 'Henüz ilgili örnek yok'}

ÖNEMLİ TALİMATLAR:
1. Soruyu TÜRKÇE olarak cevapla (profesyonel ama anlaşılır dil)
2. Eğer örnekler varsa, bunları cevabına dahil et ve "TradePath'te gördüğümüz gibi..." şeklinde referans ver
3. Pratik ve uygulanabilir tavsiyeler ver
4. Riskler hakkında uyar ama aşırı korku yaratma
5. Cevabın 3-5 paragraf uzunluğunda olsun
6. Her zaman "Bu finansal tavsiye değildir" uyarısı ekle

CEVAP FORMAT:
- Önce soruyu doğrudan cevapla
- Sonra örneklerle açıkla
- En son pratik bir tavsiye ver`;

    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      return {
        answer: 'Uzman AI şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
        examples,
        relatedTopics: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', response.statusText);
        return {
          answer: 'Uzman AI yanıt oluşturamadı. Lütfen tekrar deneyin.',
          examples,
          relatedTopics: [],
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        };
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt oluşturulamadı';

      // Extract token usage
      const usageMetadata = data.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount || Math.ceil(prompt.length / 4);
      const outputTokens = usageMetadata.candidatesTokenCount || Math.ceil(answer.length / 4);

      // Calculate cost
      const costUsd = costService.calculateGeminiCost(inputTokens, outputTokens);
      const durationMs = Date.now() - startTime;

      // Log cost
      costService.logCost({
        service: 'gemini',
        operation: 'expert_question',
        inputTokens,
        outputTokens,
        costUsd,
        userId,
        durationMs,
        metadata: { topic, questionLength: question.length },
      }).catch(err => console.error('Failed to log cost:', err));

      // Get related topics
      const relatedTopics = this.getRelatedTopics(topic);

      return {
        answer,
        examples,
        relatedTopics,
        inputTokens,
        outputTokens,
        costUsd,
      };
    } catch (error) {
      console.error('Expert AI error:', error);
      return {
        answer: 'Bir hata oluştu. Lütfen tekrar deneyin.',
        examples,
        relatedTopics: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }
  }

  /**
   * Get related topics for further learning
   */
  private getRelatedTopics(topic: TopicCategory): string[] {
    const relatedMap: Record<TopicCategory, string[]> = {
      TECHNICAL_ANALYSIS: ['Destek/Direnç Seviyeleri', 'RSI Stratejileri', 'Trend Analizi'],
      WHALE_BEHAVIOR: ['Exchange Flow Analizi', 'Smart Money Takibi', 'Order Book Okuma'],
      RISK_MANAGEMENT: ['Pozisyon Boyutlandırma', 'Stop Loss Stratejileri', 'Portföy Çeşitlendirme'],
      MARKET_STRUCTURE: ['BTC Dominans', 'Altcoin Sezonları', 'Market Döngüleri'],
      MANIPULATION: ['Pump & Dump Tespiti', 'Wash Trading', 'Spoofing'],
      PSYCHOLOGY: ['FOMO Kontrolü', 'Disiplin', 'Trading Planı'],
      TRADE_PLAN: ['Entry Stratejileri', 'Take Profit Ayarlama', 'DCA Yöntemi'],
      ENTRY_EXIT: ['Zamanlama', 'Hacim Analizi', 'Momentum Trading'],
      GENERAL: ['Teknik Analiz Temelleri', 'Risk Yönetimi', 'Psikoloji'],
    };

    return relatedMap[topic] || relatedMap.GENERAL;
  }

  /**
   * Main method: Ask the expert
   */
  async askExpert(question: string, userId?: string): Promise<ExpertResponse> {
    // Find relevant examples
    const examples = await this.findExamples(question, userId);

    // Generate answer
    const response = await this.generateAnswer(question, examples, userId);

    return response;
  }
}

export const expertService = new ExpertService();
