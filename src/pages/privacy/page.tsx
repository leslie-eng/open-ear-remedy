
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useSEO } from '../../utils/seo';

export default function PrivacyPage() {
  useSEO({
    title: 'Privacy Policy - Open Ear | Your Data Protection & Privacy Rights',
    description: 'Learn how Open Ear protects your privacy and handles your personal data. We are committed to safeguarding your information and providing transparent data practices.',
    keywords: 'privacy policy, data protection, personal information, Open Ear privacy, user rights',
    canonical: '/privacy',
  });

  const lastUpdated = 'January 15, 2025';

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 md:px-8 lg:px-14 bg-gradient-to-b from-[#E6F5FF] to-[#FAFBFC]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
            <i className="ri-shield-check-line text-[#0096FF]"></i>
            <span className="text-sm font-medium text-[#6B6B6B]">Your Privacy Matters</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2A2A2A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Privacy Policy
          </h1>
          <p className="text-sm md:text-base text-[#6B6B6B] max-w-2xl mx-auto">
            We are committed to protecting your privacy and ensuring the security of your personal information.
          </p>
          <p className="text-xs text-[#6B6B6B] mt-4">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 md:py-16 px-4 md:px-8 lg:px-14">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10 lg:p-12">
            
            {/* Introduction */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-information-line text-[#0096FF]"></i>
                </span>
                Introduction
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed">
                Open Ear ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our emotional support services, including our website, mobile applications, and call/chat services (collectively, the "Services").
              </p>
            </div>

            {/* Information We Collect */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-database-2-line text-[#0096FF]"></i>
                </span>
                Information We Collect
              </h2>
              
              <h3 className="text-base md:text-lg font-semibold text-[#2A2A2A] mt-6 mb-3">Personal Information</h3>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed mb-4">
                When you create an account or use our Services, we may collect:
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Email address and password for account creation',
                  'Phone number for call services and notifications',
                  'Payment information processed securely through third-party providers',
                  'Appointment scheduling preferences and history',
                  'Communication preferences and settings',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm md:text-base text-[#6B6B6B]">
                    <i className="ri-checkbox-circle-line text-[#0096FF] mt-0.5"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h3 className="text-base md:text-lg font-semibold text-[#2A2A2A] mt-6 mb-3">Usage Information</h3>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed mb-4">
                We automatically collect certain information when you use our Services:
              </p>
              <ul className="space-y-2">
                {[
                  'Device information (browser type, operating system)',
                  'IP address and general location data',
                  'Service usage patterns and session duration',
                  'Call and chat metadata (duration, timestamps)',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm md:text-base text-[#6B6B6B]">
                    <i className="ri-checkbox-circle-line text-[#0096FF] mt-0.5"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How We Use Your Information */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-settings-3-line text-[#0096FF]"></i>
                </span>
                How We Use Your Information
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: 'ri-customer-service-2-line', text: 'Provide and maintain our emotional support services' },
                  { icon: 'ri-user-settings-line', text: 'Personalize your experience and preferences' },
                  { icon: 'ri-secure-payment-line', text: 'Process payments and manage your account' },
                  { icon: 'ri-mail-send-line', text: 'Send appointment reminders and notifications' },
                  { icon: 'ri-line-chart-line', text: 'Improve our services and develop new features' },
                  { icon: 'ri-shield-check-line', text: 'Ensure security and prevent fraud' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-[#F8FAFC] rounded-xl">
                    <i className={`${item.icon} text-[#0096FF] text-lg`}></i>
                    <span className="text-sm text-[#6B6B6B]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Security */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-lock-line text-[#0096FF]"></i>
                </span>
                Data Security
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed mb-4">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <div className="bg-[#E6F5FF] rounded-xl p-6">
                <ul className="space-y-3">
                  {[
                    'End-to-end encryption for all communications',
                    'Secure data storage with regular backups',
                    'Regular security audits and vulnerability assessments',
                    'Strict access controls and employee training',
                    'Compliance with industry security standards',
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm md:text-base text-[#2A2A2A]">
                      <i className="ri-shield-star-line text-[#0096FF] mt-0.5"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-share-line text-[#0096FF]"></i>
                </span>
                Data Sharing & Disclosure
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed mb-4">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="space-y-3">
                {[
                  { title: 'Service Providers', desc: 'Third-party vendors who assist in providing our services (e.g., Twilio for calls, payment processors)' },
                  { title: 'Legal Requirements', desc: 'When required by law or to protect our rights and safety' },
                  { title: 'Business Transfers', desc: 'In connection with a merger, acquisition, or sale of assets' },
                  { title: 'With Your Consent', desc: 'When you explicitly authorize us to share your information' },
                ].map((item, index) => (
                  <li key={index} className="p-4 bg-[#F8FAFC] rounded-xl">
                    <p className="font-semibold text-sm text-[#2A2A2A] mb-1">{item.title}</p>
                    <p className="text-sm text-[#6B6B6B]">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Your Rights */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-user-star-line text-[#0096FF]"></i>
                </span>
                Your Rights
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: 'ri-eye-line', title: 'Access', desc: 'Request a copy of your data' },
                  { icon: 'ri-edit-line', title: 'Correction', desc: 'Update inaccurate information' },
                  { icon: 'ri-delete-bin-line', title: 'Deletion', desc: 'Request data removal' },
                  { icon: 'ri-download-line', title: 'Portability', desc: 'Export your data' },
                ].map((item, index) => (
                  <div key={index} className="p-4 border border-[#E5E7EB] rounded-xl hover:border-[#0096FF]/30 transition-colors">
                    <div className="w-10 h-10 bg-[#0096FF]/10 rounded-lg flex items-center justify-center mb-3">
                      <i className={`${item.icon} text-[#0096FF]`}></i>
                    </div>
                    <p className="font-semibold text-sm text-[#2A2A2A] mb-1">{item.title}</p>
                    <p className="text-xs text-[#6B6B6B]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cookies */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-cookie-line text-[#0096FF]"></i>
                </span>
                Cookies & Tracking
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and personalize content. You can manage your cookie preferences through your browser settings. Essential cookies are required for the basic functionality of our Services.
              </p>
            </div>

            {/* Children's Privacy */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-parent-line text-[#0096FF]"></i>
                </span>
                Children's Privacy
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed">
                Our Services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a minor, please contact us immediately.
              </p>
            </div>

            {/* Changes to Policy */}
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center">
                  <i className="ri-refresh-line text-[#0096FF]"></i>
                </span>
                Changes to This Policy
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-[#0096FF] rounded-xl p-6 md:p-8 text-white">
              <h2 className="text-xl md:text-2xl font-bold mb-3">Questions About Privacy?</h2>
              <p className="text-sm md:text-base text-white/90 mb-6">
                If you have any questions about this Privacy Policy or our data practices, please contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="mailto:privacy@openear.com" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0096FF] rounded-full font-semibold text-sm hover:bg-[#E6F5FF] transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-mail-line"></i>
                  privacy@openear.com
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
            <Link to="/terms" className="text-sm text-[#0096FF] hover:underline flex items-center gap-2 cursor-pointer">
              <i className="ri-file-text-line"></i>
              Terms of Service
            </Link>
            <span className="hidden sm:block text-[#E5E7EB]">|</span>
            <Link to="/" className="text-sm text-[#6B6B6B] hover:text-[#0096FF] flex items-center gap-2 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0096FF] text-white py-10 md:py-12 px-4 md:px-8 lg:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Open Ear</h3>
              <p className="text-sm text-white/80">A safe place to share what's on your mind.</p>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                <i className="ri-instagram-line text-sm"></i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                <i className="ri-twitter-x-line text-sm"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                <i className="ri-facebook-fill text-sm"></i>
              </a>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-white/70">© 2026 Open Ear. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <Link to="/privacy" className="text-xs text-white hover:text-white/80 transition-colors cursor-pointer">Privacy Policy</Link>
                <Link to="/terms" className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer">Terms</Link>
                <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer">Powered by Readdy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
