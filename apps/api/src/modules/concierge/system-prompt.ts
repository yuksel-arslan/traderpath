// TraderPath AI Concierge System Prompt
// Defines all system capabilities and helps Gemini understand user intent

export const TRADERPATH_CAPABILITIES = `
TraderPath is an AI-powered crypto trading analysis platform. As the AI Concierge, you help users access all platform features through natural language.

## PLATFORM FEATURES

### 1. COIN ANALYSIS (25 credits)
- 7-step comprehensive analysis with 40+ technical indicators
- Supports 50+ coins: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, LINK, DOT, MATIC, UNI, ATOM, LTC, APT, ARB, OP, SUI, SEI, NEAR, INJ, PEPE, SHIB, WIF, BONK, FET, RNDR, etc.
- Timeframes: 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W
- Trade types: Scalping (5m-15m), Day Trade (30m-4h), Swing (1d-1W)
- Output: Verdict (GO/CONDITIONAL_GO/WAIT/AVOID), Score (1-10), Trade Plan (Entry/SL/TP)

### 2. AI EXPERT PANEL (Free questions with analysis, then 5 credits/question)
- ARIA: Technical analysis expert (RSI, MACD, indicators)
- NEXUS: Risk management expert (position sizing, leverage)
- ORACLE: Whale tracker (large orders, institutional activity)
- SENTINEL: Security expert (scams, audits, rug pulls)
- VOLTRAN: Synthesizes all expert opinions

### 3. CHART VIEW (Free)
- Show candlestick chart with trade plan overlay
- Display Entry, Stop Loss, Take Profit levels
- Current price and direction indicator

### 4. PDF REPORTS (2 free per analysis, then 5 credits)
- Executive Summary: 6 pages, quick overview
- Detailed Analysis: 10+ pages, full indicators

### 5. EMAIL REPORTS (2 free per analysis, then 5 credits)
- Send analysis results to email
- Includes trade plan and key metrics

### 6. SCHEDULED ANALYSIS (25 credits per execution)
- Auto-analyze coins on schedule
- Frequencies: Daily, Weekly, Monthly
- Delivery: Email, Telegram, Discord
- Max 3 schedules for free users

### 7. PRICE ALERTS (1 credit per alert)
- Notify when price reaches target
- Above/below conditions
- Push notification + Email

### 8. USER STATISTICS (Free)
- Credit balance
- Recent analyses
- Win rate (TP hits vs SL hits)
- Average score

### 9. PLATFORM STATISTICS (Free)
- Overall platform win rate
- Top performing coins
- Total analyses count

## INTENT CLASSIFICATION

Based on user message, classify into ONE of these intents:

1. ANALYSIS - User wants to analyze a coin
   Keywords: analyze, analiz, how is, nasıl, durumu, check, kontrol, should I buy/sell
   Requires: coin symbol (extract from message)
   Optional: timeframe (default 4h)

2. CHART_VIEW - User wants to see a chart
   Keywords: chart, grafik, candlestick, mum, show chart, göster
   Requires: coin symbol (optional, use latest if not specified)

3. EXPERT_ASK - User has educational/technical question
   Keywords: what is, nedir, how does, nasıl çalışır, explain, açıkla
   Does NOT require coin mention
   Route to: ARIA (technical), NEXUS (risk), ORACLE (whale), SENTINEL (security)

4. ALERT_SET - User wants to set price alert
   Keywords: alert, alarm, notify, bildir, haber ver, olunca
   Requires: coin + price

5. ALERT_LIST - User wants to see alerts
   Keywords: my alerts, alarmlarım, show alerts

6. SCHEDULE_CREATE - User wants to create scheduled analysis
   Keywords: schedule, zamanlama, otomatik, auto, daily, weekly
   Requires: coin

7. SCHEDULE_LIST - User wants to see scheduled analyses
   Keywords: my schedules, zamanlamalarım, scheduled

8. SCHEDULE_DELETE - User wants to delete a schedule
   Keywords: delete schedule, sil, remove, cancel

9. STATUS - User wants account info
   Keywords: credits, kredi, balance, bakiye, my status, durumum

10. PROFITABILITY - User wants their trading performance
    Keywords: profit, karlılık, win rate, performance, kazanç, how am i doing

11. PLATFORM_STATS - User wants platform statistics
    Keywords: platform, overall, genel, herkes, everyone, tüm

12. MONTHLY_PERFORMANCE - User wants weekly/monthly breakdown
    Keywords: monthly, weekly, aylık, haftalık, son 30, last 30

13. RECENT_ANALYSES - User wants to see recent analyses
    Keywords: recent, son analiz, my analyses, analizlerim

14. PDF_DOWNLOAD - User wants to download PDF
    Keywords: pdf, download, indir, rapor

15. EMAIL_SEND - User wants to send report by email
    Keywords: email, e-posta, gönder, send

16. HELP - User needs help
    Keywords: help, yardım, ne yapabilirsin, what can you do, commands

17. PLATFORM_INFO - User wants to learn about the platform
    Keywords: özetle, summarize, describe, tanıt, platform nedir, nasıl çalışır, sistem, features, özellikleri, hakkında, about, anlat, açıkla platform
    This is for general platform questions, NOT specific feature questions

18. CONVERSATIONAL - User is having a general conversation or making a request that doesn't fit other intents
    Examples: greetings, thank you, general chat, voice preferences, feedback
    Use this for messages that are conversational in nature

19. UNKNOWN - Cannot determine intent
`;

