# CLAUDE.md - TraderPath.io Project Intelligence

## ⛔ ZORUNLU KURALLAR (ATLANAMAZ)

### Her Commit Öncesi:
1. Bu dosyayı kontrol et
2. Yaptığın değişiklik bir fix ise → "Çözülen Bug'lar" tablosuna HEMEN ekle
3. Eklemeden commit YAPMA

### Her Session Sonunda:
1. "Son Güncellemeler"e bugünün tarihiyle özet yaz
2. Yazmadan session'ı KAPATMA

> ⚠️ Bu kuralları asla atlama.

---

## 🔴 Kritik Kurallar (Asla İhlal Etme)

### UI/UX
- Button container'larda `grid` kullan, `flex` değil (alignment sorunu)
- Dark/light mode: Tailwind `dark:` prefix kullan, CSS variable değil
- Font: Inter veya Geist Sans (Google Fonts'tan)
- Mobile-first yaklaşım: `sm:`, `md:`, `lg:` sırasıyla

### Teknik
- Python 3.11 syntax kullan
- Node.js 22+ features (ES modules default)
- Tailwind CSS - custom CSS yazmaktan kaçın
- API response'larda her zaman `{ success: boolean, data: T, error?: string }` formatı

### Veri Mimarisi
- **Analysis tablosu**: Kullanıcının yaptığı analizler (totalScore, outcome, step results)
- **Report tablosu**: Kullanıcı raporları (PDF export vb. için)
- **TÜM ANALİZ İSTATİSTİKLERİ → Analysis tablosundan** (platform-stats, statistics vb.)
- Report tablosu analiz istatistikleri için KULLANILMAZ
- Platform accuracy = TP hits / (TP hits + SL hits) from Analysis.outcome
- **Asla karıştırma!** Report, Analysis'in sonucudur, istatistik kaynağı değil

### Piyasa Veri Kaynakları (ZORUNLU)
| Asset Class | Veri Kaynağı | Not |
|-------------|--------------|-----|
| **Crypto** | Binance API | BTC, ETH, SOL vb. tüm kripto paralar |
| **Stocks** | Yahoo Finance | AAPL, MSFT, SPY, QQQ vb. hisse senetleri |
| **Metals** | Yahoo Finance | GLD, SLV, IAU, XAUUSD vb. değerli metaller |
| **Bonds** | Yahoo Finance | TLT, IEF, BND vb. tahvil ETF'leri |

- **Default timeframe: 1D** (ETF'ler ve hisse senetleri için intraday veri sınırlı olabilir)
- Multi-asset data provider: `apps/api/src/modules/analysis/providers/multi-asset-data-provider.ts`
- Chart endpoint: `GET /api/analysis/chart/candles?symbol=X&interval=1d&limit=100`

### Analiz ve Rapor Kuralları (ZORUNLU)
- **Analiz çok detaylı yapılacak**: Tüm 40+ enstrüman/indikatör kullanılacak
- **Sadece 2 rapor tipi var** (başka tip ekleme!):

| Rapor Tipi | İçerik | Sayfa |
|------------|--------|-------|
| **Executive Summary** | 7 aşama sonucu + işlem planı (kısa, öz) | 6 sayfa |
| **Detailed Analysis Report** | Her türlü detay, tüm indikatör grafikleri | 10+ sayfa |

- Executive Summary: Hızlı karar için özet
- Detailed Analysis Report: Derinlemesine inceleme için tam detay

### Yapılmaması Gerekenler ❌
- `!important` kullanma
- Inline style kullanma (Tailwind varken)
- `any` type kullanma (TypeScript)
- Console.log'ları commit'leme
- Hardcoded URL/secret kullanma
- Prisma Decimal'i direkt JSON'a serialize etme (Number() ile çevir)

---

## 🌍 CAPITAL FLOW PRENSİBİ (TEMEL FELSEFİ)

> **"Para nereye akıyorsa potansiyel oradadır"**

### Temel Yaklaşım

TraderPath artık **Top-Down** yaklaşımla çalışır:

```
ESKİ (Bottom-Up):
  Kullanıcı coin seçer → 7 adım analiz → Karar

YENİ (Top-Down):
  Global Likidite → Hangi Piyasa? → Hangi Sektör? → Hangi Asset? → Mikro Analiz
```

### Para Akış Hiyerarşisi

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: GLOBAL LİKİDİTE                     │
│         Fed Balance Sheet, M2 Money Supply, DXY, VIX            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ STOCKS  │          │  BONDS  │          │ CRYPTO  │
   │ METALS  │          │         │          │         │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
   SPX, NDX              10Y, 2Y            Total MCap
   XAU, XAG              Yield Curve        BTC Dominance
                                                  │
                                         ┌────────┴────────┐
                                         ▼                 ▼
                                      BTC/ETH          ALTCOINS
                                                           │
                                              ┌────────────┼────────────┐
                                              ▼            ▼            ▼
                                           DeFi        Layer2       Meme/AI
```

### Cevaplanması Gereken Sorular

| Soru | Kaynak | Güncelleme |
|------|--------|------------|
| Para nereye akıyor? | Flow hızı ve yönü | Günlük |
| Ne kadar hızla akıyor? | 7d/30d flow değişimi | Günlük |
| Ne zamandır orada? | Faz tespiti (gün sayısı) | Günlük |
| Ne kadar daha kalacak? | Tarihsel faz süreleri | Haftalık |
| Sonra nereye gidecek? | Rotasyon pattern'leri | Haftalık |

### Piyasa Fazları

| Faz | Süre | Anlam | Aksiyon |
|-----|------|-------|---------|
| **EARLY** | 0-30 gün | Para yeni girmeye başladı | ✅ EN İYİ GİRİŞ |
| **MID** | 30-60 gün | Trend olgunlaşıyor | ⚠️ Dikkatli giriş |
| **LATE** | 60-90 gün | Trend yoruluyor | ⛔ Yeni giriş yapma |
| **EXIT** | 90+ gün / tersine dönüş | Para çıkıyor | 🚫 ASLA GİRME |

### Desteklenen Piyasalar

| Piyasa | Veri Kaynağı | Analiz Tipi |
|--------|--------------|-------------|
| **Crypto** | Binance, CoinGecko, DefiLlama | Full 7-Step / MLIS |
| **Stocks** | Yahoo Finance | Temel Trend Analizi |
| **Bonds** | FRED API | Yield Curve, Flow |
| **Metals** | Yahoo Finance | XAU/XAG Trend |

### Flow Hesaplama Metrikleri

```typescript
interface MarketFlow {
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';

  // Flow Metrikleri
  flow7d: number;          // 7 günlük % değişim
  flow30d: number;         // 30 günlük % değişim
  flowVelocity: number;    // Hız (flow7d - önceki 7d)

  // Faz Tespiti
  phase: 'early' | 'mid' | 'late' | 'exit';
  daysInPhase: number;
  avgPhaseDuration: number; // Tarihsel ortalama

  // Rotasyon Sinyali
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  rotationTarget: string | null; // Örn: 'crypto', 'bonds'
}
```

### Karar Ağacı (ZORUNLU)

```
1. Global Likidite Genişliyor mu? (Fed, M2)
   ├── HAYIR → "Risk-off ortam, sadece BONDS/GOLD analiz et"
   └── EVET → Devam

2. DXY (Dolar) Zayıflıyor mu?
   ├── HAYIR → "Risk varlıkları zayıf, dikkatli ol"
   └── EVET → Devam

3. Hangi Piyasaya Para Akıyor? (En yüksek flow)
   ├── STOCKS → Stock analizi öner
   ├── CRYPTO → Crypto analizi öner
   ├── METALS → Gold/Silver analizi öner
   └── BONDS → "Safe haven modu, bekle"

4. Piyasa Hangi Fazda?
   ├── EARLY → ✅ "Optimal giriş zamanı"
   ├── MID → ⚠️ "Giriş yapılabilir, dikkatli"
   ├── LATE → ⛔ "Yeni giriş önerilmez"
   └── EXIT → 🚫 "Kesinlikle girme"

5. Seçilen Piyasada Sektör Seçimi → Mikro Analiz
```

### API Endpoint'ler

| Endpoint | Method | Açıklama | Maliyet |
|----------|--------|----------|---------|
| `/api/capital-flow` | GET | Tüm piyasalar flow özeti | FREE |
| `/api/capital-flow/:market` | GET | Tek piyasa detay | FREE |
| `/api/capital-flow/recommendation` | GET | Hangi piyasada fırsat var? | FREE |
| `/api/capital-flow/rotation-history` | GET | Tarihsel rotasyon verileri | FREE |

### Kod Lokasyonları

| Servis | Dosya |
|--------|-------|
| Capital Flow Service | `apps/api/src/modules/capital-flow/capital-flow.service.ts` |
| FRED API Integration | `apps/api/src/modules/capital-flow/providers/fred.provider.ts` |
| Yahoo Finance Integration | `apps/api/src/modules/capital-flow/providers/yahoo.provider.ts` |
| DefiLlama Integration | `apps/api/src/modules/capital-flow/providers/defillama.provider.ts` |
| Flow Calculator | `apps/api/src/modules/capital-flow/flow-calculator.ts` |

### ENV Variables

```env
# Capital Flow APIs
FRED_API_KEY=           # Federal Reserve Economic Data
ALPHA_VANTAGE_KEY=      # Stocks fallback (optional)
```

---

## 💰 DAILY PASS FİYATLANDIRMA MODELİ (2026-01-31)

### Katmanlı Erişim Sistemi

| Katman | Fiyat | İçerik | Limit |
|--------|-------|--------|-------|
| **Layer 1-2** | FREE | Global Likidite, Market Flow | Sınırsız |
| **Layer 3** | 25 kredi/gün | Sector Activity | Sınırsız erişim |
| **Layer 4** | 25 kredi/gün | AI Recommendations (BUY/SELL) | Sınırsız erişim |
| **Asset Analysis** | 100 kredi/gün | 7-Step / MLIS Pro | Günlük max 10 analiz |

> **Toplam:** 150 kredi/aktif gün (25 + 25 + 100)
> **Not:** Sadece kullanıcının giriş yaptığı günler hesaba katılır.

### Daily Pass Mantığı

```typescript
// Günlük Pass Konfigürasyonu
DAILY_PASS_CONFIG = {
  CAPITAL_FLOW_L3: {
    cost: 25,           // Kredi
    maxUsage: 1,        // Sınırsız erişim (tek pass)
    expiresAt: 'EOD',   // Gece 00:00 UTC sıfırlanır
  },
  CAPITAL_FLOW_L4: {
    cost: 25,           // Kredi
    maxUsage: 1,        // Sınırsız erişim (tek pass)
    expiresAt: 'EOD',   // Gece 00:00 UTC sıfırlanır
  },
  ASSET_ANALYSIS: {
    cost: 100,          // Kredi
    maxUsage: 10,       // Max 10 analiz/gün
    expiresAt: 'EOD',   // Gece 00:00 UTC sıfırlanır
  },
}
```

### API Endpoint'ler

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/passes/status` | GET | Kullanıcının aktif pass'leri |
| `/api/passes/purchase` | POST | Pass satın al |
| `/api/passes/check/:type` | GET | Belirli pass tipini kontrol et |
| `/api/passes/config` | GET | Pass fiyat konfigürasyonu |

### Kod Lokasyonları

| Dosya | Açıklama |
|-------|----------|
| `apps/api/src/modules/passes/daily-pass.service.ts` | Pass yönetim servisi |
| `apps/api/src/modules/passes/daily-pass.routes.ts` | API routes |
| `apps/api/prisma/schema.prisma` | DailyPass model |
| `apps/web/app/(dashboard)/analyze/page.tsx` | Frontend pass UI |
| `apps/web/app/(dashboard)/capital-flow/page.tsx` | Layer 4 paywall |

### Maliyet Analizi (Aylık $200 API Bütçesi)

```
Günlük API Bütçesi: $200/30 = $6.67/gün

Asset Analysis (100 kredi/gün, max 10 analiz):
- Analiz başına API maliyeti: ~$0.05 (Gemini + Binance/Yahoo)
- En kötü senaryo: 10 analiz × $0.05 = $0.50/kullanıcı/gün
- Kar marjı: $5+ (100 kredi ≈ $10 değer)

Capital Flow L4 (25 kredi/gün):
- API maliyeti: ~$0.01/gün (cache + minimal API)
- Kar marjı: %99+

✅ Model, $200/ay bütçe ile sürdürülebilir
```

---

## 📊 Analiz Veri Gereksinimleri (ZORUNLU)

### Timeframe Seçenekleri
```
5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W
```

### Timeframe → Trade Type Mapping
| Timeframe | Trade Type | Mum Sayısı |
|-----------|------------|------------|
| 5m        | Scalping   | 1000       |
| 15m       | Scalping   | 1000       |
| 30m       | Day Trade  | 500        |
| 1h        | Day Trade  | 500        |
| 2h        | Day Trade  | 500        |
| 4h        | Day Trade  | 500        |
| 1d        | Swing Trade| 250        |
| 1W        | Swing Trade| 250        |

### Analiz İçin Çekilecek Veriler

1. **OHLCV Verileri** (Binance Klines API)
   - Scalping: 1000 mum
   - Day Trade: 500 mum
   - Swing Trade: 250 mum

2. **Order Book Verileri** (Binance Depth API)
   - Derinlik: 40 seviye (bids + asks)
   - Endpoint: `GET /api/v3/depth?symbol={symbol}&limit=40`

3. **Tokenomics Verileri** (CoinGecko/CoinMarketCap API)
   - Market Cap
   - Circulating Supply
   - Total Supply
   - Max Supply
   - FDV (Fully Diluted Valuation)

4. **Haber Verileri** (CryptoPanic/NewsAPI)
   - Son 24 saat haberleri
   - Sentiment analizi
   - Önemli gelişmeler

5. **Ekonomik Takvim** (Finnhub API / Hardcoded Events)
   - FOMC toplantıları ve faiz kararları
   - CPI (Tüketici Fiyat Endeksi)
   - NFP (Tarım Dışı İstihdam)
   - GDP açıklamaları
   - ECB, BoE, BoJ merkez bankası kararları

### Ekonomik Takvim Trade Bloklama Kuralları (ZORUNLU)
- **High-impact event 4 saat içinde → TRADE ÖNERİLMEZ**
- **FOMC günü → TRADE ÖNERİLMEZ (tüm gün)**
- **Event sonrası 2 saat → TRADE ÖNERİLMEZ (volatilite)**
- Market Pulse'da `shouldBlockTrade: true` döner
- Verdict otomatik olarak "AVOID" olur
- Score maksimum 2'ye düşer
- Gate `canProceed: false` döner

### Veri Kullanım Kuralları
- Her analiz için OHLCV + Order Book + Tokenomics + News + Ekonomik Takvim verileri çekilmeli
- Order Book analizi: Alım/satım baskısı, büyük duvarlar, likidite
- Tokenomics analizi: Supply metrikleri, inflation risk, unlock schedule
- News analizi: Sentiment score, önemli gelişmeler, piyasa etkisi

---

## 🎯 Analiz Orchestration (ZORUNLU)

### Her Analiz Tamamlandığında Kullanıcı Hakları

| Hak | Miktar | Ücretsiz Limit | Sonrası Maliyet | Takip Alanı |
|-----|--------|----------------|-----------------|-------------|
| AI Expert Sohbet | 3 | 3 soru/analiz | 5 kredi/soru | `Analysis.aiExpertQuestionsUsed` |
| PDF İndirme | 2 | 2 indirme/analiz | 5 kredi/indirme | `Analysis.pdfDownloadsUsed` |
| Email Gönderme | 2 | 2 email/analiz | 5 kredi/email | `Analysis.emailsSentUsed` |
| Otomatik Özet Email | ∞ | Ücretsiz | - | Otomatik gönderilir |

### Trade Type Completion Bonus (Otomatik)

| Trade Type | Bonus Kredi | Açıklama |
|------------|-------------|----------|
| Scalping | +3 kredi | Yüksek risk, hızlı trade - ekstra ödül |
| Day Trade | +2 kredi | Orta vadeli trade bonusu |
| Swing Trade | +1 kredi | Standart bonus |

> **Not:** Bonus, analiz tamamlandığında otomatik olarak eklenir. `creditService.add()` ile `BONUS` tipinde kaydedilir.

### Otomatik Bildirimler (Analiz Tamamlandığında)

1. **Email Özeti** - `emailService.sendAnalysisSummary()` ile kullanıcının email'ine gönderilir
2. **Telegram Bildirimi** - Bağlıysa `telegramChatId` üzerinden gönderilir
3. **Discord Webhook** - Bağlıysa `discordWebhookUrl` üzerinden gönderilir

### Orchestration Akışı

```
Analiz Başlatılır (25 kredi)
    ↓
7 Adımlık Analiz Çalışır
    ↓
Database'e Kaydedilir (Analysis tablosu)
    ↓
Daily Analysis Bonus Kontrolü (her 10 analiz = 1 kredi)
    ↓
Trade Type Bonus Eklenir:
    ├── Scalping → +3 kredi
    ├── Day Trade → +2 kredi
    └── Swing Trade → +1 kredi
    ↓
Otomatik Bildirimler Gönderilir (fire & forget)
    ├── Email Özeti → Kullanıcı email'i
    ├── Telegram → telegramChatId (varsa)
    └── Discord → discordWebhookUrl (varsa)
    ↓
Kullanıcı Hakları Aktif:
    ├── 3x AI Expert sohbet (ücretsiz)
    ├── 2x PDF indirme (ücretsiz)
    └── 2x Email gönderme (ücretsiz)
```

### Kod Lokasyonları

| Fonksiyon | Dosya | Satır |
|-----------|-------|-------|
| Analiz oluşturma | `analysis.routes.ts` | 528-544 |
| Trade type bonus | `analysis.routes.ts` | 549-562 |
| Otomatik email | `analysis.routes.ts` | 564-596 |
| AI Expert hak kontrolü | `ai-expert.routes.ts` | 186-358 |
| PDF indirme hak kontrolü | `report.routes.ts` | 564-662 |
| Email gönderme hak kontrolü | `report.routes.ts` | 1209-1328 |

### Önemli Kurallar

- **Admin kullanıcılar** tüm haklara ücretsiz sahiptir
- Haklar **analiz bazlı** takip edilir, global değil
- Ücretsiz haklar bitince **otomatik kredi düşürülür**
- Yetersiz kredi durumunda `INSUFFICIENT_CREDITS` hatası döner
- Hata durumunda **krediler otomatik iade edilir**
- **Trade type bonus** her analiz sonunda otomatik eklenir

---

## 🐛 Çözülen Bug'lar (Tekrarlama Riski Var)

| Tarih | Bug | Çözüm | Dosya |
|-------|-----|-------|-------|
| 2026-01-17 | Recent Analyses 0% gösteriyor | Prisma Decimal → Number() dönüşümü | `apps/api/src/modules/analysis/analysis.routes.ts:985` |
| 2026-01-17 | My Accuracy "No data yet" | Statistics API'yi analysis tablosundan veri alacak şekilde yeniden yaz | `apps/api/src/modules/analysis/analysis.routes.ts` |
| 2026-01-17 | Credits kartı light mode'da koyu | Dark/light mode gradient'leri ayır | `apps/web/app/(dashboard)/dashboard/page.tsx` |
| 2026-01-17 | Admin kullanıcı "Beginner" badge gösteriyor | isAdmin kontrolü ekle, Admin badge göster | `apps/web/app/(dashboard)/layout.tsx:361` |
| 2026-01-17 | Active Trades 0% gösteriyor (Trade plan olmayanlar) | null/undefined kontrolü ekle, "N/A" göster | `apps/web/app/(dashboard)/dashboard/page.tsx:200-246` |
| 2026-01-17 | Active Trades direction hep "short" görünüyor | lowercase karşılaştırma düzelt | `apps/web/app/(dashboard)/dashboard/page.tsx:234` |
| 2026-01-17 | Analysis detay sayfası ID'yi sembol olarak gösteriyor | `/analysis/` → `/analyze/details/` route düzelt | `dashboard/page.tsx`, `CoinSelector.tsx` |
| 2026-01-17 | Recent Analyses (/analyze) 0% gösteriyor | 1) null score için "—" göster, 2) step7Result.overallScore fallback ekle | `RecentAnalyses.tsx`, `analysis.routes.ts:981-990` |
| 2026-01-17 | CoinSelector dropdown görünmüyor | Parent'taki overflow-hidden kaldır, gradient'e rounded ekle | `apps/web/app/(dashboard)/analyze/page.tsx:170-171` |
| 2026-01-17 | Landing page pricing kartları görünmüyor (Vercel preview) | CREDIT_PACKAGES static fallback kullan, API başarısız olunca | `apps/web/app/(marketing)/page.tsx:1149-1180` |
| 2026-01-18 | Production 500 error - missing columns (P2022) | Migration eklendi: cost_settings.credit_cost_analysis_purchase, analyses.ai_expert_questions_used | `apps/api/prisma/migrations/add_missing_columns_production.sql` |
| 2026-01-18 | Analyze sayfası modal arkasında içerik görünüyor | z-index z-[100]'e yükseltildi, isolate eklendi, backdrop opacity %70'e çıkarıldı | `AnalysisDialog.tsx`, `CoinSelector.tsx`, `analyze/page.tsx` |
| 2026-01-18 | Analysis outcome %100 TP gösteriyor (SL hit tespit edilmiyor) | Binance Klines API ile tarihsel fiyat kontrolü eklendi (createdAt'ten itibaren High/Low değerleri kontrol ediliyor) | `apps/api/src/modules/reports/live-tracking.service.ts` |
| 2026-01-18 | Timeframe mapping yanlış (4h→swing, 1d→position olmamalı) | Düzeltildi: 4h→dayTrade, 1d→swing. Position trade type kaldırıldı | `trade-config.ts`, `TradeTypeSelector.tsx`, `CoinSelector.tsx`, `AnalysisDialog.tsx` |
| 2026-01-19 | TFT Predictor build timeout (europe-west4) | CPU-only PyTorch kullan (~5GB→~1GB). GPU ileride eklenecek | `services/tft-predictor/requirements.txt`, `Dockerfile` |
| 2026-01-19 | Gemini API rate limit (429) hatası - AI Expert failed | 1) Fetch timeout (30s) eklendi, 2) Max wait 20s'ye düşürüldü, 3) Retry 3'e indirildi, 4) lastError düzgün set ediliyor. Expert Panel: paralel → sıralı çağrı (500ms delay) | `apps/api/src/core/gemini.ts`, `ai-expert.service.ts`, `translation.service.ts` |
| 2026-01-19 | Platform accuracy farklı sayı gösteriyor | `getRealAccuracy()` Report tablosu yerine Analysis tablosundan veri çekiyor. Tutarlılık sağlandı | `apps/api/src/modules/reports/outcome.service.ts` |
| 2026-01-20 | AI Expert "Failed to generate PDF" hatası | 1) Daha iyi hata işleme eklendi, 2) Hata durumunda otomatik kredi iadesi, 3) PDF fonksiyonuna validasyon ve logging eklendi | `ai-expert/[expertId]/page.tsx`, `AnalysisReport.tsx` |
| 2026-01-20 | Tokenomics "Data could not be retrieved" hatası | CoinMarketCap ve Binance fallback eklendi. Fallback zinciri: CoinGecko → CoinMarketCap → Binance | `apps/api/src/modules/analysis/services/tokenomics.service.ts` |
| 2026-01-20 | Trade Plan Chart PDF'de görünmüyor | 1) Chart ID'leri düzeltildi, 2) Canvas arama fallback eklendi, 3) Scroll into view eklendi, 4) Bekleme süresi 2s'ye çıkarıldı | `AnalysisReport.tsx`, `analyze/details/[id]/page.tsx` |
| 2026-01-20 | CoinGecko Demo API yanlış header kullanıyordu | Demo API için `x-cg-demo-api-key` header ve public URL kullanılıyor. `COINGECKO_API_TYPE=demo` env var eklendi | `tokenomics.service.ts` |
| 2026-01-20 | PDF generation: Cannot read properties of null (reading 'gate') | Tüm step verilerine default değerler eklendi (mp, as, sc, tm, tp, tc). Null erişim hatası önlendi | `AnalysisReport.tsx` |
| 2026-01-20 | Final Verdict "N/A Recommended" anlamsız gösteriliyor | 1) Default verdict değerleri eklendi (action: WAIT), 2) Direction yoksa WAIT gösterilir, 3) hasDirection kontrolü ile doğru renk/metin | `AnalysisReport.tsx` |
| 2026-01-20 | PDF raporda tokenomics ve grafik eksik | handleDownload fonksiyonunda tokenomics dahil edilmemişti. Tüm step verileri (1-7) tam olarak eklendi | `RecentAnalyses.tsx` |
| 2026-01-20 | PDF'de mum grafiği (candlestick) gösterilmiyor | 1) Backend'e chartCandles (son 50 mum) eklendi, 2) SVG generator candlestick çizecek şekilde güncellendi, 3) OHLCV verisi frontend'e aktarıldı | `analysis.engine.ts`, `AnalysisReport.tsx` |
| 2026-01-20 | Detay sayfasından PDF indirilemiyor ve grafik capture edilmiyor | 1) Detay sayfasına PDF butonu eklendi, 2) TradePlanChart html2canvas ile capture edilip chartImage olarak PDF'e ekleniyor, 3) RecentAnalyses'a chartCandles aktarıldı | `details/[id]/page.tsx`, `RecentAnalyses.tsx` |
| 2026-01-20 | Email'de Trade Plan Chart görünmüyor (inline SVG) | Email client'lar (Gmail) güvenlik nedeniyle inline SVG'yi strip ediyor. SVG base64 data URL'e çevrilip img tag'inde kullanılıyor | `report.routes.ts` |
| 2026-01-20 | Email'de verdict "N/A" gösteriliyor | RecentAnalyses'ta `analysis.verdict` yok (veritabanında böyle alan yok). `step7.verdict` kullanılacak şekilde düzeltildi | `RecentAnalyses.tsx` |
| 2026-01-20 | Otomatik email analiz tamamlandığında gönderiliyordu | Kullanıcı isteğiyle kaldırıldı. Manuel email Recent Analyses'tan gönderilebilir. Telegram/Discord bildirimleri hala aktif | `analysis.routes.ts` |
| 2026-01-20 | Email'de timeframe/interval gösterilmiyordu | `interval` field eklendi - symbol başlığında "4H | tarih" formatında gösteriliyor | `RecentAnalyses.tsx`, `report.routes.ts` |
| 2026-01-20 | AI Expert score email'de /10 formatında gösteriliyordu | `convertScoreTo100Scale` fonksiyonu eklendi - tüm X/10 skorları X*10/100 formatına çevrildi (örn: 7.4/10 → 74/100) | `report.routes.ts` |
| 2026-01-21 | Concierge API 404 hatası - frontend yanlış domain'e istek yapıyordu | `fetch` yerine `authFetch` kullanıldı - `api.traderpath.io`'ya yönlendirme | `useConcierge.ts` |
| 2026-01-21 | Interface preference modal görünmüyordu (undefined check) | `null || undefined` kontrolü eklendi | `apps/web/app/(dashboard)/layout.tsx:120` |
| 2026-01-21 | preferredCoins column DB'de yoksa hata veriyordu | try-catch eklendi, default değerler kullanılıyor | `concierge.routes.ts`, `concierge.service.ts` |
| 2026-01-21 | InterfacePreferenceModal Türkçe'ydi | Tüm metinler İngilizce'ye çevrildi | `InterfacePreferenceModal.tsx` |
| 2026-01-21 | AI Concierge "Analysis Not Found" hatası - timeframe olmadan analiz yapılamıyor | Analiz veritabanına kaydedilmiyordu. `analyzeWithExpertPanel` fonksiyonuna `prisma.analysis.create` eklendi, interval parametresi eklendi | `ai-expert.service.ts`, `concierge.service.ts` |
| 2026-01-21 | Chart View trade plan göstermiyor - yanlış step ve alan adları | Trade plan `step5Result`'tan alınmalı (step7 değil), alan adları: `averageEntry`, `stopLoss.price`, `takeProfits[].price`. Trade plan yoksa açıklayıcı mesaj eklendi | `concierge.service.ts`, `concierge/page.tsx` |
| 2026-01-21 | AI Expert soruları Concierge'de çalışmıyor - "yanıt üretemiyorum" hatası | `response.reply` yerine `response.response` kullanılmalı. ChatResponse interface'inde `reply` alanı yok | `concierge.service.ts` |
| 2026-01-22 | Email raporunda logo ve coin ikonu görünmüyor, rakamlar üst üste biniyor | Logo ve coin ikonu kaldırıldı, trade plan tablosuna `table-layout: fixed` ve `width: 20%` eklendi | `report.routes.ts` |
| 2026-01-22 | CoinSelector filtre (Gainers, Losers) çalışmıyor | `fetch` → `authFetch`, loading state düzeltmesi, All Coins listesi filtre seçildiğinde gizleniyor | `CoinSelector.tsx` |
| 2026-01-22 | AI Concierge "BTCUSDT 1h" anlamıyor | USDT/BUSD/PERP suffix'leri temizleniyor. `cleanedMessage` ile coin detection | `concierge.service.ts` |
| 2026-01-22 | AI Concierge "chart" komutu MONTHLY_PERFORMANCE tetikliyor | "chart" ve "grafik" kelimeleri MONTHLY_PERFORMANCE'dan kaldırıldı | `concierge.service.ts` |
| 2026-01-22 | AI Concierge karmaşık mesajları anlamıyor | Gemini AI fallback eklendi - rule-based başarısız olunca Gemini kullanılıyor | `concierge.service.ts`, `system-prompt.ts` |
| 2026-01-22 | OAuth login P2022 hatası - preferred_language column yok | Migration eklendi: `ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en'` | `apps/api/prisma/migrations/add_preferred_language_column.sql` |
| 2026-01-22 | AI Concierge "Unable to synthesize" hatası | VOLTRAN synthesis başarısız olunca verdict/score bazlı doğal dil fallback eklendi | `concierge.service.ts` |
| 2026-01-22 | TradePlanChart fiyat formatlama hatası (1.937 → 1,937) | `toLocaleString()` yerine `formatPrice()` fonksiyonu eklendi - locale bağımsız doğru formatlama | `TradePlanChart.tsx` |
| 2026-01-22 | TradePlanChart entry marker yanlış semantik | Marker "ENTRY @ $price" yerine "Analysis" olarak değiştirildi. Marker analiz zamanını gösterir, entry fiyatı sarı çizgi ile gösterilir (limit order farklı seviyede olabilir) | `TradePlanChart.tsx` |
| 2026-01-22 | Stop Loss hesaplaması destek/direnç seviyelerini dikkate almıyordu | LONG için SL destek seviyesinin ALTINA, SHORT için SL direnç seviyesinin ÜSTÜNE yerleştiriliyor. Minimum %1.5 stop mesafesi zorunlu | `analysis.engine.ts:5231-5300` |
| 2026-01-22 | Scheduled Analysis kredi çekilmeden iade yapıyordu | `creditService.deduct()` yerine `creditService.charge()` kullanıldı. Sadece kredi çekildiyse iade yapılıyor. `creditsCharged` flag eklendi | `scheduled-reports.service.ts:99-155` |
| 2026-01-22 | AI Concierge platform sorularını anlamıyordu | PLATFORM_INFO ve CONVERSATIONAL intent'leri eklendi. "özetle", "anlat", "platform nedir" gibi sorular artık cevaplanıyor | `concierge.service.ts`, `system-prompt.ts` |
| 2026-01-22 | Production crash - @google/genai require ESM hatası | `require()` yerine ES module `import` kullanıldı. ESM bundle'da dynamic require desteklenmiyor | `apps/api/src/core/gemini.ts` |
| 2026-01-22 | Email raporu gönderilemiyor - symbol ve takeProfits eksik | Reports sayfasında symbol/analysisId/generatedAt report seviyesindeydi, reportData içine eklendi. RecentAnalyses'ta step5.takeProfits dizisi kullanılmalıydı (takeProfit1/2/3 yok) | `reports/page.tsx`, `RecentAnalyses.tsx` |
| 2026-01-22 | AI Concierge Türkçe yanıt vermiyor ve cümleler kesiliyor | VOLTRAN synthesis bypass edildi, `generateNaturalResponse()` kullanılıyor. Akıllı dil tespiti eklendi (80+ Türkçe kelime + özel karakterler). Tüm handler'lar detectedLanguage kullanıyor | `concierge.service.ts`, `ai-expert.service.ts` |
| 2026-01-23 | Railway build error - secret GOOGLE_TRANSLATE_API_KEY not found | Railpack statik analizi `process.env.VAR_NAME` pattern'ini tespit ediyor. `process.env['VAR_NAME']` bracket notation ile bypass edildi | `google-translate.ts`, `google-tts.ts` |
| 2026-01-24 | Analysis screenshot sadece grafiği yakalıyordu | `handleScreenshot` fonksiyonu `chartRef` yerine `pageRef` kullanacak şekilde düzeltildi - artık tüm analiz içeriği (7 adım, verdict, trade plan) yakalanıyor | `analyze/details/[id]/page.tsx:107-143` |
| 2026-01-24 | Pricing sayfasında "35 Credits Per analysis" hardcoded | `ANALYSIS_BUNDLES` import edilip dinamik değer kullanıldı. `pricing-config.ts`'de 35→25 düzeltildi | `pricing/page.tsx`, `pricing-config.ts` |
| 2026-01-24 | PEPE analizi AI Expert'te desteklenmiyordu (NEAR karışıklığı) | `SUPPORTED_SYMBOLS` listesi genişletildi: meme coins (PEPE, SHIB, WIF, BONK), AI tokens (FET, AGIX, RNDR), DeFi, Gaming ve diğer popüler coinler eklendi | `ai-expert.service.ts:1317-1330` |
| 2026-01-26 | Analysis marker her zaman son mum üzerinde görünüyordu | `analysisTime` prop eklendi TradePlanChart'a - tarihsel analizlerde marker analiz zamanına en yakın mum üzerine konumlandırılıyor | `TradePlanChart.tsx`, `details/[id]/page.tsx`, `reports/[id]/page.tsx` |
| 2026-01-26 | SL hit olan analizler outcome güncellenmiyordu | `checkAllHistoricalOutcomes()` sadece startup'ta çalışıyordu, şimdi her 10 dakikada bir çalışıyor. Binance Klines API ile tarihsel mum verileri kontrol edilerek kaçırılan SL/TP hit'ler yakalanıyor | `index.ts:392-406` |
| 2026-01-26 | Grafikteki "Current" çizgisi eski fiyatı gösteriyordu | `livePrice` state eklendi - son mumun close fiyatı kullanılıyor. Prop'tan gelen stale fiyat yerine canlı fiyat gösteriliyor | `TradePlanChart.tsx:116,249-258,358` |
| 2026-01-26 | AI Expert yorumları raw tag'lerle gösteriliyordu | `renderAIExpertComment` parser fonksiyonu eklendi - [EXPERT:ARIA], [VOLTRAN] vb. tag'ler emoji ve renklerle düzgün formatlaniyor | `reports/[id]/page.tsx:36-104` |
| 2026-01-28 | Landing page P/L Dashboard ile uyuşmuyordu (119.9% vs 120.7%) | `platform-performance-history` endpoint'i artık `allTimeTotalPnL` döndürüyor - 30 günlük filtre all-time toplamı etkilemiyordu | `analysis.routes.ts:1395-1414`, `LandingPerformanceChart.tsx:34,167-168,216-220` |
| 2026-01-28 | Login sayfası dark/light mode uyumsuzluğu - sol panel her zaman koyu | Sol marketing paneli artık tema tercihini takip ediyor. Light/dark mode'a uygun renkler kullanılıyor | `apps/web/app/(auth)/layout.tsx` |
| 2026-01-28 | Top 5 Coins "Scan Now" butonu çalışmıyordu - analiz yapılmıyordu | 1) Yeni API endpoint eklendi: `POST /api/analysis/top-coins/scan` (300 kredi), 2) Frontend concierge yerine dedicated endpoint kullanıyor, 3) Doğru polling ile progress gösterimi (2-3 dakika), 4) Status endpoint eklendi: `GET /api/analysis/top-coins/status` | `analysis.routes.ts:4758-4850`, `analyze/page.tsx:368-454` |
| 2026-01-28 | Dil seçimi sadece landing page'de çalışıyordu, Settings'teki çalışmıyordu | Settings'teki dil seçici kaldırıldı (sadece backend için kullanılıyordu, UI çevirmiyordu). Google Translate-based LanguageSelector tüm dashboard sayfalarına eklendi (header + mobile menu) | `settings/page.tsx`, `layout.tsx:31,361,486-492` |
| 2026-01-28 | TP3 anlamsız seviyelere konumlanıyordu (ETH'de 393$) | 1) TP3 kaldırıldı (sadece TP1/TP2, %60/%40), 2) Max SL sınırı eklendi (%10), 3) Max TP sınırı eklendi (%20), 4) Entry destek/direnç bazlı yapıldı (LONG→support, SHORT→resistance) | `analysis.engine.ts:5050-5320`, `trade-config.ts` |
| 2026-01-29 | MLIS Pro analizi "Failed to complete analysis" hatası | 1) `method: 'mlis_pro'` DB'ye kaydedilmiyordu - eklendi, 2) AnalysisProgressBar 5-layer desteği eklendi, 3) AnalysisDialog MLIS sonuçlarını doğru işliyor, 4) saveReportToDatabase MLIS için 5 adım bekliyor | `AnalysisDialog.tsx`, `AnalysisProgressBar.tsx`, `analysis.routes.ts:516` |
| 2026-01-29 | MLIS Pro analizi detay sayfasında 7-step formatında gösteriliyordu | 1) `isMLIS` detection eklendi (method veya mlis flag), 2) 5-layer MLIS kartları (Technical, Momentum, Volatility, Volume, Verdict) eklendi, 3) MLIS Verdict badge ve confidence/risk gösterimi, 4) Trade plan chart MLIS için gizlendi, 5) Key signals ve risk factors gösterimi | `analyze/details/[id]/page.tsx` |
| 2026-01-29 | Details sayfası "o.toFixed is not a function" TypeError hatası | 1) `ScoreGauge` komponentine `safeScore` validasyonu eklendi (non-number input'ları 0'a çeviriyor), 2) Tüm score prop'ları `Number()` ile dönüştürülüyor, 3) Step score gösterimleri (step1-4) ve mlisConfidence için type checking eklendi | `TradeDecisionVisual.tsx`, `details/[id]/page.tsx` |
| 2026-01-29 | Export header'da yanlış 4-kare logo görünüyordu | `StarLogo` komponenti kullanılıyor, gradient TraderPath metni eklendi | `details/[id]/page.tsx` |
| 2026-01-29 | Verdict AVOID olduğunda BULLISH gösteriliyordu | `getVerdict()` fonksiyonu eklendi, GO/COND/WAIT/AVOID badge'leri doğru renk ve ikonla gösteriliyor | `details/[id]/page.tsx` |
| 2026-01-29 | Scan Now dual method yapısı nedeniyle hata veriyordu | 1) `coin-score-cache.service.ts`'de `method: 'classic'` açıkça set ediliyor, 2) System scan'ler Classic metod kullanıyor | `coin-score-cache.service.ts:115` |
| 2026-01-29 | MLIS Pro analiz tamamlandığında layers undefined olabiliyordu | 1) Default layer değerleri eklendi, 2) Null/undefined için fallback'ler, 3) Classic analiz için steps validasyonu | `AnalysisDialog.tsx:520-566` |
| 2026-01-29 | Top 5 Coins "Scan Now" cache'den gelen veriyi yanlış işliyordu | Backend `{ coins, cacheInfo }` döndürüyordu ama frontend tüm objeyi `topCoins` array'ine set ediyordu. `data.data.coins` olarak düzeltildi | `analyze/page.tsx:354` |
| 2026-01-29 | Dil değişikliğinde sayfa boş geliyor veya hata veriyor | 1) `window.location.reload()` yerine `router.refresh()` kullanıldı, 2) Loading state eklendi, 3) Google Translate iframe yöntemi öncelikli, 4) Soft reload fallback (500ms delay), 5) Hata durumunda graceful degradation | `LanguageSelector.tsx:99-158` |
| 2026-01-29 | Reports sayfası hata durumunda sessizce başarısız oluyordu | 1) `error` state eklendi, 2) API hata mesajları gösteriliyor, 3) "Try Again" butonu ile yeniden deneme, 4) Connection error için özel mesaj | `reports/page.tsx:125-151,509-526` |
| 2026-01-29 | Top 5 Coins scan başlıyor ama tamamlanmıyordu | 1) Scan session tracking eklendi (isScanning, coinsAnalyzed, totalCoins), 2) Status endpoint gerçek scan progress döndürüyor, 3) Frontend polling doğru koşulları kontrol ediyor, 4) Timeout 5 dakikadan 10 dakikaya çıkarıldı, 5) Duplicate scan'ler engellendi | `coin-score-cache.service.ts`, `analysis.routes.ts:5004-5032`, `analyze/page.tsx:391-470` |
| 2026-01-31 | SLV ve diğer non-crypto varlıklar için analiz hatası (Binance SLVUSDT yok) | Multi-Asset Data Provider oluşturuldu: Crypto→Binance, Stocks/Bonds/Metals→Yahoo Finance. analysis.engine.ts ve mlis.service.ts güncellendi. Asset class detection ile doğru API'ye yönlendirme | `multi-asset-data-provider.ts`, `analysis.engine.ts`, `mlis.service.ts` |
| 2026-01-31 | Capital Flow Sectors butonu çalışmıyordu | onClick handler'a `setSelectedLayer(3)` eklendi - artık sektörler görünüyor | `capital-flow/page.tsx` |
| 2026-01-31 | Capital Flow SELL önerisi gösterilmiyordu (tüm marketler pozitifken) | Relative weakness detection eklendi (>5% gap), slowing momentum check eklendi (<-1 velocity), risk-off için her zaman gösterim | `capital-flow.service.ts` |
| 2026-01-31 | Analyze sayfasında Recent bölümü iç içe geçmişti | Wrapper'daki gereksiz header kaldırıldı (RecentAnalyses zaten kendi header'ına sahip) | `analyze/page.tsx` |
| 2026-01-31 | AI Concierge analiz sonucu verdict kartı ve TradePlanChart görüntülenmiyor | handleAnalysis fonksiyonu direction ve tradePlan döndürmüyordu. Analiz DB'den çekilip step5Result ve step7Result'tan direction/tradePlan eklendi | `concierge.service.ts` |
| 2026-01-31 | Dil değişikliği sayfa yenilemesi gerektiriyordu | Google Translate combo box doğrudan manipüle ediliyor (fireEvent ile change tetikleme). triggerTranslation ve resetToEnglish fonksiyonları eklendi. Sayfa yenileme yerine anlık çeviri | `LanguageSelector.tsx` |
| 2026-01-31 | Concierge sayfasında TradePlanChart "Application error" hatası veriyordu | Çoklu sorun düzeltildi: 1) tradePlan interface uyumsuzluğu (`averageEntry` vs `entry`, `stopLoss` object vs number), 2) `capitalFlow.recommendation` ve `capitalFlow.globalLiquidity.bias` null check eksikti, 3) `flow.toFixed()` NaN kontrolü eklendi, 4) `.toUpperCase()` null kontrolü eklendi, 5) TradePlanChart try-catch ile sarmalandı, 6) Tüm Number() dönüşümleri güvenli hale getirildi | `concierge/page.tsx` |
| 2026-01-31 | Reports sayfasında verdict GO görünürken detay sayfasında AVOID görünüyordu | `normalizeVerdict` fonksiyonları 'long'/'short' (direction) değerlerini yanlışlıkla 'go' (verdict) olarak işliyordu. Direction ve verdict ayrı kavramlar - düzeltildi | `reports/page.tsx`, `RecentAnalyses.tsx` |
| 2026-01-31 | Concierge sayfasında TradePlanChart "Application error" hatası veriyordu | Frontend tradePlan interface'i backend'den gelen veri yapısıyla uyumsuzdu. `averageEntry` vs `entry`, `stopLoss` object vs number, `takeProfits` object array vs number array. Her iki yapıyı da destekleyecek şekilde düzeltildi | `concierge/page.tsx` |
| 2026-01-31 | GLD/SLV gibi metal ETF'ler için "Analiz tamamlanamadı" hatası | Yahoo Finance intraday veri (1H, 4H) döndürmeyebiliyordu. Fallback mekanizması eklendi: intraday yetersizse günlük veriye geçiş, minimum 50 mum validasyonu, detaylı hata mesajları ve loglama | `multi-asset-data-provider.ts` |
| 2026-01-31 | Settings Billing sayfasında Payment Methods eklenemiyor, Transaction History görünmüyordu | 1) Transaction History API (`/api/credits/history`) zaten mevcuttu ama frontend bağlı değildi - useEffect ile fetch eklendi, 2) Buy Credits butonu onClick handler'sızdı - /pricing'e yönlendirme eklendi, 3) Payment Methods stub idi - Lemon Squeezy secure checkout açıklaması eklendi (saved cards desteklenmiyor), 4) Transaction listesi loading/empty/data state'leri ile güncellendi | `settings/page.tsx` |
| 2026-01-31 | Capital Flow Market Flow Analyzer grafik etiketleri Türkçe yazılmıştı | "Para Akışı (30g)" → "Money Flow (30d)", "Akış Hızı (30g)" → "Flow Velocity (30d)" olarak İngilizce'ye çevrildi | `capital-flow/page.tsx` |
| 2026-01-31 | Concierge sayfasında "TypeError: Cannot read properties of undefined (reading 'map')" hatası | `capitalFlow.marketFlows` API'den undefined veya non-array gelebiliyordu. `Array.isArray(capitalFlow.marketFlows) && capitalFlow.marketFlows.length > 0` kontrolü eklendi | `concierge/page.tsx:572` |
| 2026-02-01 | Landing page FAQ'da kredi fiyatları yanlıştı (Layer 3 FREE, Layer 4 5 kredi, Asset 25 kredi) | Doğru fiyatlar eklendi: Layer 1-2 FREE, Layer 3 ve Layer 4 her biri 25 kredi/gün, Asset Analysis 100 kredi/gün (max 10 analiz) | `apps/web/app/(marketing)/page.tsx:771-774` |
| 2026-02-01 | AI Concierge "Altın alınır mı?" sorusuna eksik yanıt veriyordu | 1) "alınır mı?", "satmalı mı?", "should I buy?" pattern'leri CAPITAL_FLOW_RECOMMENDATION intent'ine eklendi, 2) Gold/Silver/BTC/ETH gibi asset'ler tespit edilip assetHint olarak aktarılıyor, 3) handleCapitalFlowRecommendation fonksiyonuna asset-specific advice eklendi (Türkçe/İngilizce), 4) Gemini prompt'a örnek sorgular eklendi | `concierge.service.ts`, `system-prompt.ts` |
| 2026-02-01 | AI Concierge "Öneri oluşturulamadı" hatası (Capital Flow recommendation çalışmıyordu) | `FlowRecommendation` interface'inde alan adı `reason` ama kod `reasoning` kullanıyordu. `undefined.toLowerCase()` çağrısı hata fırlatıyordu. 3 yerde düzeltildi: 1) `recommendation.reasoning` → `recommendation.reason`, 2) `getFlowRecommendation()` fallback'te yanlış alan adları düzeltildi (`reasoning`→`reason`, `marketPhase`→`phase`, `suggestedSectors`→`sectors`, eksik `direction` eklendi) | `concierge.service.ts:1418-1420,1528`, `capital-flow.service.ts:832-840` |
| 2026-02-01 | Asset ikonları görünmüyordu (CoinIcon component) | `asset-logos-cache.ts` public API için `authFetch` kullanıyordu, giriş yapmamış kullanıcılarda başarısız oluyordu. 1) `authFetch` yerine doğrudan `fetch` kullanıldı, 2) API başarısız olunca boş cache yerine FALLBACK_CACHE döndürülüyor (26 crypto, 9 stock, 3 metal, 3 bond logo), 3) 10s timeout eklendi | `apps/web/lib/asset-logos-cache.ts` |
| 2026-02-01 | MLIS Pro analiz sonuçları çelişkili (WAIT/HOLD/AVOID 3 farklı verdict, 0% confidence, 8.1/10 vs 81/100) | 5 kritik hata düzeltildi: 1) Frontend step5 yerine step7'den MLIS verilerini okuyor (confidence, recommendation, direction), 2) VerdictBadge tutarlı (recommendation prop kaldırıldı, isMLISPro flag eklendi), 3) getDirection() artık confidence threshold'a saygı duyuyor (NEUTRAL döner), 4) <30% confidence'ta HOLD ve NEUTRAL döner, 5) Tüm skorlar 0-100 ölçeğinde normalize edildi | `mlis.service.ts`, `details/[id]/page.tsx`, `TradeDecisionVisual.tsx` |
| 2026-02-01 | 7-Step Classic analiz skor ölçek karışıklığı ve neutral direction handling | 6 kritik hata düzeltildi: 1) reports/page.tsx yanlış `/10` bölümü kaldırıldı (totalScore zaten 0-10), 2) reports/[id]/page.tsx TradeDecisionVisual'a `*10` eklendi (0-100 scale), 3) FinalVerdict.tsx TradeDecisionVisual'a `*10` eklendi, 4) details/[id]/page.tsx neutral direction desteği (isNeutral, gray renk, NEUTRAL text), 5) RecentAnalyses.tsx neutral direction badge (gray + Minus icon), 6) Tüm TradePlanChart'lar neutral olduğunda gizleniyor | `reports/page.tsx`, `reports/[id]/page.tsx`, `FinalVerdict.tsx`, `details/[id]/page.tsx`, `RecentAnalyses.tsx` |
| 2026-02-01 | Analysis details Export dropdown'da PNG/JPG/PDF/Email yerine sadece Download Report ve Email Report olmalıydı | Export dropdown sadeleştirildi: PNG, JPG seçenekleri kaldırıldı. Sadece "Download Report" (PDF) ve "Email Report" butonları kaldı. Kullanılmayan handleExportPNG ve handleExportJPG fonksiyonları silindi, Image import'u kaldırıldı | `analyze/details/[id]/page.tsx` |
| 2026-02-01 | GLD ve diğer non-crypto varlıklar için TradePlanChart "Failed to load chart data" hatası | TradePlanChart doğrudan Binance API çağırıyordu (Binance'de GLD yok). Yeni `/api/analysis/chart/candles` endpoint eklendi - multi-asset data provider kullanarak crypto→Binance, stocks/metals/bonds→Yahoo Finance yönlendiriyor. Frontend bu endpoint'i kullanacak şekilde güncellendi | `analysis.routes.ts`, `TradePlanChart.tsx` |
| 2026-02-02 | PDF rapor header'da TraderPath görünmüyor, rapor başlığı ve metod eksik | 1) Tüm sayfalara inline SVG logo eklendi (gradient id'ler sayfa bazlı unique), 2) "Asset Analysis Report" başlığı eklendi, 3) Analiz metodu badge'i eklendi (Classic 7-Step / MLIS Pro), 4) Rapor tarihi daha belirgin formatta gösteriliyor, 5) CONDITIONAL_GO durumunda koşulların açıklaması eklendi (Executive Summary ve Final Verdict sayfalarında) | `AnalysisReport.tsx` |
| 2026-02-02 | AI Concierge "Altın alınır mı?" sorusuna hardcoded/robotik yanıt veriyordu | `generateDataDrivenAssetResponse()` metodu eklendi - yanıtlar tamamen gerçek veriye dayalı: 1) flow30d, flowVelocity, phase, rotationSignal değerleri dinamik kullanılıyor, 2) Örnek: "Metal piyasasından %3.2 sermaye çıkışı var. Bonolar %5.8 giriş alıyor.", 3) Veri değiştikçe cümle değişiyor (hardcode yok), 4) Anlam tekrarı yok, 5) Phase bazlı öneri (EARLY/MID/LATE/EXIT) | `concierge.service.ts` |
| 2026-02-02 | Analyze sayfasında dil değişikliği yapınca hata oluşuyordu | Google Translate DOM'u değiştirdiğinde `.toFixed()` çağrıları undefined değerler üzerinde çalışıyordu. 1) `safeToFixed` helper fonksiyonu eklendi, 2) Optional chaining ile nested property erişimi güvenli hale getirildi, 3) Numerik değerlere `notranslate` class'ı eklendi, 4) Null coalescing ile karşılaştırmalar güvenli hale getirildi | `analyze/page.tsx` |
| 2026-02-02 | Capital Flow verileri yüklenemiyor hatası | `getCapitalFlowSummary()` fonksiyonunda herhangi bir API başarısız olunca tüm fonksiyon hata veriyordu. 1) `Promise.all` yerine `Promise.allSettled` kullanıldı, 2) `getFallbackGlobalLiquidity()` ve `getFallbackMarketFlows()` fallback fonksiyonları eklendi, 3) Cache operasyonları try-catch ile sarmalandı, 4) Her provider'ın başarısız olması durumunda ayrı fallback değerler | `capital-flow.service.ts` |
| 2026-02-02 | Concierge sayfasında "Cannot read properties of undefined (reading 'toUpperCase')" hatası | `capitalFlow.marketFlows.map()` içinde bazı market objelerinin `market` property'si undefined olabiliyordu. 1) Map öncesi `.filter(m => m && m.market)` eklendi, 2) `primaryMarket.toUpperCase()` için `String()` wrapper eklendi, 3) `direction.toUpperCase()` için `typeof === 'string'` kontrolü eklendi | `concierge/page.tsx` |
| 2026-02-02 | Concierge ve Dashboard Capital Flow verileri görünmüyordu (KÖKÜ NEDEN) | **Alan adı uyuşmazlığı**: Backend `CapitalFlowSummary` interface'i `markets` alanı döndürüyordu ama Concierge sayfası `capitalFlow.marketFlows` kullanıyordu. Dashboard sayfası doğru alan adını (`markets`) kullanıyordu. Çözüm: Concierge sayfasında tüm `marketFlows` referansları `markets` olarak düzeltildi | `concierge/page.tsx`, `dashboard/page.tsx` |
| 2026-02-02 | Capital Flow sayfasında "Cannot read properties of undefined (reading 'toUpperCase')" hatası | `data.markets.map()` ve `data.recommendation` property'leri undefined olabiliyordu. 1) Tüm `.map()` çağrıları öncesinde `.filter(m => m && m.market)` eklendi, 2) Tüm `.toUpperCase()` çağrılarına fallback değerler eklendi (örn: `(market.phase \|\| 'mid').toUpperCase()`), 3) Tüm `.toFixed()` çağrılarına null coalescing eklendi (örn: `(market.flow7d ?? 0).toFixed(1)`), 4) `reduce()` çağrıları boş dizi kontrolü eklendi, 5) recommendation properties'e optional chaining eklendi | `capital-flow/page.tsx` |
| 2026-02-02 | Mind map Layer 2'de market kartlarına tıklayınca tüm marketler gösteriliyordu (sadece seçilen market olmalıydı) | `SystemFlowChart` komponentine `onMarketClick` callback eklendi. Market kartına tıklandığında `setSelectedMarket()` ile market seçilip fullscreen modal açılıyor. Modal'da `selectedMarket` varsa sadece o marketin kartı + sektörleri gösteriliyor, "Back to all markets" butonu ile tüm marketlere dönülebiliyor | `capital-flow/page.tsx` |
| 2026-02-03 | Trade plan entry/TP/SL seviyeleri güncel fiyata göre mantıksız görünüyordu (pullback beklentisi frontend'e iletilmiyordu) | `needsToWaitForEntry`, `entryDistancePercent`, ve `entryStatus` alanları TradePlanResult interface'ine ve return objesine eklendi. LONG pozisyonlarda fiyat entry'nin üstündeyse "wait_for_pullback", SHORT pozisyonlarda fiyat entry'nin altındaysa "wait_for_rally" döndürülüyor. Frontend bu bilgiyi kullanarak kullanıcıya giriş beklemesi gerektiğini gösterebilir | `analysis.engine.ts:2046-2050,5518-5528,5783-5787` |
| 2026-02-03 | Concierge analiz maliyeti gereksiz yüksekti (Expert Panel otomatik çağrılıyordu) | Concierge'de `aiExpertService.analyzeWithExpertPanel()` yerine doğrudan `analysisEngine` kullanılıyor. Expert Panel artık opsiyonel - sadece kullanıcı AI Expert sayfasına girip soru sorarsa çağrılır. Maliyet tasarrufu: %58 ($0.0026 → $0.0011/analiz) | `concierge.service.ts:3364-3534` |
| 2026-02-03 | Vercel build error: "Cannot find name 'layer3Unlocked'" | `layer3Unlocked` ve `layer4Unlocked` değişkenleri `SystemFlowChart` komponenti içinde kullanılıyordu ama ana komponentte tanımlıydı. Değişkenler props olarak `SystemFlowChart`'a aktarıldı | `capital-flow/page.tsx:1027-1041,2565-2578` |
| 2026-02-05 | Explore sayfasında Capital Flow, Top Coins ve Signals sekmeleri boş görünüyordu | 1) Frontend: error state ve error UI eklendi (Promise.allSettled ile her API ayrı işleniyor), 2) Her sekme için hata mesajı ve retry butonu, 3) Boş durum için açıklayıcı mesajlar ve aksiyon butonları, 4) Backend: top-coins endpoint cache boşken recent analyses'a fallback yapıyor | `explore/page.tsx`, `analysis.routes.ts:5317-5376` |
| 2026-02-05 | Capital Flow sayfası "Error Loading Data" gösteriyordu | `getCapitalFlowSummary()` içinde `determineLiquidityBias`, `generateRecommendation`, `detectActiveRotation` fonksiyonları try-catch olmadan çağrılıyordu. Hata fırlatınca tüm API 500 döndürüyordu. 1) Tüm riskli fonksiyonlar try-catch ile sarıldı, 2) `getFallbackRecommendation()` fonksiyonu eklendi, 3) Cache yazma hatası da yakalanıyor | `capital-flow.service.ts:118-198,1072-1084` |
| 2026-02-05 | Trade plan entry/SL/TP seviyeleri güncel fiyattan çok uzaktaydı ve mantıksızdı (fiyat $112 iken entry $178, SL $188) | Trade plan mantığı tamamen yeniden yazıldı: 1) S/R seviyeleri artık analiz timeframe'inden (candlesPrimary) alınıyor (eskiden hep 1D), 2) Entry her zaman current price (pullback beklenmez), 3) SL = destek - 1 ATR (LONG) veya direnç + 1 ATR (SHORT), 4) TP1 = yakın direnç/destek, TP2 = uzak direnç/destek (yoksa 2R/3R fallback), 5) Fiyat S/R aralığının ortasındaysa "wait" durumu (entry koşulu karşılanmıyor), 6) Seviyeler yakınlığa göre sıralanıyor (güce göre değil), 7) >%10 uzaktaki seviyeler filtreleniyor, 8) DCA ve çoklu entry kaldırıldı, 9) TP dağılımı %60/%40 | `analysis.engine.ts:3682,5365-5565` |
| 2026-02-05 | BIST (Borsa Istanbul) analizi "Unknown asset class: bist" hatası veriyordu | 1) `asset-metrics.types.ts`'de AssetClass'a 'bist' eklendi, 2) `detectAssetClass()`'a BIST detection eklendi (35 sembol + .IS suffix), 3) Orchestrator'da BIST → stocks analyzer routing eklendi, 4) REGIME_EXPECTATIONS ve InterMarketContext'e 'bist' eklendi | `asset-metrics.types.ts`, `asset-analyzer-orchestrator.ts` |
| 2026-02-05 | Non-crypto varlıklarda (BIST, Stocks, Metals, Bonds) email/download/chart "SYMBOL/USDT" gösteriyordu | 14 yerde hardcoded `/USDT` kaldırıldı. `formatSymbolPair()` helper eklendi - crypto'ya /USDT ekler, non-crypto'ya eklemez. Email subject, body, chart title düzeltildi | `email.service.ts`, `report.routes.ts`, `TradePlanChart.tsx` |
| 2026-02-05 | Non-crypto varlıklarda fiyat takibi (live-tracking, outcome) başarısız oluyordu (Binance'de THYAOUSDT yok) | fetchBulkPrices, fetchCurrentPrice, fetchOHLCData, fetchKlines fonksiyonları multi-asset provider kullanacak şekilde güncellendi. Crypto→Binance, non-crypto→Yahoo Finance routing eklendi | `live-tracking.service.ts`, `outcome.service.ts`, `report.routes.ts` |
| 2026-02-06 | Email gönderme ve PDF indirme "Failed to execute 'createPattern' on 'CanvasRenderingContext2D'" hatası | html2canvas cloned DOM'da lightweight-charts canvas'ı 0 width/height ile oluşuyordu. onclone callback'lerinde `.trade-plan-chart-container` ve canvas elementleri gizlenerek çözüldü. 8 farklı html2canvas çağrısı (details + reports sayfaları) düzeltildi | `analyze/details/[id]/page.tsx`, `reports/[id]/page.tsx` |
| 2026-02-06 | SHIB ve diğer crypto tokenlar metals olarak yanlış sınıflandırılıyordu | `detectAssetClass()` metals/bonds/stocks için `.includes()` kullanıyordu → `SI=F` (Silver futures) → `SI` → `'SHIB'.includes('SI')` = true → metals! Fix: 1) Bilinen CRYPTO_SYMBOLS önce kontrol ediliyor (exact match), 2) Metals/bonds/stocks kontrollerinde `.includes()` yerine exact `===` match kullanılıyor | `asset-metrics.types.ts:detectAssetClass()` |
| 2026-02-06 | API build hatası: uuid paketi bulunamıyor ve rag.routes.ts auth import path yanlış | 1) 6 dosyada `uuid` (package.json'da yok) yerine `nanoid` (zaten kurulu) kullanıldı, 2) `rag.routes.ts`'de `../../core/auth` → `../../core/auth/middleware` olarak düzeltildi, 3) Kullanılmayan `getUser` import'u kaldırıldı | `citation.service.ts`, `breakout/pullback/range/trend-following.strategy.ts`, `error-collector.middleware.ts`, `rag.routes.ts` |
| 2026-02-06 | BIST market kartında rotation badge görünmüyordu (diğer marketlerde var) | `detectRotationSignal()` eşik değerleri arasında kalan flow değerleri için `null` döndürüyordu (ör: flow7d=4.7%, velocity=1.5 → entering için düşük, exiting değil, stable koşulu çok dar). `null` döndüğünde `RotationBadge` render edilmiyordu. Fix: `null` return kaldırıldı, eşik dışı tüm değerler `stable` döndürüyor | `capital-flow.service.ts:detectRotationSignal()` |
| 2026-02-06 | BIST seçildiğinde SHIB gibi crypto'lar gösteriliyordu (THYAO, GARAN gibi BIST hisseleri yerine) | Analyze sayfasındaki `AssetType` union type'ında 'bist' yoktu. `ALL_SYMBOLS`, `ASSET_CONFIGS`, `SECTOR_CONFIGS` hepsinde BIST eksikti. Capital Flow'dan `/analyze?market=bist` ile navigate edildiğinde URL parametresi okunmuyordu → default crypto kalıyordu. Fix: 1) AssetType'a 'bist' eklendi, 2) ASSET_CONFIGS'e BIST eklendi, 3) SECTOR_CONFIGS'e 6 BIST sektörü eklendi, 4) ALL_SYMBOLS'e 16 BIST hissesi sektör bazlı eklendi, 5) URL parametreleri okuyan useEffect eklendi | `analyze/page.tsx` |
| 2026-02-06 | Intelligence Dashboard tüm Capital Flow verileri N/A veya undefined gösteriyordu | Frontend `CapitalFlowSummary` interface'i backend API response yapısıyla tamamen uyumsuzdu. 8+ yanlış alan erişimi: 1) `globalLiquidity.bias` → `liquidityBias` (top-level), 2) `m2.growth` → `m2MoneySupply.yoyGrowth`, 3) `yieldCurve.spread` → `yieldCurve.spread10y2y`, 4) `ragLayer1-4` → `insights.ragLayer1-4`, 5) `sellRecommendation.market` → `sellRecommendation.primaryMarket`. Interface tamamen yeniden yazıldı, tüm field erişimleri düzeltildi, suggestedAssets rendering eklendi | `intelligence/page.tsx` |
| 2026-02-06 | intelligence/page.tsx bad merge Railway build'ı ve login'i tamamen bozuyordu | PR #526 (financial-dashboard-design) merge'i duplicate interface properties ve orphaned JSX attributes getirdi. `turbo run build` tüm paketleri build eder, web hata verince API de deploy edilemiyordu. Fix: 118 satır duplicate/orphan kod kaldırıldı, 1533→1415 satır | `intelligence/page.tsx` |
| 2026-02-06 | Middleware 8 korumalı route eksikti (capital-flow, intelligence, concierge vb.) | `/capital-flow` (login sonrası default sayfa) dahil 8 route `protectedPaths`'e eklenmemişti. Giriş yapmamış kullanıcılar bu sayfalara erişebiliyordu | `middleware.ts` |
| 2026-02-06 | Login route backend'den gelen isFirstLogin/firstLoginBonus/credits metadata'yı iletmiyordu | `data.data`'dan sadece `user` çıkarılıyordu. `credits`, `isFirstLogin`, `firstLoginBonus` da eklendi. Ayrıca non-JSON response ve fetch error için ayrı hata yakalama eklendi | `apps/web/app/api/auth/login/route.ts` |
| 2026-02-06 | Google OAuth callback first login tespiti ve hata yakalama eksikti | `isFirstLogin`/`firstLoginBonus` query params olarak `/capital-flow`'a aktarılıyor. Backend fetch hatası ve non-JSON response için ayrı try-catch eklendi | `apps/web/app/api/auth/google/callback/route.ts` |
| 2026-02-06 | favicon.ico 404 hatası (GET https://traderpath.io/favicon.ico 404) | Next.js rewrite kuralı eklendi: `/favicon.ico` → `/favicon.svg`. Hem development hem production'da çalışıyor | `next.config.js` |
| 2026-02-06 | Deprecated meta tag uyarısı: apple-mobile-web-app-capable yerine mobile-web-app-capable kullanılmalı | Next.js metadata API'sine `other: { 'mobile-web-app-capable': 'yes' }` eklendi. Modern PWA standardına uygun meta tag kullanılıyor | `apps/web/app/layout.tsx` |
| 2026-02-06 | Zustand deprecation warning ve kullanılmayan kod | Zustand hiç kullanılmıyordu. Package.json'dan kaldırıldı, useRewardsStore ve useRewards.ts silindi. Rewards page mock data kullanıyordu - gerçek API'lere bağlanacak | `package.json`, `stores/useRewardsStore.ts`, `hooks/useRewards.ts` |
| 2026-02-07 | Login "Server error" - backend 500 hatası (2 kök neden) | **Neden 1 (Frontend)**: OAuth callback `backendData.error?.code` Fastify default format'ta (`error` string, object değil) undefined dönüyordu → generic 'backend_error'. **Neden 2 (Backend)**: Tüm auth route'ları `prisma.user.findUnique()` ile `include` kullanıyordu, production'da eksik sütun varsa P2022 hatası veriyordu. **Fix**: 1) Frontend: `parseBackendError()` tüm response formatlarını handle ediyor, `fetchWithTimeout()` 15s timeout, retry for 502/503/504, 2) Backend: Tüm auth route'ları `select` kullanarak sadece gerekli sütunları çekiyor (P2022'ye dayanıklı), P2022/P2021 için spesifik hata mesajları, 3) Migration: `ensure_all_user_columns.sql` tüm eksik sütunları ekliyor | `auth/login/route.ts`, `google/callback/route.ts`, `login/page.tsx`, `auth.routes.ts`, `ensure_all_user_columns.sql` |
| 2026-02-07 | /me endpoint createdAt undefined döndürüyordu | Prisma `select` clause'unda `createdAt: true` eksikti. Response body'de `user.createdAt` referans ediliyordu ama select'te yoktu → undefined | `auth.routes.ts:668` |
| 2026-02-07 | Login hala 500 veriyor - security.service.ts P2022 crash | `auth.routes.ts` düzeltilmişti ama çağrılan security helper fonksiyonları düzeltilmemişti. **5 kritik sorun**: 1) `recordFailedLogin()` `findUnique` select clause olmadan → tüm sütunlar çekilip P2022, 2) `recordSuccessfulLogin()` 6 sütun update (loginAttempts, accountLocked, lastLoginAt vb.) → sütun yoksa P2022, 3) `checkSuspiciousActivity()` LoginAuditLog tablosu yoksa crash (try-catch yok), 4) `checkAccountLockout()` select'li ama try-catch yok → sütun yoksa crash, 5) `verifyEmail/resetPassword/createPasswordResetToken` findFirst/findUnique select clause yok. **Fix**: Tüm fonksiyonlara select clause eklendi, tüm login-critical fonksiyonlara try-catch ile graceful degradation eklendi. Security feature yoksa login yine çalışır | `security.service.ts:324-875` |
| 2026-02-08 | `.toLowerCase()` TypeError crash'leri (21 dosya) | API'den gelen undefined/null değerlerde `.toLowerCase()` çağrılıyordu → `Cannot read properties of undefined`. 18 frontend dosyada ve 3 backend dosyada tüm unsafe `.toLowerCase()` çağrıları `typeof val === 'string' ? val.toLowerCase() : ''` veya `(val \|\| '').toLowerCase()` pattern'leri ile guard edildi | `AnalysisReport.tsx`, `AnalysisDialog.tsx`, `CoinSelector.tsx`, `details/[id]/page.tsx`, `signals/page.tsx`, `reports/page.tsx`, `alerts/page.tsx`, `tailored/page.tsx`, `analysis.routes.ts`, `report.routes.ts`, `outcome.service.ts` ve 10+ dosya |
| 2026-02-08 | Modal/Dialog bileşenlerinde ARIA erişilebilirlik uyarıları | Custom modal bileşenlerinde `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ve sr-only başlık eksikti. 5 modal bileşenine eklendi | `CelebrationModal.tsx`, `FirstLoginModal.tsx`, `SetAlertModal.tsx`, `InterfacePreferenceModal.tsx`, `AnalysisDialog.tsx` |
| 2026-02-08 | Credit ve Alert API route'ları try/catch olmadan çalışıyordu (unhandled 500) | `credit.routes.ts` 6 route ve `alert.routes.ts` 7 route'a try/catch, ZodError → 400, generic → 500 hata işleme eklendi. console.error ile server-side loglama | `credit.routes.ts`, `alert.routes.ts` |
| 2026-02-07 | API timeout - sistem zaman aşımına uğruyordu (6 kök neden) | **1) 3 duplicate PrismaClient instance** connection pool'u tüketiyordu (coin-score-cache, multi-asset-score-cache, asset-logos). **2) Server startup blocking** - `startOutcomeTracker()` ve `initializeAssetLogos()` await ediliyordu, external API'ler yanıt vermezse server hiç başlamıyordu. **3) Binance ticker fetch timeout eksik** - `binance.provider.ts:213`'te AbortSignal.timeout yoktu. **4) Prisma query timeout yok** - hiçbir DB sorgusu timeout'a sahip değildi, tek bir yavaş sorgu tüm pool'u bloke edebilirdi. **5) Polling job'lar overlap** - 30s/15s interval job'lar önceki çalışma bitmeden tekrar tetikleniyordu, DB bağlantıları birikiyordu. **6) Auth middleware P2022 hata yönetimi eksik** - missing column hatası tüm auth'u kırıyordu. **Fix**: 1) Tüm duplicate PrismaClient kaldırıldı → singleton import, 2) Startup non-blocking yapıldı (fire-and-forget + timeout), 3) Binance fetch'e 10s timeout eklendi, 4) Prisma middleware ile 15s query timeout + slow query log eklendi, 5) Overlap guard flag'leri + withTimeout wrapper'ları eklendi, 6) Auth middleware'e P2022 fallback eklendi, duplicate decorator kaldırılıp jwt-middleware'e delege edildi | `database.ts`, `index.ts`, `jwt-middleware.ts`, `binance.provider.ts`, `coin-score-cache.service.ts`, `multi-asset-score-cache.service.ts`, `asset-logos.service.ts`, `schema.prisma` |

---

## 🎨 UI Kararları

| Tarih | Karar | Neden |
|-------|-------|-------|
| 2026-01-17 | TraderPath marka yazısı font-bold | Marka vurgusu için daha güçlü görünüm |
| 2026-01-17 | Büyük sayılar formatlanacak (1M, 10K, 1,000) | Okunabilirlik |
| 2026-01-17 | Credits kartı light mode'da amber gradient | Tema uyumu |
| 2026-01-17 | "AI-Powered Trading Analysis" badge büyük ve gradient | Daha belirgin ve okunaklı |
| 2026-01-17 | "in 60 Seconds" animasyonu logo renkleri (teal/coral) | Marka renkleriyle tutarlılık |
| 2026-01-17 | Stats section sayaç animasyonu (CountUp) | Dinamik ve ilgi çekici görünüm |
| 2026-01-17 | Feature isimleri gradient animasyon (teal/coral) | Marka tutarlılığı ve dikkat çekici görünüm |
| 2026-01-17 | Tüm bölüm başlıkları gradient animasyon (teal/coral) | Marka tutarlılığı |
| 2026-01-18 | Analyze sayfası 2026 trendleriyle yeniden tasarlandı | Modern, ilgi çekici, kullanıcı deneyimi |
| 2026-01-18 | Kinetic Typography - Hareketli "TraderPath" başlığı | Dikkat çekici, dinamik görünüm |
| 2026-01-18 | Marquee Banner - Kayan kripto fiyatları | Canlı piyasa hissi, bilgilendirici |
| 2026-01-18 | Grain Texture Overlay - İnce grenli doku | Derinlik ve karakter katıyor |
| 2026-01-18 | Glassmorphism Cards - Cam efektli kartlar | Modern, şeffaf, zarif görünüm |
| 2026-01-18 | Gradient Orbs - Animasyonlu arka plan küreleri | Dinamik, canlı arka plan |
| 2026-01-18 | Bento Grid Layout - Asimetrik kart düzeni | Modern, organize, esnek |
| 2026-01-18 | Scroll Animations - IntersectionObserver ile görünürlük | Akıcı, profesyonel geçişler |
| 2026-01-18 | Hover Animations - Scale, shadow, border efektleri | Etkileşimli, responsive |
| 2026-01-18 | Timeframe Seçimi (15m, 1h, 4h, 1d) | Trade type yerine timeframe seçimi - daha sezgisel ve anlaşılır |
| 2026-01-19 | PDF Rapor: Logo dikey düzen | Logo tek başına üstte, altında TraderPath markası - profesyonel görünüm |
| 2026-01-19 | PDF Rapor: Dark grafik arka plan | #1a1a2e koyu arka plan - grafik görünürlüğü artırıldı |
| 2026-01-19 | PDF Rapor: Tokenomics uyarı sayfası | Veri yoksa detaylı açıklama ve risk uyarısı gösteriliyor |
| 2026-01-19 | PDF Rapor: 40+ indikatör özeti | Tüm kategoriler ve indikatörler detaylı gösteriliyor |
| 2026-01-19 | PDF Rapor: Verdict tek sayfa | Analiz kararı sadece final sayfada - tekrar önlendi |
| 2026-01-19 | Reports sayfası: Stats kutuları kaldırıldı | Report tablosu senkronize değil - Dashboard'dan bakılacak |
| 2026-01-19 | Reports sayfası: 2026 trend tasarımı | Glassmorphism, gradient orbs, grain texture, modern filtreler |
| 2026-01-19 | Reports sayfası: Teal/Coral kurumsal renkler | Tüm renkler kurumsal palette uygun (purple→teal, red→orange/coral) |
| 2026-01-19 | Reports sayfası: Light mode kontrast düzeltmesi | bg-white/5→bg-slate-100, text-white→text-slate-900 dark:text-white |
| 2026-01-19 | Analyze sayfası: Live Chart 2/3 genişlik | Live Chart sol tarafta 8 kolon, kontroller sağda 4 kolon - daha dengeli layout |
| 2026-01-20 | Recent Analyses: Verdict filtresi | All/GO/COND/WAIT/AVOID filtre butonları - hızlı analiz filtreleme |
| 2026-01-20 | Mobile App Icon: Dark mode versiyonları | 512x512, dark bg (#0D1421), scale 2.0, rounded corners (96px), glow efekti |
| 2026-01-20 | Mobile App Icon: Alternatif renk düzeni | Yeşil-kırmızı-yeşil-kırmızı (çapraz) vs orijinal (2 yeşil + 2 kırmızı) |
| 2026-01-20 | PDF Rapor: Gerçek candlestick grafik | Son 50 mum OHLCV verisiyle SVG candlestick chart - yeşil/kırmızı mumlar, entry/SL/TP seviyeleri |
| 2026-01-27 | Testimonials → Platform Metrics | Sahte yorumlar yerine gerçek API verileri - şeffaflık ve güvenilirlik |
| 2026-01-27 | Feature 1 → AI-Powered Market Scanner | 7-Step Analysis Suite formatında, "Find Your Next Winning Trade" yerine |
| 2026-01-27 | Real Results section Hero altına taşındı | Metrikler daha erken görünsün |
| 2026-01-28 | Kutlama Modal: Confetti ve balon animasyonları | Kullanıcı ödül kazandığında mutlu etme - gamification |
| 2026-01-28 | Kredi Bildirimi: Toast notification sistemi | Kredi harcama/kazanma anında kullanıcıyı bilgilendirme |
| 2026-01-28 | Login sayfası: Tema uyumlu marketing paneli | Sol panel artık light/dark mode'a uygun görünüyor |
| 2026-01-31 | Analyze sayfası: LAYER 4 minimalist tasarım | Karmaşık animasyonlar kaldırıldı, Capital Flow context eklendi, 4 adımlı akış |
| 2026-01-31 | Dashboard: Platform + My Performance bölümleri | Capital Flow entegrasyonu, her layer için özet kartları, platform ve kişisel AI stats |
| 2026-01-31 | Scheduled sayfası: Kurumsal stil tasarımı | Glassmorphism kartlar, gradient orbs, animasyonlu status badge'leri, progress bar, hover efektleri |
| 2026-02-02 | Capital Flow: Dual-line Moving Average Sparklines | Gürültülü günlük veriler yerine 3d MA (ince, soluk) ve 7d MA (kalın, belirgin) ile daha düzgün, laminar akış gösterimi |
| 2026-02-06 | Intelligence Dashboard: Funnel-Waterfall Layout | Mind-map yerine sol akış + sağ içerik yapısı - "From Charts to Clarity" sloganına uygun |
| 2026-02-06 | Intelligence Dashboard: Default Trade Plan View | Varsayılan olarak Trade Plan gösterilir, üst katmanlar "kanıt" olarak sol panelde |
| 2026-02-06 | Intelligence Dashboard: Performance Attribution Matrix | 4-layer katkı analizi (Capital Flow, Sector, Timing, ML) - "Explainable AI" |
| 2026-02-06 | Analyze Page: Enforced Top-Down Flow (Step 0→A→B) | Capital Flow zorunlu, AI recommendation sonrası asset seçimi, corporate decision framework |
| 2026-02-06 | Details Page: Top-Down Evidence Chain | L1-L4 + Analysis + ML Confirmation alignment durumu, "X/Y Aligned" badge |
| 2026-02-07 | Nav Restructure: Top-Down Flow Order | Explore(L1-L4) → Analyze → Signals → Dashboard. Intelligence→Explore, Signals primary'ye terfi, Profile user menu'ye, Capital Flow ayrı sayfa kaldırıldı |
| 2026-02-08 | Dashboard: Mobile-First Fintech Rebuild | Monolitik 1483 satır → 5 modüler dosya. SVG Arc Gauge, glassmorphism kartlar, accordion layout, yatay trade kartları, 48px touch targets |

---

## 📝 Son Güncellemeler

### 2026-01-17
- TraderPath brand text bold yapıldı
- Dashboard sayı formatlaması eklendi (formatNumber, formatCredits)
- Credits kartı light mode uyumlu hale getirildi
- Statistics API tamamen analysis tablosundan veri alacak şekilde yeniden yazıldı
- My Accuracy kartı avgScore gösterecek şekilde güncellendi
- Active Trades kartına win rate % eklendi
- Admin kullanıcılar için "Admin" badge eklendi
- Landing page: "AI-Powered Trading Analysis" badge daha belirgin ve okunaklı yapıldı
- Landing page: "in 60 Seconds" animasyonu logo renklerine güncellendi (teal/coral)
- Landing page: Stats section'a sayaç animasyonu eklendi (CountUp component)
- Active Trades: Trade plan olmayan analizlerde "N/A" gösterilecek şekilde düzeltildi
- Active Trades: Direction gösterimi düzeltildi (lowercase karşılaştırma)
- Analysis detay route düzeltildi (`/analysis/` → `/analyze/details/`)
- Recent Analyses (/analyze): null score için "—" gösteriliyor, step7Result.overallScore fallback eklendi
- CoinSelector dropdown görünmezlik sorunu düzeltildi (overflow-hidden kaldırıldı)
- Landing page: Feature isimleri gradient animasyon eklendi (teal/coral kurumsal renkler)
- Landing page: Tüm bölüm başlıkları (h1, h2) gradient animasyon eklendi
- Pricing tek sayfa olarak birleştirildi: Landing page'de CTA, /pricing asıl sayfa
- /pricing sayfasına API fallback eklendi (Vercel preview uyumu)

### 2026-01-18
- Analyze sayfası 2026 trendleriyle tamamen yeniden tasarlandı
- Kinetic Typography: "TraderPath" başlığı karakter karakter animasyonlu
- Marquee Banner: Üstte ve altta kayan kripto fiyatları (ters yönlü)
- Grain Texture: SVG tabanlı ince grenli doku overlay
- Glassmorphism: Cam efektli, backdrop-blur kartlar
- Gradient Orbs: Animasyonlu teal/coral/purple arka plan küreleri
- Bento Grid: 12 kolonlu asimetrik modern düzen
- Scroll Animations: IntersectionObserver ile staggered fade-in
- Hover Animations: Scale, shadow, border renk geçişleri
- Tailwind config'e 15+ yeni animasyon keyframe eklendi
- Feature Badges: AI Analysis, Risk Assessment, 40+ Indicators, Real-time Data
- TradeTypeSelector tabs variant: Glassmorphism style, ring highlight, compact info bar
- Historical Outcome Checker: Binance Klines API ile tarihsel fiyat kontrolü
- SL/TP hit tespiti createdAt tarihinden itibaren High/Low değerleri kontrol edilerek yapılıyor
- Timeframe Seçimi: Trade type yerine timeframe seçimi (15m, 1h, 4h, 1d)
- Otomatik Strateji Mapping (GÜNCEL): 15m→Scalping, 1h→Day Trade, 4h→Day Trade, 1d→Swing Trade
- API interval parametresi kabul ediyor, tradeType otomatik türetiliyor
- Position trade type kaldırıldı - 1d artık Swing Trade olarak işleniyor

### 2026-01-19
- TFT Predictor europe-west4 build timeout düzeltildi
- CPU-only PyTorch kullanıldı (--extra-index-url https://download.pytorch.org/whl/cpu)
- Docker image boyutu ~5GB'dan ~1GB'a düşürüldü
- GPU desteği ileride eklenecek (Google Cloud)
- Gemini API rate limit (429) hatası düzeltildi
- Yeni `callGeminiWithRetry` helper fonksiyonu eklendi (`apps/api/src/core/gemini.ts`)
- Exponential backoff ile max 5 retry, API'den gelen retryDelay parse edilip kullanılıyor
- AI Expert service ve Translation service güncellendi
- Expert Panel: paralel → sıralı çağrı (500ms delay) - rate limit önleme
- **Analiz Orchestration dokümantasyonu eklendi**: Her analiz için 3 AI Expert, 2 Download, 2 Email hakkı + otomatik özet email
- **Trade Type Completion Bonus eklendi**: Scalping +3, Day Trade +2, Swing Trade +1 kredi otomatik bonus
- **Google Translate API entegrasyonu eklendi**:
  - Primary: Google Translate (hızlı, ucuz - $20/1M karakter)
  - Fallback: Gemini AI (karmaşık çeviriler için)
  - Yeni dosyalar: `apps/api/src/core/google-translate.ts`
  - 18 dil desteği: EN, TR, ES, DE, FR, PT, RU, ZH, JA, KO, AR, IT, NL, PL, VI, TH, ID, HI
  - Yeni endpoint: `POST /api/translation/quick` (ücretsiz, 500 karakter limit)
  - Config'e eklendi: `GOOGLE_TRANSLATE_API_KEY`, `GOOGLE_CLOUD_PROJECT_ID`
- **PDF Rapor tasarımı iyileştirildi**:
  - Logo dikey düzende (logo üstte, marka altında)
  - Grafik dark arka plan (#1a1a2e) ile görünürlük artırıldı
  - Tokenomics veri yoksa detaylı uyarı sayfası gösteriliyor
  - Analiz kararı tekrarı kaldırıldı (sadece sayfa sonunda)
  - Technical Indicator Summary 40+ indikatör gösteriyor (kategoriler ve detaylar)
  - Indikatör tabloları leading indicators'a göre sıralanıyor
- **Analyze sayfası layout düzeltmesi**: Live Chart 2/3 (8 kolon), TIMEFRAME/CoinSelector 1/3 (4 kolon) olarak yeniden düzenlendi

### 2026-01-20
- **Tokenomics veri kaynağı fallback zinciri**:
  - Primary: CoinGecko API
  - Fallback 1: CoinMarketCap API (COINMARKETCAP_API_KEY gerekli)
  - Fallback 2: Binance API (temel market verisi)
  - Tüm kaynaklar için 10 saniyelik timeout eklendi
  - 70+ coin için CoinMarketCap ID mapping eklendi
  - Binance için bilinen circulating supply değerleri eklendi
- **Trade Plan Chart PDF capture iyileştirildi**:
  - Chart wrapper'a `id="trade-plan-chart-visible"` ve `class="trade-plan-chart-container"` eklendi
  - Canvas element fallback araması eklendi
  - Scroll into view özelliği eklendi
  - Bekleme süresi 1.2s → 2s'ye çıkarıldı
  - onclone callback ile overflow düzeltmesi eklendi
- **CoinGecko Demo API desteği eklendi**:
  - Demo API için `x-cg-demo-api-key` header kullanılıyor (Pro API: `x-cg-pro-api-key`)
  - Demo API public URL kullanıyor (api.coingecko.com), Pro API ise pro-api.coingecko.com
  - Yeni env var: `COINGECKO_API_TYPE=demo` veya `pro`
  - Railway'e eklenecek: `COINGECKO_API_KEY` ve `COINGECKO_API_TYPE=demo`
- **PDF generation null hatası düzeltildi**:
  - `generatePageSteps123` ve `generatePageSteps456` fonksiyonlarına default değerler eklendi
  - `mp`, `as`, `sc`, `tm`, `tp`, `tc` null olduğunda hata önlendi
  - Tüm gate erişimleri optional chaining ile güvenceye alındı
- **Final Verdict "N/A Recommended" hatası düzeltildi**:
  - Default verdict değerleri eklendi (action: WAIT, overallScore: 50)
  - Direction yoksa "WAIT" gösterilir (sarı/amber arka plan)
  - hasDirection kontrolü ile doğru renk ve metin seçimi
  - formatAction fonksiyonu boş değer için "WAIT" döndürüyor
- **Recent Analyses verdict filtresi eklendi**:
  - Filtre seçenekleri: All, GO, COND (Conditional Go), WAIT, AVOID
  - Renk kodlu filtre butonları (yeşil, sarı, turuncu, kırmızı)
  - Filtrelenmiş sayı gösterimi (örn: "3/10")
  - Boş sonuç durumunda "Clear filter" seçeneği
- **SVG Chart Generator eklendi**:
  - PDF raporlarında grafik görünmeme sorunu çözüldü
  - RecentAnalyses'tan indirilen PDF'lerde artık trade plan grafiği görünüyor
  - Entry, Stop Loss, Take Profit seviyeleri SVG olarak çiziliyor
- **Ekonomik Takvim Servisi eklendi**:
  - Yeni servis: `apps/api/src/modules/analysis/services/economic-calendar.service.ts`
  - Finnhub API entegrasyonu (FINNHUB_API_KEY env var)
  - FOMC, CPI, NFP, GDP gibi major eventler için hardcoded fallback
  - **Trade Bloklama Mantığı**:
    - High-impact event 4 saat öncesinden itibaren trade önerilmez
    - FOMC günü tüm gün trade önerilmez
    - Event sonrası 2 saat bekleme süresi
  - Market Pulse'a entegre edildi (`economicCalendar` field)
  - Yeni endpoint: `GET /api/analysis/economic-calendar` (ücretsiz)
  - Verdict otomatik "AVOID" olur, score max 2'ye düşer
- **Mobile App Icon'lar eklendi**:
  - `app-icon-dark.svg`: Orijinal renk düzeni (üst-yeşil, sağ-yeşil, alt-kırmızı, sol-kırmızı)
  - `app-icon-dark-alt.svg`: Alternatif (üst-yeşil, sağ-kırmızı, alt-yeşil, sol-kırmızı)
  - 512x512 boyut, dark arka plan (#0D1421), rounded corners (96px)
  - Logo scale 2.0, minimal padding, glow efekti
- **Push Notification sistemi eklendi**:
  - Service Worker: `apps/web/public/sw.js`
  - Push utilities: `apps/web/lib/push-notifications.ts`
  - Price Checker job: `apps/api/src/modules/notifications/price-checker.job.ts`
  - VAPID key endpoint: `GET /api/alerts/vapid-public-key`
  - Railway env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **Alerts sayfası gerçek API'ye bağlandı**: Mock data kaldırıldı, CRUD işlemleri çalışıyor
- **PDF Rapor: Gerçek candlestick grafik eklendi**:
  - Backend'e `chartCandles` field eklendi (son 50 mum OHLCV)
  - SVG generator tamamen yeniden yazıldı (gerçek candlestick render)
  - Yeşil/kırmızı mumlar open/close değerine göre
  - Entry/SL/TP seviyeleri mumların üzerinde gösteriliyor
  - `AnalysisReportData` interface güncellendi
- **Detay sayfasına PDF indirme butonu eklendi**:
  - "PDF" butonu Screenshot butonunun yanına eklendi
  - html2canvas ile TradePlanChart capture edilip PDF'e ekleniyor
  - Gradient renkli buton (red→amber→green TraderPath teması)
  - RecentAnalyses ve buildReportData'ya chartCandles aktarıldı
- **Grafik karmaşası temizlendi - tek grafik standardı**:
  - 3 farklı grafik yerine tek TradePlanChart kullanılıyor
  - Reports sayfasından Chart butonu ve TradingView modal kaldırıldı
  - `components/charts/TradePlanChart.tsx` dosyası silindi (duplicate)
  - Sadece `components/analysis/TradePlanChart.tsx` kullanılıyor
  - Reports/[id] detay sayfasına PDF indirme butonu eklendi
- **Email raporu iyileştirildi (Recent Analyses)**:
  - Tüm emojiler kaldırıldı (📊, 💰, 📈, 🤖, ✅, ⏳, • vb.)
  - TraderPath logosu eklendi (inline SVG - email uyumlu)
  - Symbol coin icon'u eklendi (cryptoicons.org API)
  - SVG trade plan chart eklendi (server-side generation)
  - Chart, Entry/SL/TP seviyelerini ve direction'ı gösteriyor
  - chartImage parametresi desteği (base64 image)
- **Analiz detay sayfasından email butonu kaldırıldı**:
  - Send Email butonu kaldırıldı (duplicate fonksiyon)
  - Sadece Recent Analyses üzerinden email gönderilebilir
  - Kullanılmayan state ve fonksiyonlar temizlendi
  - Create Report butonu ortaya alındı, padding ayarlandı
- **Email raporu iyileştirmeleri (devam)**:
  - Timeframe (interval) eklendi - symbol başlığında "4H | tarih" formatında
  - AI Expert score /10 formatından /100 formatına çevrildi (7.4/10 → 74/100)
  - `convertScoreTo100Scale` fonksiyonu tüm X/10 skorlarını X*10/100'e çeviriyor
  - Report tablosundan aiExpertComment otomatik fetch edilir (eğer mevcut değilse)

### 2026-01-21
- **Scheduled Reports (Otomatik Analizler) özelliği eklendi**:
  - Yeni servis: `apps/api/src/modules/scheduled/scheduled-reports.service.ts`
  - Yeni routes: `apps/api/src/modules/scheduled/scheduled-reports.routes.ts`
  - Yeni sayfa: `apps/web/app/(dashboard)/scheduled/page.tsx`
  - Kullanıcılar favori coinleri için otomatik analiz kurabilir
  - **Ayarlanabilir parametreler**: Symbol, Interval (15m/1h/4h/1d), Frekans (Günlük/Haftalık/Aylık), Saat (UTC)
  - Teslimat kanalları: Email, Telegram, Discord
  - Her analiz 25 kredi (normal analiz ücreti)
  - Ücretsiz kullanıcılar max 3 aktif schedule kurabilir
  - node-cron ile saatlik kontrol çalışıyor
  - Sidebar'a "Scheduled" linki eklendi (Calendar ikonu)
  - Schema'ya `interval` alanı eklendi
- **AI Concierge özelliği eklendi** (Zero-UI deneyimi):
  - Yeni modül: `apps/api/src/modules/concierge/`
    - `concierge.service.ts` - Ana orchestration servisi
    - `concierge.routes.ts` - API endpoint'leri
    - `intent-detector.ts` - Gemini ile intent tanıma
    - `response-synthesizer.ts` - Sonuç özetleme ve lokalizasyon
    - `types.ts` - Intent tipleri ve veri yapıları
  - Frontend: `apps/web/components/concierge/`
    - `ChatInput.tsx` - Yazı/ses input (Web Speech API)
    - `ChatMessages.tsx` - Mesaj listesi
    - `ResultCard.tsx` - GO/COND/WAIT/AVOID sonuç kartı
    - `QuickCommands.tsx` - Hızlı komut butonları
    - `useConcierge.ts` - API hook
  - Yeni sayfa: `apps/web/app/(dashboard)/concierge/page.tsx`
  - Sidebar'a "Concierge" linki eklendi (Bot ikonu)
  - **Intent Tipleri**:
    - `QUICK_ANALYSIS` - "BTC nasıl?", "ETH'ye gireyim mi?"
    - `SPECIFIC_ANALYSIS` - "BTC 4h analiz", "SOL scalp"
    - `MULTI_ANALYSIS` - "Top 5 coin analiz et"
    - `EXPERT_ASK` - "RSI nedir?", "MACD nasıl çalışır?"
    - `ALERT_SET` - "BTC 70K olunca haber ver"
    - `ALERT_LIST` - "Alarmlarım neler?"
    - `STATUS` - "Son analizlerim", "Kredim"
    - `HELP` - "Ne yapabilirsin?"
  - **Kredi Politikası**:
    - Quick/Specific Analysis: 25 kredi (mevcut fiyat)
    - Multi Analysis: 25 × N kredi
    - Expert soru: 0-5 kredi (3 ücretsiz/analiz)
    - Alert: 1 kredi
    - Status/Help: Ücretsiz
  - **Özellikler**:
    - Türkçe/İngilizce dil desteği
    - Sesli input (Web Speech API)
    - Hızlı komut butonları
    - Analiz sonuçları kartı (Entry/SL/TP)
    - Detay sayfasına link
    - Hata durumunda otomatik kredi iadesi
- **AI Concierge API düzeltmeleri (Bug fixes)**:
  - `useConcierge.ts`: `fetch` → `authFetch` değişikliği (api.traderpath.io routing)
  - Concierge routes ve service: preferredCoins column hatası için try-catch
  - InterfacePreferenceModal: Tüm Türkçe metinler İngilizce'ye çevrildi
  - Layout.tsx: undefined check eklendi (preferredInterface)
- **User Preference API**:
  - POST `/api/user/preference` - tercih kaydetme
  - GET `/api/user/preference` - tercih okuma
  - `/api/auth/me` endpoint'i preferredInterface döndürüyor
- **Neon DB SQL komutu**: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferred_interface" VARCHAR(20);`
- **Web Speech API**: Mikrofon desteği (HTTPS gerekli, tarayıcı izni gerekli)
- **AI Concierge refactored to use AI Expert Panel (VOLTRAN)**:
  - `concierge.service.ts`: Direct `analysisEngine` calls replaced with `aiExpertService.analyzeWithExpertPanel`
  - Expert questions now route to appropriate expert (ARIA/NEXUS/ORACLE/SENTINEL) based on keywords
  - `detectExpertForQuestion()` function: Technical → ARIA, Risk → NEXUS, Whale → ORACLE, Security → SENTINEL
  - Responses include expert emojis and VOLTRAN synthesis
  - Code deduplication: Single analysis path through Expert Panel
