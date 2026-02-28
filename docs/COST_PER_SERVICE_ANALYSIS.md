# TraderPath - Hizmet Başına Maliyet Analizi (Cost Per Service Analysis)

> **Tarih:** 2026-02-28
> **Hazırlayan:** Claude Code AI
> **Veri Kaynakları:** Codebase analizi + güncel servis fiyatları (Şubat 2026)
> **Model:** Gemini 2.5 Flash (mevcut production modeli)

---

## 1. Aylık Sabit Maliyetler (Fixed Monthly Costs)

### A. Altyapı Hizmetleri

| # | Hizmet | Sağlayıcı | Plan | Aylık Maliyet | Doğrulama |
|---|--------|-----------|------|---------------|-----------|
| 1 | **Domain** (.io) | Cloudflare Registrar | At-cost | **$3.75** | $45/yıl ÷ 12 = $3.75 |
| 2 | **PostgreSQL** | Neon Cloud | Launch (pay-as-you-go) | **$25.00** | 0.5 CU × 730h × $0.07 + storage |
| 3 | **Frontend Hosting** | Vercel | Pro | **$20.00** | $20/kullanıcı/ay (1 dev seat) |
| 4 | **Backend Hosting** | Railway | Pro | **$20.00** | $20/ay + $20 kullanım kredisi dahil |
| 5 | **Redis Cache** | Upstash | Fixed 250MB | **$10.00** | Yeni fiyatlandırma (Mart 2025+) |
| 6 | **Docker** | Docker Hub / Local | Free | **$0.00** | Sadece local dev (docker-compose.yml) |
| | | | | | Production'da Railway üzerinde çalışır |
| | **ALTYAPI TOPLAM** | | | **$78.75** | |

### B. Geliştirme Araçları

| # | Hizmet | Sağlayıcı | Plan | Aylık Maliyet | Açıklama |
|---|--------|-----------|------|---------------|----------|
| 7 | **Claude Code** | Anthropic | Max 5× | **$100.00** | AI-assisted development tool |
| | | | Max 20× (alternatif) | ($200.00) | Ağır kullanım için |
| | **GELİŞTİRME TOPLAM** | | | **$100.00** | |

### C. İletişim Hizmetleri

| # | Hizmet | Sağlayıcı | Plan | Aylık Maliyet | Açıklama |
|---|--------|-----------|------|---------------|----------|
| 8 | **Email** | Resend | Free (3K/ay) | **$0.00** | 3,000 email/ay ücretsiz |
| | | | Pro (50K/ay, gerekirse) | ($20.00) | Büyüme aşamasında geçiş |
| | **İLETİŞİM TOPLAM** | | | **$0.00** | Başlangıç; büyümede $20 |

---

## 2. Değişken API Maliyetleri (Variable API Costs)

### A. AI Model - Gemini 2.5 Flash

| Hizmet | Gemini Çağrısı | Input Token | Output Token | Maliyet/Kullanım |
|--------|----------------|-------------|--------------|------------------|
| **7-Step Analysis** | 8 | ~5,900 | ~2,050 | **$0.00106** |
| **MLIS Pro Analysis** | 0 | 0 | 0 | **$0.00000** |
| **Capital Flow Summary** | 2 | ~1,600 | ~800 | **$0.00036** |
| **AI Expert Panel** (5 agent) | 5 | ~12,500 | ~2,000 | **$0.00154** |
| **Concierge** (mesaj başı) | 1 | ~3,000 | ~500 | **$0.00037** |
| **Expert Q&A** (soru başı) | 1 | ~3,500 | ~1,000 | **$0.00056** |
| **Translation** | 1 | ~1,250 | ~4,000 | **$0.00129** |
| **BILGE Guardian** | 3 | ~500 | ~300 | **$0.00013** |

> **Fiyatlandırma:** Flash Input: $0.075/1M token, Flash Output: $0.30/1M token

### B. Veri API'leri (Tamamı Ücretsiz)

