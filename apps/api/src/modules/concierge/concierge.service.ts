import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { aiExpertService } from '../ai-expert/ai-expert.service';

interface ConciergeRequest {
  message: string;
  userId: string;
  language?: string;
}

interface ConciergeResponse {
  success: boolean;
  intent: string;
  message: string;
  creditsSpent: number;
  creditsRemaining: number;
  error?: string;
  // Analysis-specific fields
  analysisId?: string;
  verdict?: string;
  score?: number;
  voltranSynthesis?: string;
}

// Expanded coin list - 50+ popular coins
const SUPPORTED_COINS = [
  // Top 20 by market cap
  'btc', 'eth', 'bnb', 'xrp', 'ada', 'doge', 'sol', 'trx', 'dot', 'matic',
  'shib', 'ltc', 'avax', 'link', 'atom', 'uni', 'xlm', 'etc', 'xmr', 'bch',
  // DeFi tokens
  'aave', 'mkr', 'crv', 'comp', 'sushi', 'snx', 'yfi', '1inch',
  // Layer 2 / New chains
  'arb', 'op', 'apt', 'sui', 'sei', 'near', 'ftm', 'algo', 'egld', 'flow',
  // Meme coins
  'pepe', 'floki', 'wif', 'bonk',
  // Gaming / Metaverse
  'sand', 'mana', 'axs', 'gala', 'imx', 'enj',
  // AI tokens
  'fet', 'agix', 'ocean', 'rndr',
  // Others
  'vet', 'hbar', 'qnt', 'inj', 'ldo', 'rune', 'grt', 'fil', 'theta', 'icp'
];

// Coin name aliases for natural language
const COIN_ALIASES: Record<string, string> = {
  'bitcoin': 'btc',
  'ethereum': 'eth',
  'binance': 'bnb',
  'ripple': 'xrp',
  'cardano': 'ada',
  'dogecoin': 'doge',
  'solana': 'sol',
  'polygon': 'matic',
  'polkadot': 'dot',
  'chainlink': 'link',
  'uniswap': 'uni',
  'avalanche': 'avax',
  'cosmos': 'atom',
  'litecoin': 'ltc',
  'arbitrum': 'arb',
  'optimism': 'op',
  'aptos': 'apt',
  'shiba': 'shib',
  'pepe coin': 'pepe',
  'render': 'rndr',
  'fetch': 'fet',
  'singularity': 'agix',
};

