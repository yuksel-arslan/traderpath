'use client';

// ===========================================
// Analysis Report PDF Generator
// Professional AI-based trading report
// Each analysis step on separate page with AI commentary
// ===========================================

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { getPDFTranslations, type PDFTranslations } from './pdf-translations';

// Styles - using Helvetica (built-in PDF font)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
  },
  // Cover Page
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 60,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 10,
  },
  coverSymbol: {
    fontSize: 24,
    fontWeight: 600,
    color: '#3b82f6',
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  verdictBadge: {
    marginTop: 40,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  verdictText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#ffffff',
  },
  scoreText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 5,
  },
  // Content Pages
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: 700,
    color: '#3b82f6',
  },
  headerSymbol: {
    fontSize: 12,
    color: '#6b7280',
  },
  stepBadge: {
    backgroundColor: '#3b82f6',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: 600,
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    color: '#6b7280',
  },
  value: {
    fontSize: 11,
    fontWeight: 600,
    color: '#111827',
  },
  valueGreen: {
    fontSize: 11,
    fontWeight: 600,
    color: '#10b981',
  },
  valueRed: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ef4444',
  },
  valueYellow: {
    fontSize: 11,
    fontWeight: 600,
    color: '#f59e0b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  gridItemThird: {
    width: '33.33%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  gridItemFourth: {
    width: '25%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  miniCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 10,
  },
  miniCardLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3,
  },
  miniCardValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  // AI Commentary - prominent section
  aiCommentary: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1d4ed8',
    marginBottom: 8,
  },
  aiIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  aiText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  // Trade Plan visual
  tradePlanVisual: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  levelBar: {
    height: 30,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginVertical: 10,
    position: 'relative',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  entryLabel: {
    width: 60,
    fontSize: 11,
    fontWeight: 600,
    color: '#10b981',
  },
  entryPrice: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
  },
  entryPercent: {
    fontSize: 10,
    color: '#6b7280',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  tpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  // Footer with disclaimer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  footerDisclaimer: {
    fontSize: 7,
    color: '#9ca3af',
    lineHeight: 1.4,
    textAlign: 'center',
  },
  poweredBy: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 30,
  },
  geminiLogo: {
    fontSize: 14,
    fontWeight: 700,
    color: '#4285F4',
  },
  disclaimer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.5,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bulletPoint: {
    width: 15,
    fontSize: 10,
    color: '#6b7280',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
  },
  // Key insight box
  keyInsight: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  keyInsightTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 5,
  },
  keyInsightText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.5,
  },
});

// Helper function to format price
function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

// Analysis data types
interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  marketPulse: {
    btcDominance: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    marketRegime: string;
    trend: { direction: string; strength: number };
    aiSummary?: string;
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    timeframes: Array<{ tf: string; trend: string; strength: number }>;
    levels: { support: number[]; resistance: number[] };
    indicators: {
      rsi: number;
      macd: { histogram: number };
    };
    aiInsight?: string;
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
    smartMoney: { positioning: string };
    warnings: string[];
    aiInsight?: string;
  };
  timing: {
    tradeNow: boolean;
    reason: string;
    entryZones: Array<{ priceLow: number; priceHigh: number; probability: number; eta: string }>;
    conditions: Array<{ name: string; met: boolean }>;
    aiInsight?: string;
  };
  tradePlan: {
    direction: string;
    entries: Array<{ price: number; percentage: number; type: string }>;
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: Array<{ price: number; percentage: number; reason: string }>;
    riskReward: number;
    winRateEstimate: number;
    positionSizePercent: number;
    aiInsight?: string;
  };
  trapCheck: {
    traps: {
      bullTrap: boolean;
      bearTrap: boolean;
      fakeoutRisk: string;
    };
    liquidityGrab: { zones: number[] };
    counterStrategy: string[];
    aiInsight?: string;
  };
  verdict: {
    action: string;
    overallScore: number;
    confidenceFactors: Array<{ factor: string; positive: boolean }>;
    aiSummary?: string;
  };
}