| API | Kullanım | Maliyet | Cache TTL |
|-----|----------|---------|-----------|
| **Binance** (OHLCV, OrderBook, Futures) | 5-8 çağrı/analiz | $0.00 | 10s-1m |
| **CoinGecko** (Tokenomics, MCap) | 2-3 çağrı/analiz | $0.00 | 5-30m |
| **Yahoo Finance** (Stocks, Bonds, Metals) | 0-1 çağrı/analiz | $0.00 | 1-5m |
| **FRED** (Macro, Treasury Yields) | 1 çağrı/analiz | $0.00 | 6-7 gün |
| **CryptoPanic** (News, Sentiment) | 1 çağrı/analiz | $0.00 | - |
| **Finnhub** (Economic Calendar) | 0-1 çağrı/analiz | $0.00 | - |
| **DeFiLlama** (TVL, DeFi) | 0-1 çağrı/analiz | $0.00 | 12h |
| **Fear & Greed Index** | 1 çağrı/analiz | $0.00 | - |
| **VERİ API TOPLAM** | | **$0.00** | |

### C. Google Cloud API'leri

| API | Ücretsiz Limit | Aşım Fiyatı | Tahmini Aylık |
|-----|----------------|-------------|---------------|
| **Cloud Translation** | 500K karakter/ay | $20/1M karakter | $0-5.00 |
| **Text-to-Speech** | 1M karakter/ay | $16/1M karakter | $0-3.00 |
| **GOOGLE CLOUD TOPLAM** | | | **$0-8.00** |

### D. Ödeme İşleme

| Hizmet | Oran | Tahmini Aylık |
|--------|------|---------------|
| **Stripe** | %2.9 + $0.30/işlem | Gelire bağlı |

> Not: Stripe maliyeti gelirden düşülür, operasyonel gider olarak sayılır.

---

## 3. İşletme ve Bakım Maliyetleri (Business & Maintenance)

| # | Kalem | Aylık Maliyet | Açıklama |
|---|-------|---------------|----------|
| 9 | **SSL Sertifikası** | $0.00 | Cloudflare (ücretsiz) |
| 10 | **CDN** | $0.00 | Cloudflare + Vercel Edge (ücretsiz) |
| 11 | **Monitoring** | $0.00 | BILGE Guardian (yerleşik sistem) |
| 12 | **Error Tracking** | $0.00 | BILGE Guardian (yerleşik) |
| 13 | **Backup/DR** | $0.00 | Neon (otomatik dahil) |
| 14 | **reCAPTCHA** | $0.00 | Google reCAPTCHA v3 (ücretsiz) |
| 15 | **OAuth** | $0.00 | Google OAuth (ücretsiz) |
| 16 | **Push Notifications** | $0.00 | VAPID/Web Push (ücretsiz) |
| 17 | **Image Hosting** | $0.00 | Cloudinary (ücretsiz tier) |
| | **İŞLETME TOPLAM** | **$0.00** | Tüm bakım servisleri dahili/ücretsiz |

---

## 4. Senaryo Bazlı Toplam Maliyet Hesaplaması

### Senaryo 1: MVP / Başlangıç (50 Aktif Kullanıcı)

```
Kullanıcı Dağılımı:
├── 35 Free    × 6 analiz/ay  = 210 analiz
├── 10 Starter × 75 analiz/ay = 750 analiz
├── 4 Pro      × 195 analiz/ay = 780 analiz
└── 1 Elite    × 375 analiz/ay = 375 analiz
                                ─────────────
    TOPLAM ANALİZ:              2,115/ay ≈ 2,000
```

**Gemini Maliyet Hesabı (2,000 analiz):**

| Hizmet | Hacim/Ay | Birim Maliyet | Toplam |
|--------|----------|---------------|--------|
| 7-Step Analysis (%70) | 1,400 | $0.00106 | $1.48 |
| MLIS Pro (%30) | 600 | $0.00000 | $0.00 |
| Capital Flow | 900 özet | $0.00036 | $0.32 |
| AI Expert Panel (%30 trigger) | 600 | $0.00154 | $0.92 |
| Concierge | 750 mesaj | $0.00037 | $0.28 |
| Expert Q&A | 300 soru | $0.00056 | $0.17 |
| Translation + BILGE | est. | - | $0.50 |
| **GEMİNİ TOPLAM** | | | **$3.67** |