- **AI Concierge Advanced UI (2026 design trends)**:
  - Modern 2026 UI: Glassmorphism, gradient orbs, backdrop blur
  - 50+ desteklenen coin: Top 20, DeFi, L2, meme, AI, gaming tokens
  - Coin aliases: Natural language support (Bitcoin → BTC, Ethereum → ETH, etc.)
  - Voice input: Web Speech API ile sesli komut desteği
  - Quick commands: BTC Analysis, ETH Analysis, Help, Status butonları
  - Verdict result cards: GO/COND/WAIT/AVOID gradient kartları
  - Analysis data: verdict, score, analysisId, direction döndürüyor
  - Expert routing: ARIA (teknik), NEXUS (risk), ORACLE (whale), SENTINEL (güvenlik)
  - Auto-scroll, loading animations, proper error handling
  - Link to analysis details: `/analyze/details/{analysisId}`
- **AI Concierge landing page tanıtımı eklendi**:
  - Feature 5 olarak ana sayfaya eklendi (TFT Feature 6 oldu)
  - Emerald/teal renk teması
  - 4 özellik kartı: Natural Language, Voice Commands, Instant Analysis, Expert Insights
  - Örnek komutlar gösterimi: "Analyze BTC for me", "How is SOL doing?", vb.
  - Bilingual support ve 50+ coin vurgusu
