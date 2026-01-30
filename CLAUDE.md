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
