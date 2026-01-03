// ===========================================
// AI Expert Service
// Chat with specialized AI trading experts
// Enhanced with TradePath examples (3 credits)
// ===========================================

import { config } from '../../core/config';
import { costService } from '../costs/cost.service';
import { prisma } from '../../core/database';

// Gemini API configuration
const GEMINI_API_KEY = config.gemini.apiKey;
const GEMINI_MODEL = 'gemini-2.0-flash';

// TradePath system knowledge (shared across all experts)
const TRADEPATH_CONTEXT = `
[KİMLİĞİN]
TradePath'in AI eğitim uzmanısın. Trading kavramlarını öğretir, kullanıcıları TradePath'in Analyze özelliğine yönlendirirsin.

[TradePath SİSTEMİ]
TradePath, 7 adımlı analiz sistemi sunar: Market Pulse, Asset Scan, Safety Check, Timing, Trade Plan, Trap Check, Final Verdict.
Kullanıcı Analyze sayfasından coin seçip bu analizleri çalıştırabilir.

[TEMEL İLKELER]
1. Soruyu anla, mantıklı ve doğal cevap ver
2. Kısa tut (60-80 kelime), gereksiz uzatma
3. Bağlama göre adapte ol, her soruya aynı şablonu uygulama
4. Doğal konuş, robot gibi değil
5. Konuyla ilgili TradePath özelliğini uygun yerde bahset

[YANITIN SONU]
Yanıtını bitirdiğinde DUR. Ekstra teklif, CTA, soru EKLEME.
Frontend zaten footer ekliyor, senin ekleme yapman çift içerik oluşturur.

[KESİN YASAKLAR - BUNLARI ASLA YAZMA]
- "ister misin", "yapmamı ister misin", "yapayım mı"
- "kredi", "3 kredi", "5 kredi" (ücretlendirme frontend'de)
- "raporuna ekle", "rapora ekleyebilirsin"
- "gerçek analiz yapayım", "BTCUSDT için yapayım"
- "---" yatay çizgi
- "🚀 Bu bilgiyi gerçek bir coin için" CTA'sı
- Yanıt sonunda soru sormak

[AKILLI OL]
- "Sadece X yapabilir misin?" → Mantıklı cevap ver, "hayır yapamam" deme
- Sistem hakkında soru → Doğru bilgi ver
- Kavram sorusu → Öğret ve TradePath'te nerede bulacağını söyle
- Takip sorusu → Bağlamı hatırla, tutarlı ol
`;

// AI Expert definitions with specialized system prompts
const AI_EXPERTS = {
  aria: {
    id: 'aria',
    name: 'ARIA',
    role: 'Market Analysis AI',
    category: 'TECHNICAL_ANALYSIS',
    systemPrompt: `Sen ARIA - TradePath'in Teknik Analiz Uzmanı.
${TRADEPATH_CONTEXT}

[Uzmanlık Alanın]
RSI, MACD, Bollinger Bands, Moving Averages, Volume Profile, Pattern Recognition, Fibonacci, destek/direnç.
Bu konularda sorulara cevap ver. TradePath'te Asset Scan (Adım 2) bu verileri gösterir.`,
  },
  nexus: {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    category: 'RISK_MANAGEMENT',
    systemPrompt: `Sen NEXUS - TradePath'in Risk Yönetimi Uzmanı.
${TRADEPATH_CONTEXT}

[Uzmanlık Alanın]
Position sizing, Stop Loss, Take Profit, Risk/Reward oranı, DCA stratejisi, portföy yönetimi.
Bu konularda sorulara cevap ver. TradePath'te Trade Plan (Adım 5) bu hesaplamaları yapar.`,
  },
  oracle: {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    category: 'WHALE_BEHAVIOR',
    systemPrompt: `Sen ORACLE - TradePath'in Balina Takip Uzmanı.
${TRADEPATH_CONTEXT}

[Uzmanlık Alanın]
Whale activity, exchange flow, smart money positioning, order flow, birikim/dağıtım.
Bu konularda sorulara cevap ver. TradePath'te Safety Check (Adım 3) bu verileri gösterir.`,
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    category: 'MANIPULATION',
    systemPrompt: `Sen SENTINEL - TradePath'in Güvenlik Uzmanı.
${TRADEPATH_CONTEXT}

[Uzmanlık Alanın]
Pump/dump tespiti, honeypot, rug pull, contract güvenliği, bull/bear trap, likidite avcılığı.
Bu konularda sorulara cevap ver. TradePath'te Safety Check (Adım 3) ve Trap Check (Adım 6) bu kontrolleri yapar.`,
  },
} as const;

