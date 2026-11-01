
import { Link } from 'react-router-dom';
import SiteFooter from '../../components/feature/SiteFooter';
import Navbar from '../../components/feature/Navbar';
import { useSEO } from '../../utils/seo';

export default function TermsPage() {
  useSEO({
    title: 'Terms of Service - Open Ear | User Agreement & Service Terms',
    description: 'Read the Terms of Service for Open Ear emotional support services. Understand your rights, responsibilities, and our service guidelines.',
    keywords: 'terms of service, user agreement, service terms, Open Ear terms, legal terms',
    canonical: '/terms',
  });

  const lastUpdated = 'January 15, 2025';

  return (
    <div className="min-h-screen bg-oe-surface-low">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 md:px-8 lg:px-14 bg-oe-bg">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
            <i className="ri-file-text-line text-oe-primary"></i>
            <span className="text-sm font-medium text-oe-muted">Legal Agreement</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-oe-ink mb-4">
            Terms of Service
          </h1>
          <p className="text-sm md:text-base text-oe-muted max-w-2xl mx-auto">
            Please read these terms carefully before using our emotional support services.
          </p>
          <p className="text-xs text-oe-muted mt-4">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 md:py-16 px-4 md:px-8 lg:px-14">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10 lg:p-12">
            
            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-10">
              <div className="flex items-start gap-3">
                <i className="ri-error-warning-line text-amber-600 text-xl mt-0.5"></i>
                <div>
                  <p className="font-semibold text-sm text-amber-800 mb-1">Important Notice</p>
                  <p className="text-sm text-amber-700">
                    Open Ear provides emotional support services and is not a substitute for professional mental health treatment, therapy, or medical advice. If you are experiencing a mental health emergency, please contact emergency services or a crisis hotline immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Agreement to Terms */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">1</span>
                Agreement to Terms
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                By accessing or using Open Ear's services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services. We reserve the right to modify these terms at any time, and your continued use of the services constitutes acceptance of any changes.
              </p>
            </div>

            {/* Description of Services */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">2</span>
                Description of Services
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed mb-4">
                Open Ear provides emotional support services through:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: 'ri-phone-line', title: 'Voice Calls', desc: 'Real-time voice support sessions via secure phone connections' },
                  { icon: 'ri-message-3-line', title: 'AI Chat', desc: 'Text-based emotional support through our AI assistant' },
                  { icon: 'ri-calendar-line', title: 'Appointments', desc: 'Scheduled support sessions at your convenience' },
                  { icon: 'ri-wallet-3-line', title: 'Credit System', desc: 'Pay-per-minute pricing with credit packages' },
                ].map((item, index) => (
                  <div key={index} className="p-4 bg-oe-surface-low rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <i className={`${item.icon} text-oe-primary text-lg`}></i>
                      <p className="font-semibold text-sm text-oe-ink">{item.title}</p>
                    </div>
                    <p className="text-xs text-oe-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Eligibility */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">3</span>
                Eligibility
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed mb-4">
                To use our services, you must:
              </p>
              <ul className="space-y-2">
                {[
                  'Be at least 18 years of age',
                  'Have the legal capacity to enter into a binding agreement',
                  'Provide accurate and complete registration information',
                  'Maintain the security of your account credentials',
                  'Not use the services for any illegal or unauthorized purpose',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm md:text-base text-oe-muted">
                    <i className="ri-checkbox-circle-line text-oe-primary mt-0.5"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account Registration */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">4</span>
                Account Registration
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed mb-4">
                When creating an account, you agree to:
              </p>
              <ul className="space-y-2">
                {[
                  'Provide accurate, current, and complete information',
                  'Maintain and promptly update your account information',
                  'Keep your password confidential and secure',
                  'Accept responsibility for all activities under your account',
                  'Notify us immediately of any unauthorized access',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm md:text-base text-oe-muted">
                    <i className="ri-arrow-right-s-line text-oe-primary mt-0.5"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Terms */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">5</span>
                Payment Terms
              </h2>
              <div className="bg-oe-primary-tint rounded-xl p-6 mb-4">
                <h3 className="font-semibold text-base text-oe-ink mb-3">Credit System</h3>
                <ul className="space-y-2">
                  {[
                    'Credits are purchased in advance and deducted per minute of service',
                    'Credit packages are non-refundable once purchased',
                    'Unused credits do not expire',
                    'Pricing is displayed before purchase and service use',
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-oe-ink">
                      <i className="ri-coin-line text-oe-primary mt-0.5"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                All payments are processed securely through third-party payment providers. By making a purchase, you authorize us to charge your selected payment method. You are responsible for any applicable taxes.
              </p>
            </div>

            {/* Service Limitations */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">6</span>
                Service Limitations
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4">
                <p className="font-semibold text-sm text-red-800 mb-2">Open Ear is NOT:</p>
                <ul className="space-y-2">
                  {[
                    'A licensed therapy or counseling service',
                    'A substitute for professional mental health treatment',
                    'An emergency or crisis intervention service',
                    'A medical advice or diagnosis provider',
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-red-700">
                      <i className="ri-close-circle-line text-red-500 mt-0.5"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                If you are experiencing a mental health crisis, suicidal thoughts, or any emergency situation, please contact emergency services (999 or 112 in Kenya), a crisis line listed on our Crisis Help page, or seek immediate professional help.
              </p>
            </div>

            {/* User Conduct */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">7</span>
                User Conduct
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed mb-4">
                When using our services, you agree NOT to:
              </p>
              <ul className="space-y-2">
                {[
                  'Use abusive, threatening, or harassing language',
                  'Share illegal, harmful, or inappropriate content',
                  'Attempt to record or distribute conversations without consent',
                  'Impersonate others or provide false information',
                  'Interfere with or disrupt the services or servers',
                  'Use the services for commercial purposes without authorization',
                  'Violate any applicable laws or regulations',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm md:text-base text-oe-muted">
                    <i className="ri-prohibited-line text-red-500 mt-0.5"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Intellectual Property */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">8</span>
                Intellectual Property
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                All content, features, and functionality of our services, including but not limited to text, graphics, logos, icons, images, audio, and software, are the exclusive property of Open Ear and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written permission.
              </p>
            </div>

            {/* Disclaimer of Warranties */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">9</span>
                Disclaimer of Warranties
              </h2>
              <div className="bg-oe-surface-low rounded-xl p-5">
                <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                  OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. YOUR USE OF THE SERVICES IS AT YOUR OWN RISK.
                </p>
              </div>
            </div>

            {/* Limitation of Liability */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">10</span>
                Limitation of Liability
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                To the maximum extent permitted by law, Open Ear shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses, resulting from your use or inability to use the services. Our total liability shall not exceed the amount you paid for the services in the twelve (12) months preceding the claim.
              </p>
            </div>

            {/* Indemnification */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">11</span>
                Indemnification
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                You agree to indemnify, defend, and hold harmless Open Ear and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the services, violation of these terms, or infringement of any third-party rights.
              </p>
            </div>

            {/* Termination */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">12</span>
                Termination
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed mb-4">
                We may terminate or suspend your account and access to the services at our sole discretion, without prior notice, for any reason, including:
              </p>
              <ul className="space-y-2">
                {[
                  'Violation of these Terms of Service',
                  'Conduct that we determine is harmful to other users or our business',
                  'Extended periods of inactivity',
                  'Request by law enforcement or government agencies',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm md:text-base text-oe-muted">
                    <i className="ri-arrow-right-s-line text-oe-primary mt-0.5"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Governing Law */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">13</span>
                Governing Law
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with the laws of Finland, without regard to its conflict of law provisions. Any disputes arising from these terms or your use of the services shall be resolved in the courts of Finland.
              </p>
            </div>

            {/* Changes to Terms */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-oe-ink mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-oe-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-oe-primary">14</span>
                Changes to Terms
              </h2>
              <p className="text-sm md:text-base text-oe-muted leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. We will notify users of material changes by posting the updated terms on our website and updating the "Last updated" date. Your continued use of the services after such changes constitutes acceptance of the new terms.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-oe-primary rounded-xl p-6 md:p-8 text-white">
              <h2 className="text-xl md:text-2xl font-bold mb-3">Questions About Our Terms?</h2>
              <p className="text-sm md:text-base text-white/90 mb-6">
                If you have any questions about these Terms of Service, please contact our legal team.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="mailto:legal@openearemedy.com" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-oe-primary rounded-full font-semibold text-sm hover:bg-oe-primary-tint transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-mail-line"></i>
                  legal@openearemedy.com
                </a>
                <Link to="/contact" className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white rounded-full font-semibold text-sm hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-message-3-line"></i>
                  Contact Us
                </Link>
              </div>
            </div>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/privacy" className="text-sm text-oe-primary hover:underline flex items-center gap-2 cursor-pointer">
              <i className="ri-shield-check-line"></i>
              Privacy Policy
            </Link>
            <span className="hidden sm:block text-oe-line">|</span>
            <Link to="/" className="text-sm text-oe-muted hover:text-oe-primary flex items-center gap-2 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
