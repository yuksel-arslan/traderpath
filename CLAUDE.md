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
