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
- **Report tablosu**: Analizlerden oluşturulan raporlar
- Analiz istatistikleri → Analysis tablosundan
- Rapor istatistikleri → Report tablosundan
- **Asla karıştırma!** Report, Analysis'in sonucudur, tersi değil

### Yapılmaması Gerekenler ❌
- `!important` kullanma
- Inline style kullanma (Tailwind varken)
- `any` type kullanma (TypeScript)
- Console.log'ları commit'leme
- Hardcoded URL/secret kullanma
- Prisma Decimal'i direkt JSON'a serialize etme (Number() ile çevir)

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