type ExpertId = keyof typeof AI_EXPERTS;

interface ExampleData {
  type: 'analysis' | 'quiz' | 'pattern';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedQuestion {
  id: string;
  question: string;
  category: 'education' | 'strategy' | 'practical';
  stage1Preview: string;  // Free educational preview
  stage2Action: string;   // Paid action description
  creditCost: number;     // Credits needed for full analysis
}

interface ChatRequest {
  expertId: ExpertId;
  message: string;
  conversationHistory?: ChatMessage[];
  userId: string;
}

interface ChatResponse {
  response: string;
  expertId: ExpertId;
  examples: ExampleData[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class AIExpertService {
  /**
   * Get expert information
   */
  getExpert(expertId: string) {
    return AI_EXPERTS[expertId as ExpertId] || null;
  }

  /**
   * Get all experts
   */
  getAllExperts() {
    return Object.values(AI_EXPERTS).map(({ id, name, role }) => ({
      id,
      name,
      role,
    }));
  }

  /**
   * Find relevant TradePath examples based on expert category
   */
  async findExamples(expertId: ExpertId, userId: string): Promise<ExampleData[]> {
    const expert = AI_EXPERTS[expertId];
    const category = expert.category;
    const examples: ExampleData[] = [];

    // Always add pattern examples first (these are static and always available)
    const patterns = this.getExpertPatterns(expertId);
    examples.push(...patterns);

    try {
      // 1. Get relevant quiz questions as educational examples
      const quizzes = await prisma.quiz.findMany({
        where: {
          category: category,
          isActive: true,
        },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      for (const quiz of quizzes) {
        const options = quiz.options as string[];
        examples.push({
          type: 'quiz',
          title: 'TradePath Eğitim',
          description: quiz.question,
          details: {
            dogruCevap: options[quiz.correctIndex],
            aciklama: quiz.explanation || '',
          },
        });
      }

      // 2. Get user's recent analyses as real trading examples
      const recentAnalyses = await prisma.analysis.findMany({
        where: {
          userId,
          step7Result: { not: null },
        },
        take: 2,
        orderBy: { createdAt: 'desc' },
        select: {
          symbol: true,
          step2Result: true,
          step3Result: true,
          step5Result: true,
          step7Result: true,
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
            title: `${analysis.symbol} TradePath Analizi`,
            description: `Gerçek analiz: ${(verdict.verdict as string || 'N/A').toUpperCase()} sinyali`,
            details: {
              sembol: analysis.symbol,
              karar: verdict.verdict,
              skor: verdict.overallScore,
              yon: tradePlan?.direction || 'N/A',
              risk: safety?.riskLevel || 'N/A',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error finding examples:', error);
    }

    return examples.slice(0, 4);
  }

  /**
   * Get pattern examples specific to each expert
   */
  private getExpertPatterns(expertId: ExpertId): ExampleData[] {
    const patterns: Record<ExpertId, ExampleData[]> = {
      aria: [
        {
          type: 'pattern',
          title: 'RSI Divergence Örneği',
          description: 'Fiyat yeni dip yaparken RSI yapmıyorsa = bullish divergence',
          details: {
            sinyal: 'Hidden Bullish Divergence',
            guvenilirlik: '%72',
            onay: '4H kapanış beklenmeli',
          },
        },
        {
          type: 'pattern',
          title: 'MACD Crossover',
          description: 'MACD çizgisi sinyal çizgisini yukarı keserse = alım sinyali',
          details: {
            sinyal: 'Bullish Crossover',
            guvenilirlik: '%68',
            onay: 'Histogram pozitife dönmeli',
          },
        },
        {
          type: 'pattern',
          title: 'Bollinger Band Squeeze',
          description: 'Bantlar daralıyorsa büyük hareket yakın demek',
          details: {
            sinyal: 'Volatilite patlaması bekleniyor',
            strateji: 'Breakout yönünü bekle, erken girme',
          },
        },
      ],
      nexus: [
        {
          type: 'pattern',
          title: 'Position Size Hesaplama',
          description: '10.000$ portföy, %1 risk = 100$ maksimum kayıp',
          details: {
            formul: 'Pozisyon = Risk$ / (Entry - Stop)',
            ornek: '100$ / (50.000 - 48.000) = 0.05 BTC',
          },
        },
        {
          type: 'pattern',
          title: 'Risk/Reward Oranı',
          description: 'Minimum 1:2 R/R olmadan işleme girme',
          details: {
            kural: 'Potansiyel kazanç, riskten en az 2x fazla olmalı',
            ornek: '100$ risk için 200$ hedef',
          },
        },
        {
          type: 'pattern',
          title: 'Kademeli Giriş (DCA)',
          description: 'Tüm sermayeyi tek seferde koymak yerine 3 kademe',
          details: {
            strateji: '%40 + %30 + %30',
            avantaj: 'Ortalama maliyeti düşürür',
          },
        },
      ],
      oracle: [
        {
          type: 'pattern',
          title: 'Whale Accumulation Örneği',
          description: 'Exchange outflow + düşük volatilite = akümülasyon',
          details: {
            sinyal: 'Smart Money Accumulation',
            gosterge: 'OBV artışı + fiyat yatay',
          },
        },
        {
          type: 'pattern',
          title: 'Exchange Outflow Sinyali',
          description: 'Borsalardan büyük çıkış = HODLing başlıyor',
          details: {
            sinyal: 'Bullish uzun vadeli',
            dikkat: 'Kısa vadede etki gecikmeli olabilir',
          },
        },
        {
          type: 'pattern',
          title: 'Whale Dump Uyarısı',
          description: 'Büyük cüzdanlardan borsalara transfer = satış baskısı',
          details: {
            sinyal: 'Bearish kısa vadeli',
            aksiyon: 'Stop loss sık tut',
          },
        },
      ],
      sentinel: [
        {
          type: 'pattern',
          title: 'Pump & Dump Tespiti',
          description: 'Ani %50+ artış + 10x volume = manipülasyon riski',
          details: {
            uyari: 'FOMO\'ya kapılma!',
            kural: 'İlk saatte alma, düşüşü bekle',
          },
        },
        {
          type: 'pattern',
          title: 'Honeypot Tespiti',
          description: 'Alım yapılıp satış yapılamıyorsa = HONEYPOT',
          details: {
            kontrol: 'TradePath Safety Check → contractSecurity.isHoneypot',
            kural: 'isHoneypot = true ise ASLA ALMA',
          },
        },
        {
          type: 'pattern',
          title: 'Rug Pull Sinyalleri',
          description: 'Liquidity kilitli değilse = Rug Pull riski',
          details: {
            kontrol: 'contractSecurity.liquidityLocked',
            uyari: 'Kilit süresi de önemli, 1 yıldan az tehlikeli',
          },
        },
      ],
    };

    return patterns[expertId] || [];
  }

  /**
   * Get suggested questions for an expert with 2-stage response info
   */
  getSuggestedQuestions(expertId: ExpertId): SuggestedQuestion[] {
    const questions: Record<ExpertId, SuggestedQuestion[]> = {
      aria: [
        // Eğitici Sorular (Stage 1: Free education)
        {
          id: 'aria-1',
          question: 'RSI nedir ve nasıl yorumlanır?',
          category: 'education',
          stage1Preview: 'RSI (Relative Strength Index) momentum göstergesidir. 0-100 arası değer alır...',
          stage2Action: 'Seçtiğin coin için RSI analizi yap',
          creditCost: 3,
        },
        {
          id: 'aria-2',
          question: 'MACD sinyalleri nasıl okunur?',
          category: 'education',
          stage1Preview: 'MACD, trend değişimlerini tespit eden güçlü bir göstergedir...',
          stage2Action: 'Coin için MACD crossover analizi',
          creditCost: 3,
        },
        {
          id: 'aria-3',
          question: 'Bollinger Bands squeeze ne anlama gelir?',
          category: 'education',
          stage1Preview: 'Bantlar daraldığında büyük bir hareket yaklaşıyor demektir...',
          stage2Action: 'Seçtiğin coin için band analizi',
          creditCost: 3,
        },
        {
          id: 'aria-4',
          question: 'Destek ve direnç seviyeleri nasıl belirlenir?',
          category: 'education',
          stage1Preview: 'Destek/direnç, fiyatın sıkça test ettiği seviyelerdir...',
          stage2Action: 'Coin için destek/direnç hesapla',
          creditCost: 3,
        },
        {
          id: 'aria-5',
          question: 'Multi-timeframe analiz neden önemli?',
          category: 'education',
          stage1Preview: 'Farklı zaman dilimlerinde trend uyumu güvenilirliği artırır...',
          stage2Action: '1H, 4H, 1D trend uyumu analizi',
          creditCost: 3,
        },
        // Strateji Soruları
        {
          id: 'aria-6',
          question: 'Bu coin için en iyi giriş noktası neresi?',
          category: 'strategy',
          stage1Preview: 'Optimal giriş için RSI, destek seviyeleri ve trend uyumu kontrol edilir...',
          stage2Action: 'Gerçek zamanlı giriş noktası hesapla',
          creditCost: 5,
        },
        {
          id: 'aria-7',
          question: 'Trend dönüşü nasıl anlaşılır?',
          category: 'strategy',
          stage1Preview: 'MA crossover, divergence ve hacim değişimleri trend dönüşünü işaret eder...',
          stage2Action: 'Coin için trend analizi raporu',
          creditCost: 5,
        },
        {
          id: 'aria-8',
          question: 'Breakout mu yoksa fake-out mu?',
          category: 'strategy',
          stage1Preview: 'Gerçek breakout hacim artışı ve kapanış ile onaylanır...',
          stage2Action: 'Breakout doğrulama analizi',
          creditCost: 5,
        },
        // Pratik Sorular
        {
          id: 'aria-9',
          question: 'Şu an BTC dominansı ne durumda?',
          category: 'practical',
          stage1Preview: 'BTC dominansı altcoin performansını etkiler...',
          stage2Action: 'Güncel BTC dominans analizi',
          creditCost: 2,
        },
        {
          id: 'aria-10',
          question: 'Fear & Greed Index şu an ne?',
          category: 'practical',
          stage1Preview: 'Aşırı korku alım, aşırı açgözlülük satış fırsatı olabilir...',
          stage2Action: 'Güncel piyasa duyarlılık raporu',
          creditCost: 2,
        },
      ],
      nexus: [
        // Eğitici Sorular
        {
          id: 'nexus-1',
          question: 'Position size nasıl hesaplanır?',
          category: 'education',
          stage1Preview: 'Position size = Risk tutarı / (Giriş - Stop Loss) formülü ile hesaplanır...',
          stage2Action: 'Portföyün için position size hesapla',
          creditCost: 3,
        },
        {
          id: 'nexus-2',
          question: 'Risk/Reward oranı neden önemli?',
          category: 'education',
          stage1Preview: 'Her işlemde potansiyel kazanç, riskten en az 2x fazla olmalı...',
          stage2Action: 'Trade için R/R hesaplaması',
          creditCost: 3,
        },
        {
          id: 'nexus-3',
          question: 'Stop loss nereye konmalı?',
          category: 'education',
          stage1Preview: 'Stop loss destek seviyelerinin altına veya volatilite bazlı hesaplanır...',
          stage2Action: 'Optimal stop loss hesapla',
          creditCost: 3,
        },
        {
          id: 'nexus-4',
          question: 'Kademeli giriş stratejisi nedir?',
          category: 'education',
          stage1Preview: 'DCA (Dollar Cost Averaging) ile riski dağıtmak...',
          stage2Action: 'Kademe fiyatları hesapla',
          creditCost: 3,
        },
        {
          id: 'nexus-5',
          question: 'Portföy çeşitlendirme nasıl yapılır?',
          category: 'education',
          stage1Preview: 'Korelasyonu düşük varlıklar seçerek risk azaltılır...',
          stage2Action: 'Portföy korelasyon analizi',
          creditCost: 5,
        },
        // Strateji Soruları
        {
          id: 'nexus-6',
          question: 'Bu trade için ne kadar risk almalıyım?',
          category: 'strategy',
          stage1Preview: 'Tek bir trade için maksimum %1-2 portföy riski önerilir...',
          stage2Action: 'Kişiselleştirilmiş risk hesabı',
          creditCost: 5,
        },
        {
          id: 'nexus-7',
          question: 'Take profit hedeflerini nasıl belirlemeliyim?',
          category: 'strategy',
          stage1Preview: 'Direnç seviyeleri ve Fibonacci hedefleri kullanılır...',
          stage2Action: 'TP1, TP2, TP3 hedeflerini hesapla',
          creditCost: 5,
        },
        {
          id: 'nexus-8',
          question: 'Ne zaman pozisyonu büyütmeliyim?',
          category: 'strategy',
          stage1Preview: 'Piramitleme stratejisi karlı pozisyonlarda uygulanır...',
          stage2Action: 'Pozisyon büyütme planı',
          creditCost: 5,
        },
        // Pratik Sorular
        {
          id: 'nexus-9',
          question: '1000$ ile hangi strateji?',
          category: 'practical',
          stage1Preview: 'Küçük sermaye için swing trading ve sıkı risk yönetimi...',
          stage2Action: '1000$ portföy planı',
          creditCost: 3,
        },
        {
          id: 'nexus-10',
          question: 'Maksimum kaç pozisyon açmalıyım?',
          category: 'practical',
          stage1Preview: 'Portföy büyüklüğüne göre 3-10 arası pozisyon önerilir...',
          stage2Action: 'Optimal pozisyon sayısı analizi',
          creditCost: 3,
        },
      ],
      oracle: [
        // Eğitici Sorular
        {
          id: 'oracle-1',
          question: 'Whale accumulation nasıl tespit edilir?',
          category: 'education',
          stage1Preview: 'Büyük cüzdanların borsalardan çekimi = biriktirme sinyali...',
          stage2Action: 'Coin için whale analizi',
          creditCost: 3,
        },
        {
          id: 'oracle-2',
          question: 'Exchange flow neden önemli?',
          category: 'education',
          stage1Preview: 'Borsaya giriş = satış baskısı, çıkış = alım sinyali...',
          stage2Action: 'Güncel exchange flow raporu',
          creditCost: 3,
        },
        {
          id: 'oracle-3',
          question: 'Smart money ne demek?',
          category: 'education',
          stage1Preview: 'Kurumsal yatırımcılar ve deneyimli traderların pozisyonları...',
          stage2Action: 'Smart money positioning analizi',
          creditCost: 3,
        },
        {
          id: 'oracle-4',
          question: 'Order flow imbalance nasıl okunur?',
          category: 'education',
          stage1Preview: 'Alış emirlerinin satış emirlerinden fazla olması = bullish...',
          stage2Action: 'Order flow analizi',
          creditCost: 3,
        },
        {
          id: 'oracle-5',
          question: 'Net flow negatif ne demek?',
          category: 'education',
          stage1Preview: 'Borsalardan net çıkış = arz azalıyor = potansiyel yükseliş...',
          stage2Action: 'Net flow detaylı rapor',
          creditCost: 3,
        },
        // Strateji Soruları
        {
          id: 'oracle-6',
          question: 'Büyük oyuncular ne yapıyor?',
          category: 'strategy',
          stage1Preview: 'Whale aktivitesi piyasa yönünü önceden gösterebilir...',
          stage2Action: 'Whale aktivite raporu',
          creditCost: 5,
        },
        {
          id: 'oracle-7',
          question: 'Bu coin için birikim var mı?',
          category: 'strategy',
          stage1Preview: 'OBV artışı ve düşük volatilite birikim işareti...',
          stage2Action: 'Birikim/dağıtım analizi',
          creditCost: 5,
        },
        {
          id: 'oracle-8',
          question: 'Whale dump riski var mı?',
          category: 'strategy',
          stage1Preview: 'Büyük cüzdanlardan borsalara transfer = dump riski...',
          stage2Action: 'Whale risk değerlendirmesi',
          creditCost: 5,
        },
        // Pratik Sorular
        {
          id: 'oracle-9',
          question: 'En çok biriktirilen coinler hangileri?',
          category: 'practical',
          stage1Preview: 'Exchange outflow takibi ile tespit edilebilir...',
          stage2Action: 'Top birikim listesi',
          creditCost: 5,
        },
        {
          id: 'oracle-10',
          question: 'Kurumsal alımlar nerede?',
          category: 'practical',
          stage1Preview: 'OTC işlemler ve büyük cüzdan transferleri izlenir...',
          stage2Action: 'Kurumsal aktivite raporu',
          creditCost: 5,
        },
      ],
      sentinel: [
        // Eğitici Sorular
        {
          id: 'sentinel-1',
          question: 'Honeypot token nedir?',
          category: 'education',
          stage1Preview: 'Alım yapılıp satış yapılamayan dolandırıcılık tokenleri...',
          stage2Action: 'Token için honeypot kontrolü',
          creditCost: 2,
        },
        {
          id: 'sentinel-2',
          question: 'Rug pull nasıl anlaşılır?',
          category: 'education',
          stage1Preview: 'Likidite kilitsiz, anonim ekip, gerçekçi olmayan vaatler...',
          stage2Action: 'Rug pull risk analizi',
          creditCost: 3,
        },
        {
          id: 'sentinel-3',
          question: 'Liquidity lock neden önemli?',
          category: 'education',
          stage1Preview: 'Kilitli likidite geliştiricinin kaçmasını engeller...',
          stage2Action: 'Liquidity lock kontrolü',
          creditCost: 2,
        },
        {
          id: 'sentinel-4',
          question: 'Mint function riski nedir?',
          category: 'education',
          stage1Preview: 'Owner sınırsız token basabilirse = sonsuz enflasyon...',
          stage2Action: 'Mint function kontrolü',
          creditCost: 2,
        },
        {
          id: 'sentinel-5',
          question: 'Contract verified ne demek?',
          category: 'education',
          stage1Preview: 'Kaynak kodu görülebilir = şeffaflık, gizli ise tehlike...',
          stage2Action: 'Contract doğrulama kontrolü',
          creditCost: 1,
        },
        // Strateji Soruları
        {
          id: 'sentinel-6',
          question: 'Bu token güvenli mi?',
          category: 'strategy',
          stage1Preview: 'Kapsamlı güvenlik kontrolü: honeypot, lock, mint, tax...',
          stage2Action: 'Tam güvenlik raporu',
          creditCost: 5,
        },
        {
          id: 'sentinel-7',
          question: 'Pump & dump riski var mı?',
          category: 'strategy',
          stage1Preview: 'Ani fiyat ve hacim artışları manipülasyon işareti...',
          stage2Action: 'Manipülasyon risk analizi',
          creditCost: 3,
        },
        {
          id: 'sentinel-8',
          question: 'Bu projede red flag var mı?',
          category: 'strategy',
          stage1Preview: 'Ekip, tokenomics, contract kontrolü ile tespit edilir...',
          stage2Action: 'Kapsamlı red flag taraması',
          creditCost: 5,
        },
        // Pratik Sorular
        {
          id: 'sentinel-9',
          question: 'Buy/sell tax ne kadar?',
          category: 'practical',
          stage1Preview: 'Yüksek vergi oranları karı yok eder...',
          stage2Action: 'Tax oranı kontrolü',
          creditCost: 2,
        },
        {
          id: 'sentinel-10',
          question: 'Wash trading var mı?',
          category: 'practical',
          stage1Preview: 'Sahte hacim ile gerçek talep yanıltılır...',
          stage2Action: 'Wash trading tespiti',
          creditCost: 3,
        },
      ],
    };

    return questions[expertId] || [];
  }

  /**
   * Get all suggested questions for all experts
   */
  getAllSuggestedQuestions(): Record<ExpertId, SuggestedQuestion[]> {
    return {
      aria: this.getSuggestedQuestions('aria'),
      nexus: this.getSuggestedQuestions('nexus'),
      oracle: this.getSuggestedQuestions('oracle'),
      sentinel: this.getSuggestedQuestions('sentinel'),
    };
  }

  /**
   * Chat with an AI expert - Enhanced with examples
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const expert = AI_EXPERTS[request.expertId];
    if (!expert) {
      throw new Error(`Unknown expert: ${request.expertId}`);
    }

    // Find relevant TradePath examples
    const examples = await this.findExamples(request.expertId, request.userId);

    // Format examples for the prompt
    const examplesText = examples.length > 0
      ? `\n\n[TradePath'ten Gerçek Örnekler - Yanıtında bunlara referans ver]\n${examples.map((ex, i) =>
          `${i + 1}. ${ex.title}: ${ex.description}\n   Detay: ${JSON.stringify(ex.details)}`
        ).join('\n')}`
      : '';

    // Build conversation with enhanced system prompt
    const enhancedSystemPrompt = expert.systemPrompt + examplesText;

    const messages = [
      {
        role: 'user' as const,
        parts: [{ text: enhancedSystemPrompt }],
      },
      {
        role: 'model' as const,
        parts: [{ text: `Ben ${expert.name}, TradePath'in uzman AI'siyim. Size TradePath'teki gerçek örneklerle desteklenmiş yanıtlar vereceğim. Nasıl yardımcı olabilirim?` }],
      },
    ];

    // Add conversation history
    if (request.conversationHistory?.length) {
      for (const msg of request.conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      parts: [{ text: request.message }],
    });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              temperature: 0.8,
              topP: 0.92,
              topK: 40,
              maxOutputTokens: 800,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt oluşturulamadı.';

      // Extract token usage
      const usageMetadata = data.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount || 0;
      const outputTokens = usageMetadata.candidatesTokenCount || 0;
      const costUsd = costService.calculateGeminiCost(inputTokens, outputTokens);

      // Log cost
      await costService.logCost({
        service: 'gemini',
        operation: `ai_expert_${request.expertId}`,
        inputTokens,
        outputTokens,
        costUsd,
        userId: request.userId,
        metadata: {
          expertId: request.expertId,
          expertName: expert.name,
          examplesCount: examples.length,
        },
      });

      return {
        response: responseText,
        expertId: request.expertId,
        examples,
        inputTokens,
        outputTokens,
        costUsd,
      };
    } catch (error) {
      console.error('AI Expert chat error:', error);
      throw error;
    }
  }

  /**
   * Add expert insight to an existing report or create a new one
   */
  async addToReport(params: {
    userId: string;
    symbol: string;
    expertId: ExpertId;
    insight: string;
    reportId?: string;
  }): Promise<{
    reportId: string;
    isNew: boolean;
    symbol: string;
  }> {
    const expert = AI_EXPERTS[params.expertId];

    // Format the expert insight
    const expertInsight = {
      expertId: params.expertId,
      expertName: expert.name,
      expertRole: expert.role,
      insight: params.insight,
      addedAt: new Date().toISOString(),
    };

    if (params.reportId) {
      // Add to existing report
      const existingReport = await prisma.report.findFirst({
        where: { id: params.reportId, userId: params.userId },
      });

      if (!existingReport) {
        throw new Error('Report not found');
      }

      // Update report data with expert insight
      const reportData = existingReport.reportData as Record<string, unknown>;
      const expertInsights = (reportData.expertInsights || []) as unknown[];
      expertInsights.push(expertInsight);
      reportData.expertInsights = expertInsights;

      await prisma.report.update({
        where: { id: params.reportId },
        data: { reportData },
      });

      return {
        reportId: params.reportId,
        isNew: false,
        symbol: existingReport.symbol,
      };
    } else {
      // Create new report with expert insight
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

      const newReport = await prisma.report.create({
        data: {
          userId: params.userId,
          symbol: params.symbol.toUpperCase(),
          reportData: {
            type: 'expert_analysis',
            symbol: params.symbol.toUpperCase(),
            expertInsights: [expertInsight],
            createdAt: new Date().toISOString(),
          },
          verdict: 'expert_analysis',
          score: 0, // Expert analysis doesn't have a score
          expiresAt,
        },
      });

      return {
        reportId: newReport.id,
        isNew: true,
        symbol: newReport.symbol,
      };
    }
  }

  /**
   * Get expert insight summary for a symbol
   */
  async getExpertSummary(params: {
    userId: string;
    symbol: string;
  }): Promise<{
    symbol: string;
    experts: Array<{
      expertId: string;
      expertName: string;
      insight: string;
      addedAt: string;
    }>;
    reportId?: string;
  }> {
    // Find latest report for this symbol
    const report = await prisma.report.findFirst({
      where: {
        userId: params.userId,
        symbol: params.symbol.toUpperCase(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) {
      return {
        symbol: params.symbol.toUpperCase(),
        experts: [],
      };
    }

    const reportData = report.reportData as Record<string, unknown>;
    const expertInsights = (reportData.expertInsights || []) as Array<{
      expertId: string;
      expertName: string;
      insight: string;
      addedAt: string;
    }>;

    return {
      symbol: params.symbol.toUpperCase(),
      experts: expertInsights,
      reportId: report.id,
    };
  }
}

export const aiExpertService = new AIExpertService();
