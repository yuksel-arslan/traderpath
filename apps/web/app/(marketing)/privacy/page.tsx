'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, UserCheck, Globe, Mail } from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 16, 2025';

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
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-rose-500 text-white rounded-lg font-medium hover:from-teal-600 hover:to-rose-600 transition-all shadow-sm shadow-teal-500/20"
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            At TraderPath, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="bg-card border rounded-xl p-6 mb-12">
          <h2 className="font-semibold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '#information-we-collect', label: 'Information We Collect', icon: Database },
              { href: '#how-we-use', label: 'How We Use Info', icon: Eye },
              { href: '#data-security', label: 'Data Security', icon: Lock },
              { href: '#your-rights', label: 'Your Rights', icon: UserCheck },
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
          {/* Section 1: Information We Collect */}
          <section id="information-we-collect">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">1. Information We Collect</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>We collect information that you provide directly to us, including:</p>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Account Information</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email address</li>
                  <li>Name (optional)</li>
                  <li>Password (encrypted)</li>
                  <li>Profile picture (if using Google Sign-In)</li>
                </ul>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Usage Information</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Analysis history and preferences</li>
                  <li>Trading pairs you analyze</li>
                  <li>Feature usage patterns</li>
                  <li>Device information and IP address</li>
                </ul>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Payment Information</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Payment transactions are processed by Stripe</li>
                  <li>We do not store credit card numbers</li>
                  <li>We retain transaction IDs for record-keeping</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section id="how-we-use">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, and security alerts</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
                <li>Personalize and improve your experience on our platform</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Information Sharing */}
          <section id="information-sharing">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold">3. Information Sharing</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Service Providers</h3>
                <p>We may share information with third-party vendors who perform services on our behalf, such as payment processing (Stripe), email delivery, and hosting services.</p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Legal Requirements</h3>
                <p>We may disclose information if required by law or in response to valid legal requests from public authorities.</p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Business Transfers</h3>
                <p>In connection with any merger, sale of company assets, or acquisition, your information may be transferred as part of the transaction.</p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Security */}
          <section id="data-security">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">4. Data Security</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>We implement appropriate technical and organizational measures to protect your personal information:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-foreground">Encryption:</strong> All data is transmitted using 256-bit SSL/TLS encryption</li>
                <li><strong className="text-foreground">Password Security:</strong> Passwords are hashed using bcrypt with salt</li>
                <li><strong className="text-foreground">Access Control:</strong> Strict access controls limit who can access your data</li>
                <li><strong className="text-foreground">Regular Audits:</strong> We regularly review and update our security practices</li>
                <li><strong className="text-foreground">No Trading Keys:</strong> We never ask for or store your exchange API keys</li>
              </ul>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-4">
                <p className="text-amber-600 dark:text-amber-400 text-sm">
                  <strong>Important:</strong> While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Cookies and Tracking */}
          <section id="cookies">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-cyan-500" />
              </div>
              <h2 className="text-2xl font-bold">5. Cookies and Tracking Technologies</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>We use cookies and similar tracking technologies to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Keep you signed in to your account</li>
                <li>Remember your preferences and settings</li>
                <li>Understand how you use our platform</li>
                <li>Improve our services based on usage patterns</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our platform.
              </p>
            </div>
          </section>

          {/* Section 6: Your Rights */}
          <section id="your-rights">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold">6. Your Rights</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>

              <div className="grid gap-3">
                {[
                  { title: 'Access', desc: 'Request a copy of your personal data' },
                  { title: 'Correction', desc: 'Request correction of inaccurate data' },
                  { title: 'Deletion', desc: 'Request deletion of your personal data' },
                  { title: 'Portability', desc: 'Request transfer of your data to another service' },
                  { title: 'Objection', desc: 'Object to processing of your personal data' },
                  { title: 'Restriction', desc: 'Request restriction of processing' },
                ].map((right) => (
                  <div key={right.title} className="flex items-start gap-3 bg-card border rounded-lg p-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <span className="font-semibold text-foreground">{right.title}:</span>{' '}
                      {right.desc}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4">
                To exercise any of these rights, please contact us at{' '}
                <a href="mailto:privacy@traderpath.io" className="text-primary hover:underline">
                  privacy@traderpath.io
                </a>
              </p>
            </div>
          </section>

          {/* Section 7: Data Retention */}
          <section id="data-retention">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold">7. Data Retention</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>We retain your personal information for as long as necessary to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce our agreements</li>
              </ul>
              <p className="mt-4">
                When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal purposes.
              </p>
            </div>
          </section>

          {/* Section 8: Children's Privacy */}
          <section id="childrens-privacy">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">8. Children&apos;s Privacy</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                TraderPath is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child without parental consent, we will take steps to delete that information.
              </p>
            </div>
          </section>

          {/* Section 9: International Transfers */}
          <section id="international-transfers">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-teal-500" />
              </div>
              <h2 className="text-2xl font-bold">9. International Data Transfers</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. By using our services, you consent to the transfer of your information to these countries.
              </p>
              <p>
                We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
              </p>
            </div>
          </section>

          {/* Section 10: Changes to This Policy */}
          <section id="changes">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold">10. Changes to This Policy</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
              <p>
                We encourage you to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </div>
          </section>

          {/* Section 11: Contact Us */}
          <section id="contact">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">11. Contact Us</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="bg-card border rounded-lg p-4">
                <ul className="space-y-2">
                  <li>
                    <strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:privacy@traderpath.io" className="text-primary hover:underline">
                      privacy@traderpath.io
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
          <h3 className="text-xl font-bold mb-2">Have Questions?</h3>
          <p className="text-muted-foreground mb-6">
            We&apos;re here to help. Contact our team for any privacy-related inquiries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:privacy@traderpath.io"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              Contact Privacy Team
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