**AYLIK TOPLAM MALİYET (Senaryo 1):**

| Kategori | Maliyet |
|----------|---------|
| Altyapı (sabit) | $78.75 |
| Claude Code (geliştirme) | $100.00 |
| Gemini API (değişken) | $3.67 |
| Google Cloud APIs | $2.00 |
| Email (Resend Free) | $0.00 |
| İşletme & Bakım | $0.00 |
| **TOPLAM** | **$184.42** |

```
┌─────────────────────────────────────────────┐
│  MALİYET / ANALİZ = $184.42 / 2,000        │
│                   = $0.0922 / analiz        │
│                   ≈ 9.2 cent / analiz       │
└─────────────────────────────────────────────┘
```

---

### Senaryo 2: Büyüme (200 Aktif Kullanıcı)

```
Kullanıcı Dağılımı:
├── 140 Free    × 6 analiz/ay  = 840 analiz
├── 40 Starter  × 75 analiz/ay = 3,000 analiz
├── 16 Pro      × 195 analiz/ay = 3,120 analiz
└── 4 Elite     × 375 analiz/ay = 1,500 analiz
                                 ─────────────
    TOPLAM ANALİZ:               8,460/ay ≈ 8,500
```

**Gemini Maliyet Hesabı (8,500 analiz):**

| Hizmet | Hacim/Ay | Birim Maliyet | Toplam |
|--------|----------|---------------|--------|
| 7-Step Analysis (%70) | 5,950 | $0.00106 | $6.31 |
| MLIS Pro (%30) | 2,550 | $0.00000 | $0.00 |
| Capital Flow | 3,600 özet | $0.00036 | $1.30 |
| AI Expert Panel (%30) | 2,550 | $0.00154 | $3.93 |
| Concierge | 3,000 mesaj | $0.00037 | $1.11 |
| Expert Q&A | 1,200 soru | $0.00056 | $0.67 |
| Translation + BILGE | est. | - | $2.00 |
| **GEMİNİ TOPLAM** | | | **$15.32** |

**AYLIK TOPLAM MALİYET (Senaryo 2):**

| Kategori | Maliyet |
|----------|---------|
| Altyapı (sabit) | $78.75 |
| Claude Code (geliştirme) | $100.00 |
| Gemini API (değişken) | $15.32 |
| Google Cloud APIs | $5.00 |
| Email (Resend Pro) | $20.00 |
| İşletme & Bakım | $0.00 |
| **TOPLAM** | **$219.07** |

```
┌─────────────────────────────────────────────┐
│  MALİYET / ANALİZ = $219.07 / 8,500        │
│                   = $0.0258 / analiz        │
│                   ≈ 2.6 cent / analiz       │
└─────────────────────────────────────────────┘
```

---

### Senaryo 3: Ölçekleme (1,000 Aktif Kullanıcı)

```
Kullanıcı Dağılımı:
├── 700 Free    × 6 analiz/ay  = 4,200 analiz
├── 200 Starter × 75 analiz/ay = 15,000 analiz
├── 80 Pro      × 195 analiz/ay = 15,600 analiz
└── 20 Elite    × 375 analiz/ay = 7,500 analiz
                                 ──────────────
    TOPLAM ANALİZ:               42,300/ay ≈ 42,000
```

**Gemini Maliyet Hesabı (42,000 analiz):**

| Hizmet | Hacim/Ay | Birim Maliyet | Toplam |
|--------|----------|---------------|--------|
| 7-Step Analysis (%70) | 29,400 | $0.00106 | $31.16 |
| MLIS Pro (%30) | 12,600 | $0.00000 | $0.00 |
| Capital Flow | 18,000 özet | $0.00036 | $6.48 |
| AI Expert Panel (%30) | 12,600 | $0.00154 | $19.40 |
| Concierge | 15,000 mesaj | $0.00037 | $5.55 |
| Expert Q&A | 6,000 soru | $0.00056 | $3.36 |
| Translation + BILGE | est. | - | $8.00 |
| **GEMİNİ TOPLAM** | | | **$73.95** |

