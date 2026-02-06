'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle, TrendingDown, DollarSign, BookOpen, Shield, Scale, Mail } from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

export default function DisclaimerPage() {
  const lastUpdated = 'February 6, 2026';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TraderPathLogo size="md" showText={true} showTagline={false} href="/" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Disclaimer</h1>
              <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            Please read this disclaimer carefully before using TraderPath. This disclaimer applies to all users of our platform, services, reports, and communications.
          </p>
        </div>

        {/* Important Warning Banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Important Disclaimer
              </h2>
              <p className="text-red-600 dark:text-red-400">
                This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. The information provided should not be construed as a recommendation to buy, sell, or hold any security or financial instrument. All investments carry risk, including the potential loss of principal. Past performance does not guarantee future results. You should conduct your own research and consult with a licensed financial advisor before making any investment decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Not Financial Advice */}
          <section id="not-financial-advice">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">1. Not Financial Advice</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">TraderPath is not a financial advisor, broker-dealer, or registered investment advisor.</strong> The information, analysis, reports, and tools provided on our platform are for informational and educational purposes only and do not constitute financial, investment, or trading advice.
              </p>
              <p>
                Nothing on this platform should be construed as:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>A recommendation to buy, sell, or hold any security or financial instrument</li>
                <li>An offer or solicitation to buy or sell any securities</li>
                <li>Professional financial, legal, or tax advice</li>
                <li>A guarantee of future performance or results</li>
                <li>A substitute for professional financial consultation</li>
              </ul>
              <div className="bg-card border rounded-lg p-4 mt-4">
                <p className="text-sm">
                  <strong className="text-foreground">Always consult a qualified financial advisor</strong> before making any investment decisions. We recommend seeking independent financial advice if you have any doubts about your trading activities.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Trading Risks */}
          <section id="trading-risks">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">2. Trading Risks</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Trading cryptocurrencies, stocks, bonds, metals, and other financial instruments carries significant risks:
              </p>
              <div className="grid gap-4">
                {[
                  {
                    title: 'Market Volatility',
                    desc: 'Cryptocurrency prices can fluctuate dramatically in short periods, leading to substantial gains or losses.',
                  },
                  {
                    title: 'Liquidity Risk',
                    desc: 'Some markets may lack sufficient liquidity, making it difficult to execute trades at desired prices.',
                  },
                  {
                    title: 'Regulatory Risk',
                    desc: 'Cryptocurrency regulations vary by jurisdiction and may change, potentially affecting your ability to trade.',
                  },
                  {
                    title: 'Technical Risk',
                    desc: 'Software bugs, network issues, or exchange failures may result in trading losses or inability to execute trades.',
                  },
                  {
                    title: 'Leverage Risk',
                    desc: 'Trading with leverage amplifies both potential gains and losses, potentially exceeding your initial investment.',
                  },
                ].map((risk) => (
                  <div key={risk.title} className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-1">{risk.title}</h3>
                    <p className="text-sm">{risk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: No Guarantees */}
          <section id="no-guarantees">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">3. No Guarantees</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                While we strive to provide accurate and helpful analysis, <strong className="text-foreground">we make no guarantees</strong> regarding:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>The accuracy, completeness, or timeliness of our analysis</li>
                <li>Future market movements or price predictions</li>
                <li>The profitability of any trading strategy</li>
                <li>The reliability of data from third-party sources</li>
                <li>Uninterrupted access to our services</li>
              </ul>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-4">
                <p className="text-amber-600 dark:text-amber-400 text-sm">
                  <strong>Past performance does not guarantee future results.</strong> Any statistics, accuracy metrics, or price predictions displayed on our platform are based on historical data and technical analysis, which may not accurately reflect future price movements. Market conditions can change rapidly, and any analysis may become outdated. Prices and statistics are subject to change.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: User Responsibility */}
          <section id="user-responsibility">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">4. User Responsibility</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                By using TraderPath, you acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>You are solely responsible for your trading decisions</li>
                <li>You will conduct your own research before trading</li>
                <li>You will only invest capital you can afford to lose</li>
                <li>You understand the risks associated with cryptocurrency trading</li>
                <li>You will comply with all applicable laws and regulations in your jurisdiction</li>
              </ul>
              <div className="bg-card border rounded-lg p-4 mt-4">
                <h3 className="font-semibold text-foreground mb-2">Risk Management</h3>
                <p className="text-sm">
                  We strongly recommend implementing proper risk management strategies, including setting stop-loss orders, diversifying your portfolio, and never investing more than you can afford to lose.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Third-Party Information */}
          <section id="third-party">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold">5. Third-Party Information</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                The analysis is based on publicly available information from third-party sources, including:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Market data from cryptocurrency exchanges (Binance, CoinGecko)</li>
                <li>Stock, bond, and commodity data (Yahoo Finance)</li>
                <li>Economic data (FRED API, Finnhub)</li>
                <li>News and sentiment analysis from external providers</li>
                <li>Technical indicators and chart data</li>
                <li>Economic calendar events</li>
              </ul>
              <p className="mt-4">
                The analysis may contain errors or omissions. We do not guarantee the accuracy, completeness, reliability, or timeliness of third-party information and are not responsible for any errors, omissions, or delays in such data. Data as of the analysis date; prices and statistics are subject to change.
              </p>
            </div>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section id="limitation">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold">6. Limitation of Liability</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                To the fullest extent permitted by law, TraderPath shall not be liable for:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Any trading losses or financial damages</li>
                <li>Decisions made based on our analysis or tools</li>
                <li>Technical issues, system failures, or service interruptions</li>
                <li>Errors or inaccuracies in market data</li>
                <li>Any indirect, incidental, or consequential damages</li>
              </ul>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  <strong>Maximum Liability:</strong> In no event shall our total liability exceed the amount you have paid to TraderPath in the preceding twelve (12) months.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Jurisdiction */}
          <section id="jurisdiction">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-teal-500" />
              </div>
              <h2 className="text-2xl font-bold">7. Jurisdictional Restrictions</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                TraderPath may not be available in all jurisdictions. It is your responsibility to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Ensure that using our services is legal in your jurisdiction</li>
                <li>Comply with local laws regarding cryptocurrency trading</li>
                <li>Report any income or gains as required by tax authorities</li>
              </ul>
              <p className="mt-4">
                We do not provide services to residents of sanctioned countries or jurisdictions where cryptocurrency trading is prohibited.
              </p>
            </div>
          </section>

          {/* Section 8: Contact */}
          <section id="contact">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">8. Contact Us</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>If you have questions about this disclaimer, please contact us:</p>
              <div className="bg-card border rounded-lg p-4">
                <ul className="space-y-2">
                  <li>
                    <strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:legal@traderpath.io" className="text-primary hover:underline">
                      legal@traderpath.io
                    </a>
                  </li>
                  <li>
                    <strong className="text-foreground">Website:</strong>{' '}
                    <a href="https://traderpath.io" className="text-primary hover:underline">
                      traderpath.io
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 p-8 bg-card border rounded-xl text-center">
          <h3 className="text-xl font-bold mb-2">Questions About Trading Risks?</h3>
          <p className="text-muted-foreground mb-6">
            We recommend consulting with a qualified financial advisor before trading.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              Visit Help Center
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border rounded-lg font-semibold hover:bg-accent transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="minimal" />
    </div>
  );
}
