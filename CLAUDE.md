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
Analiz Başlatılır (15 kredi)
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
  - Frekans seçenekleri: Günlük, Haftalık, Aylık
  - Teslimat kanalları: Email, Telegram, Discord
  - Her analiz 10 kredi (normal 15 yerine - %33 indirim)
  - Ücretsiz kullanıcılar max 3 aktif schedule kurabilir
  - node-cron ile saatlik kontrol çalışıyor
  - Sidebar'a "Scheduled" linki eklendi (Calendar ikonu)

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