// AI Educational Commentary Generator Functions
function generateMarketPulseEducation(data: AnalysisReportData): string {
  const fg = data.marketPulse.fearGreedIndex;
  const btcDom = data.marketPulse.btcDominance;
  const trend = data.marketPulse.trend?.direction || 'neutral';

  let commentary = '';

  if (fg <= 25) {
    commentary += `Piyasa asiri korku bolgesinde (${fg}). Tarihsel olarak bu seviyeler, uzun vadeli alicilar icin iyi firsatlar olusturabilir. Ancak dusus devam edebilir, kademeli giris stratejisi onerilir. `;
  } else if (fg >= 75) {
    commentary += `Piyasa asiri ac gozluluk bolgesinde (${fg}). Bu seviyeler genellikle duzeltme oncesi gozlenir. Yeni pozisyon acmak yerine kar realizasyonu dusunulebilir. `;
  } else {
    commentary += `Piyasa duygusu dengeli seviyelerde (${fg}). Ne asiri korku ne de ac gozluluk hakim. `;
  }

  if (btcDom > 55) {
    commentary += `Bitcoin dominansi yuksek (%${btcDom?.toFixed(1)}), bu altcoinlerin BTC'ye karsi zayif performans gosterdigi bir donem. `;
  } else if (btcDom < 45) {
    commentary += `Bitcoin dominansi dusuk (%${btcDom?.toFixed(1)}), altcoin sezonu olabilir. `;
  }

  if (trend === 'bullish') {
    commentary += `Genel trend yukari yonlu. Trend ile islem yapmak risk/getiri acisindan avantajlidir.`;
  } else if (trend === 'bearish') {
    commentary += `Genel trend asagi yonlu. Short pozisyonlar veya kenarda beklemek dusunulebilir.`;
  }

  return commentary;
}

function generateAssetScanEducation(data: AnalysisReportData): string {
  const rsi = data.assetScan.indicators?.rsi || 50;
  const price = data.assetScan.currentPrice;
  const change = data.assetScan.priceChange24h || 0;
  const supports = data.assetScan.levels?.support || [];
  const resistances = data.assetScan.levels?.resistance || [];

  let commentary = '';

  if (rsi > 70) {
    commentary += `RSI asiri alim bolgesinde (${rsi.toFixed(1)}). Fiyat kisa vadede duzeltme yapabilir. Yeni alimlarda dikkatli olunmali. `;
  } else if (rsi < 30) {
    commentary += `RSI asiri satim bolgesinde (${rsi.toFixed(1)}). Potansiyel dipten donus sinyali. Kademeli alim stratejisi uygulanabilir. `;
  } else if (rsi > 50 && rsi < 70) {
    commentary += `RSI (${rsi.toFixed(1)}) yukari momentum gosteriyor ancak henuz asiri alim bolgesinde degil. `;
  } else {
    commentary += `RSI (${rsi.toFixed(1)}) notr bolgelerde seyrediyor. `;
  }

  if (supports.length > 0) {
    const nearestSupport = supports[0];
    const distToSupport = ((price - nearestSupport) / price) * 100;
    commentary += `En yakin destek ${formatPrice(nearestSupport)} seviyesinde, fiyattan %${distToSupport.toFixed(1)} uzaklikta. `;
  }

  if (resistances.length > 0) {
    const nearestResistance = resistances[0];
    const distToResistance = ((nearestResistance - price) / price) * 100;
    commentary += `En yakin direnc ${formatPrice(nearestResistance)} seviyesinde, fiyattan %${distToResistance.toFixed(1)} yukarda.`;
  }

  return commentary;
}