// Intent detection with advanced pattern matching
function detectIntent(message: string): {
  intent: string;
  symbol?: string;
  interval?: string;
  expertType?: string;
} {
  const lower = message.toLowerCase().trim();

  // Help intent
  if (lower === 'help' || lower === '?' || lower.includes('yardım') || lower === 'nasıl kullanılır') {
    return { intent: 'HELP' };
  }

  // Status intent
  if (
    lower === 'status' ||
    lower === 'credits' ||
    lower === 'balance' ||
    lower.includes('my status') ||
    lower.includes('my credits') ||
    lower.includes('kredi') ||
    lower.includes('bakiye') ||
    lower.includes('durumum')
  ) {
    return { intent: 'STATUS' };
  }

  // Profitability/Performance intent (user's own performance)
  if (
    (lower.includes('karlılık') && !lower.includes('platform')) ||
    (lower.includes('karlilik') && !lower.includes('platform')) ||
    (lower.includes('performans') && (lower.includes('benim') || lower.includes('my'))) ||
    lower.includes('kazanç') ||
    lower.includes('kazanc') ||
    (lower.includes('profit') && !lower.includes('platform')) ||
    lower.includes('profitability') ||
    (lower.includes('performance') && lower.includes('my')) ||
    (lower.includes('win rate') && !lower.includes('platform')) ||
    (lower.includes('başarı') && !lower.includes('platform')) ||
    (lower.includes('basari') && !lower.includes('platform')) ||
    lower.includes('report my') ||
    lower.includes('how am i doing') ||
    lower.includes('nasıl gidiyorum') ||
    lower.includes('trade geçmişi') ||
    lower.includes('trade history')
  ) {
    return { intent: 'PROFITABILITY' };
  }

  // Platform stats intent
  if (
    lower.includes('platform') ||
    lower.includes('genel başarı') ||
    lower.includes('overall') ||
    lower.includes('toplam başarı') ||
    lower.includes('platform accuracy') ||
    lower.includes('site istatistik') ||
    lower.includes('herkes') ||
    lower.includes('everyone') ||
    lower.includes('tüm kullanıcı') ||
    lower.includes('all users')
  ) {
    return { intent: 'PLATFORM_STATS' };
  }

  // Monthly/Weekly performance intent
  if (
    lower.includes('aylık') ||
    lower.includes('haftalık') ||
    lower.includes('monthly') ||
    lower.includes('weekly') ||
    lower.includes('son 30') ||
    lower.includes('son 7') ||
    lower.includes('last 30') ||
    lower.includes('last 7') ||
    lower.includes('this month') ||
    lower.includes('bu ay') ||
    lower.includes('grafik') ||
    lower.includes('chart') ||
    lower.includes('trend')
  ) {
    return { intent: 'MONTHLY_PERFORMANCE' };
  }

  // Recent analyses intent
  if (
    lower.includes('son analiz') ||
    lower.includes('recent analys') ||
    lower.includes('last analys') ||
    lower.includes('analizlerim') ||
    lower.includes('my analyses') ||
    lower.includes('geçmiş analiz') ||
    lower.includes('past analys') ||
    lower.includes('analiz listesi') ||
    lower.includes('analysis list')
  ) {
    return { intent: 'RECENT_ANALYSES' };
  }

  // Alert set intent
  if (
    (lower.includes('alarm') && (lower.includes('kur') || lower.includes('set') || lower.includes('ekle') || lower.includes('add') || lower.includes('oluştur') || lower.includes('create'))) ||
    (lower.includes('alert') && (lower.includes('set') || lower.includes('add') || lower.includes('create'))) ||
    lower.includes('bildir') ||
    lower.includes('notify') ||
    lower.includes('haber ver') ||
    (lower.includes('olunca') || lower.includes('ulaşınca') || lower.includes('when') || lower.includes('reaches'))
  ) {
    return { intent: 'ALERT_SET' };
  }

  // Alert list intent
  if (
    (lower.includes('alarm') && (lower.includes('listele') || lower.includes('göster') || lower.includes('neler') || lower.includes('list') || lower.includes('show'))) ||
    (lower.includes('alert') && (lower.includes('list') || lower.includes('show') || lower.includes('my'))) ||
    lower.includes('alarmlarım') ||
    lower.includes('my alerts')
  ) {
    return { intent: 'ALERT_LIST' };
  }

  // Check for coin aliases first
  let detectedCoin: string | null = null;

  for (const [alias, symbol] of Object.entries(COIN_ALIASES)) {
    if (lower.includes(alias)) {
      detectedCoin = symbol;
      break;
    }
  }

  // Check for coin symbols
  if (!detectedCoin) {
    for (const coin of SUPPORTED_COINS) {
      // Match coin symbol with word boundaries
      const coinRegex = new RegExp(`\\b${coin}\\b`, 'i');
      if (coinRegex.test(lower)) {
        detectedCoin = coin;
        break;
      }
    }
  }

  // Analysis intent - coin detected
  if (detectedCoin) {
    // Detect interval
    let interval = '4h'; // default

    if (lower.includes('15m') || lower.includes('15 min') || lower.includes('15 dakika')) {
      interval = '15m';
    } else if (lower.includes('1h') || lower.includes('1 hour') || lower.includes('saatlik') || lower.includes('1 saat')) {
      interval = '1h';
    } else if (lower.includes('4h') || lower.includes('4 hour') || lower.includes('4 saat')) {
      interval = '4h';
    } else if (lower.includes('1d') || lower.includes('daily') || lower.includes('günlük') || lower.includes('gün')) {
      interval = '1d';
    } else if (lower.includes('1w') || lower.includes('weekly') || lower.includes('haftalık')) {
      interval = '1W';
    } else if (lower.includes('scalp')) {
      interval = '15m';
    } else if (lower.includes('swing')) {
      interval = '1d';
    }

    return {
      intent: 'ANALYSIS',
      symbol: detectedCoin.toUpperCase(),
      interval,
    };
  }

  // Expert question intent - detect expert type
  const technicalKeywords = ['rsi', 'macd', 'bollinger', 'ema', 'sma', 'indicator', 'indikatör', 'teknik'];
  const riskKeywords = ['risk', 'leverage', 'margin', 'stop loss', 'position size', 'kaldıraç'];
  const whaleKeywords = ['whale', 'balina', 'big player', 'institution', 'order book', 'emir defteri'];
  const securityKeywords = ['security', 'güvenlik', 'hack', 'scam', 'rug pull', 'audit'];

  let expertType = 'aria'; // default: technical expert

  if (technicalKeywords.some(k => lower.includes(k))) {
    expertType = 'aria';
  } else if (riskKeywords.some(k => lower.includes(k))) {
    expertType = 'nexus';
  } else if (whaleKeywords.some(k => lower.includes(k))) {
    expertType = 'oracle';
  } else if (securityKeywords.some(k => lower.includes(k))) {
    expertType = 'sentinel';
  }

  // Check if it's a question
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'explain', 'ne', 'nasıl', 'neden', 'açıkla', 'anlat', 'nedir'];
  if (questionWords.some(w => lower.includes(w)) || lower.endsWith('?')) {
    return { intent: 'EXPERT_ASK', expertType };
  }

  // Unknown intent
  return { intent: 'UNKNOWN' };
}