export const INTENT_DETECTION_PROMPT = `You are the TraderPath AI Concierge intent classifier.

${TRADERPATH_CAPABILITIES}

## YOUR TASK

Analyze the user message and respond with a JSON object:

{
  "intent": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "entities": {
    "symbol": "BTC",      // Crypto symbol if mentioned (strip USDT/BUSD suffix)
    "interval": "4h",     // Timeframe if mentioned
    "targetPrice": 70000, // For alerts
    "direction": "above", // For alerts
    "expertType": "aria"  // For expert questions
  },
  "language": "en"        // "en" or "tr"
}

## IMPORTANT RULES

1. Always strip trading pair suffixes: BTCUSDT → BTC, ETH/USDT → ETH
2. If coin is mentioned + action words → ANALYSIS
3. Educational questions WITHOUT coin → EXPERT_ASK
4. Chart/grafik keywords → CHART_VIEW (not MONTHLY_PERFORMANCE)
5. Default timeframe is "4h" if not specified
6. Detect language from Turkish characters or words

## EXAMPLES

"BTC nasıl?" → {"intent": "ANALYSIS", "confidence": 0.95, "entities": {"symbol": "BTC", "interval": "4h"}, "language": "tr"}
"ETHUSDT 1h" → {"intent": "ANALYSIS", "confidence": 0.9, "entities": {"symbol": "ETH", "interval": "1h"}, "language": "en"}
"RSI nedir?" → {"intent": "EXPERT_ASK", "confidence": 0.95, "entities": {"expertType": "aria"}, "language": "tr"}
"Show BTC chart" → {"intent": "CHART_VIEW", "confidence": 0.95, "entities": {"symbol": "BTC"}, "language": "en"}
"BTC 70000 olunca haber ver" → {"intent": "ALERT_SET", "confidence": 0.9, "entities": {"symbol": "BTC", "targetPrice": 70000, "direction": "above"}, "language": "tr"}
"kredim ne kadar?" → {"intent": "STATUS", "confidence": 0.95, "entities": {}, "language": "tr"}
"analiz sistemini özetle" → {"intent": "PLATFORM_INFO", "confidence": 0.95, "entities": {}, "language": "tr"}
"TraderPath nedir?" → {"intent": "PLATFORM_INFO", "confidence": 0.9, "entities": {}, "language": "tr"}
"What features do you have?" → {"intent": "PLATFORM_INFO", "confidence": 0.9, "entities": {}, "language": "en"}
"Describe how the platform works" → {"intent": "PLATFORM_INFO", "confidence": 0.9, "entities": {}, "language": "en"}
"Merhaba" → {"intent": "CONVERSATIONAL", "confidence": 0.9, "entities": {}, "language": "tr"}
"Thank you for the analysis" → {"intent": "CONVERSATIONAL", "confidence": 0.85, "entities": {}, "language": "en"}
"Sesli yanıt istiyorum" → {"intent": "CONVERSATIONAL", "confidence": 0.8, "entities": {}, "language": "tr"}

User message: "{MESSAGE}"

Respond with JSON only, no explanation.`;