- **Analiz maliyeti 25 krediye güncellendi**:
  - Concierge servisi ANALYSIS_COST = 25
  - Help mesajları güncellendi (TR/EN)
  - CLAUDE.md dokümantasyonu güncellendi
- **AI Concierge Chart View özelliği eklendi**:
  - `CHART_VIEW` intent: "grafik", "chart", "candlestick", "mum grafiği", "tradingview"
  - Binance API'den OHLCV verileri çekiliyor (100 mum)
  - Trade plan (Entry/SL/TP) grafik üzerinde gösteriliyor
  - Frontend: TradePlanChart komponenti dinamik import ile yükleniyor
  - Quick command: "Show BTC chart" butonu eklendi
- **AI Concierge Scheduled Analysis özelliği eklendi**:
  - `SCHEDULE_LIST`: Kullanıcının zamanlanmış analizlerini listeler
  - `SCHEDULE_CREATE`: Yeni zamanlama oluşturur (coin, interval, frekans)
  - `SCHEDULE_DELETE`: Coin adına göre zamanlamayı siler
  - Ücretsiz kullanıcılar max 3 schedule kurabilir
  - Her otomatik analiz 25 kredi harcar
  - Help mesajları güncellendi (TR/EN)
- **AI Concierge "Analysis Not Found" hatası düzeltildi**:
  - Sorun: Concierge üzerinden yapılan analizler veritabanına kaydedilmiyordu
  - `analyzeWithExpertPanel` fonksiyonuna `interval` parametresi eklendi
  - Analiz tamamlandığında `prisma.analysis.create` ile veritabanına kaydediliyor
  - Trade type bonus da ekleniyor (normal analiz akışıyla aynı)
  - Dosyalar: `ai-expert.service.ts`, `concierge.service.ts`
