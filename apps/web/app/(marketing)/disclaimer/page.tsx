'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  BookOpen,
  Shield,
  Scale,
  Mail,
  Globe,
  Server,
  Lock,
  FileText,
  CheckCircle2,
  XCircle,
  Info,
  Cpu,
} from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

export default function DisclaimerPage() {
  const lastUpdated = 'February 9, 2026';
  const effectiveDate = 'February 9, 2026';

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
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full uppercase tracking-wider">
              Legal
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Risk Disclosure Statement</h1>
              <p className="text-muted-foreground">Effective: {effectiveDate} &middot; Last updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            This Risk Disclosure Statement (&ldquo;Statement&rdquo;) sets forth the material risks associated
            with the use of TraderPath&rsquo;s analytical services and must be read in conjunction with
            our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            By accessing or using TraderPath, you acknowledge that you have read, understood, and
            accepted the risks described herein.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 p-6 bg-card border rounded-xl">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Table of Contents</h2>
          <ol className="space-y-1.5 text-sm">
            {[
              'Nature of Services',
              'No Investment Advice',
              'Market & Trading Risks',
              'Technology & Model Risks',
              'Third-Party Data Dependency',
              'Performance Metrics Disclosure',
              'Regulatory Status',
              'User Responsibilities & Acknowledgments',
              'Limitation of Liability',
              'Jurisdictional Restrictions',
              'Amendments to This Statement',
              'Contact Information',
            ].map((item, i) => (
              <li key={i}>
                <a href={`#section-${i + 1}`} className="text-muted-foreground hover:text-foreground transition">
                  {i + 1}. {item}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Important Warning Banner */}
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-3">
                IMPORTANT RISK WARNING
              </h2>
              <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed mb-3">
                Trading and investing in financial instruments, including but not limited to
                cryptocurrencies, equities, fixed-income securities, and commodity derivatives,
                involves substantial risk of loss and is not suitable for every individual.
                You should carefully consider whether such activities are appropriate for you
                in light of your financial condition, investment experience, and risk tolerance.
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed font-semibold">
                You could lose some or all of your invested capital. Do not invest funds you
                cannot afford to lose. Past performance, whether actual or indicated by historical
                analysis, is not indicative of future results.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">

          {/* Section 1: Nature of Services */}
          <section id="section-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">1. Nature of Services</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                TraderPath (&ldquo;the Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;our&rdquo;) operates as an
                <strong className="text-foreground"> analytical research and data processing platform</strong>.
                The Platform provides automated market analysis, capital flow intelligence, and quantitative
                research tools. The Platform does not:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Execute, facilitate, or intermediate securities transactions',
                  'Hold, custody, or manage user funds or assets',
                  'Provide personalized investment recommendations',
                  'Act as a broker-dealer, exchange, or trading venue',
                  'Offer margin lending, leverage, or financing services',
                  'Guarantee any specific financial outcome or return',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-card border rounded-lg">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs">{item}</span>
                  </div>
                ))}
              </div>
              <p>
                All outputs produced by the Platform &mdash; including but not limited to analysis scores,
                directional assessments (GO, CONDITIONAL GO, WAIT, AVOID), trade plan parameters
                (entry, stop-loss, take-profit levels), and AI-generated commentary &mdash; constitute
                <strong className="text-foreground"> informational and educational content only</strong>.
              </p>
            </div>
          </section>

          {/* Section 2: No Investment Advice */}
          <section id="section-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-teal-500" />
              </div>
              <h2 className="text-2xl font-bold">2. No Investment Advice</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                Nothing contained on this Platform shall be construed as:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>A recommendation, solicitation, or offer to buy or sell any security, financial instrument, or digital asset;</li>
                <li>An endorsement of any particular investment strategy, transaction, or asset class;</li>
                <li>Professional financial, legal, tax, or accounting advice tailored to your individual circumstances;</li>
                <li>A fiduciary obligation or duty of care owed to any user; or</li>
                <li>A substitute for consultation with a qualified, licensed financial advisor or other professional.</li>
              </ul>
              <div className="bg-card border rounded-lg p-4">
                <p className="text-xs">
                  <strong className="text-foreground">We strongly recommend</strong> that you seek independent
                  professional advice from a qualified financial advisor, tax advisor, or legal counsel
                  before making any investment or trading decisions. Any reliance on the Platform&rsquo;s
                  outputs is at your own risk and discretion.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Market & Trading Risks */}
          <section id="section-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">3. Market & Trading Risks</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                Financial markets are inherently volatile and subject to rapid, unpredictable changes.
                The following non-exhaustive list describes material risks:
              </p>
              <div className="grid gap-3">
                {[
                  {
                    title: 'Market Volatility Risk',
                    desc: 'Prices of financial instruments, particularly digital assets, can experience extreme volatility. Intraday price swings exceeding 10-20% are not uncommon in cryptocurrency markets. Such volatility may result in substantial or total loss of invested capital.',
                  },
                  {
                    title: 'Liquidity Risk',
                    desc: 'Certain markets or instruments may have insufficient liquidity to execute transactions at intended prices. Slippage, wide bid-ask spreads, and inability to exit positions during market stress events may result in material losses beyond anticipated levels.',
                  },
                  {
                    title: 'Leverage & Margin Risk',
                    desc: 'If you choose to trade with leverage (which TraderPath does not provide or recommend), losses can exceed your initial deposit. Margin calls may force liquidation of positions at unfavorable prices.',
                  },
                  {
                    title: 'Counterparty & Exchange Risk',
                    desc: 'Third-party exchanges, brokers, or custodians may experience insolvency, security breaches, regulatory actions, or operational failures that could result in loss of assets.',
                  },
                  {
                    title: 'Regulatory & Legal Risk',
                    desc: 'The regulatory landscape for digital assets and financial instruments varies by jurisdiction and is evolving. Changes in law, regulation, or enforcement may materially affect the value or legality of certain assets or trading activities.',
                  },
                  {
                    title: 'Systemic & Correlation Risk',
                    desc: 'During periods of market stress, correlations between asset classes may converge toward 1.0, negating expected diversification benefits. Black swan events may cause simultaneous losses across seemingly uncorrelated positions.',
                  },
                ].map((risk) => (
                  <div key={risk.title} className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">{risk.title}</h3>
                    <p className="text-xs">{risk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 4: Technology & Model Risks */}
          <section id="section-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold">4. Technology & Model Risks</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                The Platform employs complex algorithmic models and artificial intelligence systems.
                Users should be aware of the following inherent limitations:
              </p>
              <div className="grid gap-3">
                {[
                  {
                    title: 'Model Risk',
                    desc: 'All predictive models, including our 7-Step engine and MLIS Pro system, are approximations of reality. Models may fail during regime changes, structural breaks, or unprecedented market conditions (e.g., flash crashes, regulatory shocks) for which historical data provides no precedent.',
                  },
                  {
                    title: 'AI & Machine Learning Limitations',
                    desc: 'AI-generated outputs (including AI Expert commentary and trade plan parameters) are probabilistic, not deterministic. Large language models may produce incorrect, incomplete, or misleading outputs (hallucinations). All AI outputs should be independently verified.',
                  },
                  {
                    title: 'Overfitting & Look-Ahead Bias',
                    desc: 'While we employ rigorous validation protocols, all quantitative models carry inherent overfitting risk: patterns observed in historical data may not persist in future market conditions.',
                  },
                  {
                    title: 'Technical Infrastructure Risk',
                    desc: 'The Platform may experience service interruptions, latency, data feed delays, or software defects. During such events, analysis outputs may be delayed, incomplete, or unavailable. The Platform is not designed for time-critical, latency-sensitive trading execution.',
                  },
                ].map((risk) => (
                  <div key={risk.title} className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">{risk.title}</h3>
                    <p className="text-xs">{risk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 5: Third-Party Data */}
          <section id="section-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">5. Third-Party Data Dependency</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                The Platform ingests data from multiple third-party providers, including but not limited to
                Binance, Yahoo Finance, FRED (Federal Reserve Economic Data), DefiLlama, CoinGecko,
                CoinMarketCap, and Finnhub. We do not control, guarantee, or warrant the accuracy,
                completeness, timeliness, or availability of third-party data.
              </p>
              <p>
                Third-party data may contain errors, omissions, or delays. Data feeds may be
                interrupted, modified, or discontinued without notice. The Platform implements
                multi-provider fallback chains to mitigate single-source dependency, but
                simultaneous failures across providers cannot be excluded.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-700 dark:text-amber-300 text-xs">
                  <strong>Important:</strong> All data is provided &ldquo;as is&rdquo; without warranty.
                  Market data may be delayed (typically 15 minutes for non-crypto assets).
                  Historical data is subject to retroactive adjustment by source providers.
                  Prices and statistics displayed are subject to change without notice.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Performance Metrics */}
          <section id="section-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold">6. Performance Metrics Disclosure</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                The Platform displays historical performance metrics (including but not limited to
                win rate, average return, profit factor, and accuracy percentages). These metrics
                are subject to the following important qualifications:
              </p>
              <div className="grid gap-3">
                {[
                  'Past performance is not indicative of future results and should not be relied upon as a predictor of future performance.',
                  'Performance metrics are calculated from outcome-verified analyses where a defined take-profit or stop-loss level was reached. Analyses with WAIT or AVOID verdicts, and analyses still in pending status, are excluded from performance calculations.',
                  'Performance metrics do not account for transaction costs, slippage, fees, taxes, or other costs that would reduce actual returns.',
                  'Hypothetical or simulated performance results have inherent limitations. Unlike actual trading records, simulated results do not represent actual trading and may not reflect the impact of market factors such as liquidity constraints.',
                  'The Platform does not track or verify actual user trading results. Displayed metrics reflect the theoretical performance of the analytical engine only.',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-card border rounded-lg">
                    <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 7: Regulatory Status */}
          <section id="section-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold">7. Regulatory Status</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                TraderPath is not registered as, and does not operate as, a broker-dealer,
                investment advisor, commodity trading advisor, futures commission merchant, or
                any other regulated financial services entity under the securities laws of any
                jurisdiction, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>The U.S. Securities and Exchange Commission (SEC)</li>
                <li>The U.S. Commodity Futures Trading Commission (CFTC)</li>
                <li>The Financial Industry Regulatory Authority (FINRA)</li>
                <li>The European Securities and Markets Authority (ESMA)</li>
                <li>The Financial Conduct Authority (FCA, UK)</li>
                <li>Any equivalent national or supranational financial regulatory body</li>
              </ul>
              <p>
                The Platform&rsquo;s services are not subject to the investor protection provisions
                that apply to regulated financial services. Users do not benefit from deposit
                insurance, investor compensation schemes, or regulatory dispute resolution mechanisms.
              </p>
            </div>
          </section>

          {/* Section 8: User Responsibilities */}
          <section id="section-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">8. User Responsibilities & Acknowledgments</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                By accessing and using the Platform, you represent, warrant, and acknowledge that:
              </p>
              <div className="grid gap-2">
                {[
                  'You are of legal age in your jurisdiction and have the legal capacity to enter into binding agreements.',
                  'You are solely responsible for all trading and investment decisions you make, regardless of any analysis or information obtained from the Platform.',
                  'You have sufficient knowledge and experience to evaluate the merits and risks of any trading or investment activity.',
                  'You will conduct your own independent research and due diligence before making any trading or investment decisions.',
                  'You will not invest or risk funds that you cannot afford to lose.',
                  'You understand that the Platform provides analysis and research tools, not trading signals, investment advice, or trade execution services.',
                  'You will implement appropriate risk management practices, including position sizing, stop-loss discipline, and portfolio diversification.',
                  'You will comply with all applicable laws, regulations, and tax obligations in your jurisdiction.',
                  'You acknowledge that no representation has been made that any account will or is likely to achieve profits or losses similar to those shown on the Platform.',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-card border rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 9: Limitation of Liability */}
          <section id="section-9">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-500/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold">9. Limitation of Liability</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
              </p>
              <div className="bg-card border-2 border-slate-300 dark:border-slate-600 rounded-lg p-5 space-y-3">
                <p className="text-xs">
                  <strong className="text-foreground">(a)</strong> TRADERPATH, ITS OFFICERS, DIRECTORS, EMPLOYEES,
                  AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
                  SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF
                  PROFITS, LOSS OF DATA, LOSS OF GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT
                  OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM.
                </p>
                <p className="text-xs">
                  <strong className="text-foreground">(b)</strong> THIS LIMITATION APPLIES WHETHER THE DAMAGES ARE
                  BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR
                  ANY OTHER LEGAL THEORY, AND WHETHER OR NOT TRADERPATH HAS BEEN ADVISED OF THE
                  POSSIBILITY OF SUCH DAMAGES.
                </p>
                <p className="text-xs">
                  <strong className="text-foreground">(c)</strong> IN NO EVENT SHALL THE AGGREGATE LIABILITY OF
                  TRADERPATH EXCEED THE GREATER OF: (i) THE TOTAL AMOUNT YOU HAVE PAID TO TRADERPATH
                  IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM;
                  OR (ii) ONE HUNDRED U.S. DOLLARS (USD $100.00).
                </p>
              </div>
              <p>
                Some jurisdictions do not allow the exclusion or limitation of certain types of
                damages. In such jurisdictions, the above limitations shall apply to the fullest
                extent permitted by applicable law.
              </p>
            </div>
          </section>

          {/* Section 10: Jurisdictional Restrictions */}
          <section id="section-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-teal-500" />
              </div>
              <h2 className="text-2xl font-bold">10. Jurisdictional Restrictions</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                The Platform is not intended for distribution to, or use by, any person in any
                jurisdiction where such distribution or use would be contrary to local law or
                regulation. It is your sole responsibility to determine whether your use of
                the Platform complies with applicable laws in your jurisdiction.
              </p>
              <p>
                The Platform does not provide services to residents or nationals of countries
                subject to comprehensive sanctions imposed by the United States (OFAC), the
                European Union, or the United Nations. Accessing the Platform from a sanctioned
                jurisdiction is strictly prohibited.
              </p>
            </div>
          </section>

          {/* Section 11: Amendments */}
          <section id="section-11">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold">11. Amendments to This Statement</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                We reserve the right to modify this Risk Disclosure Statement at any time. Material
                changes will be communicated through the Platform and/or via email to registered
                users. Continued use of the Platform after such modifications constitutes acceptance
                of the revised Statement.
              </p>
              <p>
                Users are encouraged to review this Statement periodically. The &ldquo;Last Updated&rdquo;
                date at the top of this page indicates when this Statement was most recently revised.
              </p>
            </div>
          </section>

          {/* Section 12: Contact */}
          <section id="section-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">12. Contact Information</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>
                If you have questions regarding this Risk Disclosure Statement or require
                further clarification on any of the risks described herein, please contact:
              </p>
              <div className="bg-card border rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong className="text-foreground">Legal Department:</strong>{' '}
                    <a href="mailto:legal@traderpath.io" className="text-primary hover:underline">legal@traderpath.io</a>
                  </li>
                  <li>
                    <strong className="text-foreground">General Inquiries:</strong>{' '}
                    <a href="mailto:support@traderpath.io" className="text-primary hover:underline">support@traderpath.io</a>
                  </li>
                  <li>
                    <strong className="text-foreground">Website:</strong>{' '}
                    <a href="https://traderpath.io" className="text-primary hover:underline">traderpath.io</a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 p-8 bg-card border rounded-xl text-center">
          <h3 className="text-xl font-bold mb-2">Understand the Methodology Behind Our Analysis</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Review our detailed technical methodology to understand how our analytical
            framework processes data across four hierarchical layers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/how-it-works"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              Read Methodology
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

      <Footer variant="minimal" />
    </div>
  );
}
