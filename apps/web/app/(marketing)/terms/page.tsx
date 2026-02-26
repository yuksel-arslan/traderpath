'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle, CreditCard, UserX, Scale, Shield, RefreshCw, Mail, Clock, Globe, Target, Activity } from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

export default function TermsOfServicePage() {
  const lastUpdated = 'January 31, 2026';

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
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            Welcome to TraderPath. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully before using our services.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="bg-card border rounded-xl p-6 mb-12">
          <h2 className="font-semibold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { href: '#acceptance', label: 'Acceptance', icon: FileText },
              { href: '#services', label: 'Our Services', icon: Shield },
              { href: '#payments', label: 'Payments', icon: CreditCard },
              { href: '#daily-pass', label: 'Daily Pass', icon: Clock },
              { href: '#liability', label: 'Liability', icon: Scale },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg hover:bg-accent transition text-sm"
              >
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Acceptance of Terms */}
          <section id="acceptance">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                By creating an account or using TraderPath, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
              <p>
                If you do not agree to these terms, you may not access or use our services.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-600 dark:text-amber-400 text-sm">
                  <strong>Important:</strong> You must be at least 18 years old to use TraderPath. By using our services, you represent that you are of legal age to form a binding contract.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Description of Services */}
          <section id="services">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">2. Description of Services</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>TraderPath provides cryptocurrency market analysis tools, including:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>7-step technical and fundamental analysis</li>
                <li>AI-powered market insights and predictions</li>
                <li>Real-time market data visualization</li>
                <li>Trading plan generation with entry, stop-loss, and take-profit levels</li>
                <li>PDF report generation and email delivery</li>
                <li>Price alerts and notifications</li>
              </ul>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Important Disclaimer</h3>
                <p>
                  TraderPath is for informational and educational purposes only and does not constitute financial, investment, or trading advice. The information provided should not be construed as a recommendation to buy, sell, or hold any security or financial instrument. All investments carry risk, including the potential loss of principal.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: User Accounts */}
          <section id="accounts">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold">3. User Accounts</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>When creating an account, you agree to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
              <p className="mt-4">
                We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activities.
              </p>
            </div>
          </section>

          {/* Section 4: Credits and Payments */}
          <section id="payments">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">4. Credits and Payments</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Credit System</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Asset Analysis requires a Daily Pass (100 credits/day for up to 10 analyses)</li>
                  <li>Credits are non-transferable between accounts</li>
                  <li>Unused credits do not expire</li>
                  <li>Bonus credits may be earned through platform activities</li>
                </ul>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Refund Policy</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>We offer a 7-day money-back guarantee for unused credits</li>
                  <li>Refunds are processed within 5-10 business days</li>
                  <li>Bonus credits are not refundable</li>
                  <li>Partial refunds may be issued for partially used packages</li>
                </ul>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Payment Processing</h3>
                <p>
                  All payments are processed securely through Stripe. We do not store your credit card information. By making a purchase, you authorize us to charge your payment method for the selected amount.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4b: Daily Pass System */}
          <section id="daily-pass">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">4b. Daily Pass System</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                TraderPath offers a Daily Pass subscription model for premium features. Each pass provides unlimited access for the calendar day (UTC timezone) it was purchased.
              </p>

              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded">PRICING</span>
                  Daily Pass Rates
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Layer 3 */}
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Globe className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Layer 3 - Sectors</p>
                        <p className="text-xs text-muted-foreground">Sector drill-down analysis</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">25</span>
                      <span className="text-sm text-muted-foreground">credits/day</span>
                    </div>
                  </div>

                  {/* Layer 4 */}
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Target className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Layer 4 - AI Recommendations</p>
                        <p className="text-xs text-muted-foreground">BUY/SELL signals</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">25</span>
                      <span className="text-sm text-muted-foreground">credits/day</span>
                    </div>
                  </div>

                  {/* Asset Analysis */}
                  <div className="bg-card border border-violet-200 dark:border-violet-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-violet-500/10 rounded-lg">
                        <Activity className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Asset Analysis</p>
                        <p className="text-xs text-muted-foreground">7-Step / MLIS Pro</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">100</span>
                      <span className="text-sm text-muted-foreground">credits/day</span>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">Maximum 10 analyses per day</p>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 p-3 bg-card/50 rounded-lg border border-dashed">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total for full daily access:</span>
                    <span className="font-bold text-foreground">150 credits/day</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Daily Pass Terms</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Passes are valid for the calendar day (UTC) they are purchased</li>
                  <li>Passes expire at 23:59:59 UTC on the purchase date</li>
                  <li>Unused passes cannot be refunded or transferred</li>
                  <li>Credits are only charged on days you actively use the platform</li>
                  <li>Asset Analysis pass includes a maximum of 10 analyses per day</li>
                  <li>Layer 3 and Layer 4 passes provide unlimited views for the day</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                  <strong>Note:</strong> Daily Pass pricing may be adjusted. Any changes will be communicated via email and platform notifications before taking effect.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Prohibited Uses */}
          <section id="prohibited">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">5. Prohibited Uses</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Use the service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>Share your account credentials with others</li>
                <li>Resell or redistribute our analysis without permission</li>
                <li>Use automated tools to scrape or collect data</li>
                <li>Reverse engineer or decompile our software</li>
                <li>Misrepresent your identity or affiliation</li>
              </ul>
              <p className="mt-4">
                Violation of these terms may result in immediate account termination without refund.
              </p>
            </div>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section id="liability">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-cyan-500" />
              </div>
              <h2 className="text-2xl font-bold">6. Limitation of Liability</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>TraderPath is provided &quot;as is&quot; without warranties of any kind</li>
                <li>We do not guarantee the accuracy of our analysis</li>
                <li>We are not responsible for trading losses</li>
                <li>Our total liability is limited to the amount you paid for our services</li>
                <li>We are not liable for indirect, incidental, or consequential damages</li>
              </ul>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  <strong>Trading Risk Warning:</strong> Cryptocurrency trading involves substantial risk of loss. Past performance is not indicative of future results. Only invest what you can afford to lose.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Intellectual Property */}
          <section id="ip">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold">7. Intellectual Property</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                All content, features, and functionality of TraderPath, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Analysis algorithms and methodologies</li>
                <li>User interface and design elements</li>
                <li>Trademarks, logos, and branding</li>
                <li>Documentation and educational content</li>
              </ul>
              <p className="mt-4">
                are owned by TraderPath and protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </div>
          </section>

          {/* Section 8: Modifications to Service */}
          <section id="modifications">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold">8. Modifications to Service</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We reserve the right to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Modify or discontinue any feature without notice</li>
                <li>Update pricing and credit costs</li>
                <li>Change these Terms of Service at any time</li>
                <li>Suspend service for maintenance or updates</li>
              </ul>
              <p className="mt-4">
                We will make reasonable efforts to notify users of significant changes via email or platform notifications.
              </p>
            </div>
          </section>

          {/* Section 9: Governing Law */}
          <section id="governing-law">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-teal-500" />
              </div>
              <h2 className="text-2xl font-bold">9. Governing Law</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TraderPath operates, without regard to its conflict of law provisions.
              </p>
              <p>
                Any disputes arising from these terms shall be resolved through binding arbitration, unless prohibited by local law.
              </p>
            </div>
          </section>

          {/* Section 10: Contact */}
          <section id="contact">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">10. Contact Us</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>If you have questions about these Terms of Service, please contact us:</p>
              <div className="bg-card border rounded-lg p-4">
                <ul className="space-y-2">
                  <li>
                    <strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:legal@traderpath.io" className="text-primary hover:underline">
                      legal@traderpath.io
                    </a>
                  </li>
                  <li>
                    <strong className="text-foreground">Support:</strong>{' '}
                    <a href="mailto:support@traderpath.io" className="text-primary hover:underline">
                      support@traderpath.io
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 p-8 bg-card border rounded-xl text-center">
          <h3 className="text-xl font-bold mb-2">Have Questions?</h3>
          <p className="text-muted-foreground mb-6">
            Our team is here to help clarify any terms or policies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:legal@traderpath.io"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              Contact Legal Team
            </a>
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