function generateSafetyCheckEducation(data: AnalysisReportData): string {
  const risk = data.safetyCheck.riskLevel;
  const pumpDump = data.safetyCheck.manipulation?.pumpDumpRisk;
  const whale = data.safetyCheck.whaleActivity?.bias;
  const smartMoney = data.safetyCheck.smartMoney?.positioning;

  let commentary = '';

  if (risk === 'high') {
    commentary += `Risk seviyesi YUKSEK. Pozisyon boyutunu normalin %50'sine dusurmeniz, stop-loss seviyelerini daha siki tutmaniz onerilir. `;
  } else if (risk === 'medium') {
    commentary += `Risk seviyesi ORTA. Normal pozisyon boyutu ile islem yapilabilir, ancak stop-loss mutlaka kullanilmali. `;
  } else {
    commentary += `Risk seviyesi DUSUK. Uygun kosullar islem icin elverisli gorunuyor. `;
  }

  if (pumpDump === 'high') {
    commentary += `Pump-dump riski yuksek! Ani fiyat hareketlerine karsi dikkatli olun. Limit emirler kullanin. `;
  }

  if (whale === 'accumulating') {
    commentary += `Balinalar biriktirme yapiyor - potansiyel yukselis sinyali. `;
  } else if (whale === 'distributing') {
    commentary += `Balinalar dagitim yapiyor - potansiyel dusus riski. `;
  }

  if (smartMoney === 'long') {
    commentary += `Akilli para long pozisyonda. Kurumsal ilgi pozitif.`;
  } else if (smartMoney === 'short') {
    commentary += `Akilli para short pozisyonda. Dikkatli olun.`;
  }

  return commentary;
}

function generateTimingEducation(data: AnalysisReportData): string {
  const tradeNow = data.timing.tradeNow;
  const zones = data.timing.entryZones || [];
  const conditions = data.timing.conditions || [];

  let commentary = '';

  if (tradeNow) {
    commentary += `Simdi islem icin uygun kosullar mevcut. `;
  } else {
    commentary += `Simdi islem onerilmiyor. Daha iyi giris seviyeleri icin beklemek mantikli. `;
  }

  const metConditions = conditions.filter(c => c.met).length;
  const totalConditions = conditions.length;

  if (totalConditions > 0) {
    commentary += `Giris kosullarindan ${metConditions}/${totalConditions} karsilaniyor. `;
    if (metConditions < totalConditions / 2) {
      commentary += `Kosullarin cogunlugu henuz karsilanmadi, sabir onerilir. `;
    }
  }

  if (zones.length > 0) {
    const bestZone = zones[0];
    commentary += `En iyi giris bolgesi ${formatPrice(bestZone.priceLow)} - ${formatPrice(bestZone.priceHigh)} araliginda, ${bestZone.probability}% olasilikla.`;
  }

  return commentary;
}

function generateTradePlanEducation(data: AnalysisReportData): string {
  const plan = data.tradePlan;
  const direction = plan.direction;
  const entries = plan.entries || [];
  const stopLoss = plan.stopLoss;
  const takeProfits = plan.takeProfits || [];
  const rr = plan.riskReward || 0;

  let commentary = '';

  commentary += `**NEDEN BU SEVIYELER SECILDI?**\n\n`;

  // Entry explanation
  if (entries.length > 0) {
    commentary += `GIRIS SEVIYELERI: `;
    if (entries.length > 1) {
      commentary += `${entries.length} kademeli giris onerilmektedir. Bu strateji (DCA), tek seferde tum pozisyonu almak yerine farkli seviyelerde bolusturur. `;
      commentary += `Ortalama giris fiyati ${formatPrice(plan.averageEntry)} olarak hesaplanmistir. `;
    } else {
      commentary += `Tek giris noktasi ${formatPrice(entries[0].price)} olarak belirlenmistir. `;
    }
    commentary += `Bu seviyeler teknik destek/direnc, momentum ve hacim analizine dayanmaktadir.\n\n`;
  }

  // Stop loss explanation
  if (stopLoss) {
    const slPercent = Math.abs(stopLoss.percentage || 0);
    commentary += `STOP LOSS: ${formatPrice(stopLoss.price)} (-%${slPercent.toFixed(2)}) - `;
    if (stopLoss.reason) {
      commentary += `${stopLoss.reason} `;
    } else {
      if (direction === 'long') {
        commentary += `Bu seviye, en yakin guclu destegin altindadir. Bu seviyenin kirilmasi, trend degisimi anlamina gelebilir. `;
      } else {
        commentary += `Bu seviye, en yakin guclu direncin ustundedir. `;
      }
    }
    commentary += `Sermayenin korunmasi icin stop-loss kullanmak ZORUNLUDUR.\n\n`;
  }

  // Take profit explanation
  if (takeProfits.length > 0) {
    commentary += `KAR HEDEFLERI: `;
    takeProfits.forEach((tp, i) => {
      commentary += `TP${i+1}: ${formatPrice(tp.price)} (+%${tp.percentage?.toFixed(1)}) `;
    });
    commentary += `\nKademeli kar realizasyonu onerilir: her hedefte pozisyonun bir kismini kapatin.\n\n`;
  }

  // Risk/Reward explanation
  commentary += `RISK/GETIRI ORANI: ${rr.toFixed(2)}:1 - `;
  if (rr >= 3) {
    commentary += `Mukemmel risk/getiri orani! Bu islem yuksek pozitif beklentiye sahip.`;
  } else if (rr >= 2) {
    commentary += `Iyi risk/getiri orani. Profesyonel traderlar genellikle en az 2:1 oran ararlar.`;
  } else if (rr >= 1) {
    commentary += `Kabul edilebilir risk/getiri orani ancak ideal degil.`;
  } else {
    commentary += `Dusuk risk/getiri orani. Bu islem onerilmeyebilir.`;
  }

  return commentary;
}