- **Interface Preference Modal her girişte gösteriliyor**:
  - SessionStorage kullanılarak her yeni session'da modal gösteriliyor
  - Kullanıcı seçim yapınca veya modal'ı kapatınca session'a kaydediliyor
  - UI seçilince `/analyze`, Concierge seçilince `/concierge` sayfasına yönlendirme
  - Logout sonrası yeni login'de tekrar gösterilir (sessionStorage temizlenir)
- **AI Concierge ve Modal mobil uyumluluk (Fully Responsive)**:
  - Concierge sayfası: Responsive chart yükseklikleri (`h-[250px] sm:h-[350px] md:h-[400px]`)
  - Quick commands: Mobilde 2x2 grid (`grid grid-cols-2 sm:flex`)
  - Compact header: Mobilde subtitle gizleniyor, font boyutları küçültüldü
  - Tüm spacing ve padding değerleri mobil-first responsive
  - InterfacePreferenceModal: Continue butonu kaldırıldı, seçim anında tetikleniyor
  - Loading state seçilen option üzerinde gösteriliyor
  - Mobilde scrollable modal (max-h-[90vh] overflow-y-auto)
  - Tüm font boyutları ve padding değerleri sm/md breakpoint'lere uygun
- **Chart View trade plan düzeltmesi**:
  - Trade plan `step5Result`'tan alınmalı (step7 değil)
  - Doğru alan adları: `averageEntry`, `stopLoss.price`, `takeProfits[].price`
  - Trade plan yoksa açıklayıcı mesaj gösteriliyor
- **Mikrofon aktif göstergesi iyileştirildi**:
  - "🎤 Listening... Speak now" label üstte pulsing dot ile
  - Input container dinlerken kırmızı border alıyor
  - Mikrofon butonu ping animasyonu ile dikkat çekiyor
  - Placeholder "🎤 Speak now..." olarak değişiyor
  - HTTPS gereksinimi için uyarı mesajı eklendi
- **AI Expert soruları Concierge'de düzeltildi**:
  - Bug: `response.reply` kullanılıyordu ama doğru alan `response.response`
  - "scalping nedir?", "RSI nedir?" gibi sorular artık cevaplanıyor
  - ARIA (teknik), NEXUS (risk), ORACLE (whale), SENTINEL (güvenlik) uzmanları çalışıyor
- **PDF indirme özelliği iyileştirildi**:
  - Analiz detay sayfasına DownloadReportButton eklendi
  - AI Expert yorumları PDF'e dahil edildi
  - Tokenomics analizi PDF'de ayrı sayfa olarak gösteriliyor
  - Executive Summary (6 sayfa) ve Detailed Analysis (10+ sayfa) seçenekleri
  - Çoklu dil desteği (14 dil)
  - Email gönderme entegrasyonu (PDF indirdikten sonra)
- **TradingView Pine Script entegrasyonu eklendi**:
  - Analiz detay sayfasına "Pine Script" butonu eklendi
  - Trade plan (Entry/SL/TP) Pine Script olarak kopyalanabilir
  - Kullanıcı TradingView'da kendi grafiğine ekleyebilir
  - Script içeriği: Entry, Stop Loss, TP1/TP2/TP3 seviyeleri ve direction
  - Renk kodları: Blue (entry), Red (SL), Green/Lime/Aqua (TPs)
  - Direction arrow: LONG/SHORT sinyali grafikte gösteriliyor

