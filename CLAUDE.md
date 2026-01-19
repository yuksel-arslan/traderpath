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

### Veri Kullanım Kuralları
- Her analiz için OHLCV + Order Book + Tokenomics + News verileri çekilmeli
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
| 2026-01-19 | Gemini API rate limit (429) hatası - AI Expert failed | Exponential backoff ile retry logic eklendi. API'den gelen retryDelay parse edilip kullanılıyor. Max 3 retry, 60s cap | `apps/api/src/core/gemini.ts`, `ai-expert.service.ts`, `translation.service.ts` |

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
- Exponential backoff ile max 3 retry, API'den gelen retryDelay parse edilip kullanılıyor
- AI Expert service ve Translation service güncellendi
- **Analiz Orchestration dokümantasyonu eklendi**: Her analiz için 3 AI Expert, 2 Download, 2 Email hakkı + otomatik özet email
- **Trade Type Completion Bonus eklendi**: Scalping +3, Day Trade +2, Swing Trade +1 kredi otomatik bonus

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
