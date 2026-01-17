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

---

## 🎨 UI Kararları

| Tarih | Karar | Neden |
|-------|-------|-------|
| 2026-01-17 | TraderPath marka yazısı font-bold | Marka vurgusu için daha güçlü görünüm |
| 2026-01-17 | Büyük sayılar formatlanacak (1M, 10K, 1,000) | Okunabilirlik |
| 2026-01-17 | Credits kartı light mode'da amber gradient | Tema uyumu |

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

---

## 🤖 Claude Code Talimatları

1. **Session başında** bu dosyayı oku
2. **Kod yazarken** yukarıdaki kurallara uy
3. **Bug fix sonrası** → HEMEN "Çözülen Bug'lar" tablosuna ekle
4. **UI kararı sonrası** → HEMEN "UI Kararları" tablosuna ekle
5. **Session sonunda** → "Son Güncellemeler"e tarihle özet yaz
6. **Commit öncesi** → Bu dosya güncellendi mi kontrol et
7. **Microservice değişikliğinde** ilgili SERVICE.md'yi güncelle