function generateTrapCheckEducation(data: AnalysisReportData): string {
  const traps = data.trapCheck.traps;
  const strategies = data.trapCheck.counterStrategy || [];

  let commentary = '';

  commentary += `TUZAK ANALIZI: `;

  if (traps?.bullTrap) {
    commentary += `BULL TRAP RISKI TESPIT EDILDI! Fiyat yukari kirilmis gibi gorunebilir ancak bu sahte olabilir. Onay bekleyin. `;
  }

  if (traps?.bearTrap) {
    commentary += `BEAR TRAP RISKI TESPIT EDILDI! Fiyat asagi kirilmis gibi gorunebilir ancak bu sahte olabilir. Panik satisi yapmayin. `;
  }

  if (traps?.fakeoutRisk === 'high') {
    commentary += `Fakeout (sahte kirilim) riski yuksek. Kirilislarda hemen islem acmak yerine, en az 4 saatlik mum kapanisini bekleyin. `;
  }

  if (!traps?.bullTrap && !traps?.bearTrap && traps?.fakeoutRisk !== 'high') {
    commentary += `Belirgin bir tuzak riski tespit edilmedi. Normal dikkatle islem yapilabilir. `;
  }

  if (strategies.length > 0) {
    commentary += `\n\nKORUNMA STRATEJILERI:\n`;
    strategies.forEach((s, i) => {
      commentary += `${i+1}. ${s}\n`;
    });
  }

  return commentary;
}

function generateVerdictEducation(data: AnalysisReportData): string {
  const verdict = data.verdict;
  const score = verdict.overallScore || 0;
  const action = verdict.action?.toLowerCase() || '';
  const positives = (verdict.confidenceFactors || []).filter(f => f.positive);
  const negatives = (verdict.confidenceFactors || []).filter(f => !f.positive);

  let commentary = '';

  commentary += `GENEL DEGERLENDIRME: `;

  if (score >= 8) {
    commentary += `Cok guclu sinyal (${score}/10). Cogu gosterge ayni yonde isaret ediyor. `;
  } else if (score >= 6) {
    commentary += `Iyi sinyal (${score}/10). Pozitif faktorler baskinda ancak bazi riskler var. `;
  } else if (score >= 4) {
    commentary += `Notr sinyal (${score}/10). Net bir yon belirgin degil. Beklemek akillica olabilir. `;
  } else {
    commentary += `Zayif veya negatif sinyal (${score}/10). Islem onerilmiyor. `;
  }

  if (positives.length > 0) {
    commentary += `\n\nGUCLU YANLAR: `;
    positives.forEach(p => {
      commentary += `${p.factor}; `;
    });
  }

  if (negatives.length > 0) {
    commentary += `\n\nRISK FAKTORLERI: `;
    negatives.forEach(n => {
      commentary += `${n.factor}; `;
    });
  }

  commentary += `\n\nSONUC: ${verdict.action}`;

  return commentary;
}

// Reusable Footer Component
const PageFooter = ({ pageNumber, t }: { pageNumber: number; t: PDFTranslations }) => (
  <View style={styles.footer}>
    <View style={styles.footerRow}>
      <Text style={styles.footerText}>{t.footerTitle}</Text>
      <Text style={styles.footerText}>{t.footerPowered}</Text>
      <Text style={styles.footerText}>{t.page} {pageNumber}</Text>
    </View>
    <Text style={styles.footerDisclaimer}>{t.disclaimer}</Text>
  </View>
);

