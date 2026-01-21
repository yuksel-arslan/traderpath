import {
  IntentType,
  VerdictType,
  QuickAnalysisResult,
  ExpertAskResult,
  AlertSetResult,
  StatusResult,
  HelpResult,
  ConciergeResultData,
} from './types';

interface SynthesizeOptions {
  language: string;
  intent: IntentType;
  data: ConciergeResultData;
}

// Localized messages
const MESSAGES: Record<string, Record<string, string>> = {
  tr: {
    // Verdicts
    GO: 'GO - Giriş yapılabilir',
    CONDITIONAL_GO: 'KOŞULLU - Dikkatli giriş',
    WAIT: 'BEKLE - Şimdilik girme',
    AVOID: 'KAÇIN - Riskli',

    // Directions
    long: 'Long (Alım)',
    short: 'Short (Satım)',

    // Labels
    entry: 'Giriş',
    stopLoss: 'Stop Loss',
    takeProfit: 'Take Profit',
    riskReward: 'Risk/Ödül',
    score: 'Skor',

    // Help
    helpTitle: 'TraderPath Concierge - Yapabileceklerim',
    helpAnalysis: 'Hızlı analiz: "BTC nasıl?", "ETH\'ye gireyim mi?"',
    helpSpecific: 'Özel analiz: "BTC 4h analiz", "SOL scalp"',
    helpMulti: 'Çoklu analiz: "Top 5 coin analiz"',
    helpAlert: 'Alarm kur: "BTC 70K olunca haber ver"',
    helpStatus: 'Durum: "Son analizlerim", "Kredim"',
    helpExpert: 'Expert sor: "RSI nedir?", "MACD nasıl çalışır?"',

    // Status
    recentAnalyses: 'Son Analizlerin',
    noAnalyses: 'Henüz analiz yapmadın',
    activeAlerts: 'Aktif Alarm',
    creditBalance: 'Kredi Bakiyesi',

    // Alerts
    alertCreated: 'Alarm oluşturuldu',
    alertAbove: 'üstüne çıkınca',
    alertBelow: 'altına düşünce',

    // Errors
    insufficientCredits: 'Yetersiz kredi. Mevcut: {balance}, Gerekli: {required}',
    unknownIntent: 'Anlayamadım. "Yardım" yazarak ne yapabileceğimi görebilirsin.',
    analysisFailed: 'Analiz başarısız oldu. Lütfen tekrar dene.',

    // Suggestions
    suggestDetail: 'Detay göster',
    suggestPdf: 'PDF indir',
    suggestExpert: 'Expert\'e sor',
    suggestAlert: 'Alarm kur',
  },
  en: {
    // Verdicts
    GO: 'GO - Entry recommended',
    CONDITIONAL_GO: 'CONDITIONAL - Careful entry',
    WAIT: 'WAIT - Not now',
    AVOID: 'AVOID - Too risky',

    // Directions
    long: 'Long (Buy)',
    short: 'Short (Sell)',

    // Labels
    entry: 'Entry',
    stopLoss: 'Stop Loss',
    takeProfit: 'Take Profit',
    riskReward: 'Risk/Reward',
    score: 'Score',

    // Help
    helpTitle: 'TraderPath Concierge - What I can do',
    helpAnalysis: 'Quick analysis: "How is BTC?", "Should I buy ETH?"',
    helpSpecific: 'Specific analysis: "BTC 4h analysis", "SOL scalp"',
    helpMulti: 'Multi analysis: "Analyze top 5 coins"',
    helpAlert: 'Set alert: "Alert me when BTC hits 70K"',
    helpStatus: 'Status: "My recent analyses", "My credits"',
    helpExpert: 'Ask expert: "What is RSI?", "How does MACD work?"',

    // Status
    recentAnalyses: 'Recent Analyses',
    noAnalyses: 'No analyses yet',
    activeAlerts: 'Active Alerts',
    creditBalance: 'Credit Balance',

    // Alerts
    alertCreated: 'Alert created',
    alertAbove: 'rises above',
    alertBelow: 'drops below',

    // Errors
    insufficientCredits: 'Insufficient credits. Available: {balance}, Required: {required}',
    unknownIntent: 'I didn\'t understand. Type "help" to see what I can do.',
    analysisFailed: 'Analysis failed. Please try again.',

    // Suggestions
    suggestDetail: 'Show details',
    suggestPdf: 'Download PDF',
    suggestExpert: 'Ask expert',
    suggestAlert: 'Set alert',
  },
};