**AYLIK TOPLAM MALİYET (Senaryo 3):**

| Kategori | Maliyet | Not |
|----------|---------|-----|
| Altyapı (sabit) | $98.75 | Neon/Railway upgrade gerekebilir |
| Claude Code (geliştirme) | $100.00 | |
| Gemini API (değişken) | $73.95 | |
| Google Cloud APIs | $15.00 | |
| Email (Resend Pro) | $20.00 | |
| İşletme & Bakım | $0.00 | |
| **TOPLAM** | **$307.70** |

```
┌─────────────────────────────────────────────┐
│  MALİYET / ANALİZ = $307.70 / 42,000       │
│                   = $0.0073 / analiz        │
│                   ≈ 0.73 cent / analiz      │
└─────────────────────────────────────────────┘
```

---

## 5. Minimum Aylık Analiz Miktarı Tahmini

### Hesaplama Yöntemi

Minimum analiz miktarı = Platformu sürdürülebilir kılan en düşük kullanıcı/analiz hacmi

```
Varsayımlar:
├── Minimum aktif kullanıcı: 50 (MVP aşaması)
├── Free kullanıcı oranı: %70
├── Ortalama Free kullanıcı: 6 analiz/ay (10 kr/gün limitli, 25 kr/analiz)
├── Ortalama Starter: 75 analiz/ay (100 kr/gün, ~3/gün)
├── Ortalama Pro: 195 analiz/ay (250 kr/gün, ~6.5/gün)
├── Ortalama Elite: 375 analiz/ay (500 kr/gün, ~12.5/gün)
└── Dağılım: %70 Free / %20 Starter / %8 Pro / %2 Elite
```

```
┌─────────────────────────────────────────────┐
│  MİNİMUM AYLIK ANALİZ = 2,000              │
│  (50 aktif kullanıcı senaryosu)             │
└─────────────────────────────────────────────┘
```

---

## 6. Nihai Sonuç: Aylık Toplam / Aylık Analiz

### Tüm Senaryolar Karşılaştırması

| Senaryo | Kullanıcı | Aylık Analiz | Aylık Toplam Maliyet | **Maliyet/Analiz** |
|---------|-----------|--------------|---------------------|---------------------|
| **MVP (Min.)** | 50 | 2,000 | $184.42 | **$0.0922** |
| **Büyüme** | 200 | 8,500 | $219.07 | **$0.0258** |
| **Ölçekleme** | 1,000 | 42,000 | $307.70 | **$0.0073** |

### Maliyet Dağılımı (MVP Senaryosu - En Kötü Durum)

```
$184.42 / 2,000 analiz = $0.0922/analiz

Dağılım:
├── Claude Code:     $100.00 / 2,000 = $0.0500 (%54.2)  ← En büyük gider
├── Altyapı:         $78.75  / 2,000 = $0.0394 (%42.7)
├── Gemini API:      $3.67   / 2,000 = $0.0018 (%2.0)
├── Google Cloud:    $2.00   / 2,000 = $0.0010 (%1.1)
└── Email + Diğer:   $0.00   / 2,000 = $0.0000 (%0.0)
                                       ────────
                              TOPLAM:  $0.0922/analiz
```

### Claude Code Hariç (Sadece Operasyonel Maliyet)

Claude Code bir geliştirme aracıdır, doğrudan analiz maliyeti değildir.
Sadece operasyonel maliyetler hesaplandığında:

| Senaryo | Aylık Maliyet | Aylık Analiz | **Maliyet/Analiz** |
|---------|---------------|--------------|---------------------|
| **MVP** | $84.42 | 2,000 | **$0.0422** |
| **Büyüme** | $119.07 | 8,500 | **$0.0140** |
| **Ölçekleme** | $207.70 | 42,000 | **$0.0049** |

---

## 7. Kârlılık Analizi

### Kullanıcı Başına Gelir vs Maliyet