// AI Commentary Section Component
const AICommentary = ({ title, content }: { title: string; content: string }) => (
  <View style={styles.aiCommentary}>
    <Text style={styles.aiTitle}>{title}</Text>
    <Text style={styles.aiText}>{content}</Text>
  </View>
);

// PDF Document Component - Each step on separate page
const AnalysisReportDocument = ({ data, t }: { data: AnalysisReportData; t: PDFTranslations }) => {
  const getVerdictColor = () => {
    const action = data.verdict.action?.toLowerCase() || '';
    if (action.includes('go') && !action.includes('avoid')) return '#10b981';
    if (action.includes('avoid')) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <Document>
      {/* Page 1: Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.logo}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          <Text style={styles.coverTitle}>{t.reportTitle}</Text>
          <Text style={styles.coverSymbol}>{data.symbol}/USDT</Text>

          <Text style={styles.coverMeta}>{t.generatedAt} {data.generatedAt}</Text>
          <Text style={styles.coverMeta}>{t.analysisId} {data.analysisId}</Text>

          <View style={[styles.verdictBadge, { backgroundColor: getVerdictColor() }]}>
            <Text style={styles.verdictText}>{data.verdict.action}</Text>
            <Text style={styles.scoreText}>{t.score} {data.verdict.overallScore}/10</Text>
          </View>

          {/* Powered by Gemini */}
          <Text style={styles.poweredBy}>{t.poweredBy}</Text>
          <Text style={styles.geminiLogo}>Google Gemini 2.5 Flash</Text>
        </View>

        <PageFooter pageNumber={1} t={t} />
      </Page>

      {/* Page 2: Step 1 - Market Pulse */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 1 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.marketPulse}</Text>
        <Text style={styles.sectionSubtitle}>{t.marketPulseDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.btcDominance}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.btcDominance?.toFixed(1) || 0}%</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.fearGreed}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.fearGreedIndex || 0} ({data.marketPulse.fearGreedLabel || 'N/A'})</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.marketRegime}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.marketRegime || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.trend}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.trend?.direction || 'N/A'} ({data.marketPulse.trend?.strength || 0}%)</Text>
            </View>
          </View>
        </View>

        <AICommentary
          title={t.aiMarketPulse}
          content={data.marketPulse.aiSummary || generateMarketPulseEducation(data)}
        />

        <PageFooter pageNumber={2} t={t} />
      </Page>

      {/* Page 3: Step 2 - Asset Scan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 2 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.assetScan}</Text>
        <Text style={styles.sectionSubtitle}>{t.assetScanDesc} {data.symbol}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.currentPrice}</Text>
              <Text style={styles.miniCardValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.change24h}</Text>
              <Text style={[styles.miniCardValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                {(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.rsi}</Text>
              <Text style={styles.miniCardValue}>{data.assetScan.indicators?.rsi?.toFixed(1) || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.macd}</Text>
              <Text style={styles.miniCardValue}>{(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? t.positive : t.negative}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.supportResistance}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t.support}</Text>
            <Text style={styles.valueGreen}>{data.assetScan.levels?.support?.slice(0, 3).map(s => formatPrice(s)).join(' / ') || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t.resistance}</Text>
            <Text style={styles.valueRed}>{data.assetScan.levels?.resistance?.slice(0, 3).map(r => formatPrice(r)).join(' / ') || 'N/A'}</Text>
          </View>
        </View>

        <AICommentary
          title={t.aiAssetScan}
          content={data.assetScan.aiInsight || generateAssetScanEducation(data)}
        />

        <PageFooter pageNumber={3} t={t} />
      </Page>

      {/* Page 4: Step 3 - Safety Check */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 3 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.safetyCheck}</Text>
        <Text style={styles.sectionSubtitle}>{t.safetyCheckDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.riskLevel}</Text>
              <Text style={[styles.miniCardValue, {
                color: data.safetyCheck.riskLevel === 'high' ? '#ef4444' :
                       data.safetyCheck.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
              }]}>{(data.safetyCheck.riskLevel || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.pumpDumpRisk}</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.whaleActivity}</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.whaleActivity?.bias || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.smartMoney}</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.smartMoney?.positioning || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {data.safetyCheck.warnings && data.safetyCheck.warnings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.warnings}</Text>
            {data.safetyCheck.warnings.map((warning, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>!</Text>
                <Text style={styles.bulletText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        <AICommentary
          title={t.aiSafetyCheck}
          content={data.safetyCheck.aiInsight || generateSafetyCheckEducation(data)}
        />

        <PageFooter pageNumber={4} t={t} />
      </Page>

      {/* Page 5: Step 4 - Timing */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 4 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.timing}</Text>
        <Text style={styles.sectionSubtitle}>{t.timingDesc}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.tradeNow} {data.timing.tradeNow ? t.yes : t.no}</Text>
          <Text style={styles.aiText}>{data.timing.reason || 'N/A'}</Text>
        </View>

        {data.timing.entryZones && data.timing.entryZones.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.entryZones}</Text>
            {data.timing.entryZones.map((zone, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{t.zone} {i + 1} ({zone.eta || 'N/A'})</Text>
                <Text style={styles.value}>{formatPrice(zone.priceLow)} - {formatPrice(zone.priceHigh)} (%{zone.probability || 0})</Text>
              </View>
            ))}
          </View>
        )}

        {data.timing.conditions && data.timing.conditions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.entryConditions}</Text>
            {data.timing.conditions.map((cond, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{cond.name}</Text>
                <Text style={cond.met ? styles.valueGreen : styles.valueRed}>{cond.met ? t.met : t.notMet}</Text>
              </View>
            ))}
          </View>
        )}

        <AICommentary
          title={t.aiTiming}
          content={data.timing.aiInsight || generateTimingEducation(data)}
        />

        <PageFooter pageNumber={5} t={t} />
      </Page>

      {/* Page 6: Step 5 - Trade Plan (DETAILED) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 5 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.tradePlan}</Text>
        <Text style={styles.sectionSubtitle}>{t.tradePlanDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.direction}</Text>
              <Text style={[styles.miniCardValue, { color: data.tradePlan.direction === 'long' ? '#10b981' : '#ef4444' }]}>
                {(data.tradePlan.direction || 'N/A').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.riskReward}</Text>
              <Text style={styles.miniCardValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.winRate}</Text>
              <Text style={styles.miniCardValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.position}</Text>
              <Text style={styles.miniCardValue}>{(data.tradePlan.positionSizePercent || 0).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.entryLevels}</Text>
          {data.tradePlan.entries?.map((entry, i) => (
            <View key={i} style={styles.entryRow}>
              <Text style={styles.entryLabel}>E{i + 1}</Text>
              <Text style={styles.entryPrice}>{formatPrice(entry.price)}</Text>
              <Text style={styles.entryPercent}>{entry.percentage}% ({entry.type})</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.label}>{t.averageEntry}</Text>
            <Text style={styles.value}>{formatPrice(data.tradePlan.averageEntry)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.stopLoss}</Text>
          <View style={styles.stopRow}>
            <Text style={[styles.entryLabel, { color: '#ef4444' }]}>SL</Text>
            <Text style={styles.entryPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
            <Text style={styles.entryPercent}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(2)}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.profitTargets}</Text>
          {data.tradePlan.takeProfits?.map((tp, i) => (
            <View key={i} style={styles.tpRow}>
              <Text style={[styles.entryLabel, { color: '#10b981' }]}>TP{i + 1}</Text>
              <Text style={styles.entryPrice}>{formatPrice(tp.price)}</Text>
              <Text style={styles.entryPercent}>+{tp.percentage?.toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNumber={6} t={t} />
      </Page>

      {/* Page 7: Trade Plan - AI Explanation */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 5 {t.of} 7 - {t.continued}</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.tradePlanExplanation}</Text>
        <Text style={styles.sectionSubtitle}>{t.whyTheseLevels}</Text>

        <AICommentary
          title={t.aiTradePlan}
          content={data.tradePlan.aiInsight || generateTradePlanEducation(data)}
        />

        <View style={styles.keyInsight}>
          <Text style={styles.keyInsightTitle}>{t.importantReminder}</Text>
          <Text style={styles.keyInsightText}>{t.reminderText}</Text>
        </View>

        <PageFooter pageNumber={7} t={t} />
      </Page>

      {/* Page 8: Step 6 - Trap Check */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 6 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.trapCheck}</Text>
        <Text style={styles.sectionSubtitle}>{t.trapCheckDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.bullTrap}</Text>
              <Text style={[styles.miniCardValue, { color: data.trapCheck.traps?.bullTrap ? '#ef4444' : '#10b981' }]}>
                {data.trapCheck.traps?.bullTrap ? t.detected : t.none}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.bearTrap}</Text>
              <Text style={[styles.miniCardValue, { color: data.trapCheck.traps?.bearTrap ? '#ef4444' : '#10b981' }]}>
                {data.trapCheck.traps?.bearTrap ? t.detected : t.none}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.fakeoutRisk}</Text>
              <Text style={[styles.miniCardValue, {
                color: data.trapCheck.traps?.fakeoutRisk === 'high' ? '#ef4444' :
                       data.trapCheck.traps?.fakeoutRisk === 'medium' ? '#f59e0b' : '#10b981'
              }]}>{(data.trapCheck.traps?.fakeoutRisk || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {data.trapCheck.counterStrategy && data.trapCheck.counterStrategy.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.protectionStrategies}</Text>
            {data.trapCheck.counterStrategy.map((strategy, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{strategy}</Text>
              </View>
            ))}
          </View>
        )}

        <AICommentary
          title={t.aiTrapCheck}
          content={data.trapCheck.aiInsight || generateTrapCheckEducation(data)}
        />

        <PageFooter pageNumber={8} t={t} />
      </Page>

      {/* Page 9: Step 7 - Final Verdict */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 7 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.verdict}</Text>
        <Text style={styles.sectionSubtitle}>{t.verdictDesc}</Text>

        <View style={[styles.card, { backgroundColor: getVerdictColor() + '15' }]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, { color: getVerdictColor(), fontSize: 18 }]}>{data.verdict.action}</Text>
            <Text style={[styles.miniCardValue, { color: getVerdictColor(), fontSize: 24 }]}>{data.verdict.overallScore}/10</Text>
          </View>
        </View>

        {data.verdict.confidenceFactors && data.verdict.confidenceFactors.length > 0 && (
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.positiveFactors}</Text>
                {data.verdict.confidenceFactors.filter(f => f.positive).map((f, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletPoint}>+</Text>
                    <Text style={[styles.bulletText, { color: '#10b981' }]}>{f.factor}</Text>
                  </View>
                ))}
                {data.verdict.confidenceFactors.filter(f => f.positive).length === 0 && (
                  <Text style={styles.aiText}>{t.noPositiveFactors}</Text>
                )}
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.riskFactors}</Text>
                {data.verdict.confidenceFactors.filter(f => !f.positive).map((f, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletPoint}>-</Text>
                    <Text style={[styles.bulletText, { color: '#ef4444' }]}>{f.factor}</Text>
                  </View>
                ))}
                {data.verdict.confidenceFactors.filter(f => !f.positive).length === 0 && (
                  <Text style={styles.aiText}>{t.noRiskFactors}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <AICommentary
          title={t.aiVerdict}
          content={data.verdict.aiSummary || generateVerdictEducation(data)}
        />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>{t.legalDisclaimer}</Text>
          <Text style={styles.disclaimerText}>{t.legalText}</Text>
        </View>

        <PageFooter pageNumber={9} t={t} />
      </Page>
    </Document>
  );
};

// Export function to generate and download PDF
export async function generateAnalysisReport(data: AnalysisReportData, language: string = 'en'): Promise<void> {
  const t = getPDFTranslations(language);
  const blob = await pdf(<AnalysisReportDocument data={data} t={t} />).toBlob();
  const langSuffix = language === 'en' ? 'Report' : 'Rapor';
  const filename = `TradePath_${data.symbol}_${langSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

// Export the document component for preview if needed
export { AnalysisReportDocument };
export type { AnalysisReportData };
