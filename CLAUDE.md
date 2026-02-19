# CLAUDE.md - TraderPath.io Project Intelligence

## ⛔ ZORUNLU KURALLAR (ATLANAMAZ)

> 📁 **Bug geçmişi ve session güncellemeleri ayrı dosyada tutulur:**
> **`CLAUDE-HISTORY.md`** (`.gitignore`'da — repoya push edilmez)

### Her Commit Öncesi:
1. Bu dosyayı kontrol et
2. Yaptığın değişiklik bir fix ise → `CLAUDE-HISTORY.md` içindeki "Çözülen Bug'lar" tablosuna HEMEN ekle
3. Eklemeden commit YAPMA

### Her Session Sonunda:
1. `CLAUDE-HISTORY.md` içindeki "Son Güncellemeler"e bugünün tarihiyle özet yaz
2. Yazmadan session'ı KAPATMA

> ⚠️ Bu kuralları asla atlama.

---

## 🔴 Kritik Kurallar (Asla İhlal Etme)

### UI/UX
- Button container'larda `grid` kullan, `flex` değil (alignment sorunu)
- Dark/light mode: Tailwind `dark:` prefix kullan, CSS variable değil
- Font: Inter veya Geist Sans (Google Fonts'tan)
- Mobile-first yaklaşım: `sm:`, `md:`, `lg:` sırasıyla

### 🎨 TASARIM SİSTEMİ: Railway/Linear Minimal (ZORUNLU)

> **Referans**: Railway Project Settings sayfası tarzı — sade, temiz, profesyonel SaaS.
> **Felsefe**: "Az çoktur." Dekoratif elementler yerine içerik ön planda.

#### Arka Plan & Renkler
- **Arka plan**: `bg-white dark:bg-[#0A0A0A]` — saf beyaz/siyah, gradient yok
- **Kart arka planı**: `bg-white dark:bg-[#111111]` — şeffaflık/glassmorphism YOK
- **Border**: `border border-gray-200 dark:border-gray-800` — ince, subtle
- **Accent renk**: Tek bir vurgu rengi: `teal-500` (#14B8A6) — sadece CTA butonlar ve aktif state
- **Metin**: `text-gray-900 dark:text-gray-100` (başlık), `text-gray-600 dark:text-gray-400` (açıklama)
- **Negatif**: `text-red-500`, **Pozitif**: `text-green-500` — sadece veri gösteriminde

#### Tipografi
- **Font**: `font-sans` (Inter) — tüm sayfada tek font
- **Başlık**: `text-2xl font-semibold` — büyük, bold değil semibold
- **Alt başlık**: `text-sm text-gray-500` — küçük, soluk
- **Veri/Sayı**: `font-mono` — sadece fiyat, skor gibi numerik değerlerde
- **Label**: `text-sm font-medium text-gray-700 dark:text-gray-300`

#### Layout
- **Max genişlik**: `max-w-4xl mx-auto` — içerik dar ve ortalı
- **Spacing**: `space-y-8` bölümler arası, `space-y-4` bölüm içi
- **Padding**: `p-6` kart içi, `py-8 px-4 sm:px-6` sayfa kenar boşlukları
- **Kart border radius**: `rounded-lg` — `rounded-2xl` değil, `rounded-xl` değil

#### Kaldırılacaklar (YASAK)
- ❌ Gradient orbs (arka plan küreleri)
- ❌ Grain/noise texture overlay
- ❌ Glassmorphism (backdrop-blur, bg-white/5)
- ❌ Neon glow efektleri
- ❌ Marquee/kayan yazı
- ❌ Kinetic typography
- ❌ Animasyonlu gradient text (başlıklar düz renk olacak)
- ❌ `bg-white/5`, `bg-white/10` — şeffaf arka planlar
- ❌ `backdrop-blur-md`, `backdrop-blur-xl`
- ❌ `shadow-xl`, `shadow-2xl` — maksimum `shadow-sm`
- ❌ Pulse/ping/bounce animasyonları (loading spinner hariç)

#### İzin Verilenler
- ✅ Hover'da subtle border renk değişimi: `hover:border-gray-300`
- ✅ Transition: `transition-colors duration-150`
- ✅ Loading spinner: `animate-spin`
- ✅ `shadow-sm` — sadece dropdown/modal'larda
- ✅ Accent renk CTA butonlarında: `bg-teal-500 hover:bg-teal-600 text-white`
- ✅ Divider: `border-t border-gray-200 dark:border-gray-800`
- ✅ Badge: `text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600`

#### Kart Yapısı (Standart)
```html
<div class="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-[#111111]">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Başlık</h3>
  <p class="text-sm text-gray-500 mt-1">Açıklama</p>
  <!-- İçerik -->
</div>
```

#### Buton Stilleri
```html
<!-- Primary CTA -->
<button class="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
  Update
</button>
<!-- Secondary -->
<button class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
  Cancel
</button>
```

#### Input Stilleri
```html
<input class="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-[#111111] text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors" />
```

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

1. **Session başında** bu dosyayı oku, ardından `CLAUDE-HISTORY.md` dosyasını oku
2. **Kod yazarken** yukarıdaki kurallara uy
3. **Bug fix sonrası** → `CLAUDE-HISTORY.md` içindeki "Çözülen Bug'lar" tablosuna HEMEN ekle
4. **UI kararı sonrası** → `CLAUDE-HISTORY.md` içindeki "UI Kararları" tablosuna HEMEN ekle
5. **Session sonunda** → `CLAUDE-HISTORY.md` içindeki "Son Güncellemeler"e tarihle özet yaz
6. **Commit öncesi** → `CLAUDE-HISTORY.md` güncellendi mi kontrol et (bu dosya repoya gitmez, commit etme)
7. **Microservice değişikliğinde** ilgili SERVICE.md'yi güncelle
8. **Önemli değişiklikler için** → PR hazırla ve kullanıcıya link ver
