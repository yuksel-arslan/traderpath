# CLAUDE.md - TraderPath.io Project Intelligence

## ⛔ ZORUNLU KURALLAR (ATLANAMAZ)

### Her Commit Öncesi:
1. Bu dosyayı kontrol et
2. Kurallara uygunluğu doğrula

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
- **Report tablosu**: Kullanıcı raporları (Snapshot PNG olarak Telegram/Discord'a gönderim)
- **TÜM ANALİZ İSTATİSTİKLERİ → Analysis tablosundan** (platform-stats, statistics vb.)
- Report tablosu analiz istatistikleri için KULLANILMAZ
- Platform accuracy = TP hits / (TP hits + SL hits) from Analysis.outcome
- **Asla karıştırma!** Report, Analysis'in sonucudur, istatistik kaynağı değil

### Analiz ve Rapor Kuralları (ZORUNLU)
- **Analiz çok detaylı yapılacak**: Tüm 40+ enstrüman/indikatör kullanılacak
- **Sadece 2 rapor tipi var** (başka tip ekleme!):

| Rapor Tipi | İçerik | Format |
|------------|--------|--------|
| **Executive Summary** | 7 aşama sonucu + işlem planı (kısa, öz) | 3-4 Snapshot PNG |
| **Detailed Analysis Report** | Her türlü detay, tüm indikatör grafikleri | 6-8 Snapshot PNG |

- Executive Summary: Hızlı karar için özet
- Detailed Analysis Report: Derinlemesine inceleme için tam detay
- **Format: Snapshot PNG** (Puppeteer screenshot, pixel-perfect Chrome rendering)
- **Dağıtım: Telegram + Discord** (inline görünüm, indirme gerektirmez)
- **PDF KULLANILMAZ** — satır kayması ve font sorunları nedeniyle kaldırıldı

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
| AI Expert Sohbet | 5 | 5 soru/analiz (Analysis Subscription dahil) | Abonelik gerekli | `Analysis.aiExpertQuestionsUsed` |
| Snapshot Rapor | Otomatik | Sınırsız | $0 | Telegram/Discord'a otomatik gönderim |

> **Not:** Raporlar Snapshot PNG olarak Telegram ve Discord'a otomatik gönderilir (inline görünüm, indirme gerektirmez). PDF kaldırıldı. İşlem sonuçları (TP/SL hit) Telegram/Discord ile bildirilir. Auth emailleri (doğrulama, şifre sıfırlama) için Resend Free Tier kullanılır.

### Haftalık Abonelik Planları (YENİ)

| Plan | Fiyat | Kota | İçerik |
|------|-------|------|--------|
| **Intelligent Report Subscription** | $13.99/hafta | 7 rapor/hafta (1/gün) | Executive Summary veya Detailed Analysis, Snapshot PNG, Telegram+Discord delivery |
| **Capital Flow & Asset Analysis Subscription** | $13.99/hafta | 7 analiz/hafta | Full analiz + 5 AI Expert soru/analiz, AI Concierge/Auto/Tailored |

> **Not:** Planlar birbirinden bağımsızdır — kullanıcı birini seçer. Kota her hafta yenilenir. 3 ücretsiz analiz kayıt bonusu devam eder.
### Trade Type Completion Bonus (Otomatik)

| Trade Type | Bonus Kredi | Açıklama |
|------------|-------------|----------|
| Scalping | +3 kredi | Yüksek risk, hızlı trade - ekstra ödül |
| Day Trade | +2 kredi | Orta vadeli trade bonusu |
| Swing Trade | +1 kredi | Standart bonus |

> **Not:** Bonus, analiz tamamlandığında otomatik olarak eklenir. `creditService.add()` ile `BONUS` tipinde kaydedilir.

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
Signal Auto-Publish (Confidence > 70% ve GO/COND_GO ise):
    ├── Signal DB'ye kaydedilir
    ├── Telegram kanalına yayınlanır (sadece Signal aboneleri)
    └── Discord'a bildirim gönderilir (sadece Signal aboneleri)
    ↓
Snapshot Rapor Gönderimi:
    ├── HTML template → Puppeteer screenshot (2x retina)
    ├── Telegram sendPhoto (inline görünüm)
    └── Discord webhook embed (inline görünüm)
    ↓
Kullanıcı Hakları Aktif:
    ├── 3x AI Expert sohbet (ücretsiz)
    └── Snapshot rapor (otomatik, sınırsız)
```

### Kod Lokasyonları

| Fonksiyon | Dosya | Satır |
|-----------|-------|-------|
| Analiz oluşturma | `analysis.routes.ts` | 528-544 |
| Trade type bonus | `analysis.routes.ts` | 549-562 |
| Signal auto-publish | `analysis.routes.ts` | 1268-1421 |
| AI Expert hak kontrolü | `ai-expert.routes.ts` | 186-358 |
| Snapshot rapor gönderimi | `report.routes.ts` | 564-662 |

### Önemli Kurallar

- **Admin kullanıcılar** tüm haklara ücretsiz sahiptir
- Haklar **analiz bazlı** takip edilir, global değil
- Ücretsiz haklar bitince **otomatik kredi düşürülür**
- Yetersiz kredi durumunda `INSUFFICIENT_CREDITS` hatası döner
- Hata durumunda **krediler otomatik iade edilir**
- **Trade type bonus** her analiz sonunda otomatik eklenir

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
| 2026-01-19 | ~~PDF Rapor kaldırıldı~~ | Satır kayması ve font sorunları — Snapshot PNG ile değiştirildi |
| 2026-01-19 | Reports sayfası: Stats kutuları kaldırıldı | Report tablosu senkronize değil - Dashboard'dan bakılacak |
| 2026-01-19 | Reports sayfası: 2026 trend tasarımı | Glassmorphism, gradient orbs, grain texture, modern filtreler |
| 2026-01-19 | Reports sayfası: Teal/Coral kurumsal renkler | Tüm renkler kurumsal palette uygun (purple→teal, red→orange/coral) |
| 2026-01-19 | Reports sayfası: Light mode kontrast düzeltmesi | bg-white/5→bg-slate-100, text-white→text-slate-900 dark:text-white |
| 2026-01-19 | Analyze sayfası: Live Chart 2/3 genişlik | Live Chart sol tarafta 8 kolon, kontroller sağda 4 kolon - daha dengeli layout |
| 2026-01-20 | Recent Analyses: Verdict filtresi | All/GO/COND/WAIT/AVOID filtre butonları - hızlı analiz filtreleme |
| 2026-01-20 | Mobile App Icon: Dark mode versiyonları | 512x512, dark bg (#0D1421), scale 2.0, rounded corners (96px), glow efekti |
| 2026-01-20 | Mobile App Icon: Alternatif renk düzeni | Yeşil-kırmızı-yeşil-kırmızı (çapraz) vs orijinal (2 yeşil + 2 kırmızı) |
| 2026-01-20 | Snapshot Rapor: Gerçek candlestick grafik | Son 50 mum OHLCV verisiyle SVG candlestick chart - yeşil/kırmızı mumlar, entry/SL/TP seviyeleri |
| 2026-01-27 | Testimonials → Platform Metrics | Sahte yorumlar yerine gerçek API verileri - şeffaflık ve güvenilirlik |
| 2026-01-27 | Feature 1 → AI-Powered Market Scanner | 7-Step Analysis Suite formatında, "Find Your Next Winning Trade" yerine |
| 2026-01-27 | Real Results section Hero altına taşındı | Metrikler daha erken görünsün |
| 2026-02-26 | Dashboard: "Decision Engine Control Room" layout | Enterprise dashboard → intelligence-first tasarım, PrimaryDecision + ProfitTracker + FlowChain |
| 2026-02-26 | Dashboard: ScoreRing, PulseDot, Sparkline bileşenleri | Paylaşılan intelligence UI primitives - animasyonlu SVG |
| 2026-02-26 | Dashboard: AgentPanel (ARIA/NEXUS/ORACLE/SENTINEL) | 4 AI agent durum göstergesi, PulseDot + ScoreRing |
| 2026-02-26 | Dashboard: FlowChain pipeline (Capital→Sector→Asset→Plan) | Akış bazlı karar zinciri görselleştirme |
| 2026-02-26 | Analyze: Sol panel konfigürasyon + sağ panel pipeline | İki kolonlu layout, MarketContext + TrendingAssets sol, pipeline + recent sağ |
| 2026-02-26 | Analyze: AnalysisPipelineCard 3 adımlı görsel | Shimmer animasyonlu adım ilerlemesi, Daily Pass sayacı |
| 2026-02-26 | Analyze: RecentAnalysisRow genişletilebilir satır | ScoreRing + VerdictBadge + Entry/SL/TP detay kartları |
| 2026-02-26 | Analyze: Verdict filtresi (All/GO/COND/AVOID) | Hızlı filtreleme, yeşil/mavi/kırmızı renk kodlu |
| 2026-02-26 | Renk paleti: #00F5A0 bullish, #FF4757 bearish, #00D4FF accent | Tutarlı intelligence renk sistemi |
| 2026-02-26 | Font: JetBrains Mono (sayılar) + Inter (metin) | Monospace sayılar için okunabilirlik, sans-serif metin için modernlik |
| 2026-02-26 | Terminal: Monolitik 2700 satır → 9 ayrı bileşen dosyası | Modülerlik, bakım kolaylığı, yeniden kullanılabilirlik |
| 2026-02-26 | Terminal: TerminalSummaryBar her bölümün üstünde | Tek cümle özet + skor + durum göstergesi - hızlı bilgi erişimi |
| 2026-02-26 | Terminal: Sidebar SELECTED bölümü ScoreRing + VerdictBadge | 32px ScoreRing + fiyat + change + verdict badge - zenginleştirilmiş seçim bilgisi |
| 2026-02-26 | Terminal: L1 GlobalLiquidity Sparkline'lı macro kartlar | Her kart: label + büyük değer + change% + mini sparkline - trend görünürlüğü |
| 2026-02-26 | Terminal: L2 MarketFlow phase badge'leri renkli | EARLY=#00F5A0, MID=#FFB800, LATE=#A855F7, EXIT=#FF4757 + flow strength bar |
| 2026-02-26 | Terminal: RotationMatrix ScoreRing + phase timeline | 64px ScoreRing'ler + FlowArrow bağlantıları + yatay phase timeline bar |
| 2026-02-26 | Terminal: L3 SectorActivity heatmap + list view toggle | Heatmap: renk kodlu kutular (change%'ye göre). List: flow bar'lı detaylı satırlar |
| 2026-02-26 | Terminal: L4 AIRecommendation decision bar + gate check | PrimaryDecision tarzı regime bar + gate check list (yeşil/kırmızı sol border) + signal kartları |
| 2026-02-26 | Terminal: AssetTable ScoreRing(28px) + verdict filter | Kompakt ScoreRing + VerdictBadge + Analyze/Chart action butonları + verdict filter tabs |
| 2026-02-26 | Terminal: RunAnalysis tahmin + INP fix + duplicate fix | requestAnimationFrame ile INP <100ms, zaman/kredi tahmini, Quick Add duplicate filtreleme |
| 2026-02-26 | Terminal: TradeVisualizer risk metrics + forecast panel | Confidence bar + mini forecast sparkline + Position Size/Max Loss/R:R risk metrikleri |
| 2026-02-26 | Landing Page: 13-section content overhaul | Hero→Stats→Problem→Pipeline→7-Layer→Comparison→Preview→Performance→Services→Pricing→Social→CTA→Footer |
| 2026-02-26 | Landing: ProblemSolution 3-column grid | Lagging Indicators / Information Overload / Invisible Capital Flows + SVG icons |
| 2026-02-26 | Landing: Pipeline 3-step (Detect→Analyze→Act) | SVG flow arrows, color-coded steps, output descriptions |
| 2026-02-26 | Landing: ComparisonTable (Typical vs TraderPath) | 5-row comparison, red X / green check visual indicators |
| 2026-02-26 | Landing: LivePreview 4 platform cards (2x2) | Dashboard/Terminal/Analyzer/Trade Visualizer — screenshot slots + gradient placeholders, hover scale+glow |
| 2026-02-26 | Landing: ThreeServices credit-based cards | Capital Flow (50 cr), 7-Step (100 cr), Best Opportunities (50 cr) |
| 2026-02-26 | Landing: SocialProof trust metrics + tech stack | 200+ assets, 5 markets, 24/7 scanning, 309+ analyses + tech badges |
| 2026-02-26 | Landing: PricingSection Free/Pro/Enterprise | Credit-based, no subscriptions, Popular badge on Pro tier |
| 2026-02-26 | Landing: PerformanceChart metrics grid | Total Signals, Win Rate, Avg R:R, Max Drawdown + disclaimer |
| 2026-02-26 | AnalysisDialog: Duplicate analysis warning | 4 saat içinde aynı asset+timeframe uyarısı, View Existing / Analyze Again butonları |
| 2026-02-26 | AnalysisDialog: Results drawer format | Mobilde bottom-up (%85vh), desktopda sağdan sola (520px panel) |
| 2026-02-26 | OpportunityRadar: CF-only filtering | Primary market önce, exit-phase ve negatif flow gizleniyor |
| 2026-02-26 | AnimatedCounter: Landing Stats count-up | IntersectionObserver + rAF + easeOutCubic, viewport'a girince 0→değer animasyonu |
| 2026-02-26 | LivePreview: SVG placeholder görseller + Next.js Image | 4 adet detaylı SVG placeholder (dashboard/terminal/analyzer/visualizer), aspect-video, lazy loading, onerror fallback |
| 2026-02-26 | Header/Footer: bg-background ile sayfa rengi eşitleme | Navbar `bg-white/bg-[#0A0A0A]` → `bg-background`, Footer `bg-slate-50/bg-[#0B1121]` → `bg-background`, Dashboard header `bg-card/80` → `bg-background/80`, Dashboard footer `bg-card/50` → `bg-background` |
| 2026-02-26 | Auth Layout: Marketing paneli kaldırıldı | Sol taraftaki %50 marketing paneli kaldırıldı, logo formun üstüne küçük (sm) yerleştirildi, tek kolonlu centered layout |
| 2026-02-26 | LivePreview: Perspective Tilt 3D layout | Kartlar perspective(1200px) + rotateY(±3deg) ile açılı yerleşim, hover'da düzleşir + scale(1.03) + translateZ(20px), cubic-bezier geçiş |
| 2026-02-27 | Auth Layout: Dynamic gradient arka plan | Dashboard bg-background eşleşmesi + 4 animasyonlu gradient orb (teal/coral) + grain texture overlay, light/dark mod desteği |
| 2026-02-27 | Dashboard: System Performance → Platform-wide veri | ProfitTracker artık platform-performance-history API'den tüm kullanıcıların P/L verilerini gösteriyor |
| 2026-02-27 | Dashboard: Performance → My Performance | Ortadaki PnLChart "My Performance" olarak yeniden adlandırıldı - kullanıcıya özel veri gösterir |
| 2026-02-28 | Pricing: Kredi → Analiz Paket modeli | Kredi sistemi yerine analiz paketi: Explorer(5/$9.99), Trader(20/$29.99), Pro(50/$59.99), Elite(150/$149.99) |
| 2026-02-28 | Pricing: Sinyal Servisi → Intelligence Reports | "Signal Service" → "Intelligence Reports" olarak yeniden markalaştırıldı, rapor + sinyal dahil |
| 2026-02-28 | Pricing: Report Standard $29/mo, Pro $59/mo | Standard: 5 rapor/gün Crypto, Pro: 10 rapor/gün 4 piyasa, PDF + sinyal + outcome tracking |
| 2026-02-28 | Pricing: Platform Subscriptions yeniden yapılandırma | Starter $29/mo (3/gün), Pro $59/mo (10/gün), Elite $99/mo (sınırsız) — analiz bazlı, kredi bazlı değil |
| 2026-02-28 | Pricing: Kayıt bonusu 25 kredi → 3 analiz | Yeni kullanıcılar 3 ücretsiz analiz alıyor (kredi kartı gerekmez) |
| 2026-02-28 | Pricing: Landing PricingSection 4 paket grid | Explorer/Trader/Pro/Elite kartları + "Every Analysis Includes" bölümü + Intelligence Reports callout |
| 2026-02-28 | Pricing: /pricing sayfası 3 modlu tasarım | Analysis Packages / Intelligence Reports / Monthly Plans — tab toggle ile geçiş |
| 2026-02-28 | Pricing: Value Comparison bölümü | Professional Analyst ($75-140) vs TraderPath ($0.88) karşılaştırma kartları |
| 2026-02-28 | Pricing: FAQ bölümü eklendi | 6 sık sorulan soru — analiz nedir, süre dolumu, rapor servisi, piyasalar vb. |
| 2026-02-28 | Rapor: PDF → Snapshot PNG geçişi | PDF kaldırıldı (satır kayması/font sorunları), Puppeteer screenshot ile pixel-perfect PNG |
| 2026-02-28 | Rapor: Telegram/Discord inline gönderim | Snapshot PNG'ler Telegram sendPhoto + Discord webhook ile inline görüntülenir, indirme gerektirmez |
| 2026-02-28 | Rapor: Executive Summary 3-4 PNG, Detailed 6-8 PNG | Bölüm bazlı snapshot: Header+Verdict, 7-Step Özet, Chart+Levels, İşlem Planı+Final |
| 2026-02-28 | İletişim: WhatsApp kaldırıldı | Telegram + Discord + Resend Free yeterli, WhatsApp $50-150/ay tasarruf |
| 2026-02-28 | Email: Resend Pro → Free Tier | Sadece auth emailleri (doğrulama, şifre sıfırlama) için Free Tier yeterli (3,000/ay) |
| 2026-02-28 | Nav: Primary → Concierge, Dashboard, Analyzer, Terminal, Reports | Concierge öne çıktı, Analyze→Analyzer, Signals kaldırıldı |
| 2026-02-28 | Nav: More dropdown → Price Alerts, Notifications, Methodology | Smart Alerts kaldırıldı (Notifications'a merge) |
| 2026-02-28 | Signals sayfası kaldırıldı | Signal bildirimleri Notifications sayfasından SIGNAL filtresiyle görüntülenir |
| 2026-02-28 | Smart Alerts → Notifications merge | ALERT tipi bildirimler artık L1-L4 layer, severity, market badge'leri gösteriyor |
| 2026-02-28 | Notifications: Zenginleştirilmiş ALERT/SIGNAL kartları | ALERT: layer icon + severity badge + market + action. SIGNAL: direction + confidence badge |
| 2026-02-28 | Analyzer: 3-tab layout (Auto / Tailored / Scheduled) | analyze/layout.tsx ile tab navigasyonu, Scheduled artık Analyzer'ın parçası |
| 2026-02-28 | Analyzer: Scheduled /analyze/scheduled'a taşındı | More dropdown'dan kaldırıldı, Analyzer tab olarak erişilir |
| 2026-02-28 | Pricing: Haftalık abonelik modeli | Eski karmaşık paketler (Explorer/Trader/Pro/Elite + Report Standard/Pro + Platform Starter/Pro/Elite) → 2 basit haftalık plan |
| 2026-02-28 | Pricing: Intelligent Report Subscription $13.99/hafta | 7 rapor/hafta (günde 1), Executive Summary veya Detailed Analysis, Telegram + Discord Snapshot PNG delivery |
| 2026-02-28 | Pricing: Capital Flow & Asset Analysis Subscription $13.99/hafta | 7 analiz/hafta + analiz başına 5 AI Expert soru, AI Concierge/Auto/Tailored yöntemler, aynı fiyat |
| 2026-02-28 | Pricing: Planlar bağımsız | Kullanıcı birini seçer: ya Intelligent Report ya Capital Flow & Asset Analysis |
| 2026-02-28 | Pricing: Birim fiyat $2.00 | $13.99 / 7 = $2.00 per analiz veya rapor — %97 tasarruf (geleneksel analist $75-140) |
| 2026-02-28 | Pricing: /pricing sayfası 2 kart layout | Tab toggle kaldırıldı, 2 yan yana kart (violet=Report, emerald=Analysis) + How It Works + Value Comparison + FAQ |
| 2026-02-28 | Pricing: Landing PricingSection 2 plan grid | 4 paket grid → 2 bağımsız plan grid, güncel bilgilerle |
| 2026-02-28 | DB: WeeklyPlan modeli eklendi | weekly_plans tablosu: planType (REPORT_WEEKLY/ANALYSIS_WEEKLY), quota tracking, Stripe entegrasyonu |
| 2026-02-28 | API: /api/weekly-plans routes | plans, status, checkout, cancel, resume endpoints — Stripe haftalık recurring billing |

---

## 💰 Aylık İşletme & Bakım Maliyeti (Piyasa Fiyatları)

### Altyapı

| Servis | Plan | Maliyet/Ay | Açıklama |
|--------|------|-----------|----------|
| Railway (API Backend) | Pro | $20 | Node.js API sunucusu |
| Vercel (Frontend) | Pro | $20 | Next.js SSR, CDN |
| Neon (PostgreSQL) | Pro | $25 | Managed database |
| Upstash (Redis) | Pro | $10 | Cache, rate limiting, pub/sub |
| Cloudflare (Domain/SSL) | Free | $0 | DNS, SSL, DDoS koruması |
| **Alt Toplam** | | **$75** | |

### Geliştirme & İzleme

| Servis | Plan | Maliyet/Ay | Açıklama |
|--------|------|-----------|----------|
| Claude Code | Max | $100 | AI geliştirme asistanı |
| Sentry | Team | $26 | Error monitoring, crash reporting |
| Vercel Analytics | Pro dahil | $0 | Web analytics (Pro plan'a dahil) |
| GitHub | Free | $0 | Repo, CI/CD Actions |
| **Alt Toplam** | | **$126** | |

### İletişim Kanalları

| Servis | Plan | Maliyet/Ay | Açıklama |
|--------|------|-----------|----------|
| Telegram Bot API | Free | $0 | Sinyal/rapor/bildirim gönderimi, sınırsız |
| Discord Webhooks | Free | $0 | Sinyal/rapor bildirimleri, sınırsız |
| Resend (Email) | Free | $0 | Sadece auth emailleri (3,000/ay limit) |
| **Alt Toplam** | | **$0** | |

### Ödeme İşleme (Lemon Squeezy)

| Bileşen | Oran |
|---------|------|
| İşlem komisyonu | 5% + $0.50/işlem |
| Vergi hesaplama & ödeme | Dahil |
| Aylık platform ücreti | $0 |

### Müşteri Desteği

| Servis | Plan | Maliyet/Ay |
|--------|------|-----------|
| Crisp Chat | Mini | $45 |

### AI Motor (Gemini)

| Bileşen | Flash | Pro |
|---------|-------|-----|
| 7-Step Analiz (1,000/ay) | ~$3 | ~$43 |
| AI Concierge sohbet (2,000 mesaj/ay) | ~$1 | ~$10 |
| BILGE hata analizi + haftalık rapor | ~$1 | ~$3 |
| AI Expert soruları (500/ay) | ~$0.50 | ~$10 |
| **Alt Toplam** | **~$5.50** | **~$66** |

> **Not:** Concierge — kullanıcıların doğal dille analiz başlattığı, kredi onay mekanizmalı AI chatbot. BILGE — sistem sağlığı izleme, hata pattern tespiti, haftalık bakım raporu üreten AI guardian. Her ikisi de Gemini API kullanır.

### Toplam Aylık Maliyet (1,000 analiz/ay)

| Senaryo | Flash | Pro |
|---------|-------|-----|
| Altyapı | $75 | $75 |
| Geliştirme & İzleme | $126 | $126 |
| İletişim | $0 | $0 |
| Lemon Squeezy (~$3K gelir) | $200 | $200 |
| Müşteri Desteği | $45 | $45 |
| AI Motor (Analiz+Concierge+BILGE) | $5.50 | $66 |
| **TOPLAM** | **$451.50** | **$512** |

### Senaryo Bazlı Kar/Zarar

| Dönem | Kullanıcı | Gelir | Gider (Flash) | Net Kar | Marj |
|-------|----------|-------|--------------|---------|------|
| Erken | 50 | $1,500 | $341 | $1,159 | 77.3% |
| Büyüme | 200 | $6,000 | $654 | $5,346 | 89.1% |
| Olgun | 1,000 | $25,000 | $1,939 | $23,061 | 92.2% |

> **Not:** En büyük maliyet kalemi Lemon Squeezy komisyonu (gelire orantılı). Break-even: ~$452 gelir/ay (~15 Trader paketi). AI Motor maliyeti Concierge ve BILGE dahil.

---

## 🤖 Claude Code Talimatları

1. **Session başında** bu dosyayı oku
2. **Kod yazarken** yukarıdaki kurallara uy
3. **UI kararı sonrası** → HEMEN "UI Kararları" tablosuna ekle
4. **Commit öncesi** → Bu dosya güncellendi mi kontrol et
5. **Microservice değişikliğinde** ilgili SERVICE.md'yi güncelle
6. **Önemli değişiklikler için** → PR hazırla ve kullanıcıya link ver