// Get trade type from interval
function getTradeType(interval: string): 'scalping' | 'dayTrade' | 'swing' {
  switch (interval) {
    case '5m':
    case '15m':
      return 'scalping';
    case '1d':
    case '1W':
      return 'swing';
    default:
      return 'dayTrade';
  }
}

class ConciergeService {
  async processMessage(request: ConciergeRequest): Promise<ConciergeResponse> {
    const { message, userId, language = 'en' } = request;

    try {
      // Get credit balance (returns object with balance property)
      const creditBalanceObj = await creditService.getBalance(userId);
      const creditBalance = creditBalanceObj.balance;

      // Detect intent
      const { intent, symbol, interval, expertType } = detectIntent(message);

      // Handle different intents
      switch (intent) {
        case 'HELP':
          return this.handleHelp(language, creditBalance);

        case 'STATUS':
          return await this.handleStatus(userId, creditBalance, language);

        case 'PROFITABILITY':
          return await this.handleProfitability(userId, creditBalance, language);

        case 'PLATFORM_STATS':
          return await this.handlePlatformStats(creditBalance, language);

        case 'MONTHLY_PERFORMANCE':
          return await this.handleMonthlyPerformance(userId, creditBalance, language);

        case 'RECENT_ANALYSES':
          return await this.handleRecentAnalyses(userId, creditBalance, language);

        case 'ALERT_SET':
          return await this.handleAlertSet(userId, message, creditBalance, language);

        case 'ALERT_LIST':
          return await this.handleAlertList(userId, creditBalance, language);

        case 'ANALYSIS':
          return await this.handleAnalysis(userId, symbol!, interval!, language, creditBalance);

        case 'EXPERT_ASK':
          return await this.handleExpertQuestion(userId, message, language, creditBalance, expertType);

        default:
          return this.handleUnknown(language, creditBalance);
      }
    } catch (error) {
      console.error('Concierge service error:', error);
      const creditBalanceObj = await creditService.getBalance(userId).catch(() => ({ balance: 0 }));
      const creditBalance = creditBalanceObj.balance;

      return {
        success: false,
        intent: 'ERROR',
        message: language === 'tr'
          ? 'Bir hata oluştu. Lütfen tekrar deneyin.'
          : 'An error occurred. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private handleHelp(language: string, creditBalance: number): ConciergeResponse {
    const helpText = language === 'tr'
      ? `AI Concierge - Tam Özellikli Asistan

ANALİZ (25 kredi)
• "BTC nasıl?" - Hızlı analiz
• "ETH 4h analiz" - Belirli timeframe
• "SOL scalp" - Scalping analizi

UZMAN SORULARI (ücretsiz)
• "RSI nedir?" - Teknik analiz
• "Risk yönetimi nasıl yapılır?"
• "Balina aktivitesi ne demek?"

PERFORMANS & İSTATİSTİK
• "karlılık raporla" - Senin performansın
• "aylık performans" - Haftalık grafik
• "platform başarı oranı" - Genel istatistik
• "son analizlerim" - Analiz listesi

ALARMLAR
• "BTC 70000 olunca haber ver"
• "alarmlarım" - Alarm listesi

HESAP
• "status" - Kredi bakiyesi

50+ coin: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK, ARB, OP, APT, SUI, SEI...`
      : `AI Concierge - Full-Featured Assistant

ANALYSIS (25 credits)
• "How is BTC?" - Quick analysis
• "ETH 4h analysis" - Specific timeframe
• "SOL scalp" - Scalping analysis

EXPERT QUESTIONS (free)
• "What is RSI?" - Technical analysis
• "How to manage risk?"
• "What is whale activity?"

PERFORMANCE & STATS
• "report my profitability" - Your stats
• "monthly performance" - Weekly chart
• "platform stats" - Overall stats
• "my recent analyses" - Analysis list

ALERTS
• "BTC reaches 70000 notify me"
• "my alerts" - Alert list

ACCOUNT
• "status" - Credit balance

50+ coins: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK, ARB, OP, APT, SUI, SEI...`;

    return {
      success: true,
      intent: 'HELP',
      message: helpText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleStatus(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get recent analyses count
    const recentAnalyses = await prisma.analysis.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Get total analyses
    const totalAnalyses = await prisma.analysis.count({
      where: { userId },
    });

    // Get average score
    const avgScoreResult = await prisma.analysis.aggregate({
      where: { userId },
      _avg: { totalScore: true },
    });
    const avgScore = avgScoreResult._avg.totalScore
      ? Number(avgScoreResult._avg.totalScore).toFixed(1)
      : 'N/A';

    const statusText = language === 'tr'
      ? `Hesap Durumunuz

Krediler: ${creditBalance}
Son 7 Gün Analiz: ${recentAnalyses}
Toplam Analiz: ${totalAnalyses}
Ortalama Skor: ${avgScore}/10

Daha fazla krediye mi ihtiyacınız var? Fiyatlandırma sayfasını ziyaret edin.`
      : `Your Account Status

Credits: ${creditBalance}
Analyses (7 days): ${recentAnalyses}
Total Analyses: ${totalAnalyses}
Average Score: ${avgScore}/10

Need more credits? Visit the pricing page.`;

    return {
      success: true,
      intent: 'STATUS',
      message: statusText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleProfitability(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get analyses with outcomes
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      select: {
        outcome: true,
        symbol: true,
        totalScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (analyses.length === 0) {
      return {
        success: true,
        intent: 'PROFITABILITY',
        message: language === 'tr'
          ? 'Henüz analiz yapmadınız. "BTC nasıl?" diyerek ilk analizinizi yapabilirsiniz.'
          : 'You have no analyses yet. Try "How is BTC?" to make your first analysis.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Calculate statistics
    const tpHits = analyses.filter(a => a.outcome === 'TP_HIT').length;
    const slHits = analyses.filter(a => a.outcome === 'SL_HIT').length;
    const pending = analyses.filter(a => a.outcome === 'PENDING' || !a.outcome).length;
    const expired = analyses.filter(a => a.outcome === 'EXPIRED').length;
    const totalCompleted = tpHits + slHits;
    const winRate = totalCompleted > 0 ? ((tpHits / totalCompleted) * 100).toFixed(1) : 'N/A';

    // Get best performing symbols (by win count)
    const symbolStats: Record<string, { wins: number; losses: number }> = {};
    for (const analysis of analyses) {
      if (!analysis.symbol) continue;
      if (!symbolStats[analysis.symbol]) {
        symbolStats[analysis.symbol] = { wins: 0, losses: 0 };
      }
      if (analysis.outcome === 'TP_HIT') {
        symbolStats[analysis.symbol].wins++;
      } else if (analysis.outcome === 'SL_HIT') {
        symbolStats[analysis.symbol].losses++;
      }
    }

    // Sort by wins
    const sortedSymbols = Object.entries(symbolStats)
      .filter(([, stats]) => stats.wins + stats.losses > 0)
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 3);

    const bestSymbols = sortedSymbols.length > 0
      ? sortedSymbols.map(([sym, stats]) => `${sym}: ${stats.wins}W/${stats.losses}L`).join(', ')
      : 'N/A';

    // Recent performance (last 10)
    const recent10 = analyses.slice(0, 10);
    const recentWins = recent10.filter(a => a.outcome === 'TP_HIT').length;
    const recentLosses = recent10.filter(a => a.outcome === 'SL_HIT').length;

    // Average score
    const avgScore = analyses.reduce((sum, a) => sum + (Number(a.totalScore) || 0), 0) / analyses.length;

    const profitText = language === 'tr'
      ? `Karlılık Raporu

Toplam Analiz: ${analyses.length}
Kazanç (TP Hit): ${tpHits}
Kayıp (SL Hit): ${slHits}
Bekleyen: ${pending}
Süresi Dolan: ${expired}

Başarı Oranı: %${winRate}
Ortalama Skor: ${avgScore.toFixed(1)}/10

En İyi Coinler: ${bestSymbols}

Son 10 Analiz: ${recentWins}W / ${recentLosses}L

${Number(winRate) >= 60 ? 'Harika gidiyorsunuz!' : Number(winRate) >= 40 ? 'Fena değil, gelişmeye devam!' : 'Risk yönetimine dikkat edin.'}`
      : `Profitability Report

Total Analyses: ${analyses.length}
Wins (TP Hit): ${tpHits}
Losses (SL Hit): ${slHits}
Pending: ${pending}
Expired: ${expired}

Win Rate: ${winRate}%
Average Score: ${avgScore.toFixed(1)}/10

Best Coins: ${bestSymbols}

Last 10 Analyses: ${recentWins}W / ${recentLosses}L

${Number(winRate) >= 60 ? 'Great job! Keep it up!' : Number(winRate) >= 40 ? 'Not bad, keep improving!' : 'Focus on risk management.'}`;

    return {
      success: true,
      intent: 'PROFITABILITY',
      message: profitText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handlePlatformStats(creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get all platform analyses
    const allAnalyses = await prisma.analysis.findMany({
      select: {
        outcome: true,
        symbol: true,
        totalScore: true,
      },
    });

    const totalAnalyses = allAnalyses.length;
    const tpHits = allAnalyses.filter(a => a.outcome === 'TP_HIT').length;
    const slHits = allAnalyses.filter(a => a.outcome === 'SL_HIT').length;
    const totalCompleted = tpHits + slHits;
    const platformWinRate = totalCompleted > 0 ? ((tpHits / totalCompleted) * 100).toFixed(1) : 'N/A';

    // Average score
    const avgScore = allAnalyses.length > 0
      ? (allAnalyses.reduce((sum, a) => sum + (Number(a.totalScore) || 0), 0) / allAnalyses.length).toFixed(1)
      : 'N/A';

    // Best performing coins platform-wide
    const symbolStats: Record<string, { wins: number; losses: number; total: number }> = {};
    for (const analysis of allAnalyses) {
      if (!analysis.symbol) continue;
      if (!symbolStats[analysis.symbol]) {
        symbolStats[analysis.symbol] = { wins: 0, losses: 0, total: 0 };
      }
      symbolStats[analysis.symbol].total++;
      if (analysis.outcome === 'TP_HIT') {
        symbolStats[analysis.symbol].wins++;
      } else if (analysis.outcome === 'SL_HIT') {
        symbolStats[analysis.symbol].losses++;
      }
    }

    // Sort by win rate (min 5 analyses)
    const topCoins = Object.entries(symbolStats)
      .filter(([, stats]) => stats.wins + stats.losses >= 5)
      .map(([sym, stats]) => ({
        symbol: sym,
        winRate: stats.wins + stats.losses > 0 ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0,
        total: stats.total,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);

    const topCoinsText = topCoins.length > 0
      ? topCoins.map((c, i) => `${i + 1}. ${c.symbol} - %${c.winRate.toFixed(0)} (${c.total} analiz)`).join('\n')
      : 'N/A';

    // User count
    const userCount = await prisma.user.count();

    const platformText = language === 'tr'
      ? `Platform İstatistikleri
━━━━━━━━━━━━━━━━━━━━━
Toplam Kullanıcı: ${userCount.toLocaleString()}
Toplam Analiz: ${totalAnalyses.toLocaleString()}
Tamamlanan: ${totalCompleted.toLocaleString()}

Platform Başarı Oranı: %${platformWinRate}
Ortalama Skor: ${avgScore}/10

En Başarılı Coinler:
${topCoinsText}

TraderPath ile akıllı trade!`
      : `Platform Statistics
━━━━━━━━━━━━━━━━━━━━━
Total Users: ${userCount.toLocaleString()}
Total Analyses: ${totalAnalyses.toLocaleString()}
Completed: ${totalCompleted.toLocaleString()}

Platform Win Rate: ${platformWinRate}%
Average Score: ${avgScore}/10

Top Performing Coins:
${topCoinsText}

Trade smart with TraderPath!`;

    return {
      success: true,
      intent: 'PLATFORM_STATS',
      message: platformText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleMonthlyPerformance(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Get analyses for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const analyses = await prisma.analysis.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        outcome: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (analyses.length === 0) {
      return {
        success: true,
        intent: 'MONTHLY_PERFORMANCE',
        message: language === 'tr'
          ? 'Son 30 günde analiz bulunamadı.'
          : 'No analyses found in the last 30 days.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Group by week
    const weeks: { wins: number; losses: number; start: Date }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekAnalyses = analyses.filter(a => a.createdAt >= weekStart && a.createdAt < weekEnd);
      weeks.unshift({
        wins: weekAnalyses.filter(a => a.outcome === 'TP_HIT').length,
        losses: weekAnalyses.filter(a => a.outcome === 'SL_HIT').length,
        start: weekStart,
      });
    }

    // Create visual bars
    const createBar = (wins: number, losses: number): string => {
      const total = wins + losses;
      if (total === 0) return '░░░░░░░░░░';
      const winBlocks = Math.round((wins / total) * 10);
      return '█'.repeat(winBlocks) + '░'.repeat(10 - winBlocks);
    };

    const weekLabels = language === 'tr'
      ? ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4']
      : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    const weekLines = weeks.map((w, i) => {
      const total = w.wins + w.losses;
      const rate = total > 0 ? ((w.wins / total) * 100).toFixed(0) : '0';
      return `${weekLabels[i]}: ${createBar(w.wins, w.losses)} ${w.wins}W/${w.losses}L (%${rate})`;
    }).join('\n');

    // Calculate trend
    const firstHalf = weeks.slice(0, 2);
    const secondHalf = weeks.slice(2, 4);
    const firstWinRate = firstHalf.reduce((s, w) => s + w.wins, 0) / Math.max(firstHalf.reduce((s, w) => s + w.wins + w.losses, 0), 1);
    const secondWinRate = secondHalf.reduce((s, w) => s + w.wins, 0) / Math.max(secondHalf.reduce((s, w) => s + w.wins + w.losses, 0), 1);

    let trendText: string;
    if (secondWinRate > firstWinRate + 0.1) {
      trendText = language === 'tr' ? 'Trend: ↑ İyileşiyor' : 'Trend: ↑ Improving';
    } else if (secondWinRate < firstWinRate - 0.1) {
      trendText = language === 'tr' ? 'Trend: ↓ Düşüşte' : 'Trend: ↓ Declining';
    } else {
      trendText = language === 'tr' ? 'Trend: → Stabil' : 'Trend: → Stable';
    }

    const monthlyText = language === 'tr'
      ? `Son 30 Gün Performansı
━━━━━━━━━━━━━━━━━━━━━
${weekLines}

${trendText}

Toplam: ${analyses.length} analiz`
      : `Last 30 Days Performance
━━━━━━━━━━━━━━━━━━━━━
${weekLines}

${trendText}

Total: ${analyses.length} analyses`;

    return {
      success: true,
      intent: 'MONTHLY_PERFORMANCE',
      message: monthlyText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleRecentAnalyses(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      select: {
        id: true,
        symbol: true,
        outcome: true,
        totalScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (analyses.length === 0) {
      return {
        success: true,
        intent: 'RECENT_ANALYSES',
        message: language === 'tr'
          ? 'Henüz analiz yapmadınız. "BTC nasıl?" diyerek başlayın!'
          : 'No analyses yet. Try "How is BTC?" to start!',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const outcomeEmoji = (outcome: string | null): string => {
      switch (outcome) {
        case 'TP_HIT': return '✓';
        case 'SL_HIT': return '✗';
        case 'PENDING': return '◌';
        default: return '·';
      }
    };

    const analysisList = analyses.map(a => {
      const date = new Date(a.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric' });
      const score = a.totalScore ? Number(a.totalScore).toFixed(1) : '-';
      return `${outcomeEmoji(a.outcome)} ${a.symbol} | ${score}/10 | ${date}`;
    }).join('\n');

    const recentText = language === 'tr'
      ? `Son 10 Analiziniz
━━━━━━━━━━━━━━━━━━━━━
${analysisList}

✓ = TP Hit, ✗ = SL Hit, ◌ = Bekliyor

Detaylar için /analyze/details/{id} sayfasını ziyaret edin.`
      : `Your Last 10 Analyses
━━━━━━━━━━━━━━━━━━━━━
${analysisList}

✓ = TP Hit, ✗ = SL Hit, ◌ = Pending

Visit /analyze/details/{id} for details.`;

    return {
      success: true,
      intent: 'RECENT_ANALYSES',
      message: recentText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleAlertSet(userId: string, message: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    // Parse alert from message
    // Examples: "BTC 70000 olunca haber ver", "ETH reaches 4000 notify me"
    const lower = message.toLowerCase();

    // Find coin
    let alertCoin: string | null = null;
    for (const coin of SUPPORTED_COINS) {
      if (lower.includes(coin)) {
        alertCoin = coin.toUpperCase();
        break;
      }
    }

    // Find price
    const priceMatch = message.match(/\d+[\d,.]*/);
    const alertPrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;

    if (!alertCoin || !alertPrice) {
      return {
        success: true,
        intent: 'ALERT_SET',
        message: language === 'tr'
          ? `Alarm kurmak için coin ve fiyat belirtin.

Örnek: "BTC 70000 olunca haber ver"
Örnek: "ETH 4000 ulaşınca bildir"`
          : `Please specify coin and price for alert.

Example: "BTC reaches 70000 notify me"
Example: "Alert me when ETH hits 4000"`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    // Create alert
    try {
      await prisma.priceAlert.create({
        data: {
          userId,
          symbol: alertCoin,
          targetPrice: alertPrice,
          condition: 'ABOVE', // Could detect ABOVE/BELOW from message
          isActive: true,
        },
      });

      return {
        success: true,
        intent: 'ALERT_SET',
        message: language === 'tr'
          ? `Alarm kuruldu!

Coin: ${alertCoin}
Hedef Fiyat: $${alertPrice.toLocaleString()}

${alertCoin} bu fiyata ulaştığında bildirim alacaksınız.`
          : `Alert set!

Coin: ${alertCoin}
Target Price: $${alertPrice.toLocaleString()}

You'll be notified when ${alertCoin} reaches this price.`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    } catch {
      return {
        success: false,
        intent: 'ALERT_SET',
        message: language === 'tr'
          ? 'Alarm kurulurken hata oluştu. Lütfen tekrar deneyin.'
          : 'Error setting alert. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'Failed to create alert',
      };
    }
  }

  private async handleAlertList(userId: string, creditBalance: number, language: string): Promise<ConciergeResponse> {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (alerts.length === 0) {
      return {
        success: true,
        intent: 'ALERT_LIST',
        message: language === 'tr'
          ? 'Aktif alarmınız yok. "BTC 70000 olunca haber ver" diyerek alarm kurabilirsiniz.'
          : 'No active alerts. Try "BTC reaches 70000 notify me" to set one.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
      };
    }

    const alertList = alerts.map(a => {
      const condition = a.condition === 'ABOVE' ? '↑' : '↓';
      return `${condition} ${a.symbol} @ $${Number(a.targetPrice).toLocaleString()}`;
    }).join('\n');

    const alertText = language === 'tr'
      ? `Aktif Alarmlarınız
━━━━━━━━━━━━━━━━━━━━━
${alertList}

Toplam: ${alerts.length} alarm aktif`
      : `Your Active Alerts
━━━━━━━━━━━━━━━━━━━━━
${alertList}

Total: ${alerts.length} alerts active`;

    return {
      success: true,
      intent: 'ALERT_LIST',
      message: alertText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }

  private async handleAnalysis(
    userId: string,
    symbol: string,
    interval: string,
    language: string,
    creditBalance: number
  ): Promise<ConciergeResponse> {
    const ANALYSIS_COST = 25;

    // Check credits
    if (creditBalance < ANALYSIS_COST) {
      return {
        success: false,
        intent: 'ANALYSIS',
        message: language === 'tr'
          ? `Yetersiz kredi. Analiz için ${ANALYSIS_COST} kredi gerekli, bakiyeniz: ${creditBalance}`
          : `Insufficient credits. Analysis requires ${ANALYSIS_COST} credits, you have: ${creditBalance}`,
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: 'INSUFFICIENT_CREDITS',
      };
    }

    try {
      // Use AI Expert Panel for analysis
      const tradeType = getTradeType(interval);

      const panelResult = await aiExpertService.analyzeWithExpertPanel({
        symbol,
        userId,
        language: language === 'tr' ? 'tr' : 'en',
        tradeType,
      });

      if (!panelResult.success) {
        return {
          success: false,
          intent: 'ANALYSIS',
          message: language === 'tr'
            ? `Analiz başarısız: ${panelResult.error || 'Bilinmeyen hata'}`
            : `Analysis failed: ${panelResult.error || 'Unknown error'}`,
          creditsSpent: 0,
          creditsRemaining: creditBalance,
          error: panelResult.error,
        };
      }

      // Build response message
      const verdict = panelResult.verdict?.toUpperCase() || 'WAIT';
      const score = panelResult.score || 5;
      const synthesis = panelResult.voltranSynthesis || 'Analysis completed.';

      const verdictLabel = verdict === 'GO' ? 'GO' : verdict === 'AVOID' ? 'AVOID' : verdict === 'CONDITIONAL_GO' ? 'COND' : 'WAIT';

      const analysisMessage = `${symbol} ${interval.toUpperCase()} Analysis

Verdict: ${verdictLabel}
Score: ${score}/10

${synthesis}`;

      return {
        success: true,
        intent: 'ANALYSIS',
        message: analysisMessage,
        creditsSpent: panelResult.creditsSpent || ANALYSIS_COST,
        creditsRemaining: panelResult.remainingCredits ?? (creditBalance - ANALYSIS_COST),
        // Analysis-specific data
        analysisId: panelResult.analysisId,
        verdict: verdict,
        score: score,
        voltranSynthesis: synthesis,
      };

    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        intent: 'ANALYSIS',
        message: language === 'tr'
          ? 'Analiz sırasında hata oluştu. Lütfen tekrar deneyin.'
          : 'Error during analysis. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  private async handleExpertQuestion(
    userId: string,
    question: string,
    language: string,
    creditBalance: number,
    expertType: string = 'aria'
  ): Promise<ConciergeResponse> {
    try {
      // Expert emojis and names
      const expertInfo: Record<string, { emoji: string; name: string }> = {
        aria: { emoji: 'ARIA', name: 'Technical Expert' },
        nexus: { emoji: 'NEXUS', name: 'Risk Expert' },
        oracle: { emoji: 'ORACLE', name: 'Whale Tracker' },
        sentinel: { emoji: 'SENTINEL', name: 'Security Expert' },
      };

      const expert = expertInfo[expertType] || expertInfo.aria;

      // Use AI Expert for question
      const response = await aiExpertService.chat({
        expertId: expertType,
        message: question,
        userId,
      });

      const formattedReply = `${expert.emoji} ${expert.name}

${response.reply || 'I couldn\'t generate a response.'}`;

      return {
        success: true,
        intent: 'EXPERT_ASK',
        message: formattedReply,
        creditsSpent: response.creditsSpent || 0,
        creditsRemaining: response.creditsRemaining ?? creditBalance,
      };
    } catch (error) {
      console.error('Expert question error:', error);
      return {
        success: false,
        intent: 'EXPERT_ASK',
        message: language === 'tr'
          ? 'Sorunuz cevaplanamadı. Lütfen tekrar deneyin.'
          : 'Could not answer your question. Please try again.',
        creditsSpent: 0,
        creditsRemaining: creditBalance,
        error: error instanceof Error ? error.message : 'Question failed',
      };
    }
  }

  private handleUnknown(language: string, creditBalance: number): ConciergeResponse {
    const unknownText = language === 'tr'
      ? `Anlamadım. Şunları deneyebilirsiniz:

• "BTC nasıl?" - Hızlı analiz
• "RSI nedir?" - Uzman sorusu
• "help" - Tüm komutlar`
      : `I didn't understand. Try:

• "How is BTC?" - Quick analysis
• "What is RSI?" - Expert question
• "help" - All commands`;

    return {
      success: true,
      intent: 'UNKNOWN',
      message: unknownText,
      creditsSpent: 0,
      creditsRemaining: creditBalance,
    };
  }
}

export const conciergeService = new ConciergeService();