| Tier | Aylık Gelir | Aylık Maliyet (Gemini) | Altyapı Payı (50 user) | **Net Kâr** | **Marj** |
|------|-------------|------------------------|------------------------|-------------|----------|
| Free | $0.00 | $0.04 | $1.58 | -$1.62 | N/A |
| Starter | $29.00 | $0.08 | $1.58 | $27.34 | 94.3% |
| Pro | $59.00 | $0.21 | $1.58 | $57.21 | 97.0% |
| Elite | $99.00 | $0.40 | $1.58 | $97.02 | 98.0% |

### Break-Even Noktası

```
Minimum sürdürülebilir gelir = Aylık sabit maliyet
$184.42 = X adet Starter kullanıcı × $29/ay

Starter-only: 184.42 / 29 = 6.4 → 7 Starter kullanıcı ile break-even
Karma dağılımla (20 Starter + 8 Pro + 2 Elite):
  Gelir = (20 × $29) + (8 × $59) + (2 × $99) = $580 + $472 + $198 = $1,250/ay
  Kâr = $1,250 - $184.42 = $1,065.58/ay (%85.2 marj)
```

---

## 8. Önemli Notlar

### Maliyet Düşürme Fırsatları

1. **Claude Code ($100/ay):** Geliştirme tamamlandıkça Pro ($20/ay) plana düşürülebilir → **-$80/ay**
2. **Neon ($25/ay):** Free tier (100 CU-saat/ay) başlangıçta yeterli olabilir → **-$25/ay**
3. **Vercel ($20/ay):** Hobby (ücretsiz) production-öncesi için yeterli → **-$20/ay**
4. **Potansiyel minimum maliyet:** ~$30/ay (Railway + Upstash + Domain + Gemini)

### Ölçekleme Uyarıları

- **1,000+ kullanıcı:** Neon Scale plana geçiş gerekebilir (+$20-50/ay)
- **5,000+ kullanıcı:** Railway resource upgrade (+$30-50/ay)
- **10,000+ kullanıcı:** Dedicated infrastructure düşünülmeli
- **Gemini rate limiting:** Exponential backoff + 20s max wait implementasyonu mevcut

### Neden Bu Kadar Ucuz?

1. **Gemini 2.5 Flash** çok düşük token maliyeti ($0.075/1M input)
2. **Tüm veri API'leri ücretsiz** (Binance, CoinGecko, FRED, Yahoo Finance)
3. **Agresif caching** birçok katmanda (10s-12h TTL)
4. **MLIS Pro $0 AI maliyeti** - tamamen lokal hesaplama
5. **Yerleşik monitoring** (BILGE) - harici izleme servisi gereksiz

---

## 9. Kaynak Dosyalar

| Dosya | İçerik |
|-------|--------|
| `docs/COST_ANALYSIS.md` | Gemini API maliyet detayları |
| `docs/SUBSCRIPTION_PRICING.md` | Abonelik fiyatlandırma modeli |
| `apps/api/src/modules/costs/cost.service.ts` | Maliyet takip servisi |
| `apps/api/src/modules/costs/credit-costs.service.ts` | Kredi fiyatlandırma servisi |
| `apps/api/src/core/gemini.ts` | Gemini SDK istemcisi |
| `apps/api/src/modules/analysis/analysis.engine.ts` | 7-Step analiz motoru (8 Gemini çağrısı) |
| `.env.example` | Tüm API anahtarları listesi |
| `docker-compose.yml` | Local dev altyapısı (Postgres + Redis + TFT) |

---

## 10. Fiyat Kaynakları (Şubat 2026)

- [Cloudflare .io Domain Pricing](https://www.cloudflare.com/application-services/products/registrar/buy-io-domains/) — $45/yıl
- [Claude Max Plan](https://claude.com/pricing/max) — $100-200/ay
- [Neon Pricing](https://neon.com/pricing) — Launch $5 min, pay-as-you-go
- [Vercel Pro](https://vercel.com/pricing) — $20/kullanıcı/ay
- [Railway Pro](https://railway.com/pricing) — $20/ay
- [Upstash Redis](https://upstash.com/pricing/redis) — $10/ay fixed plan
- [Resend Email](https://resend.com/pricing) — Free 3K/ay, Pro $20/ay
- [Gemini Flash Pricing](https://ai.google.dev/pricing) — $0.075 input, $0.30 output /1M token