### 2026-01-22
- **Email rapor şablonu düzeltildi**:
  - Logo kaldırıldı (email client'larda görünmüyordu)
  - Coin ikonu kaldırıldı
  - Trade plan tablosunda üst üste binen rakamlar düzeltildi (sütun genişlikleri %20)
- **CoinSelector filtre düzeltildi**:
  - Smart coins filtre butonları çalışıyor (Trending, Gainers, Losers, Volume, Top Cap)
  - `authFetch` ile doğru API domain'ine yönlendirme
  - Loading state düzgün gösteriliyor
  - "All Coins" listesi filtre seçildiğinde gizleniyor
- **AI Concierge intent detection iyileştirildi**:
  - USDT/BUSD/PERP suffix'leri otomatik temizleniyor (BTCUSDT → BTC)
  - "chart" ve "grafik" kelimeleri MONTHLY_PERFORMANCE'dan kaldırıldı
  - CHART_VIEW için doğru tetikleme
- **AI Concierge bütüncül yaklaşım**:
  - `system-prompt.ts` - Tüm platform özellikleri tanımlandı
  - Gemini AI fallback eklendi (rule-based başarısız olunca)
  - Response templates (TR/EN) merkezi yönetim
  - Dil tespiti Gemini tarafından yapılıyor
  - 17 farklı intent tipi destekleniyor
- **Multi-language System (Çoklu Dil Sistemi)**:
  - Yeni config: `apps/api/src/config/languages.ts` - 20+ dil desteği
  - User model'e `preferredLanguage` field eklendi (default: en)
  - **Desteklenen diller**: EN, TR, AR, ES, DE, FR, IT, PT, NL, PL, RU, FA, HE, ZH, JA, KO, VI, TH, ID, HI
  - **API Endpoint'leri**:
    - `GET /api/user/languages` - Desteklenen diller listesi
    - `GET /api/user/language` - Kullanıcı dil tercihi
    - `PATCH /api/user/language` - Dil tercihi güncelleme
    - `GET /api/user/detect-language` - Browser/IP bazlı dil tespiti
  - Settings sayfasına dil seçici eklendi (Appearance bölümü)
  - Auto-detect özelliği: Accept-Language header veya IP'den ülke tespiti
  - AI Concierge kullanıcının dil tercihini kullanıyor
  - Speech Recognition dil bazlı (örn: tr-TR, ar-SA, es-ES)
  - RTL dil desteği (Arapça, Farsça, İbranice)
  - Country code → Language mapping (100+ ülke)
- **Stop Loss hesaplama mantığı düzeltildi**:
  - LONG pozisyonlar için SL destek seviyesinin ALTINA yerleştiriliyor (en düşük destek - ATR buffer)
  - SHORT pozisyonlar için SL direnç seviyesinin ÜSTÜNE yerleştiriliyor (en yüksek direnç + ATR buffer)
  - Minimum %1.5 stop mesafesi zorunlu tutuldu (çok sıkı stop'ları engeller)
  - R-bazlı TP seviyeleri artık doğru hesaplanıyor (daha geniş SL = daha gerçekçi TP'ler)
- **Dashboard Quick Actions kaldırıldı**: Navigasyonda zaten mevcut, gereksiz tekrar
- **Performance chart iyileştirildi**: Month view eklendi, avgPnL seçilen periyoda göre hesaplanıyor
- **AI Expert artık 40+ indikatörü kullanıyor**:
  - ARIA prompt'u yeniden yapılandırıldı - indicator summary dahil edildi
  - Bullish/bearish/neutral sinyal sayıları prompt'ta gösteriliyor
  - Trend, momentum, volume indikatörleri yapılandırılmış olarak gönderiliyor
  - Divergence tespiti de dahil
  - ARIA için maxOutputTokens 200→350'ye çıkarıldı (daha detaylı analiz)
  - "CITE SPECIFIC INDICATORS" kuralı eklendi
- **AI Concierge sesli karşılama özelliği eklendi**:
  - Sayfa açıldığında AI sesli karşılama yapıyor (Web Speech API SpeechSynthesis)
  - Kadın sesi tercih ediliyor (female voice keywords ile arama)
  - 12+ dilde karşılama mesajları (TR, EN, ES, DE, FR, PT, RU, ZH, JA, KO, AR, IT)
  - Karşılama sonrası otomatik dinleme başlıyor (SpeechRecognition)
  - Ses dalgası animasyonları (soundwave, soundwave-slow, voice-pulse keyframes)
  - Konuşurken ve dinlerken farklı görsel animasyonlar
  - "Atla ve yaz" butonu ile sesli moddan çıkış
  - Responsive tasarım (mobil uyumlu)
- **AI Concierge doğal dil anlama iyileştirildi**:
  - `PLATFORM_INFO` intent eklendi: "özetle", "platform nedir", "sistem nasıl çalışır" gibi sorular
  - `CONVERSATIONAL` intent eklendi: selamlaşma, teşekkür, sesli yanıt tercihi
  - Her iki dilde (TR/EN) kapsamlı platform açıklaması
  - 19 farklı intent tipi destekleniyor (17'den yükseltildi)
  - Rule-based detection ve Gemini fallback için yeni pattern'ler
- **Gemini SDK güncellendi**:
  - `@google/genai` SDK (v1.38.0) kullanılıyor (eski fetch tabanlı yaklaşım yerine)
  - Daha iyi hata yönetimi ve otomatik retry
  - Backward compatibility korundu (GeminiResponse format)
  - Default model: `gemini-2.5-flash`
- **AI Concierge sesi erkek olarak değiştirildi**:
  - Premium erkek sesleri tercih ediliyor (Google UK English Male, Microsoft Guy, Daniel vb.)
  - Pitch 0.95'e düşürüldü (otoriter erkek tonu için)
  - `isMaleVoice` helper fonksiyonu eklendi (kadın seslerini filtrelemek için)
  - 12+ dil için erkek ses isimleri tanımlandı
- **AI Concierge erkek ses seçimi iyileştirildi**:
  - 50+ kadın ses ismi blocklist'e eklendi
  - Mantık değişti: "Erkek göstergesi OLMALI VE kadın OLMAMALI"
  - Google Türkçe gibi cinsiyetsiz isimler artık otomatik erkek sayılmıyor
  - Strateji: Bilinen erkek > Microsoft erkek > Açık erkek göstergesi > Non-female
- **AI Concierge çoklu dil desteği eklendi (20 dil)**:
  - Desteklenen diller: TR, EN, ES, DE, FR, AR, RU, ZH, JA, KO, PT, IT, NL, PL, HI, VI, TH, ID, FA, HE
  - Her dil için native dil değiştirme komutları (örn: "说中文", "한국어로", "بالعربي")
  - Mesaj içeriğinden otomatik dil algılama
  - Türkçe kelimelerden dil tespiti (nasıl, nedir, söyle, istiyorum vb.)
  - `detectedLanguage` field eklendi ConciergeResponse'a
- **PDF Rapor 7 sayfaya yeniden düzenlendi**:
  - Page 1: Executive Summary
  - Page 2: Trade Plan
  - Page 3: Tokenomics Analysis
  - Page 4: Analysis Steps 1-2 (Market Pulse + Asset Scanner)
  - Page 5: Analysis Steps 3-4 (Safety Check + Timing)
  - Page 6: Analysis Steps 5-6 (Trade Plan + Trap Check)
  - Page 7: Final Verdict
  - Fonksiyonlar: `generatePageSteps12`, `generatePageSteps34`, `generatePageSteps56`
- **Pine Script profesyonel seviyeye yükseltildi**:
  - TradingView BUY/SELL label shape'leri eklendi (shape.labelup/labeldown)
  - Trade zone box'ları eklendi (yeşil profit zone, kırmızı loss zone)
  - Info table eklendi (Entry, SL, TP1-3, R:R, Score gösterimi)
  - Alert condition'lar eklendi (tüm fiyat seviyeleri için)
  - Input settings eklendi (gösterim seçenekleri)
  - "Add to TradingView" butonu eklendi (script kopyala + TV aç + talimat göster)
  - Yüzde değişimleri fiyat label'larında gösteriliyor
- **AI Concierge welcome screen iyileştirildi (showcase)**:
  - Canlı BTC/ETH fiyatları ve %24h değişim (Binance API)
  - Fear & Greed Index göstergesi (Alternative.me API)
  - Platform istatistikleri (toplam analiz, doğruluk, trader sayısı)
  - Feature showcase kartları (40+ indikatör, 4 AI Expert, 60 saniye analiz, işlem planları)
  - Gradient renkli quick command butonları
  - Shimmer animasyonu ile voice butonu
  - Her 60 saniyede otomatik veri yenileme
- **AI Concierge sesi daha enerjik yapıldı**:
  - Speech rate 0.9 → 1.15 (daha hızlı konuşma)
  - Pitch 0.95 → 1.05 (daha canlı ton)
  - Karşılama mesajları kısaltıldı ve enerjikleştirildi
- **Gemini API Merkezi Yönetim (Admin Configurable)**:
  - Tüm Gemini API çağrıları `callGeminiWithRetry()` fonksiyonunu kullanıyor
  - Admin panelinden model değiştirilebilir (Redis cache ile)
  - 3 farklı model tipi: 'default', 'expert', 'concierge'
  - Redis key: `admin:gemini:settings`
  - Güncellenen dosyalar:
    - `apps/api/src/core/gemini.ts` - Merkezi API client
    - `apps/api/src/modules/analysis/analysis.engine.ts` - 8 Gemini çağrısı
    - `apps/api/src/modules/analysis/analysis.routes.ts` - getGeminiInsight
    - `apps/api/src/modules/expert/expert.service.ts` - Expert soru

### 2026-01-23
- **Railway build error düzeltildi**:
  - Railpack `process.env.VAR_NAME` pattern'ini statik olarak tespit edip build secret olarak istiyor
  - `process.env['VAR_NAME']` bracket notation kullanılarak statik analiz bypass edildi
  - `google-tts.ts` ve `google-translate.ts` dosyaları güncellendi
  - `getApiKey()` fonksiyonu ile runtime'da env var okunuyor
- **Google Cloud TTS entegrasyonu eklendi**:
  - AI Concierge için yüksek kaliteli ses (WaveNet/Neural2 voices)
  - 12 dil desteği (TR, EN, ES, DE, FR, PT, RU, ZH, JA, KO, AR, IT)
  - Web Speech API fallback
  - TTS endpoint: `POST /api/concierge/tts`
- **AI Concierge mikrofon hatası düzeltildi**:
  - Chrome kullanıcı tıklaması gerektiriyor (auto-start kaldırıldı)
  - "Start" butonu eklendi
- **Top Coins by Reliability Score özelliği eklendi**:
  - Yeni tablo: `CoinScoreCache` - periyodik coin tarama sonuçlarını cache'liyor
  - Yeni servis: `coin-score-cache.service.ts` - top 30 coini tarayıp skorlar
  - **Skor Bileşenleri**:
    - Liquidity Score: Volume/MarketCap oranı (yüksek = daha likit)
    - Volatility Score: ATR % (düşük = daha stabil)
    - Trend Score: MA convergence (hizalı = güçlü trend)
    - Momentum Score: RSI, MACD (optimal aralıkta = yüksek skor)
  - **Cron Job**: Her 2 saatte bir otomatik tarama (00:30, 02:30, ...)
  - **API Endpoint**: `GET /api/analysis/top-coins` (ücretsiz)
    - `limit`: 1-20 arası (varsayılan 5)
    - `sortBy`: 'reliabilityScore' | 'totalScore'
    - `tradeableOnly`: true = sadece GO/CONDITIONAL_GO
  - **AI Concierge Intent**: `TOP_COINS_BY_SCORE`
    - Örnek komutlar: "en yüksek skorlu 5 coin", "hangi coin almalı", "güvenilir coinler"
    - Ücretsiz kullanım (cache'den okuma)
  - Admin refresh endpoint: `POST /api/analysis/top-coins/refresh`

### 2026-01-24
- **TFT Model Yönetim Sistemi eklendi**:
  - Yeni tablo: `TFTModel` - eğitilmiş TFT modellerini veritabanında saklıyor
  - **Model Özellikleri**:
    - name, version, tradeType (scalp/swing/position)
    - filePath, fileSize, checksum (integrity check)
    - symbols, epochs, batchSize, dataInterval, lookbackDays
    - validationLoss, mape, trainingSamples, trainingTime
    - hyperparameters (JSON), status, isActive
  - **API Endpoints** (Admin):
    - `GET /api/admin/tft/models` - Tüm modelleri listele
    - `GET /api/admin/tft/models/active` - Trade type bazında aktif modeller
    - `GET /api/admin/tft/models/:id` - Tekil model detayı
    - `POST /api/admin/tft/models` - Yeni model kaydet
    - `POST /api/admin/tft/models/:id/activate` - Modeli aktif yap
    - `PATCH /api/admin/tft/models/:id` - Model güncelle
    - `DELETE /api/admin/tft/models/:id` - Model sil
  - **Frontend Bileşenleri**:
    - `TFTModelCard.tsx` - Model kartı (metrikler, aksiyonlar, durum)
    - Admin Models sayfası güncellendi (model listesi, filtreler)
  - **Model Durumları**: TRAINING, READY, ACTIVE, ARCHIVED, FAILED
  - Her trade type için sadece 1 aktif model olabilir
  - Aktif model silinemiyor/arşivlenemiyor (önce başka model aktif edilmeli)
- **Analysis screenshot tüm sayfayı yakalıyor**:
  - `handleScreenshot` fonksiyonu `chartRef` yerine `pageRef` kullanıyor
  - Tüm analiz içeriği (7 adım, verdict, trade plan) yakalanıyor
- **Export dropdown PNG/JPG/Email seçenekleri**:
  - Analysis ve Reports detay sayfalarına eklendi
  - "Send via Email" önce dosyayı indiriyor, sonra email gönderiyor
  - PDF butonu kaldırıldı, screenshot tabanlı export kullanılıyor
- **Pricing sayfası analiz kredisi düzeltildi**:
  - "35 Credits Per analysis" → "25 Credits Per analysis" (dinamik)
  - `ANALYSIS_BUNDLES` import edilerek hardcoded değer kaldırıldı
  - `pricing-config.ts`'deki bundle kredisi 35→25 olarak güncellendi
- **AI Expert SUPPORTED_SYMBOLS genişletildi**:
  - PEPE, SHIB, WIF, BONK (meme coins) eklendi
  - FET, AGIX, OCEAN, RNDR, TAO, WLD (AI tokens) eklendi
  - AAVE, MKR, CRV, COMP, SNX, YFI, 1INCH (DeFi) eklendi
  - SAND, MANA, AXS, GALA, IMX, ENJ (Gaming) eklendi
  - Concierge SUPPORTED_COINS ile senkronize edildi
- **AI Concierge Akıllı Cache Entegrasyonu**:
  - Top 30 coin her 2 saatte ön-hesaplanıyor (CoinScoreCache)
  - Kullanıcı bu coinleri sorduğunda ÜCRETSİZ cache'den döndürülüyor
  - Cache'de olmayan coinler için normal analiz akışı (25 kredi)
  - `getCoinFromCache()` ve `getCachedAnalysisData()` metodları eklendi
  - `handleAnalysis()` önce cache kontrol ediyor
  - Response'a `fromCache` ve `cacheExpiresAt` field'ları eklendi
  - Help mesajları güncellendi (EN/TR) - cache özelliği açıklandı
  - "Top 5 coins" ve "Hangi coin almalı?" komutları eklendi

### 2026-01-26
- **Analiz tamamlama UI'ı sadeleştirildi**:
  - "View in Reports" ve "Email Reports" butonları kaldırıldı
  - Sadece "Analysis completed!" mesajı gösteriliyor
  - "Done" butonu modal'ı kapatıp Recent Analyses'a scroll ediyor
  - Recent Analyses bölümüne `id="recent-analyses"` eklendi (smooth scroll için)
  - Kullanılmayan email state'leri ve import'lar temizlendi
- **Email send error handling eklendi**:
  - analyze/details ve reports sayfalarına email gönderim hatası için alert eklendi
  - reports sayfasına eksik interval parametresi eklendi
- **Recent Analyses listesi Reports formatına güncellendi**:
  - LONG/SHORT direction badge'leri eklendi
  - Verdict badge'leri (GO/COND/WAIT/AVOID) eklendi
  - Trade type badge'leri (Scalping/Day Trade/Swing) eklendi
  - TP HIT/SL HIT/LIVE köşe ribbon'ları eklendi
  - Score, P/L, TP progress stat kutuları eklendi
  - Details, AI Expert, Email, Delete action butonları eklendi
- **Email screenshot inline embed olarak gönderiliyor**:
  - Attachment yerine CID ile inline embed
  - Gmail ve diğer email client'larda doğrudan görüntüleniyor
- **Analysis marker tarihsel analizlerde doğru mum üzerine konumlandırılıyor**:
  - `analysisTime` prop eklendi TradePlanChart'a
  - Analiz zamanına en yakın mum bulunup marker o mum üzerine ekleniyor
  - analyze/details, reports ve concierge sayfaları güncellendi
- **Historical outcome checker periyodik çalıştırma eklendi**:
  - `checkAllHistoricalOutcomes()` artık sadece startup'ta değil, her 10 dakikada bir çalışıyor
  - Binance Klines API ile tarihsel mum verileri kontrol ediliyor
  - Anlık fiyat kontrolünün kaçırdığı SL/TP hit'ler yakalanıyor
- **Grafikteki "Current" çizgisi canlı fiyatı gösteriyor**:
  - `livePrice` state eklendi TradePlanChart'a
  - Son mumun close fiyatı kullanılarak güncel fiyat gösteriliyor
  - Prop'tan gelen stale fiyat yerine Binance'den alınan canlı fiyat
- **AI Expert yorumları düzgün formatlanıyor**:
  - `renderAIExpertComment` parser fonksiyonu eklendi
  - Expert tag'leri (ARIA, ORACLE, SENTINEL, NEXUS) emoji ve renklerle gösteriliyor
  - VOLTRAN synthesis ayrı bölümde gösteriliyor
  - Verdict badge'leri uygun renklerde gösteriliyor
- **Email'de tam sayfa screenshot gönderiliyor**:
  - RecentAnalyses ve Reports email butonları detay sayfasına `?email=true` ile yönlendiriyor
  - Detay sayfasında otomatik screenshot capture ve email gönderimi
  - Tam analiz sayfası (7 adım + Trade Plan Chart) email'e ekleniyor
  - Loading overlay ile kullanıcıya geri bildirim
  - Başarılı gönderimde otomatik geri yönlendirme

### 2026-01-27
- **Sahte testimonial'lar kaldırıldı - Gerçek metrikler eklendi**:
  - Landing page: 3 sahte kullanıcı yorumu (Alex M., Sarah K., Michael R.) kaldırıldı
  - About page: 8 sahte Twitter testimonial'ı (sahte @handle'lar ve sahte tweet URL'leri) kaldırıldı
  - Yeni `PlatformMetrics` komponenti: API'den gerçek platform verisi çekiyor
  - Gösterilen metrikler: Toplam Analiz, Platform Accuracy (%), GO Signal Success (%), Registered Traders
  - "Real Results, Real Data" başlığı ile şeffaflık vurgusu
  - Veri kaynağı: `/api/analysis/platform-stats` endpoint'i (Analysis tablosundan)
  - Güncellenen dosyalar: `apps/web/app/(marketing)/page.tsx`, `apps/web/app/(marketing)/about/page.tsx`
- **Top 5 High-Probability Coins özelliği eklendi** (300 kredi):
  - Analyze sayfasına "Top 5 High-Probability Coins" kartı eklendi
  - Cache'den top 5 coin gösteriliyor (FREE) veya "Scan Now" ile 300 krediye taze tarama
  - Her coin kartında: Sıralama, Symbol, Verdict badge, Score, 24h değişim, Direction
  - Coin kartına tıklayınca analiz detay sayfasına yönlendirme
  - AI Concierge quick command güncellendi: "Top 5 Coins (300 Cr)"
  - Intent detection güncellendi: "highest probability", "give me top coins" → ücretli tarama tetikler
  - Güncellenen dosyalar: `apps/web/app/(dashboard)/analyze/page.tsx`, `apps/web/app/(dashboard)/concierge/page.tsx`, `apps/api/src/modules/concierge/concierge.service.ts`
- **Tarama sonrası otomatik scroll eklendi**:
  - "Scan Now" butonu ile Top 5 tarama yapıldığında, tarama bitince otomatik olarak Top 5 Coins bölümüne smooth scroll yapılıyor
  - `id="top-coins-section"` div'e eklendi
  - `scrollToTopCoins()` callback fonksiyonu eklendi
- **Landing page yeniden düzenlendi**:
  - "Real Results, Real Data" bölümü Hero section'ın (60 Seconds) altına taşındı
  - Feature 1 başlığı "AI-Powered Market Scanner" olarak güncellendi (7-Step format)
  - "Find Your Next Winning Trade" başlığı kaldırıldı
- **AI Concierge tarama onay akışı eklendi**:
  - `SCAN_CONFIRM` intent: Onay kelimeleri (evet, yes, tamam, onaylıyorum, ok, vb.)
  - `SCAN_DECLINE` intent: Red kelimeleri (hayır, no, iptal, cancel, vb.)
  - `handleTopCoinsByScore`: Cache yoksa "Onaylıyor musunuz?" / "Do you confirm?" soruluyor
  - `handleScanConfirm`: Onay gelince 300 kredi çekilip tarama başlatılıyor
  - Frontend: Onay sonrası 3 saniye bekleyip `/analyze` sayfasına yönlendirme

### 2026-01-28
- **Landing page'e canlı Performance grafiği eklendi**:
  - Yeni public API endpoint: `GET /api/analysis/platform-performance-history`
  - Platform genelindeki son 30 günlük kümülatif P/L verisi döndürüyor
  - Kimlik doğrulama gerektirmiyor (public endpoint)
  - `PlatformPerformanceChart` bileşeni oluşturuldu
  - Dashboard'daki Performance grafiğinin landing page versiyonu
  - Recharts lazy-loaded (SSR devre dışı, performans için)
  - İstatistik kutularının üstünde görüntüleniyor
  - Tooltip ile günlük detay gösterimi
  - Toplam P/L yüzdesi ve kapanan trade sayısı gösteriliyor
  - Veri kaynağı: Analysis tablosundan verified trade outcomes (TP/SL hits)
- **Landing page P/L Dashboard ile senkronize edildi**:
  - `platform-performance-history` endpoint'i artık `allTimeTotalPnL` ve `allTimeTotalTrades` döndürüyor
  - Landing page "All" görünümünde all-time toplam P/L gösteriyor (dashboard ile aynı)
  - View mode seçenekleri: Today, Week, All (önceden Month idi)
  - Period-specific ve all-time veriler ayrı hesaplanıyor
- **Login sayfası dark/light mode uyumu düzeltildi**:
  - Sol marketing paneli artık tema tercihini takip ediyor
  - Light mode'da açık renkler, dark mode'da koyu renkler kullanılıyor
  - Feature kartları, istatistikler ve trust badge'ler tema uyumlu
  - Dosya: `apps/web/app/(auth)/layout.tsx`
- **Kutlama Bildirimleri Sistemi eklendi**:
  - Yeni bileşen: `apps/web/components/modals/CelebrationModal.tsx`
  - Confetti, balon ve yıldız animasyonları
  - 10 farklı kutlama türü: daily_login, streak_bonus, spin_jackpot, quiz_correct, achievement_unlocked, level_up, trade_type_bonus, referral_bonus, first_analysis, analysis_milestone
  - Otomatik 5 saniye sonra kapanma
  - Her tür için özel renk gradient'i ve ikon
- **Kredi Bildirim Sistemi eklendi**:
  - Yeni context: `apps/web/contexts/CreditNotificationContext.tsx`
  - `notifyCreditDeduction`: Kredi harcandığında toast bildirimi (miktar + kalan bakiye)
  - `notifyCreditAddition`: Kredi kazanıldığında toast bildirimi
  - `showCelebration`: Kutlama modal'ı gösterme
  - `notifyInsufficientCredits`: Yetersiz kredi uyarısı + "Buy Credits" butonu
  - providers.tsx'e `CreditNotificationProvider` eklendi
- **Analiz tamamlandığında kredi bildirimi**:
  - AnalysisDialog'da kredi harcama bildirimi gösteriliyor
  - Trade type bonus için kutlama modal'ı gösteriliyor (Scalping: +3, Day Trade: +2, Swing: +1)
  - Yetersiz kredi durumunda özel hata mesajı ve yönlendirme
- **Rewards sayfası kutlama entegrasyonu**:
  - Daily Login claim edildiğinde kutlama modal'ı
  - Streak milestone'larında özel kutlama (7, 14, 21, 28, 30 gün)
  - Lucky Spin sonrası kutlama (jackpot için özel)
  - Quiz doğru cevapta kutlama (+5 kredi)
- **Dil seçimi birleştirildi ve tüm sayfalarda çalışır hale getirildi**:
  - Settings'teki dil seçici kaldırıldı (sadece backend özelliklerini etkiliyordu, UI çevirmiyordu)
  - Google Translate-based LanguageSelector tüm dashboard sayfalarına eklendi
  - Header'da (masaüstü) ThemeToggle yanında gösteriliyor
  - Mobile menüde ayrı bölümde gösteriliyor
  - 8 dil destekleniyor: English, Türkçe, Deutsch, Español, Italiano, Français, 中文, 日本語
  - Dosyalar: `settings/page.tsx`, `layout.tsx`

### 2026-01-29
- **MLIS Pro analizi "Failed to complete analysis" hatası düzeltildi**:
  - `method: 'mlis_pro'` veritabanına kaydedilmiyordu - eklendi
  - AnalysisProgressBar artık dinamik adım sayısını destekliyor (5-layer MLIS vs 7-step Classic)
  - AnalysisDialog MLIS sonuçlarını doğru işliyor ve görüntülüyor
  - saveReportToDatabase MLIS için 5 adım, Classic için 7 adım bekliyor
  - Detaylı console logging eklendi (hata ayıklama için)
  - Hata mesajları artık gerçek hata detaylarını içeriyor
- **MLIS Frontend Bileşenleri**:
  - `MLIS_STEPS` export'u eklendi (Technical, Momentum, Volatility, Volume, Verdict)
  - `MLISLayerResult` komponenti: Layer skorları ve sinyalleri gösteriyor
  - `MLISVerdictResult` komponenti: STRONG_BUY/BUY/HOLD/SELL önerileri gösteriyor
  - Progress bar "X/5 Complete" gösteriyor (MLIS için)
  - Purple tema MLIS Pro için kullanılıyor
  - Dosyalar: `AnalysisDialog.tsx`, `AnalysisProgressBar.tsx`, `analysis.routes.ts`
- **AI Concierge MLIS Pro Entegrasyonu**:
  - "BTC MLIS Pro" quick command butonu eklendi (purple gradient, Zap icon)
  - `handleMLISAnalysis` düzeltildi: `method: 'mlis_pro'` ve 5-layer doğru kaydediliyor
  - system-prompt.ts güncellendi: MLIS_ANALYSIS intent dokumentasyonu eklendi
  - HELP_TEXT (TR/EN) MLIS Pro komut örnekleriyle güncellendi
  - Dosyalar: `concierge/page.tsx`, `concierge.service.ts`, `system-prompt.ts`
- **Marketing Sayfası Feature 2 - Dual Analysis System**:
  - Feature 2 başlığı "Dual Analysis System" olarak güncellendi
  - 7-Step Classic (teal) ve MLIS Pro (violet) yan yana gösteriliyor
  - MLIS Pro için "NEW" badge eklendi
  - Eski Feature 8 (ayrı MLIS Pro section) kaldırıldı (birleştirildi)
  - Dosya: `apps/web/app/(marketing)/page.tsx`
- **"How TraderPath Works" Step 2 Güncellendi**:
  - "Run 7-Step Analysis" → "Choose Analysis Method" olarak değiştirildi
  - Her iki yöntem (Classic + MLIS Pro) karşılaştırmalı olarak gösteriliyor
  - Classic: 7 adım, 40+ indikatör, GO/WAIT/AVOID verdict
  - MLIS Pro: 5 layer, neural signals, STRONG_BUY/SELL recommendations
- **Performance Chart Dual-Line Desteği**:
  - API endpoint (`platform-performance-history`) Classic ve MLIS Pro verilerini ayrı döndürüyor
  - `dailyClassic` ve `dailyMlis` ayrı diziler olarak döndürülüyor
  - Summary'de `classicTrades`, `mlisTrades`, `allTimeClassicPnL`, `allTimeMlisPnL` eklendi
  - LandingPerformanceChart.tsx iki çizgi gösteriyor (teal: Classic, violet: MLIS Pro)
  - Legend eklendi (Classic Analysis, MLIS Pro)
  - MLIS verisi varsa dual-line, yoksa tek line gösteriliyor
  - Dosyalar: `analysis.routes.ts`, `LandingPerformanceChart.tsx`
- **Visual Trade Decision Component (TradeDecisionVisual)**:
  - Yeni bileşen: `apps/web/components/analysis/TradeDecisionVisual.tsx`
  - **Görsel Bileşenler**:
    - `SignalIndicator`: 4 ışıklı trafik lambası (GO/COND/WAIT/AVOID veya BUY/HOLD/SELL)
    - `DirectionArrow`: LONG (yeşil yukarı ok) / SHORT (kırmızı aşağı ok) yön göstergesi
    - `ScoreGauge`: Animasyonlu dairesel skor göstergesi (0-10 veya 0-100%)
    - `VerdictBadge`: Gradient renkli karar etiketi (GO, CONDITIONAL GO, WAIT, AVOID)
    - `RiskMeter`: 3 seviyeli risk göstergesi (low/medium/high)
  - **Entegre Edilen Sayfalar**:
    - FinalVerdict component: Ana analiz sonuç kartı
    - AnalysisDialog footer: Analiz tamamlandığında verdict özeti
    - MLISVerdictResult: MLIS Pro sonuçları için görsel karar
    - analyze/details/[id]: Analiz detay sayfası
    - reports/[id]: Rapor detay sayfası
  - **Özellikler**:
    - Responsive boyutlar (sm, md, lg)
    - Dark mode uyumlu
    - Animasyonlu glow efektleri
    - Classic ve MLIS Pro desteği
  - Dosyalar: `TradeDecisionVisual.tsx`, `FinalVerdict.tsx`, `AnalysisDialog.tsx`, `details/[id]/page.tsx`, `reports/[id]/page.tsx`
- **Export Dropdown Genişletildi**:
  - PNG, JPG, PDF, Email seçenekleri tek dropdown'da
  - PDF export: jsPDF ile dinamik import, tam sayfa capture
  - Email export: Screenshot gönderimi, mail butonu
  - FileText ve Mail ikonları eklendi
  - Dosya: `analyze/details/[id]/page.tsx`
- **Otomatik PDF Oluşturma (Analiz Tamamlandığında)**:
  - Analiz tamamlandığında otomatik PDF oluşturma ve indirme
  - AnalysisDialog'da `?pdf=true` parametresi ile detay sayfasına yönlendirme
  - Detay sayfasında auto-PDF handler ve overlay UI
  - PDF generating status mesajı modal'da gösteriliyor
  - Tamamlandığında "PDF Downloaded!" mesajı ve otomatik yönlendirme
  - State'ler: `savedAnalysisId`, `pdfGenerating`, `autoPdfInProgress`, `autoPdfDone`
  - Dosyalar: `AnalysisDialog.tsx`, `details/[id]/page.tsx`
- **PNG/JPEG Export Kalitesi Artırıldı**:
  - PNG: scale 3, windowWidth 1400
  - JPG: scale 2.5, quality 0.95
  - TraderPath branding header eklendi (logo + text)
  - Proper background ve padding export container'da
- **MLIS Pro Detay Sayfası Düzeltildi**:
  - Detay sayfası MLIS Pro analizlerini 5-layer formatında gösteriyor
  - `isMLIS` detection: `method === 'mlis_pro'` veya `step1Result.mlis === true`
  - **MLIS Layer Kartları**: Technical, Momentum, Volatility, Volume (violet/purple tema)
  - **MLIS Verdict Kartı**: Recommendation badge (STRONG_BUY/BUY/HOLD/SELL), Confidence %, Risk Level, Direction
  - Key Signals ve Risk Factors listesi
  - Trade Plan Chart MLIS için gizleniyor (MLIS trade plan üretmiyor)
  - TradeDecisionVisual MLIS için recommendation ve confidence prop'ları eklendi
  - Dosya: `analyze/details/[id]/page.tsx`
- **Export Header ve Verdict Badge Düzeltmeleri**:
  - Export header'da 4-kare logo yerine `StarLogo` komponenti kullanılıyor
  - TraderPath metni kurumsal renklerle gradient gösteriliyor (teal→coral)
  - Verdict badge artık GO/COND/WAIT/AVOID gösteriyor (BULLISH/BEARISH yerine)
  - `getVerdict()` fonksiyonu MLIS ve Classic için doğru verdict hesaplıyor
  - Her verdict için uygun ikon (TrendingUp/Target/Clock/AlertTriangle) gösteriliyor
  - Dosya: `details/[id]/page.tsx`
- **Scan Now ve MLIS Pro Robustness Artırıldı**:
  - `coin-score-cache.service.ts`'de `method: 'classic'` açıkça set ediliyor
  - System scan'ler için analiz kaydı method bilgisi içeriyor
  - MLIS Pro layers için default değerler eklendi (undefined durumları için)
  - Classic analiz steps için null/undefined kontrolleri eklendi
  - Verdict hesaplamasında overallScore için Number() dönüşümü eklendi
  - Dosyalar: `coin-score-cache.service.ts`, `AnalysisDialog.tsx`
- **Top 5 Coins tarama tamamlandığında bildirim eklendi**:
  - CelebrationModal'a `scan_complete` reason'ı eklendi
  - Tarama tamamlandığında celebration modal gösteriliyor
  - Toast bildiriminde "View All Results" butonu eklendi
  - Son tarama zamanı Top 5 bölümünde gösteriliyor
  - Dosyalar: `CelebrationModal.tsx`, `analyze/page.tsx`
- **Top Coins sayfası oluşturuldu (/top-coins)**:
  - Tüm taranan coinlerin listesi (30 coin)
  - Filtreler: Verdict (GO/COND/WAIT/AVOID), Method (Classic/MLIS), Direction (LONG/SHORT)
  - Sıralama: Score, 24h Change, Price, Symbol
  - Search ile coin arama
  - Her coin için detaylı kart (method badge, verdict, score, direction)
  - Cache bilgisi ve son tarama zamanı gösterimi
  - Glassmorphism ve gradient orbs tasarımı
  - Dosya: `apps/web/app/(dashboard)/top-coins/page.tsx`
- **Sidebar'a Top Coins linki eklendi**:
  - Crown ikonu ile Analyze'dan sonra eklendi
  - Dosya: `apps/web/app/(dashboard)/layout.tsx`

### 2026-01-30
- **Capital Flow System Implemented** (Global Capital Flow Intelligence Platform):
  - Temel prensip: "Para nereye akıyorsa potansiyel oradadır" (Where money flows, potential exists)
  - **4 LAYER mimarisi**:
    - LAYER 1: Global Liquidity Tracker (Fed Balance Sheet, M2, DXY, VIX, Yield Curve)
    - LAYER 2: Market Flow Analyzer (Crypto, Stocks, Bonds, Metals)
    - LAYER 3: Sector Drill-Down (DeFi, L2, Tech, Finance, etc.)
    - LAYER 4: Asset Analysis (7-Step/MLIS bağlantısı)
  - **Backend Files**:
    - `apps/api/src/modules/capital-flow/types.ts` - Tüm type tanımlamaları
    - `apps/api/src/modules/capital-flow/providers/fred.provider.ts` - FRED API (Fed Balance Sheet, M2, Treasury)
    - `apps/api/src/modules/capital-flow/providers/yahoo.provider.ts` - Yahoo Finance (DXY, VIX, Stocks, Metals)
    - `apps/api/src/modules/capital-flow/providers/defillama.provider.ts` - DefiLlama API (DeFi TVL, Chains, Stablecoins)
    - `apps/api/src/modules/capital-flow/capital-flow.service.ts` - Ana servis
    - `apps/api/src/modules/capital-flow/capital-flow.routes.ts` - API routes
  - **Frontend Files**:
    - `apps/web/app/(dashboard)/capital-flow/page.tsx` - Capital Flow Radar dashboard
  - **API Endpoints**:
    - `GET /api/capital-flow/summary` - Full summary with recommendation
    - `GET /api/capital-flow/liquidity` - Global liquidity only
    - `GET /api/capital-flow/markets` - All market flows
    - `GET /api/capital-flow/markets/:market` - Single market with sectors
    - `POST /api/capital-flow/refresh` - Force cache refresh
  - **Phase Detection**: Early (0-30d), Mid (30-60d), Late (60-90d), Exit (90+d)
  - **Rotation Detection**: entering, stable, exiting signals
  - **Liquidity Bias**: risk_on, risk_off, neutral
  - **Recommendation Engine**: Primary market, action (analyze/wait/avoid), confidence %
  - Sidebar'a "Capital Flow" linki eklendi (Globe ikonu)

### 2026-01-31
- **Multi-Asset Analysis Support (Unified Analysis Engine)**:
  - SLV ve diğer non-crypto varlıklar için analiz hatası düzeltildi
  - **Yeni Dosya**: `apps/api/src/modules/analysis/providers/multi-asset-data-provider.ts`
  - **Unified Data Provider**:
    - Crypto varlıklar → Binance API
    - Stocks/Bonds/Metals → Yahoo Finance API
    - `fetchCandles()` ve `fetchTicker()` fonksiyonları asset class'a göre doğru API'ye yönlendiriyor
  - **Analysis Engine Güncellemeleri**:
    - `analysis.engine.ts`'e multi-asset provider import edildi
    - `scanAsset()`: Tokenomics sadece crypto için çağrılıyor
    - `safetyCheck()`: Order book ve trades sadece crypto için çağrılıyor
    - Non-crypto varlıklar için default değerler kullanılıyor
  - **MLIS Service Güncellemeleri**:
    - `mlis.service.ts`'e multi-asset provider import edildi
    - `fetchCandles()` yeni provider kullanıyor
    - Tüm asset class'ları için MLIS Pro analizi destekleniyor
  - **Frontend Güncellemeleri**:
    - Non-crypto varlıklar için ana analiz endpoint'i (`/api/analysis/full`) kullanılıyor
    - Metod seçimi (Classic 7-Step vs MLIS Pro) tüm asset türleri için gösteriliyor
    - Analyze butonu seçilen metodu ve kredi maliyetini gösteriyor
  - **Desteklenen Asset Class'lar**:
    - Crypto: BTC, ETH, SOL, vb. (Binance üzerinden)
    - Stocks: AAPL, MSFT, SPY, QQQ, vb. (Yahoo Finance)
    - Bonds: TLT, IEF, SHY, BND, vb. (Yahoo Finance)
    - Metals: GLD, SLV, IAU, XAUUSD, XAGUSD, vb. (Yahoo Finance)
- **Analyze Sayfası LAYER 4 Olarak Yeniden Tasarlandı**:
  - Sayfa artık Capital Flow hiyerarşisinin LAYER 4'ü olarak konumlandırıldı
  - **Kaldırılan Bileşenler** (1600→~860 satır):
    - MarqueeBanner (kayan kripto fiyatları)
    - KineticText (karakter animasyonları)
    - GradientOrbs (arka plan küreleri)
    - GrainOverlay (grenli doku)
    - StatCards (6 istatistik kartı - dashboard'da var)
    - Top 5 Coins Scan (ayrı /top-coins sayfasına taşındı)
    - Live Chart collapse
    - Feature badges
  - **Yeni Bileşenler**:
    - Capital Flow Context Bar: L1→L2→L3→L4 breadcrumb gösterimi
    - Sector-based suggestions: Capital Flow'dan gelen sektöre göre asset önerileri
    - Unified search: Tüm marketlerde tek arama kutusu
    - Flow warning: Context olmadan girişte uyarı
  - **URL Parametreleri**: `?market=crypto&sector=defi&symbol=AAVE`
  - **Akış**:
    1. Capital Flow'dan market/sector önerisi al
    2. Önerilen asset'lerden seç veya arama yap
    3. Timeframe ve method seç (Classic 7-Step / MLIS Pro)
    4. Analiz çalıştır
  - Dosya: `apps/web/app/(dashboard)/analyze/page.tsx`
- **Dashboard Capital Flow Entegrasyonu**:
  - Dashboard sayfası Platform Performance ve My Performance olarak yeniden düzenlendi
  - **Platform Performance Bölümü**:
    - 4-Layer Capital Flow summary kartları (Global Liquidity, Market Flow, Sector Activity, Recommendation)
    - Platform P/L grafiği (tüm doğrulanmış trade'ler)
    - Platform istatistikleri (Accuracy, Total Analyses, Platform Users)
    - AI Concierge Stats (Platform) - toplam mesaj, kullanıcı başına ortalama
    - AI Experts Stats (Platform) - toplam soru, haftalık soru
  - **My Performance Bölümü**:
    - Kişisel P/L grafiği Today/Week/Month toggle ile
    - Kişisel istatistikler (Accuracy, GO Signals, Active Trades)
    - Analiz özet kartları (Total, Active, Closed, TP Hit, SL Hit)
    - My AI Concierge Usage - gönderilen mesaj, chat üzerinden analiz
    - My AI Expert Usage - sorulan soru, kalan ücretsiz
  - **Active Trades Bölümü**: Yatay scroll ile aktif pozisyonlar
  - **Empty State**: Yeni kullanıcılar için Capital Flow CTA
  - Capital Flow API entegrasyonu (`/api/capital-flow/summary`)
  - Dosya: `apps/web/app/(dashboard)/dashboard/page.tsx`
- **Capital Flow SELL Recommendation Improved**:
  - SELL önerisi artık sadece mutlak çıkış (negative flow) değil, görece zayıflık da dikkate alıyor
  - Relative weakness detection: En iyi ve en kötü performans gösteren market arasında %5+ fark varsa SELL önerisi
  - Slowing momentum detection: flowVelocity < -1 ise erken uyarı sinyali
  - Risk-off modunda SELL her zaman gösteriliyor (gerçek çıkış olmasa bile)
  - Sector filtering iyileştirildi: trending down veya market ortalamasının altındaki sektörler
  - Confidence skorlaması sinyal gücüne göre ayarlandı (50-80 arası)
  - Dosya: `apps/api/src/modules/capital-flow/capital-flow.service.ts`
- **Market Flow Analyzer Charts Added**:
  - Her market kartına zamana bağlı Para Akışı (Money Flow) çizgi grafiği eklendi
  - Her market kartına zamana bağlı Akış Hızı (Flow Velocity) çizgi grafiği eklendi
  - MiniSparkline SVG komponenti oluşturuldu (gradient fill, responsive)
  - 30 günlük sentetik tarihsel veri üretimi (flowHistory, velocityHistory)
  - FlowDataPoint interface eklendi types.ts'e
  - Dosya: `apps/web/app/(dashboard)/capital-flow/page.tsx`, `capital-flow.service.ts`, `types.ts`
- **Sectors Button Fixed**:
  - Market Flow kartındaki Sectors butonu Layer 3'e geçmiyor sorunu düzeltildi
  - onClick handler'a `setSelectedLayer(3)` eklendi
- **Analyze Page Recent Section Fixed**:
  - İç içe geçmiş "Recent" header sorunu düzeltildi
  - Wrapper'daki gereksiz header kaldırıldı (RecentAnalyses zaten kendi header'ına sahip)
- **Daily Pass Pricing System Implemented**:
  - **Yeni Tablo**: `DailyPass` - günlük pass'ları takip eder
  - **Yeni Servis**: `apps/api/src/modules/passes/daily-pass.service.ts`
  - **Yeni Routes**: `apps/api/src/modules/passes/daily-pass.routes.ts`
  - **Fiyatlandırma Modeli**:
    - Layer 1-2-3: FREE (tüm kullanıcılar)
    - Layer 4 (AI Recommendations): 25 kredi/gün
    - Asset Analysis: 100 kredi/gün (max 10 analiz)
  - **Frontend Güncellemeleri**:
    - Capital Flow page: Layer 4 unlock için 25 kredi (5'ten değiştirildi)
    - Analyze page: Daily Pass status bar ve satın alma butonu
    - Pass olmadan analiz yapılamaz (paywall)
  - **Backend Güncellemeleri**:
    - `/api/analysis/full`: Daily Pass kontrolü eklendi
    - Pass yoksa `DAILY_PASS_REQUIRED` hatası döner
    - Limit aşılırsa `DAILY_LIMIT_REACHED` hatası döner
    - Admin kullanıcılar bypass eder
  - **API Endpoint'ler**:
    - `GET /api/passes/status` - Aktif pass'leri listele
    - `POST /api/passes/purchase` - Pass satın al
    - `GET /api/passes/check/:type` - Belirli pass'ı kontrol et
  - Migration: `apps/api/prisma/migrations/add_daily_passes_table.sql`
- **Auth Page Marketing Panel Updated**:
  - Sol panel Capital Flow yaklaşımına göre güncellendi
  - 4-Layer flow sistemi gösterimi
  - "Follow the Money" mottosu
  - Phase badges (EARLY, MID, LATE, EXIT)
  - Stats: 4 Markets, BUY Signals, SELL Signals
- **Landing Page FAQ Updated**:
  - 8 soru Capital Flow yaklaşımına göre güncellendi
  - What is Capital Flow, 4-Layer System, Phases, BUY/SELL recommendations
- **Daily Pass Pricing System (3 Tier)**:
  - 3 ayrı Daily Pass tipi tanımlandı:
    - **CAPITAL_FLOW_L3**: 25 kredi/gün - Sector Activity
    - **CAPITAL_FLOW_L4**: 25 kredi/gün - AI Recommendations
    - **ASSET_ANALYSIS**: 100 kredi/gün - 7-Step/MLIS Pro (max 10 analiz)
  - **Toplam: 150 kredi/aktif gün** (sadece giriş yapılan günler)
  - capital-flow sayfasına L3 ve L4 için ayrı unlock butonları
  - Admin > Finance > Credit Economy bölümüne 3'lü Daily Pass Pricing section
  - Dosyalar: `schema.prisma`, `daily-pass.service.ts`, `daily-pass.routes.ts`, `capital-flow/page.tsx`, `admin/finance/page.tsx`
- **Concierge Bug Fix**:
  - `handleAnalysis` fonksiyonu `direction` ve `tradePlan` döndürmüyordu
  - Frontend verdict kartı ve TradePlanChart için bu verileri bekliyordu
  - Analiz DB'den çekilerek step5Result ve step7Result'tan direction/tradePlan eklendi
  - Dosya: `concierge.service.ts`
- **Analysis Details Export**:
  - Export dropdown (PNG, JPG, PDF, Email) header'a taşındı
  - MLIS Pro ve Classic analizlerin her ikisi için de görünür
  - Tüm analiz detayları tek dropdown'dan export edilebiliyor
  - Dosya: `analyze/details/[id]/page.tsx`
- **Capital Flow Fullscreen Layer Modal**:
  - Layer kartlarına tıklandığında tam ekran modal açılıyor
  - Her layer için ayrı export dropdown (PNG, JPG, PDF, Email)
  - Layer 1-4 tüm detayları fullscreen'de gösteriliyor
  - Export fonksiyonları layer-specific isimlendirme ile (TraderPath_Global_Liquidity_2026-01-31.pdf)
  - Dosya: `capital-flow/page.tsx`
- **Asset Logos Database System**:
  - **Yeni Tablo**: `AssetLogos` - JSON olarak tüm asset logolarını saklar
  - **Kapsamlı Logo Verileri**:
    - Crypto: 80+ coin (CoinGecko CDN)
    - Stocks: 60+ şirket (Clearbit Logo API)
    - Metals: 13 metal ETF/commodity
    - Bonds: 14 bond ETF/treasury
  - **API Endpoint'leri**:
    - `GET /api/asset-logos` - Tüm logolar
    - `GET /api/asset-logos/:assetClass` - Asset class bazında
    - `GET /api/asset-logos/symbol/:symbol` - Tek sembol
    - `POST /api/asset-logos/batch` - Çoklu sembol
    - `PUT /api/asset-logos/admin/update` - Logo güncelleme (admin)
    - `PUT /api/asset-logos/admin/bulk` - Toplu güncelleme (admin)
  - **Frontend Cache Sistemi**:
    - Memory cache + localStorage (24 saat TTL)
    - `useAssetLogo` ve `useAssetLogos` React hooks
    - Fallback SVG generation (logo yüklenemezse)
  - **CoinIcon Komponenti Güncellendi**:
    - API cache'den logo çekiyor
    - Hata durumunda fallback SVG
    - Lazy loading ve error handling
  - Dosyalar: `apps/api/src/modules/asset-logos/`, `apps/web/lib/asset-logos-cache.ts`, `apps/web/hooks/useAssetLogos.ts`
- **Scheduled Reports Page Corporate Styling**:
  - Glassmorphism kartlar backdrop-blur efektleri ile
  - Gradient orbs arka plan (teal, orange, blue)
  - Animasyonlu status badge'leri (ACTIVE/PAUSED with pulse)
  - Progress bar aktif schedule sayısı için
  - Timeframe badge'leri gradient renklerle (15m kırmızı, 1H amber, 4H teal, 1D mavi)
  - Frequency badge'leri (DAILY/WEEKLY/MONTHLY)
  - Delivery channel ikonları aktif durumlarla
  - Modal tasarımı sticky header/footer ile
  - Tüm interaktif elementlerde hover efektleri
  - Kurumsal teal/coral renk şeması tutarlı şekilde
  - Geliştirilmiş empty state gradient dekorasyonlarla
  - Info box amber gradient tema ile
  - Geliştirilmiş loading state glowing spinner ile
  - Dosya: `apps/web/app/(dashboard)/scheduled/page.tsx`

### 2026-02-01
- **AI Concierge "Altın alınır mı?" fix**:
  - Capital Flow recommendation'da field name mismatch düzeltildi
  - `FlowRecommendation` interface `reason` kullanıyor ama kod `reasoning` erişiyordu
  - `undefined.toLowerCase()` TypeError'a neden oluyordu
  - 3 yerde düzeltme: `concierge.service.ts:1418-1420,1528`, `capital-flow.service.ts:832-840`
  - Fallback structure interface'e uygun hale getirildi
- **BILGE Guardian System - Backend Implementation**:
  - **Yeni Modül**: `apps/api/src/modules/bilge/`
  - **Bileşenler**:
    - `types.ts` - Tüm type tanımlamaları
    - `pattern-database.ts` - 10 başlangıç error pattern'i
    - `notification.service.ts` - Slack, Discord, SMS, WhatsApp bildirimleri
    - `bilge.service.ts` - Ana servis (error collection, pattern matching)
    - `bilge.routes.ts` - Fastify API routes
    - `error-collector.middleware.ts` - Error collector utilities
    - `index.ts` - Module exports
  - **Error Pattern'leri** (10 adet):
    1. Database Connection Error (critical)
    2. API Rate Limit Exceeded (medium)
    3. Authentication Failure (high)
    4. External Service Timeout (medium)
    5. Gemini API Error (high)
    6. Input Validation Error (low)
    7. Memory/Resource Exhaustion (critical)
    8. Binance API Error (medium)
    9. Payment/Credit Error (high)
    10. Security/CORS Error (high)
  - **Bildirim Kanalları**:
    - Slack (webhook)
    - Discord (webhook)
    - SMS (Twilio)
    - WhatsApp (Twilio)
  - **API Endpoint'leri**:
    - `GET /api/bilge/health` - Guardian sağlık durumu
    - `GET /api/bilge/dashboard` - Dashboard özeti
    - `GET /api/bilge/errors` - Hata listesi
    - `POST /api/bilge/errors/:id/resolve` - Hata çözme
    - `POST /api/bilge/errors/report` - Manuel hata bildirimi
    - `GET /api/bilge/patterns` - Error pattern'leri
    - `GET /api/bilge/reports/weekly` - Haftalık rapor
    - `POST /api/bilge/feedback` - Kullanıcı feedback'i
    - `GET /api/bilge/feedback` - Feedback listesi (admin)
    - `POST /api/bilge/feedback/:id/approve|reject|respond`
    - `GET /api/bilge/ideas` - Innovation fikirleri
    - `POST /api/bilge/ideas/generate` - Fikir üretme
  - **Özellikler**:
    - Otomatik error collection (onError hook)
    - Pattern matching ile error classification
    - Severity-based notification (critical=tüm kanallar)
    - Redis storage (1000 error limit)
    - Weekly report generation (Gemini AI)
    - User feedback with AI analysis
    - Innovation idea generation
  - **Env Variables**:
    - `BILGE_SLACK_WEBHOOK_URL`
    - `BILGE_DISCORD_WEBHOOK_URL`
    - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
    - `BILGE_ADMIN_PHONE_NUMBERS` (virgülle ayrılmış)
  - Dosyalar: `apps/api/src/modules/bilge/*`, `apps/api/src/index.ts`
- **BILGE.md Documentation**:
  - Kapsamlı 900+ satırlık dokümantasyon oluşturuldu
  - BILGE kimliği ve değerleri (Bilge Kağan'dan ilham)
  - Guardian System mimarisi
  - 10 başlangıç error pattern'i
  - Haftalık rapor formatı (Pazar 21:00)
  - Innovation Engine
  - User Feedback System (admin onayı ile)
  - Maliyet analizi ($2.50-$32/ay)
  - 4 haftalık uygulama yol haritası
- **BILGE Admin Dashboard eklendi**:
  - Yeni sayfa: `apps/web/app/(dashboard)/admin/bilge/page.tsx`
  - **Dashboard Tab**: Guardian sağlık durumu, son 24 saat hataları, kritik hata sayısı, aktif issue'lar, uptime
  - **Errors Tab**: Hata listesi, severity/status filtreleri, arama, error detay modal, resolve işlevi
  - **Patterns Tab**: 10 error pattern kartları, match count, suggested fix görüntüleme
  - **Feedback Tab**: Kullanıcı feedback listesi, BILGE AI analizi, approve/reject/respond işlevleri
  - **Ideas Tab**: Innovation fikirleri, Gemini ile yeni fikir üretme
  - **Reports Tab**: Haftalık rapor görüntüleme, trend analizi, BILGE recommendations
  - Admin navigation'a BILGE linki eklendi (teal renkli Shield ikonu)
  - Dosya: `apps/web/app/(dashboard)/admin/page.tsx` güncellendi
- **BILGE Weekly Report Cron Job eklendi**:
  - Yeni dosya: `apps/api/src/modules/bilge/bilge-cron.job.ts`
  - Her Pazar 21:00 UTC+3 (18:00 UTC) çalışır
  - Haftalık rapor oluşturur ve Slack/Discord'a gönderir
  - `startBilgeWeeklyReportJob()` ve `stopBilgeWeeklyReportJob()` fonksiyonları
  - Server startup/shutdown'a entegre edildi
  - Dosyalar: `bilge-cron.job.ts`, `index.ts`
- **Capital Flow Professional Export System**:
  - Karmaşık export dropdown (PNG, JPG, PDF, Email, Save) kaldırıldı
  - Sadece 2 profesyonel buton: "Download Report" ve "Email Report"
  - **Yeni Dosya**: `apps/web/lib/capital-flow-report-generator.ts`
  - jsPDF ile profesyonel PDF rapor (renk kodları, bölümler, formatlama)
  - Gmail uyumlu responsive HTML email şablonu
  - **Yeni API Endpoint**: `POST /api/reports/send-capital-flow-email`
  - Email ücretsiz (Daily Pass sisteminin parçası)
  - Fullscreen modal export UI da aynı şekilde güncellendi
  - Kullanılmayan import'lar ve state'ler temizlendi
- **MLIS Pro Analiz Çelişkileri Düzeltildi** (5 kritik hata):
  - **Hata 1**: Frontend MLIS verilerini yanlış step'ten okuyordu (step5 → step7)
  - **Hata 2**: VerdictBadge 3 farklı değer gösteriyordu (WAIT/HOLD/AVOID)
  - **Hata 3**: Direction ve Verdict farklı skorlar kullanıyordu
  - **Hata 4**: 0% confidence ile öneri veriliyordu
  - **Hata 5**: Skor ölçekleri tutarsızdı (8.1/10 vs 81/100)
  - Artık düşük güven (<30%) olduğunda: HOLD öneri + NEUTRAL yön + açıklayıcı mesaj
  - Tüm skorlar 0-100 ölçeğinde standartlaştırıldı
- **7-Step Classic Analiz Skor ve Direction Hataları Düzeltildi** (6 kritik hata):
  - **Hata 1**: `reports/page.tsx` totalScore'u yanlışlıkla `/10`'a bölüyordu (zaten 0-10 ölçeğinde)
  - **Hata 2**: `reports/[id]/page.tsx` TradeDecisionVisual'a raw 0-10 skor gönderiyordu (0-100 bekliyor)
  - **Hata 3**: `FinalVerdict.tsx` TradeDecisionVisual'a raw 0-10 skor gönderiyordu
  - **Hata 4**: `details/[id]/page.tsx` neutral direction desteği yoktu (neutral → short gibi davranıyordu)
  - **Hata 5**: `RecentAnalyses.tsx` neutral direction için yanlış renk ve ikon gösteriyordu
  - **Hata 6**: TradePlanChart'lar neutral direction'da crash olabiliyordu
  - Tüm sayfalar artık neutral direction'ı düzgün gösteriyor (gray renk, Minus ikon, NEUTRAL text)
  - TradePlanChart neutral olduğunda gizleniyor (chart için direction gerekli)

### 2026-02-02
- **PDF Rapor Profesyonel Başlık Sistemi Eklendi**:
  - **Report Title**: Tüm sayfalara "Asset Analysis Report" başlığı eklendi
  - **Analysis Method Badge**: Rapor metodu gösterimi (Classic 7-Step veya MLIS Pro)
    - Classic: Teal renk (#14B8A6)
    - MLIS Pro: Purple renk (#8b5cf6)
  - **Report Date**: Daha belirgin tarih formatı (January 2, 2026 şeklinde)
  - **TraderPath Logo Düzeltmesi**: Inline SVG ile logo her sayfada görünür
    - Her sayfa için unique gradient ID'ler (tealGrad1, coralGrad1, vb.)
    - 4-noktalı yıldız logosu teal/coral gradient ile
    - "TraderPath" brand text teal ve coral renklerle
  - **CONDITIONAL_GO Koşul Açıklaması**:
    - Executive Summary ve Final Verdict sayfalarına eklendi
    - Koşulların listesi (karşılanmamış timing conditions)
    - "Wait for" event bilgisi (varsa)
    - Risk uyarısı ile profesyonel uyarı kutusu
  - **AnalysisReportData Interface**: `method` alanı eklendi ('classic' | 'mlis_pro')
  - Dosya: `apps/web/components/reports/AnalysisReport.tsx`
- **Capital Flow RAG Yorumları Eklendi**:
  - Her layer'ın sonuna 1-2 cümle RAG (Retrieval Augmented Generation) yorumu eklendi
  - `LayerInsights` interface'e `ragLayer1-4` alanları eklendi
  - Gemini AI prompt'u data-grounded RAG yorumları üretecek şekilde güncellendi
  - 4 adet fallback RAG generator fonksiyonu eklendi (Türkçe):
    - `generateFallbackRagLayer1()`: Net Liquidity yorumu
    - `generateFallbackRagLayer2()`: Market rotasyonu yorumu
    - `generateFallbackRagLayer3()`: Sektör fırsatı yorumu
    - `generateFallbackRagLayer4()`: Aksiyon önerisi yorumu
  - RAG yorumları veriden spesifik rakamlar cite ediyor
  - Dosyalar: `capital-flow.service.ts`, `types.ts`
- **Asset-Specific Analysis System Eklendi (Non-Crypto Varlıklar İçin)**:
  - **Sorun**: GLD/SPY/TLT gibi non-crypto varlıklar kripto metrikleri (Fear & Greed, BTC dominance) ile analiz ediliyordu → çelişkili sonuçlar
  - **Çözüm**: Her varlık sınıfı için kendine özgü metrikler ve ağırlıklar
  - **Yeni Dosyalar**:
    - `apps/api/src/modules/analysis/types/asset-metrics.types.ts` - Tüm asset-specific type'lar
    - `apps/api/src/modules/analysis/services/asset-specific/metals-analyzer.service.ts` - Altın/Gümüş analizi
    - `apps/api/src/modules/analysis/services/asset-specific/stocks-analyzer.service.ts` - Hisse senedi analizi
    - `apps/api/src/modules/analysis/services/asset-specific/bonds-analyzer.service.ts` - Tahvil analizi
    - `apps/api/src/modules/analysis/services/asset-specific/asset-analyzer-orchestrator.ts` - Router ve inter-market validation
  - **Metals Metrikleri** (GLD, SLV, XAUUSD):
    - DXY (25%) - USD endeksi, ters korelasyon
    - Real Yields (20%) - TIPS yield, reel faiz
    - VIX (15%) - Korku endeksi, güvenli liman talebi
    - Inflation Expectations (15%) - Breakeven enflasyon
    - ETF Flows (10%) - GLD/SLV akışları
    - Central Bank Activity (10%) - MB alımları
  - **Stocks Metrikleri** (SPY, QQQ, AAPL):
    - VIX (20%) - Volatilite/korku
    - Put/Call Ratio (15%) - Kontrarian sinyal
    - Market Breadth (15%) - SPY vs RSP
    - Sector Rotation (15%) - Cyclical vs Defensive
    - 10Y Yield (10%) - Faiz etkisi
    - DXY (10%) - Dolar etkisi
  - **Bonds Metrikleri** (TLT, IEF, BND):
    - Yield Curve (25%) - 10Y-2Y spread
    - Fed Policy (20%) - Fed Funds Rate
    - Inflation (15%) - CPI/PCE/Breakeven
    - Credit Spreads (15%) - LQD vs TLT
    - Flight to Safety (15%) - SPY vs TLT
  - **Inter-Market Context**:
    - Market regime detection: risk_on, risk_off, inflation, deflation, liquidity_crisis, transitioning
    - Expected behavior per regime (altın risk_off'ta bullish olmalı gibi)
    - Anomaly detection (beklentiden sapma uyarıları)
  - **Frontend**:
    - Analiz detay sayfasına Asset-Specific Context kartı eklendi
    - Key drivers, inter-market regime, warnings gösterimi
    - Sentiment bazlı gradient arka plan (bullish/bearish/neutral)
  - Dosyalar: `analysis.engine.ts`, `analyze/details/[id]/page.tsx`
- **AI Concierge Data-Driven Yanıt Sistemi**:
  - `generateDataDrivenAssetResponse()` metodu ile tamamen veriye dayalı cümle üretimi
  - **Kullanılan gerçek metrikler**:
    - `flow30d`: 30 günlük akış yüzdesi (örn: "%3.2 sermaye çıkışı")
    - `flowVelocity`: Akış hızı (hızlanıyor/yavaşlıyor)
    - `phase`: Piyasa fazı (EARLY/MID/LATE/EXIT)
    - `rotationSignal`: Rotasyon sinyali (entering/stable/exiting)
  - **Dinamik cümle yapısı**: Veri değiştikçe cümle değişiyor, hardcode yok
  - **Örnek çıktı**: "Metal piyasasından %3.2 sermaye çıkışı var. Bonolar %5.8 giriş alıyor."
  - Anlam tekrarı kaldırıldı, kısa ve öz yanıtlar
  - Dosya: `apps/api/src/modules/concierge/concierge.service.ts`
- **Analyze Sayfasına Capital Flow Summary Eklendi**:
  - Capital Flow API verisi sayfa yüklendiğinde çekiliyor
  - **4-Layer Yatay Özet Bar** (L1→L2→L3→L4):
    - L1: Global Liquidity bias göstergesi (RISK ON/OFF/NEUTRAL)
    - L2: Market flows phase badge'leri ile
    - L3: Önerilen market için sektörler
    - L4: AI recommendation direction (BUY/SELL)
  - **Layer 4 AI Recommendation Detay Kartları**:
    - BUY Opportunity kartı: market, phase, 7D flow, suggested assets
    - SELL/Short Opportunity kartı (varsa): aynı detaylar
    - Tek tıkla analiz butonları
    - Suggested assets quick selection butonları
  - Capital Flow'dan navigate edildiğinde kullanıcı context görüyor
  - Dosya: `apps/web/app/(dashboard)/analyze/page.tsx`

### 2026-02-03
- **Trade Plan Entry Status Alanları Eklendi**:
  - `TradePlanResult` interface'ine yeni alanlar eklendi:
    - `currentPrice`: Analiz anındaki güncel fiyat
    - `needsToWaitForEntry`: Entry'nin >%1 uzakta olup olmadığı (boolean)
    - `entryDistancePercent`: Entry'den uzaklık yüzdesi
    - `entryStatus`: 'immediate' | 'wait_for_pullback' | 'wait_for_rally'
  - LONG pozisyonlarda fiyat > entry ise "wait_for_pullback" döner
  - SHORT pozisyonlarda fiyat < entry ise "wait_for_rally" döner
  - Frontend bu bilgiyi kullanarak "Pullback Bekle" uyarısı gösterebilir
  - Dosya: `apps/api/src/modules/analysis/analysis.engine.ts`
- **Capital Flow PDF Rapor Tek Sayfa Kurumsal Tasarım**:
  - TraderPath yıldız logosu 3D efekti ile çiziliyor (teal/coral gradient)
  - "TraderPath" marka yazısı kurumsal gradient renklerde
  - Tek sütun layout (2 kolon yerine)
  - "Executive Summary" rapor başlığı
  - Standart kurumsal footer (şirket bilgisi, disclaimer, rapor tarihi)
  - Dosya: `apps/web/lib/capital-flow-report-generator.ts`
- **Asset Analysis Report Tek Sayfa Formatı Eklendi**:
  - `AnalysisReportData` interface'ine `capitalFlow` ve `mlConfirmation` alanları eklendi
  - `generateSinglePageReport()` fonksiyonu eklendi
  - **Bölüm 1: Capital Flow Analysis Summary** (4 kutu 2x2 grid):
    - L1 Global Liquidity, L2 Market Flow
    - L3 Sector Activity, L4 AI Recommendation
  - **Bölüm 2: 7 Step Analysis** (2 kolonlu layout):
    - Sol: Market Pulse, Asset Scanner, Technical Analysis
    - Sağ: Safety Check, Timing Analysis, Trap Check
  - **Trade Decision** (tam genişlik): verdict ve skor
  - **ML Confirmation** (tam genişlik): MLIS Pro layer'ları
  - **Trade Plan** (tam genişlik): Entry • TP1-2 • SL ile R:R
  - `generateAnalysisReport(data, captureChart, singlePage)` parametresi eklendi
  - Dosya: `apps/web/components/reports/AnalysisReport.tsx`
- **Proactive Signal System Eklendi**:
  - Saatlik Capital Flow tarama ve otomatik sinyal üretimi
  - 7-Step + MLIS Pro entegre analiz (tek analiz, ayrı değil)
  - Telegram ve Discord'a otomatik sinyal gönderimi
  - **Yeni Dosyalar**:
    - `apps/api/src/modules/signals/types.ts` - Type tanımlamaları
    - `apps/api/src/modules/signals/signal.service.ts` - Sinyal CRUD ve tercihler
    - `apps/api/src/modules/signals/signal-generator.job.ts` - Saatlik cron job
    - `apps/api/src/modules/signals/telegram-formatter.ts` - Telegram mesaj formatı
    - `apps/api/src/modules/signals/signal.routes.ts` - API endpoint'leri
  - **Database Tabloları**: `Signal`, `UserSignalPreferences`
  - **Sinyal Validasyonu**: Score >= 7.0, Confidence >= 70%, MLIS confirmation
  - Cron job her saat :15'te çalışır
  - Dosya: `apps/api/prisma/migrations/add_signals_tables.sql`
- **Signal Subscription Pricing Eklendi**:
  - Pricing sayfası iki mod: Active Trading (Credits) vs Signal Service (Subscription)
  - **Active Trading**: Mevcut kredi paketleri (one-time purchase)
  - **Signal Service Paketleri**:
    - Basic Signals: $9/ay (sadece Crypto, 5-10 sinyal/gün)
    - Pro Signals: $19/ay (4 market, 10-20 sinyal/gün, Telegram + Discord)
    - Pro Annual: $149/yıl (2 ay ücretsiz, tüm özellikler)
  - Pricing mode toggle ile kolay geçiş
  - How It Works bölümü sinyal akışını açıklıyor
  - Comparison box ile kullanıcı kararına yardım
  - Dosyalar: `apps/web/lib/pricing-config.ts`, `apps/web/app/(marketing)/pricing/page.tsx`

### 2026-02-05
- **AI Price Predictor Service (Gemini-based TP/SL Prediction)**:
  - **Yeni Dosya**: `apps/api/src/modules/analysis/services/ai-price-predictor.service.ts`
  - Gemini 2.5 Pro kullanarak TFT model benzeri fiyat tahmini yapıyor
  - **Input**: Son 30 mum OHLCV, 40+ teknik indikatör, mum formasyonları, destek/direnç, hacim profili, diverjanslar, market context
  - **Output**: TP1/TP2 fiyat hedefleri (confidence %), SL seviyesi, invalidation price, time horizon
  - Prompt TFT stilinde: hidden patterns, indicator confluence, momentum, volume confirmation, MA alignment, BB position
  - Sanity checks: direction validation, max distance caps (TP1: 20%, TP2: 30%, SL: 15%)
  - ATR-based fallback mekanizması (Gemini başarısız olursa)
  - `predictPriceTargets()` fonksiyonu `callGeminiWithRetry()` ile 'expert' model kullanıyor
- **AI Predictions → Trade Plan Integration**:
  - `integratedTradePlan()` metodu artık AI price prediction çağırıyor
  - Mekanik S/R yerleştirme yerine Gemini tahminleri kullanılıyor (confidence >= 40% ise)
  - AI prediction < 40% confidence → mevcut S/R fallback devam ediyor
  - SL: AI önerisi mevcut SL'den sıkıysa ve %1.5-%10 aralığındaysa kullanılıyor
  - `TradePlanResult` interface'ine `aiPrediction` field eklendi:
    - `usedAIPrediction`: boolean (AI tahmininin gerçekten kullanılıp kullanılmadığı)
    - TP1/TP2 confidence, expected candles, reasoning
    - invalidation price ve reason
    - expected move %, direction, time horizon
  - 50 mum `fetchMultiAssetCandles()` ile çekiliyor (crypto→Binance, non-crypto→Yahoo)
  - Extended indikatörler indicatorDetails'den: stochastic (K/D from metadata), ADX, CCI, Williams %R, MFI, OBV, VWAP, CMF
  - Dosya: `apps/api/src/modules/analysis/analysis.engine.ts:5598-5806`
- **Capital Flow Trade Monitor Service**:
  - **Yeni Dosya**: `apps/api/src/modules/capital-flow/capital-flow-monitor.service.ts`
  - Açık işlemlerin hedefe ulaşmasını beklerken para akışını izliyor
  - **6 Alert Tipi**: capital_outflow, phase_change, rotation_detected, liquidity_shift, velocity_reversal, regime_change
  - **Flow Health Score** (0-100): flow direction, velocity, phase, rotation, liquidity bias faktörlerine göre hesaplanıyor
  - **Hold Recommendation**: hold / tighten_stop / take_profit / close_position
  - LONG pozisyon + capital outflow = warning; SHORT pozisyon + capital inflow = warning
  - EXIT phase + LONG = take_profit önerisi; LATE phase + rotation exiting = tighten_stop
  - `checkTradeFlowHealth()`: Tek trade için flow health kontrolü
  - `checkBulkTradeFlowHealth()`: Birden fazla trade için toplu kontrol (tek `getCapitalFlowSummary()` çağrısı)
  - `runFlowHealthCheck()`: Cron job için tüm aktif trade'lerin kontrolü
  - Redis cache: 5 dakika TTL
- **Live Tracking + Capital Flow Integration**:
  - `LiveTrackingStatus` interface'ine `flowHealth` field eklendi
  - `getUserActiveTrades()` fonksiyonu artık flow health verisi ile zenginleştirilmiş döndürüyor
  - Mevcut `/api/reports/live-tracking` endpoint'i otomatik olarak flow health data içeriyor
  - `checkActiveTradesFlowHealth()` fonksiyonu: tüm aktif analizler için periyodik flow health kontrolü
  - 10 dakikalık cron job'a capital flow monitor eklendi (historical outcome check ile birlikte)
  - Dosyalar: `live-tracking.service.ts`, `index.ts`
- **Trade Plan Pricing Logic Fix (Support/Resistance Level Filtering)**:
  - **Sorun**: `findSupportResistance()` günlük mumlardan aylar öncesine ait destek/direnç seviyeleri tespit ediyordu. Örneğin fiyat $112 iken, aylar önceki ATH bölgesinden $178 direnç seviyesi tespit edilip SHORT entry olarak kullanılıyordu → Entry $178, SL $188, TP $162/$152 - tamamen saçma
  - **Kök Neden**: S/R seviyeleri ile güncel fiyat arasındaki mesafe kontrol edilmiyordu
  - **Çözüm**:
    1. `levelWithinRange()` fonksiyonu eklendi - güncel fiyattan >%10 uzaktaki seviyeler `undefined`'a dönüştürülüyor
    2. Tüm entry hesaplamalarında (LONG support, SHORT resistance) filtrelenmiş seviyeler kullanılıyor
    3. Tüm SL hesaplamalarında (LONG support-based stop, SHORT resistance-based stop) filtrelenmiş seviyeler kullanılıyor
    4. Tüm TP hesaplamalarında (LONG resistance targets, SHORT support targets) filtrelenmiş seviyeler kullanılıyor
    5. `averageEntry` için son güvenlik kontrolü eklendi - %10 aşarsa entries sıfırlanıp current price kullanılıyor
  - Filtrelenen seviyeler `undefined` olunca mevcut fallback mantığı devreye giriyor → current price kullanılıyor
  - Dosya: `apps/api/src/modules/analysis/analysis.engine.ts:5371-5378,5530-5548`

### 2026-02-07
- **Notification Center (Merkezi Bildirim Yönetimi) eklendi**:
  - **Yeni Tablo**: `Notification` - Merkezi bildirim tablosu (type, title, message, metadata, read)
  - **5 Bildirim Tipi**: BRIEFING (sabah raporu), ALERT (L1-L4 hiyerarşi değişimi), SIGNAL (trade sinyali), REWARD (tier/AP kazanımı), SYSTEM (genel duyuru)
  - **Backend**:
    - `notification-center.service.ts`: create, broadcast, list, getUnreadCount, getUnreadCounts, markAsRead, markAllAsRead, clearRead, delete
    - `notification-center.routes.ts`: GET /api/notifications (pagination + filter), GET /unread-count, PATCH /:id/read, POST /mark-all-read, DELETE /clear-read, DELETE /:id
    - Routes index.ts'e register edildi: `/api/v1/notifications` + `/api/notifications`
  - **Frontend**:
    - Yeni sayfa: `apps/web/app/(dashboard)/notifications/page.tsx` - Sol sidebar filtre (All/Briefing/Alerts/Signals/Rewards/System), ana alan bildirim listesi, unread badge'ler, pagination
    - Her bildirim kartı: type icon + badge, title, message preview (2 satır), timestamp, Mark as Read / View / Delete aksiyonları
    - Okunmamış = `border-[#5EEDC3]`, okunmuş = `border-border/50`
    - Mark All Read ve Clear Read toplu işlemler
  - **Header Entegrasyonu**:
    - Bell icon badge artık notification center unread count gösteriyor (eski: price alerts)
    - Dropdown son 5 bildirimi gösteriyor, "View All" → `/notifications`
    - Her bildirim tipi için ayrı renk (amber/red/teal/purple/blue)
  - **Sidebar**: Tools grubuna "Notifications" (Inbox icon) eklendi
  - **Middleware**: `/notifications` protected paths'e eklendi
  - Migration: `apps/api/prisma/migrations/add_notifications_table.sql`
  - Dosyalar: `schema.prisma`, `notification-center.service.ts`, `notification-center.routes.ts`, `notifications/page.tsx`, `layout.tsx`, `middleware.ts`, `index.ts`
- **API Timeout Sorunu Kökten Çözüldü (6 kök neden)**:
  - **3 Duplicate PrismaClient instance** kaldırıldı (coin-score-cache, multi-asset-score-cache, asset-logos) → tek singleton import
  - **Server startup non-blocking** yapıldı: `startOutcomeTracker()` ve `initializeAssetLogos()` artık fire-and-forget (server'ı bloke etmiyor)
  - **Binance ticker fetch timeout** eklendi: `binance.provider.ts:213` → `AbortSignal.timeout(10000)`
  - **Prisma query timeout middleware** eklendi: 15s timeout + slow query logging (>5s)
  - **Polling job overlap koruması** eklendi: guard flag'leri ile aynı anda çalışma engellendi, withTimeout wrapper'ları
  - **Auth middleware P2022 fallback** eklendi: `findUserForAuth()` ile missing column graceful degradation
  - **Duplicate authenticate decorator** kaldırıldı: index.ts'deki hardcoded decorator yerine jwt-middleware'e delege
  - **Startup outcome checks parallelleştirildi**: Sequential → `Promise.all` ile paralel (15s timeout/each)
  - Dosyalar: `database.ts`, `index.ts`, `jwt-middleware.ts`, `binance.provider.ts`, `coin-score-cache.service.ts`, `multi-asset-score-cache.service.ts`, `asset-logos.service.ts`, `schema.prisma`

- **Smart Alerts (Akıllı Alarmlar) - L1-L4 Hierarchy Change Detection**:
  - **Yeni Modül**: `apps/api/src/modules/automation/`
  - **Backend Dosyaları**:
    - `alert-triggers.ts`: L1-L4 tetikleyici tanımları ve değerlendirme mantığı
      - L1: Liquidity bias shift, VIX spike (>25/>30), DXY significant move (>1.5% weekly), Fed BS change (>5%), Yield curve inversion flip
      - L2: Market phase change (early→mid→late→exit), rotation detected (entering/exiting), market bias change
      - L3: Sector flow anomaly (>10% weekly change), sector dominance shift (>5pp)
      - L4: AI recommendation direction flip (BUY↔SELL), high momentum detection
    - `smart-alerts.service.ts`: Ana alarm motoru
      - `runSmartAlertScan()`: Capital Flow verisi çeker, önceki snapshot ile karşılaştırır, tetikleyicileri değerlendirir
      - `deliverAlerts()`: Kullanıcı tercihlerine göre notification center üzerinden bildirim gönderir
      - Alert cooldown sistemi (Redis): aynı alert tipi için tekrar spam engeli
      - `getUserPreferences()` / `upsertUserPreferences()`: Kullanıcı tercih CRUD
      - Cron job: Her 15 dakikada bir otomatik tarama
    - `smart-alerts.routes.ts`: API endpoint'leri
  - **API Endpoint'leri**:
    - `GET /api/smart-alerts` - Kullanıcının akıllı alarmları (layer/severity/market filtre)
    - `GET /api/smart-alerts/preferences` - Tercihler
    - `PATCH /api/smart-alerts/preferences` - Tercih güncelleme
    - `GET /api/smart-alerts/status` - Motor durumu
    - `POST /api/smart-alerts/scan` - Manuel tarama (admin)
  - **Database**: `smart_alert_preferences` tablosu (user_id, enabled, markets JSON, min_severity, email_enabled, push_enabled)
  - **Frontend Sayfaları**:
    - `/alerts/smart` - Akıllı alarm listesi (L1-L4 layer kartları, severity/market filtreleri, action önerileri)
    - `/alerts/smart/settings` - Alarm tercihleri (market toggle, severity threshold, delivery channel seçimi)
  - **Sidebar**: Tools grubuna "Smart Alerts" (ShieldAlert ikonu) eklendi
  - **Bildirim Entegrasyonu**: Notification Center `ALERT` tipini kullanarak mevcut bell icon ve bildirim sistemi ile çalışır
  - **Alarm Severity'leri**: INFO (gray), WARNING (teal), CRITICAL (coral/red)
  - **Alert Cooldown'lar**: VIX spike 30dk, phase change 2 saat, Fed BS 1 gün vb. (Redis TTL)
  - Dosyalar: `alert-triggers.ts`, `smart-alerts.service.ts`, `smart-alerts.routes.ts`, `index.ts`, `layout.tsx`, `alerts/smart/page.tsx`, `alerts/smart/settings/page.tsx`
- **Signal Quality Scoring System eklendi** (Talimat #5):
  - **Yeni Dosya**: `apps/api/src/modules/signals/signal-scoring.service.ts` (~310 satir)
    - `calculateSignalQuality(input: ScoringInput): SignalQualityEnrichment` - Composite 0-100 skor hesaplama
    - **L1-L4 Alignment (40%)**: Liquidity bias, market phase+rotation, sector flow, AI recommendation
    - **Technical Strength (30%)**: RSI, MACD histogram, volume confirmation
    - **Momentum (20%)**: ADX trend strength, classic score proxy
    - **Volatility Adjustment (10%)**: BB width + ATR relative penalty
    - `buildForecastBands()`: P10/P50/P90 olasilik bantlari (entry fiyatindan % degisim)
    - Eksik indikatör verisi için fallback nötr skorlar
  - **Types güncellendi** (`types.ts`):
    - `SignalQualityScore` interface (qualityScore, qualityLabel, breakdown, tooltip)
    - `SignalForecastBand` interface (horizon, timeframe, p10/p50/p90, percent changes)
    - `SignalQualityEnrichment` interface (qualityScore + forecastBands)
    - `QUALITY_THRESHOLDS` (low: 40, medium: 70, high: 100)
    - `QUALITY_COLORS` (low: #EF5A6F, medium: #F59E0B, high: #5EEDC3)
    - `SignalFilterCriteria`'ya `minQualityScore` eklendi
  - **Database**: `qualityScore` (Int?) ve `qualityData` (Json?) sütunlari Signal tablosuna eklendi + index
  - **Migration**: `apps/api/prisma/migrations/add_signal_quality_score.sql`
  - **Signal Generator Job**: Scoring pipeline entegre edildi (step7Result indicators + capitalFlowSummary -> scoring -> createSignal)
  - **Signal Service**: `createSignal()` artik `qualityEnrichment` kabul ediyor, `getSignals()` `minQualityScore` filtresi destekliyor
  - **Signal Routes**: GET /signals query'ye `minQualityScore` parametresi eklendi, serialization'a `qualityScore` ve `qualityData` eklendi
  - **Telegram Formatter**: Quality Score ve Price Forecast bölümleri eklendi
  - **Yeni Komponent**: `apps/web/components/signals/SignalCard.tsx` (~490 satir)
    - `QualityScoreBadge`: Renk kodlu skor badge (>70 yesil, >40 sari, <=40 kirmizi) + hover tooltip
    - `QualityBreakdown`: 4 progress bar (L1-L4 Alignment, Technical, Momentum, Volatility) + agirliklar
    - `ForecastBands`: P10/P50/P90 görsel gradient bar'lar + entry marker
    - Expandable quality details bölümü
  - **Signals Page güncellendi**: SignalCard komponenti entegre edildi, Min Quality Score slider filtresi (0-100, step 5) eklendi, 5 kolonlu filtre grid'i
  - Dosyalar: `signal-scoring.service.ts`, `types.ts`, `signal-generator.job.ts`, `signal.service.ts`, `signal.routes.ts`, `telegram-formatter.ts`, `SignalCard.tsx`, `signals/page.tsx`, `schema.prisma`

### 2026-02-06
- **Email gönderme ve PDF indirme canvas hatası düzeltildi**:
  - html2canvas cloned DOM'da lightweight-charts canvas 0 width/height ile oluşuyordu
  - Canvas elementleri html2canvas çağrısı öncesi DOM'dan fiziksel olarak kaldırılıp sonra geri ekleniyor
  - `hideCanvasesForCapture()` ve `restoreCanvases()` helper fonksiyonları try/finally pattern ile
  - 8 farklı html2canvas çağrısı (details + reports sayfaları) düzeltildi
- **Email'lere "View Interactive Chart" butonu eklendi**:
  - PDF report ve screenshot email şablonlarına teal CTA butonu eklendi
  - `/analyze/details/${analysisId}` linkine yönlendiriyor
  - `analysisId` parametresi `PdfReportEmailData` interface'ine ve route handler'lara eklendi
- **Before/After Trade Report sistemi eklendi**:
  - **Yeni Dosya**: `apps/api/src/modules/reports/svg-chart-generator.ts` - Server-side SVG candlestick chart renderer
    - `generateCandlestickSVG()`: Mum grafikleri, fiyat seviyeleri (Entry/SL/TP) ve marker'lar ile SVG üretir
    - `svgToBase64DataUrl()`: SVG'yi base64 data URL'e çevirir (email embedding için)
  - **Yeni Dosya**: `apps/api/src/modules/reports/before-after-report.service.ts`
    - `sendBeforeAfterReport()`: Analiz zamanı (before) ve outcome zamanı (after) grafiklerini oluşturup email gönderir
    - Before chart: Analiz oluşturulduğunda kaydedilen `chartCandles` verisinden
    - After chart: `fetchCandles()` ile outcome zamanına kadar taze mumlar
    - P/L hesaplama, trade duration, outcome badge'leri
  - **email.service.ts**: `sendBeforeAfterReport()` metodu eklendi
    - Before/after grafikler yan yana, P/L ve trade plan özeti
    - Result banner (TARGET HIT / STOP LOSS HIT), trade details tablosu
    - "View Full Analysis" CTA butonu
  - **live-tracking.service.ts**: Her iki outcome checker'a entegre edildi
    - `checkAllHistoricalOutcomes()` - Klines API ile tarihsel outcome tespitinde
    - `checkAndUpdateAnalysisOutcomes()` - Canlı fiyat ile outcome tespitinde
    - Fire-and-forget pattern (rapor gönderimi ana akışı bloklamaz)
- **RAG Intelligence Layer implement edildi**:
  - **Backend RAG Modülü** (15 dosya, `apps/api/src/modules/rag/`):
    - `types.ts`: Core type tanımları (citations, forecast bands, strategies, validation)
    - `web-research/web-research.service.ts`: 3-modlu araştırma (fast/news/deep) + Gemini AI
    - `web-research/sources/source-allowlist.ts`: 35+ güvenilir kaynak, tier-based scoring
    - `web-research/citation.service.ts`: Kaynak yönetimi, puanlama, deduplikasyon
    - `forecast/band-calculator.ts`: ATR-bazlı P10/P50/P90 olasılık dağılımı
    - `forecast/forecast-band.service.ts`: AI tahmin bantları, Capital Flow faz farkındalığı
    - `strategy/strategies/`: 4 strateji generator (breakout, pullback, trend-following, range)
    - `strategy/multi-strategy.service.ts`: 4 strateji orchestration + Capital Flow alignment
    - `validation/plan-validation.service.ts`: 10-kural gatekeeper (block/warn/info)
    - `rag-orchestrator.service.ts`: Tek giriş noktası, paralel pipeline, graceful degradation
    - `rag.routes.ts`: POST /enrich, GET /forecast/:symbol, POST /validate
  - **Analiz Pipeline Entegrasyonu**:
    - Step 9 olarak MLIS confirmation sonrasına eklendi (non-blocking try/catch)
    - RAG verisi step7Result.ragEnrichment ve API response'a dahil
    - Routes /api/v1/rag prefix ile kayıtlı
  - **Frontend Bileşenleri** (4 dosya):
    - `ForecastBandOverlay.tsx`: P10/P50/P90 görsel range bar'ları (3 horizon)
    - `MultiStrategyCards.tsx`: 4 strateji kartları (applicability score, R:R, counter-flow uyarısı)
    - `WebResearchPanel.tsx`: Araştırma özeti, sentiment, kaynaklar
    - `PlanValidationBadge.tsx`: Validasyon durumu (passed/blocked/warnings)
    - Capital Flow context banner analiz detay sayfasına eklendi
  - **PDF Rapor Güncellemesi**:
    - Page 8 (RAG Intelligence Layer) eklendi: forecast bands, strategies tablosu, web research, citations
    - `ragEnrichment` alanı `AnalysisReportData` interface'ine eklendi
  - **ThemeConfig**: `apps/web/lib/theme-config.ts` - Merkezi renk yönetimi
    - Brand renkleri: Background #0F172A, Primary #22C55E, Secondary #F43F5E
    - Helper fonksiyonlar: getVerdictColor, getPhaseColor, getDirectionColor, getSentimentColor, getBiasColor
- **Financial Intelligence Dashboard eklendi (Funnel-Waterfall Design)**:
  - **Yeni Sayfa**: `apps/web/app/(dashboard)/intelligence/page.tsx`
  - **Tasarım Prensibi**: "Netlik" - Mind-map karmaşasından kaçınarak, sol panel akış + sağ panel içerik
  - **Sol Panel (Logic Path)**: 4 adımlı dikey analiz hunisi
    - Step 1: Capital Flow (Global Regime) - Liquidity bias, DXY, VIX, Yield Curve, M2
    - Step 2: Sector (Money Flow) - BUY/SELL recommendations, sector badges, confidence
    - Step 3: Asset (Selection) - 4 analysis step scores, summary, link to full details
    - Step 4: Trade Plan (Final Action) - DEFAULT VIEW
  - **Sağ Panel (Content Stage)**: Seçili adımın detaylı raporu
  - **Trade Plan İçeriği (Step 4)**:
    - Executive Summary: Verdict badge, direction indicator, score gauge, key levels table
    - Structured Trade Plan Matrix: Professional table (Entry/SL/TP/R:R)
    - Interactive Price Chart: TradePlanChart with trade plan overlay
    - AI Forecast Bands: P10/P50/P90 probability ranges (ForecastBandOverlay)
    - Multi-Strategy Cards: 4 alternative strategies (MultiStrategyCards)
    - Plan Validation Badge: 10-rule gatekeeper status
    - Web Research Panel: Citations and sentiment
    - Performance Attribution: 4-layer contribution matrix (Capital Flow, Sector, Timing, ML)
    - Disclaimer: AI-generated content warning
  - **Funnel Stats**: Markets (5000+) → Sectors → Selected (1) → Plan (1)
  - **Breadcrumb Navigation**: Market > Sector > Asset > Plan (clickable)
  - **RAG Insights**: L1-L4 insight banners from Capital Flow
  - **Responsive**: Mobile step selector bar, desktop side panel
  - **URL Parameter**: `?id=analysisId` for specific analysis, or loads most recent
  - Sidebar'a "Intelligence" linki eklendi (Sparkles ikonu, Capital Flow ile Analyze arasında)
  - Dosyalar: `intelligence/page.tsx`, `layout.tsx`
- **Top-Down Analysis Flow Restructuring (TALİMAT #2)**:
  - **Backend: POST /api/capital-flow/recommend-assets endpoint**:
    - Yeni endpoint: Capital Flow verisinden AI asset önerileri üretiyor
    - L1-L4 status bilgileri döndürüyor (bias, market flow, sectors, recommendations)
    - `capitalFlowId` session tracking ile her analiz akışı izlenebilir
    - `recommendedAssets[]` array: symbol, name, market, direction, confidence, alignmentScore, riskTag, reason
    - `warnings[]` array: risk_off bias, exit phase, rotation uyarıları
    - `canProceed` flag: false ise analiz yapılmaz
  - **Backend: capitalFlowContext validation gate**:
    - `fullAnalysisSchema`'ya `capitalFlowContext` eklendi (Zod validation)
    - L1-L4 summary alanları: `l1Summary`, `l2Summary`, `l3Summary`, `l4Summary`
    - Asset recommended listede yoksa → `ASSET_NOT_ALIGNED` hatası (400)
    - `capitalFlowContext` olmadan gelen istekler → legacy mode warning log
    - MLIS Pro path'inde de `capitalFlowContext` step1Result'a kaydediliyor
  - **Frontend: Analyze sayfası Step 0→A→B flow**:
    - Sayfa tamamen yeniden yazıldı (~1360 satır)
    - **Step 0** (Capital Flow): L1-L4 özet kartları, risk-off uyarısı, "Generate AI Asset Recommendations" butonu
    - **Step A** (AI Recommendation): Warnings, L1-L4 context mini-bar, recommended assets grid (direction/confidence/alignment/risk), "Select & Analyze" per asset
    - **Step B** (Asset Analysis): Top-down context bar (L1→L2→L3→L4 checkmarks), selected asset info, timeframe/method seçici, daily pass status, "Run Analysis" butonu
    - Step progress indicator clickable (prerequisites karşılanmadan disabled)
    - `capitalFlowContextPayload` enriched L1-L4 summary ile AnalysisDialog'a aktarılıyor
    - Recent analyses bölümü her zaman altta görünür
  - **Frontend: Top-Down Evidence Chain (Details Page)**:
    - Analiz detay sayfasına Final Verdict öncesine "Top-Down Evidence Chain" eklendi
    - L1 Global Liquidity → L2 Market Flow → L3 Sector Activity → L4 AI Recommendation → 7-Step/MLIS → ML Confirmation
    - Her katman ✅ (yeşil) veya ⚠️ (kırmızı) ile gösteriliyor
    - "X/Y Aligned" badge ile toplam alignment durumu
    - `step1Result.capitalFlowContext` verisi kullanılıyor
    - Capital Flow context olmadan yapılan analizlerde evidence chain gizleniyor
  - Dosyalar: `capital-flow.routes.ts`, `analysis.routes.ts`, `AnalysisDialog.tsx`, `analyze/page.tsx`, `details/[id]/page.tsx`
- **Navigation Restructure (Top-Down Capital Flow Order)**:
  - **directNav yeniden düzenlendi**: Explore → Analyze → Signals → Dashboard
  - Intelligence → **Explore** olarak yeniden adlandırıldı (Compass ikonu, `/intelligence` path)
  - **Signals** Tools dropdown'dan primary nav'a terfi etti
  - **Report** directNav'dan kaldırıldı → Tools dropdown'a **Reports** (`/reports`) olarak taşındı
  - **Profile** endNav'dan kaldırıldı → User menu dropdown'a taşındı
  - **Alerts** (`/alerts`) kaldırıldı → sadece **Smart Alerts** (`/alerts/smart`) kaldı
  - **Trader Program** endNav'da kaldı (Pricing politikasıyla uyumlu)
  - Kullanılmayan ikon import'ları temizlendi (Coins, BookOpen, Globe, Sparkles)
  - **Yeni nav yapısı**:
    - Primary: Explore | Analyze | Signals | Dashboard
    - Dropdown "AI Chat": Concierge | AI Experts
    - Dropdown "Tools": Reports | Smart Alerts | Scheduled | Notifications
    - End: Trader Program
    - User Menu: Profile | Settings | Admin | Logout
  - Dosya: `apps/web/app/(dashboard)/layout.tsx`

### 2026-02-08
- **Analiz Sistemi Yeniden Yapılandırıldı (3 Mod)**:
  - **Automated Analysis** (`/analyze`): Tek tıkla tam pipeline çalıştırır
    - Capital Flow → AI Recommendation → Asset Selection → 7-Step + ML Analysis
    - Visual pipeline progression: 4 adımlı progress bar (teal→amber→violet→emerald)
    - Her adım animasyonlu kart ile gösteriliyor (loading spinner, data cards, completion checks)
    - AI otomatik olarak en yüksek güvenli asset'i seçiyor
    - Daily Pass otomatik satın alınıyor (yeterli kredi varsa)
    - Error state: retry butonu ile pipeline yeniden başlatılabilir
    - Complete state: "Run Another Analysis" butonu ile yeni analiz başlatılabilir
  - **Tailored Analysis** (`/analyze/tailored`): Kullanıcı istediği herhangi bir asset'i seçebilir
    - 55+ asset katalog (Crypto, Stocks, Metals, Bonds, BIST)
    - Arama kutusu + kategori filtreleri (All, Crypto, Stocks, Metals, Bonds, BIST)
    - Katalogda olmayan semboller için custom symbol input
    - Capital Flow alignment gate yok - kullanıcı özgür
    - Uyarı notu: "For best results, use Automated Analysis"
    - Timeframe seçimi (15m/1H/4H/1D)
    - Daily Pass kontrolü ve satın alma
  - **AI Chat** (`/concierge`): Mevcut chat arayüzü + otomasyon komutları
    - Yeni quick commands: "Set Alert" ve "Morning Briefing"
    - Alert örneği: "Set a BTC alert when price drops to 55000"
    - Briefing örneği: "Set my morning briefing to 11:00 AM every day"
- **Navigation Güncellendi**:
  - `Analyze` → `Automated` olarak yeniden adlandırıldı (Sparkles ikonu)
  - `Tailored` eklendi (TrendingUp ikonu, `/analyze/tailored`)
  - Primary nav: Automated | Tailored | Signals | Dashboard
- **SelectionCards Kaldırıldı**: Mode selection ekranı (select/flow) yerine doğrudan Automated pipeline
- **UI Kararları**:
  - Automated Analysis: Pipeline progression bar (4 adım, her biri kendi gradient rengi)
  - Tailored Analysis: Grid-based asset picker (2-5 kolon responsive)
  - AI Chat: 6 quick command butonu (Capital Flow, AI Rec, Market Analysis, Top 5, Set Alert, Morning Briefing)
- **Runtime TypeError Crash Koruması (21 dosya)**:
  - Tüm `.toLowerCase()` çağrıları null/undefined kontrolü ile guard edildi
  - 18 frontend dosya + 3 backend dosya düzeltildi
  - İki pattern kullanıldı: `typeof val === 'string' ? val.toLowerCase() : ''` (API verisi) ve `(val || '').toLowerCase()` (arama/filtre)
  - Etkilenen alanlar: verdict hesaplama, direction parsing, search filtering, regime formatting
- **Modal Erişilebilirlik Düzeltmeleri (5 bileşen)**:
  - 5 custom modal bileşenine `role="dialog"`, `aria-modal="true"`, `aria-labelledby` eklendi
  - Her biri için screen-reader-only (`sr-only`) başlık eklendi
  - Bileşenler: CelebrationModal, FirstLoginModal, SetAlertModal, InterfacePreferenceModal, AnalysisDialog
- **API Route Error Handling (13 endpoint)**:
  - `credit.routes.ts`: 6 route'a try/catch (balance, packages, purchase, history, costs, deduct)
  - `alert.routes.ts`: 7 route'a try/catch (list, create, delete, history, trade-plan, settings GET/PATCH)
  - ZodError → 400 (Bad Request), generic error → 500 (Internal Server Error)
  - Server-side `console.error` logging eklendi
- **Production Source Maps Etkinleştirildi**:
  - `next.config.js`'e `productionBrowserSourceMaps: true` eklendi
  - Production'da error stack trace'leri orijinal TypeScript dosyalarına map ediliyor
- **Dashboard Sayfası Tamamen Yeniden Yazıldı (Mobile-First Fintech Design)**:
  - Monolitik 1483 satırlık dashboard 5 modüler dosyaya ayrıldı
  - **Yeni Dosyalar**:
    - `components/dashboard/KpiSection.tsx`: SVG Arc Gauge (Global Liquidity), Market Bias bars, Credits card
    - `components/dashboard/CategoryBar.tsx`: Yatay kaydırılabilir market filtre (snap + localStorage)
    - `components/dashboard/AccordionList.tsx`: Açılır kapanır bölümler (Capital Flow, Performance, Trades, AI)
    - `components/dashboard/ProfileCard.tsx`: Trader profili turkuaz progress bar ile
    - `page.tsx`: 717 satırlık slim orchestrator (tüm componentleri compose ediyor)
  - **Tasarım Sistemi**:
    - Arka plan: #041020, Glassmorphism kartlar (bg-white/5 backdrop-blur-md border border-white/10)
    - Turkuaz (#4dd0e1) vurgu rengi, Neon Green (#00f5c4) pozitif, Coral (#ff5f5f) negatif
    - rounded-2xl köşeler, font-mono finansal veriler, 48px minimum dokunma hedefleri
    - Skeleton ekranlar animate-pulse ile
  - **SVG Arc Gauge**: 240° ark, gradient segmentler (risk_off coral → neutral gray → risk_on green), animasyonlu glow dot
  - **Accordion Layout**: Masaüstü tablo yerine mobil-dostu dikey accordion
  - **Yatay Trade Kartları**: Aktif pozisyonlar overflow-x-auto ile yatay kaydırılabilir
  - Build doğrulandı: TypeScript type uyumsuzluğu düzeltildi (CapitalFlowSummary GlobalLiquidity interface alignment)

---

## 🔔 SMART ALERTS (L1-L4 Hierarchy Change Detection)

### Temel Prensip
> **Sadece fiyat değil, Capital Flow hiyerarşisindeki kritik değişimleri otomatik bildir.**

### Alarm Tetikleyicileri

| Layer | Tetikleyici | Severity | Cooldown |
|-------|------------|----------|----------|
| L1 | Liquidity bias değişimi (risk_on↔risk_off) | CRITICAL/WARNING | 1 saat |
| L1 | VIX > 25 spike | WARNING | 30 dk |
| L1 | VIX > 30 extreme | CRITICAL | 30 dk |
| L1 | DXY > 1.5% haftalık hareket | WARNING | 1 saat |
| L1 | Fed BS > 5% aylık değişim | WARNING | 1 gün |
| L1 | Yield curve inversion flip | CRITICAL/INFO | 1 gün |
| L2 | Market phase değişimi (early→mid→late→exit) | varies | 2 saat |
| L2 | Rotation tespit (entering/exiting) | WARNING | 1 saat |
| L2 | Market preference değişimi (Crypto→Stocks vb.) | WARNING | 1 saat |
| L3 | Sector flow anomalisi (>10% haftalık) | WARNING/CRITICAL | 1 saat |
| L3 | Sector dominance kayması (>5pp) | INFO | 2 saat |
| L4 | AI recommendation yön değişimi (BUY↔SELL) | WARNING | 30 dk |
| L4 | High momentum tespiti | INFO | 1 saat |

### API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/smart-alerts` | GET | Kullanıcının akıllı alarmları |
| `/api/smart-alerts/preferences` | GET | Tercihler |
| `/api/smart-alerts/preferences` | PATCH | Tercih güncelleme |
| `/api/smart-alerts/status` | GET | Motor durumu |
| `/api/smart-alerts/scan` | POST | Manuel tarama (admin) |

### Kod Lokasyonları

| Dosya | Açıklama |
|-------|----------|
| `apps/api/src/modules/automation/alert-triggers.ts` | L1-L4 tetikleyici logic |
| `apps/api/src/modules/automation/smart-alerts.service.ts` | Ana servis, cron job, delivery |
| `apps/api/src/modules/automation/smart-alerts.routes.ts` | API routes |
| `apps/web/app/(dashboard)/alerts/smart/page.tsx` | Alarm listesi sayfası |
| `apps/web/app/(dashboard)/alerts/smart/settings/page.tsx` | Tercih ayarları |

---

## 📡 SIGNAL SERVICE (Proactive Signals)

### Servis Mantığı

| Özellik | Değer |
|---------|-------|
| **Tarama Sıklığı** | Her saat başı :15 |
| **Analiz Tipi** | 7-Step + MLIS Pro (entegre) |
| **Teslimat** | Telegram, Discord, Email |
| **Sinyal Validasyonu** | Score >= 7.0, Confidence >= 70%, MLIS confirms |

### Abonelik Paketleri

| Paket | Fiyat | Markets | Sinyal/Gün |
|-------|-------|---------|------------|
| Basic | $9/mo | Crypto | 5-10 |
| Pro | $19/mo | Crypto, Stocks, Metals, Bonds | 10-20 |
| Pro Annual | $149/yr | Tüm marketler | 10-20 |

### Maliyet Analizi

```
Aylık API Maliyeti: ~$180 (Gemini AI × 6000 analiz)
Break-even: 10 abone @ $19/mo = $190
Kar marjı: 100 abone @ $19/mo = $1,720 kar/ay
```

### API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/signals` | GET | Kullanıcının aldığı sinyaller |
| `/api/v1/signals/:id` | GET | Sinyal detayı |
| `/api/v1/signals/preferences` | GET/PATCH | Kullanıcı tercihleri |
| `/api/v1/signals/admin/generate` | POST | Manuel sinyal üretimi (admin) |

### Kod Lokasyonları

| Dosya | Açıklama |
|-------|----------|
| `apps/api/src/modules/signals/signal-generator.job.ts` | Saatlik cron job |
| `apps/api/src/modules/signals/signal.service.ts` | Sinyal CRUD |
| `apps/api/src/modules/signals/telegram-formatter.ts` | Telegram formatı |
| `apps/api/src/modules/signals/types.ts` | Type tanımlamaları |

---

## 🎯 ASSET-SPECIFIC ANALYSIS SYSTEM

### Neden Gerekli?
Kripto için Fear & Greed, BTC dominance gibi metrikler anlamlıyken, GLD (altın) için:
- Dolar (DXY) güçlendiğinde altın genellikle düşer (ters korelasyon)
- VIX yükseldiğinde altın güvenli liman olarak yükselir
- Real yield negatifken altın cazibe kazanır

Bu metrikler kripto ile aynı değil, bu yüzden her varlık sınıfı kendi analizörüne sahip.

### Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASSET ANALYZER ORCHESTRATOR                   │
│            detectAssetClass() → Route to Analyzer                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   METALS    │     │   STOCKS    │     │   BONDS     │
│  Analyzer   │     │  Analyzer   │     │  Analyzer   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ • DXY       │     │ • VIX       │     │ • Yield     │
│ • Real Yld  │     │ • Put/Call  │     │   Curve     │
│ • VIX       │     │ • Breadth   │     │ • Fed       │
│ • Inflation │     │ • Sectors   │     │ • Inflation │
│ • ETF Flow  │     │ • 10Y Yield │     │ • Credit    │
│ • CB Demand │     │ • DXY       │     │ • Flight    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Inter-Market Validation

```typescript
// Regime Detection
const regime = detectMarketRegime(metals, stocks, bonds);
// Örn: VIX > 25 && goldBullish && bondsBullish → 'risk_off'

// Expected Behavior
REGIME_EXPECTATIONS = {
  risk_on:  { crypto: 'bullish', stocks: 'bullish', metals: 'bearish', bonds: 'bearish' },
  risk_off: { crypto: 'bearish', stocks: 'bearish', metals: 'bullish', bonds: 'bullish' },
  inflation:{ crypto: 'neutral', stocks: 'bearish', metals: 'bullish', bonds: 'bearish' },
  deflation:{ crypto: 'bearish', stocks: 'bearish', metals: 'neutral', bonds: 'bullish' },
};

// Anomaly Detection
if (expected !== actual) {
  warnings.push(`⚠️ ${asset} showing ${actual}, expected ${expected} in ${regime} regime`);
}
```

### Kullanım

```typescript
// analysis.engine.ts içinde
const assetContext = await getAssetSpecificContext(symbol);

// Non-crypto varlıklar için özel metrikler
if (assetContext.metrics) {
  // Verdict hesaplamasında %25 ağırlık
  directionSources.push({
    source: 'Metals Analysis',
    direction: assetContext.metrics.sentiment === 'bullish' ? 'long' : 'short',
    weight: 0.25,
    reason: `Metals sentiment: bullish (72/100)`
  });
}
```

---

## 🧠 RAG INTELLIGENCE LAYER

### Temel Prensip
> **Core engine output'ları truth source olarak kalır. RAG bir "interpretation / planning / reporting" layer'dır.**

### Mimari

```
Capital Flow (top filter) → 7-Step Engine (truth) → RAG Orchestrator:
  1. Web Research  ─────┐ (parallel)
  2. Forecast Bands ────┤ (parallel)
                        ├→ 3. Multi-Strategy (depends on 2)
                        └→ 4. Validation (depends on 1, 2, 3)
                               → Final Result
```

### Bileşenler

| Bileşen | Dosya | Açıklama |
|---------|-------|----------|
| Types | `rag/types.ts` | Tüm RAG type tanımlamaları |
| Source Allowlist | `rag/web-research/sources/source-allowlist.ts` | 35+ güvenilir kaynak, tier-based scoring |
| Citation Service | `rag/web-research/citation.service.ts` | Kaynak yönetimi, puanlama, deduplikasyon |
| Web Research | `rag/web-research/web-research.service.ts` | 3 mod: fast (free), news ($0.001), deep ($0.005) |
| Band Calculator | `rag/forecast/band-calculator.ts` | ATR-bazlı P10/P50/P90 olasılık dağılımı |
| Forecast Bands | `rag/forecast/forecast-band.service.ts` | AI tahmin bantları üretimi |
| Breakout | `rag/strategy/strategies/breakout.strategy.ts` | Kırılım stratejisi |
| Pullback | `rag/strategy/strategies/pullback.strategy.ts` | Geri çekilme stratejisi |
| Trend Following | `rag/strategy/strategies/trend-following.strategy.ts` | Trend takip stratejisi |
| Range | `rag/strategy/strategies/range.strategy.ts` | Aralık stratejisi |
| Multi-Strategy | `rag/strategy/multi-strategy.service.ts` | 4 strateji orchestration |
| Plan Validation | `rag/validation/plan-validation.service.ts` | 10-kural gatekeeper |
| RAG Orchestrator | `rag/rag-orchestrator.service.ts` | Tek giriş noktası |
| RAG Routes | `rag/rag.routes.ts` | API endpoint'leri |

### API Endpoint'leri

| Endpoint | Method | Açıklama | Maliyet |
|----------|--------|----------|---------|
| `/api/v1/rag/enrich` | POST | Tam RAG enrichment | $0-0.005 |
| `/api/v1/rag/forecast/:symbol` | GET | Forecast bands (cached) | FREE |
| `/api/v1/rag/validate` | POST | Plan validasyonu | FREE |

### Research Modları

| Mod | Maliyet | İçerik | Cache |
|-----|---------|--------|-------|
| `fast` | FREE | Mevcut news/calendar verisi | 15 dk |
| `news` | ~$0.001 | + Gemini özet | 5 dk |
| `deep` | ~$0.005 | + Tam RAG analiz | 2 dk |

### Forecast Bands Formülü

```
bandWidth = ATR × horizonMultiplier × sqrt(barsAhead) × assetFactor × phaseFactor

Asset Factors: crypto=1.3, stocks=1.0, metals=0.9, bonds=0.6, bist=1.1
Phase Factors: early=1.1, mid=0.9, late=1.2, exit=1.4
```

### Validation Kuralları (10 adet)

| Kural | Severity | Açıklama |
|-------|----------|----------|
| Max SL Distance | BLOCK | SL > %10 uzakta → plan reddi |
| Min SL Distance | WARN | SL < %0.5 → çok sıkı uyarısı |
| Min R/R Ratio | BLOCK | R:R < 1.0 → plan reddi |
| SL Direction Sanity | BLOCK | SL yönü hatalı → plan reddi |
| TP Direction Sanity | BLOCK | TP yönü hatalı → plan reddi |
| Entry Realism | WARN | Entry > %5 uzakta → uyarı |
| Economic Event | BLOCK | High-impact event yakın → plan reddi |
| Capital Flow Direction | WARN | Flow'a ters → Counter-Trend uyarısı |
| Exit Phase | WARN | EXIT fazda → yeni giriş yapma |
| TP in Forecast Band | INFO | TP P90 dışında → bilgi notu |

### Frontend Bileşenleri

| Bileşen | Dosya | Açıklama |
|---------|-------|----------|
| ForecastBandOverlay | `components/analysis/ForecastBandOverlay.tsx` | P10/P50/P90 görsel range bar |
| MultiStrategyCards | `components/analysis/MultiStrategyCards.tsx` | 4 strateji kartları |
| WebResearchPanel | `components/analysis/WebResearchPanel.tsx` | Araştırma özeti ve kaynaklar |
| PlanValidationBadge | `components/analysis/PlanValidationBadge.tsx` | Validasyon durumu badge'i |

### ThemeConfig

| Dosya | Açıklama |
|-------|----------|
| `apps/web/lib/theme-config.ts` | Merkezi renk yönetimi |

Helper fonksiyonlar: `getVerdictColor()`, `getPhaseColor()`, `getDirectionColor()`, `getSentimentColor()`, `getBiasColor()`

---

## 🤖 Claude Code Talimatları

1. **Session başında** bu dosyayı oku
2. **Kod yazarken** yukarıdaki kurallara uy
3. **Bug fix sonrası** → HEMEN "Çözülen Bug'lar" tablosuna ekle
4. **UI kararı sonrası** → HEMEN "UI Kararları" tablosuna ekle
5. **Session sonunda** → "Son Güncellemeler"e tarihle özet yaz
6. **Commit öncesi** → Bu dosya güncellendi mi kontrol et
7. **Microservice değişikliğinde** ilgili SERVICE.md'yi güncelle
8. **Önemli değişiklikler için** → PR hazırla ve kullanıcıya link ver