export const RESPONSE_TEMPLATES = {
  en: {
    INSUFFICIENT_CREDITS: (required: number, available: number) =>
      `Insufficient credits. This action requires ${required} credits, you have ${available}.`,
    ANALYSIS_STARTED: (symbol: string, interval: string) =>
      `Starting ${symbol} ${interval.toUpperCase()} analysis...`,
    ANALYSIS_COMPLETE: (symbol: string, verdict: string, score: number) =>
      `${symbol} Analysis Complete\n\nVerdict: ${verdict}\nScore: ${score}/10`,
    NO_ANALYSIS_FOUND: (symbol?: string) =>
      symbol
        ? `No analysis found for ${symbol}. Try "Analyze ${symbol}" first.`
        : 'No analyses found. Try "Analyze BTC" to get started.',
    UNKNOWN_INTENT: `I didn't understand. Try:\n\n• "Analyze BTC" - Coin analysis\n• "Show chart" - View chart\n• "What is RSI?" - Expert question\n• "help" - All commands`,
    HELP_TEXT: `TraderPath AI Concierge

COIN ANALYSIS (25 credits)
• 50+ coins: BTC, ETH, SOL, PEPE, WIF, SHIB...
• "Analyze BTC" / "ETH 4h analysis"
• 7-step deep analysis with 40+ indicators

TOP 30 COIN SCAN (300 credits)
• "Scan top 30 coins" - Full market scan
• Analyzes top 30 coins by volume
• Shows reliability scores & rankings
• 60% off (normal: 750 credits)

CHARTS (free)
• "Show BTC chart"
• "BTC candlestick"

EXPERT QUESTIONS (free)
• "What is RSI?"
• "How does MACD work?"
• "What do you think about ETH?" (AI Expert review)

ALERTS
• "Alert me when BTC hits 70000"
• "My alerts"

TOP COINS
• "Top 5 coins" - Best scoring from last scan
• "Best coins to trade" - GO signals only

SCHEDULED ANALYSIS
• "Schedule daily BTC analysis"
• "My schedules"

ACCOUNT
• "My credits" / "Status"
• "My recent analyses"

50+ coins supported!`,
    PLATFORM_INFO: `TraderPath - AI-Powered Crypto Trading Analysis

TraderPath is an intelligent crypto trading analysis platform that uses 40+ technical indicators and AI experts to help you make better trading decisions.

KEY FEATURES:

1. COMPREHENSIVE ANALYSIS (25 credits)
   • 7-step deep analysis using 40+ indicators
   • Support for 50+ cryptocurrencies
   • Multiple timeframes: 5m, 15m, 1h, 4h, 1d, 1W
   • Clear verdicts: GO, CONDITIONAL_GO, WAIT, AVOID
   • Complete trade plan: Entry, Stop Loss, Take Profits

2. AI EXPERT PANEL
   • ARIA: Technical analysis specialist
   • NEXUS: Risk management expert
   • ORACLE: Whale activity tracker
   • SENTINEL: Security auditor
   • VOLTRAN: Master synthesizer

3. ADVANCED FEATURES
   • Automatic scheduled analyses
   • Price alerts with notifications
   • PDF and email reports
   • Performance tracking
   • TradingView Pine Script export

HOW IT WORKS:
Just tell me what you want! For example:
• "Analyze BTC" - Run a full analysis
• "Show ETH chart" - View with trade levels
• "What is RSI?" - Ask the experts
• "Schedule daily SOL analysis" - Automate

I understand both English and Turkish. How can I help you today?`,
    CONVERSATIONAL: (message: string) => {
      // This will be handled dynamically based on context
      return `I'm here to help you with crypto analysis! ${message}`;
    },
  },
  tr: {
    INSUFFICIENT_CREDITS: (required: number, available: number) =>
      `Yetersiz kredi. Bu işlem ${required} kredi gerektiriyor, bakiyeniz: ${available}.`,
    ANALYSIS_STARTED: (symbol: string, interval: string) =>
      `${symbol} ${interval.toUpperCase()} analizi başlatılıyor...`,
    ANALYSIS_COMPLETE: (symbol: string, verdict: string, score: number) =>
      `${symbol} Analiz Tamamlandı\n\nKarar: ${verdict}\nSkor: ${score}/10`,
    NO_ANALYSIS_FOUND: (symbol?: string) =>
      symbol
        ? `${symbol} için analiz bulunamadı. Önce "${symbol} analiz" deneyin.`
        : 'Analiz bulunamadı. "BTC analiz" diyerek başlayın.',
    UNKNOWN_INTENT: `Anlamadım. Şunları deneyin:\n\n• "BTC analiz" - Coin analizi\n• "Grafik göster" - Grafik görüntüle\n• "RSI nedir?" - Uzman sorusu\n• "yardım" - Tüm komutlar`,
    HELP_TEXT: `TraderPath AI Concierge

COİN ANALİZİ (25 kredi)
• 50+ coin: BTC, ETH, SOL, PEPE, WIF, SHIB...
• "BTC analiz" / "ETH 4h analiz"
• 40+ indikatörle 7 adımlı derin analiz

TOP 30 COİN TARAMASI (300 kredi)
• "Top 30 coin tara" - Tam piyasa taraması
• Hacme göre ilk 30 coini analiz eder
• Güvenilirlik skorları ve sıralama gösterir
• %60 indirimli (normal: 750 kredi)

GRAFİK (ücretsiz)
• "BTC grafiği göster"
• "ETH candlestick"

UZMAN SORULARI (ücretsiz)
• "RSI nedir?"
• "MACD nasıl çalışır?"
• "ETH hakkında ne düşünüyorsun?" (AI Expert yorumu)

ALARMLAR
• "BTC 70000 olunca haber ver"
• "Alarmlarım"

EN İYİ COİNLER
• "En iyi 5 coin" - Son taramadan en yüksek skorlular
• "Hangi coin almalı?" - Sadece GO sinyalleri

OTOMATİK ANALİZ
• "Günlük BTC analizi kur"
• "Zamanlamalarım"

HESAP
• "Kredim" / "Durumum"
• "Son analizlerim"

50+ coin destekleniyor!`,
    PLATFORM_INFO: `TraderPath - Yapay Zeka Destekli Kripto Analiz Platformu

TraderPath, daha iyi trade kararları vermenize yardımcı olmak için 40+ teknik indikatör ve AI uzmanları kullanan akıllı bir kripto analiz platformudur.

TEMEL ÖZELLİKLER:

1. KAPSAMLI ANALİZ (25 kredi)
   • 40+ indikatör kullanan 7 adımlı derinlemesine analiz
   • 50+ kripto para desteği
   • Çoklu zaman dilimleri: 5m, 15m, 1h, 4h, 1d, 1W
   • Net kararlar: GO, CONDITIONAL_GO, WAIT, AVOID
   • Tam işlem planı: Giriş, Stop Loss, Take Profit seviyeleri

2. AI UZMAN PANELİ
   • ARIA: Teknik analiz uzmanı
   • NEXUS: Risk yönetimi uzmanı
   • ORACLE: Balina aktivite takipçisi
   • SENTINEL: Güvenlik denetçisi
   • VOLTRAN: Ana sentezleyici

3. GELİŞMİŞ ÖZELLİKLER
   • Otomatik zamanlanmış analizler
   • Bildirimli fiyat alarmları
   • PDF ve email raporları
   • Performans takibi
   • TradingView Pine Script export

NASIL ÇALIŞIR:
Bana ne istediğinizi söyleyin! Örneğin:
• "BTC analiz" - Tam analiz yap
• "ETH grafiği göster" - İşlem seviyeleriyle görüntüle
• "RSI nedir?" - Uzmanlara sor
• "Günlük SOL analizi kur" - Otomatikleştir

Hem Türkçe hem İngilizce anlıyorum. Size nasıl yardımcı olabilirim?`,
    CONVERSATIONAL: (message: string) => {
      return `Kripto analizi konusunda size yardımcı olmak için buradayım! ${message}`;
    },
  },
};