function getMessage(language: string, key: string, vars?: Record<string, string | number>): string {
  const lang = MESSAGES[language] ? language : 'en';
  let message = MESSAGES[lang][key] || MESSAGES['en'][key] || key;

  if (vars) {
    for (const [varKey, value] of Object.entries(vars)) {
      message = message.replace(`{${varKey}}`, String(value));
    }
  }

  return message;
}

function getVerdictEmoji(verdict: VerdictType): string {
  switch (verdict) {
    case 'GO':
      return '🟢';
    case 'CONDITIONAL_GO':
      return '🟡';
    case 'WAIT':
      return '🟠';
    case 'AVOID':
      return '🔴';
    default:
      return '⚪';
  }
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

export function synthesizeQuickAnalysis(
  data: QuickAnalysisResult,
  language: string
): { message: string; suggestions: string[] } {
  const emoji = getVerdictEmoji(data.verdict);
  const verdictText = getMessage(language, data.verdict);
  const directionText = getMessage(language, data.direction);

  const lines = [
    `${emoji} **${data.symbol}** - ${verdictText}`,
    '',
    `📈 ${directionText} | ${getMessage(language, 'score')}: ${data.score}/100`,
    '',
    `${getMessage(language, 'entry')}: ${formatPrice(data.entry)}`,
    `${getMessage(language, 'stopLoss')}: ${formatPrice(data.stopLoss)}`,
    `${getMessage(language, 'takeProfit')}: ${formatPrice(data.takeProfit1)}`,
    `${getMessage(language, 'riskReward')}: ${data.riskReward.toFixed(1)}`,
  ];

  if (data.reasoning) {
    lines.push('', `💡 ${data.reasoning}`);
  }

  const suggestions = [
    getMessage(language, 'suggestDetail'),
    getMessage(language, 'suggestPdf'),
    getMessage(language, 'suggestExpert'),
  ];

  // Add alert suggestion if GO or CONDITIONAL_GO
  if (data.verdict === 'GO' || data.verdict === 'CONDITIONAL_GO') {
    suggestions.push(getMessage(language, 'suggestAlert'));
  }

  return {
    message: lines.join('\n'),
    suggestions,
  };
}

export function synthesizeMultiAnalysis(
  results: QuickAnalysisResult[],
  language: string
): { message: string; suggestions: string[] } {
  const lines = [`📊 **${results.length} Coin Analizi**`, ''];

  // Sort by score descending
  const sorted = [...results].sort((a, b) => b.score - a.score);

  for (const result of sorted) {
    const emoji = getVerdictEmoji(result.verdict);
    lines.push(
      `${emoji} **${result.symbol}** - ${result.score}/100 | ${result.direction.toUpperCase()} | ${formatPrice(result.entry)}`
    );
  }

  // Find best opportunity
  const best = sorted.find((r) => r.verdict === 'GO' || r.verdict === 'CONDITIONAL_GO');
  if (best) {
    lines.push('', `🎯 En iyi fırsat: **${best.symbol}** (${best.score}/100)`);
  }

  return {
    message: lines.join('\n'),
    suggestions: [
      getMessage(language, 'suggestDetail'),
      best ? `${best.symbol} detay` : '',
    ].filter(Boolean),
  };
}

export function synthesizeExpertAsk(
  data: ExpertAskResult,
  language: string
): { message: string; suggestions: string[] } {
  const lines = [
    `🤖 **${data.expertName}**`,
    '',
    data.answer,
  ];

  return {
    message: lines.join('\n'),
    suggestions: [
      language === 'tr' ? 'Başka bir soru sor' : 'Ask another question',
      language === 'tr' ? 'Analiz yap' : 'Run analysis',
    ],
  };
}

export function synthesizeAlertSet(
  data: AlertSetResult,
  language: string
): { message: string; suggestions: string[] } {
  const directionText = data.direction === 'above'
    ? getMessage(language, 'alertAbove')
    : getMessage(language, 'alertBelow');

  const lines = [
    `🔔 ${getMessage(language, 'alertCreated')}`,
    '',
    `**${data.symbol}** ${formatPrice(data.targetPrice)} ${directionText}`,
  ];

  return {
    message: lines.join('\n'),
    suggestions: [
      language === 'tr' ? 'Alarmlarımı göster' : 'Show my alerts',
      language === 'tr' ? 'Başka alarm kur' : 'Set another alert',
    ],
  };
}

export function synthesizeStatus(
  data: StatusResult,
  language: string
): { message: string; suggestions: string[] } {
  const lines = [
    `📊 **${getMessage(language, 'creditBalance')}**: ${data.creditBalance} kredi`,
    `🔔 **${getMessage(language, 'activeAlerts')}**: ${data.activeAlerts}`,
    '',
    `📈 **${getMessage(language, 'recentAnalyses')}**:`,
  ];

  if (data.recentAnalyses.length === 0) {
    lines.push(getMessage(language, 'noAnalyses'));
  } else {
    for (const analysis of data.recentAnalyses.slice(0, 5)) {
      const emoji = getVerdictEmoji(analysis.verdict);
      lines.push(`${emoji} ${analysis.symbol} - ${analysis.score}/100`);
    }
  }

  return {
    message: lines.join('\n'),
    suggestions: [
      language === 'tr' ? 'Yeni analiz yap' : 'Run new analysis',
      language === 'tr' ? 'Detay göster' : 'Show details',
    ],
  };
}

export function synthesizeHelp(language: string): { message: string; suggestions: string[] } {
  const lines = [
    `🤖 **${getMessage(language, 'helpTitle')}**`,
    '',
    `📈 ${getMessage(language, 'helpAnalysis')}`,
    `🎯 ${getMessage(language, 'helpSpecific')}`,
    `📊 ${getMessage(language, 'helpMulti')}`,
    `🔔 ${getMessage(language, 'helpAlert')}`,
    `📋 ${getMessage(language, 'helpStatus')}`,
    `🧠 ${getMessage(language, 'helpExpert')}`,
  ];

  return {
    message: lines.join('\n'),
    suggestions: [
      'BTC nasıl?',
      'ETH 4h analiz',
      'Son analizlerim',
    ],
  };
}

export function synthesizeError(
  error: string,
  language: string
): { message: string; suggestions: string[] } {
  return {
    message: `❌ ${error}`,
    suggestions: [
      language === 'tr' ? 'Yardım' : 'Help',
      language === 'tr' ? 'Tekrar dene' : 'Try again',
    ],
  };
}

export function synthesizeResponse(options: SynthesizeOptions): { message: string; suggestions: string[] } {
  const { language, intent, data } = options;

  // Handle error
  if ('error' in data) {
    return synthesizeError(data.error, language);
  }

  switch (intent) {
    case 'QUICK_ANALYSIS':
    case 'SPECIFIC_ANALYSIS':
      return synthesizeQuickAnalysis(data as QuickAnalysisResult, language);

    case 'MULTI_ANALYSIS':
      return synthesizeMultiAnalysis(data as QuickAnalysisResult[], language);

    case 'EXPERT_ASK':
      return synthesizeExpertAsk(data as ExpertAskResult, language);

    case 'ALERT_SET':
      return synthesizeAlertSet(data as AlertSetResult, language);

    case 'STATUS':
      return synthesizeStatus(data as StatusResult, language);

    case 'HELP':
      return synthesizeHelp(language);

    case 'ALERT_LIST':
      return synthesizeStatus(data as StatusResult, language);

    default:
      return synthesizeError(getMessage(language, 'unknownIntent'), language);
  }
}
