import { Link } from 'react-router-dom';
import SiteFooter from '../../components/feature/SiteFooter';
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
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-shield-check-line" aria-hidden="true" /> Your privacy
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">We are committed to protecting your privacy and ensuring the security of your personal information.</p>
        <p className="mt-2 text-sm text-oe-muted">Last updated: {lastUpdated}</p>

        <div className="mt-10 rounded-3xl border border-oe-line bg-white p-6 md:p-10">

          {/* Introduction */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-information-line text-oe-primary" aria-hidden="true" />
              </span>
              Introduction
            </h2>
            <p className="text-body text-oe-muted leading-relaxed">
              Open Ear ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our emotional support services, including our website, mobile applications, and call/chat services (collectively, the "Services").
            </p>
          </div>

          {/* Information We Collect */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-database-2-line text-oe-primary" aria-hidden="true" />
              </span>
              Information We Collect
            </h2>

            <h3 className="mb-3 mt-6 font-sans text-lg font-semibold">Personal Information</h3>
            <p className="text-body text-oe-muted leading-relaxed mb-4">
              When you create an account or use our Services, we may collect:
            </p>
            <ul className="space-y-2 mb-6">
              {[
                'Email address and password for account creation',
                'Your M-Pesa phone number and receipt number when you pay (shown only to you and our admins)',
                'Payment confirmations from Safaricom M-Pesa (we never see your M-Pesa PIN)',
                'Bookings you make and their history',
                'Communication preferences and settings',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-body text-oe-muted">
                  <i className="ri-checkbox-circle-line text-oe-primary mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="mb-3 mt-6 font-sans text-lg font-semibold">Usage Information</h3>
            <p className="text-body text-oe-muted leading-relaxed mb-4">
              We automatically collect certain information when you use our Services:
            </p>
            <ul className="space-y-2">
              {[
                'Device information (browser type, operating system)',
                'IP address and general location data',
                'Service usage patterns and visit length',
                'Call and chat metadata (duration, timestamps)',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-body text-oe-muted">
                  <i className="ri-checkbox-circle-line text-oe-primary mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="mb-3 mt-6 font-sans text-lg font-semibold">Conversations and Listener notes</h3>
            <p className="text-body text-oe-muted leading-relaxed mb-3">
              Calls and text chats with Listeners are never recorded, and what you type in a text chat is never
              saved. AI chat messages are not stored either.
            </p>
            <p className="text-body text-oe-muted leading-relaxed">
              After a conversation, a Listener may keep a brief private note so the next Listener does not need to ask
              you to repeat your story. Only Listeners you talk to and Open Ear admins can read notes; Listeners only
              ever see the display name you choose. Notes are deleted after 12 months. You can turn notes off (which
              also deletes existing ones) or delete them at any time from your profile.
            </p>
          </div>

          {/* How We Use Your Information */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-settings-3-line text-oe-primary" aria-hidden="true" />
              </span>
              How We Use Your Information
            </h2>
            <p className="text-body text-oe-muted leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: 'ri-customer-service-2-line', text: 'Provide and maintain our emotional support services' },
                { icon: 'ri-user-settings-line', text: 'Personalize your experience and preferences' },
                { icon: 'ri-secure-payment-line', text: 'Process payments and manage your account' },
                { icon: 'ri-mail-send-line', text: 'Send booking reminders and notifications' },
                { icon: 'ri-line-chart-line', text: 'Improve our services and develop new features' },
                { icon: 'ri-shield-check-line', text: 'Ensure security and prevent fraud' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 rounded-2xl bg-oe-surface-low p-4">
                  <i className={`${item.icon} text-oe-primary text-lg`} aria-hidden="true" />
                  <span className="text-sm text-oe-muted">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Security */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-lock-line text-oe-primary" aria-hidden="true" />
              </span>
              Data Security
            </h2>
            <p className="text-body text-oe-muted leading-relaxed mb-4">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <div className="rounded-2xl bg-oe-primary-tint p-6">
              <ul className="space-y-3">
                {[
                  'Encrypted connections between your device and our servers',
                  'Secure data storage with regular backups',
                  'Regular security audits and vulnerability assessments',
                  'Strict access controls and employee training',
                  'Compliance with industry security standards',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-body text-oe-ink">
                    <i className="ri-shield-star-line text-oe-primary mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data Sharing */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-share-line text-oe-primary" aria-hidden="true" />
              </span>
              Data Sharing & Disclosure
            </h2>
            <p className="text-body text-oe-muted leading-relaxed mb-4">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="space-y-3">
              {[
                { title: 'Service Providers', desc: 'Third-party vendors who assist in providing our services (e.g., Cloudflare for call audio relay, Neon for data and file storage, Safaricom M-Pesa for payments, OpenRouter for AI chat)' },
                { title: 'Legal Requirements', desc: 'When required by law or to protect our rights and safety' },
                { title: 'Business Transfers', desc: 'In connection with a merger, acquisition, or sale of assets' },
                { title: 'With Your Consent', desc: 'When you explicitly authorize us to share your information' },
              ].map((item, index) => (
                <li key={index} className="rounded-2xl bg-oe-surface-low p-4">
                  <p className="font-semibold text-sm text-oe-ink mb-1">{item.title}</p>
                  <p className="text-sm text-oe-muted">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Your Rights */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-user-star-line text-oe-primary" aria-hidden="true" />
              </span>
              Your Rights
            </h2>
            <p className="text-body text-oe-muted leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: 'ri-eye-line', title: 'Access', desc: 'Request a copy of your data' },
                { icon: 'ri-edit-line', title: 'Correction', desc: 'Update inaccurate information' },
                { icon: 'ri-delete-bin-line', title: 'Deletion', desc: 'Request data removal' },
                { icon: 'ri-download-line', title: 'Portability', desc: 'Export your data' },
              ].map((item, index) => (
                <div key={index} className="rounded-2xl border border-oe-line p-4 transition-colors hover:border-oe-primary/30">
                  <div aria-hidden="true" className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                    <i className={`${item.icon} text-oe-primary`} aria-hidden="true" />
                  </div>
                  <p className="font-semibold text-sm text-oe-ink mb-1">{item.title}</p>
                  <p className="text-xs text-oe-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cookies */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-cookie-line text-oe-primary" aria-hidden="true" />
              </span>
              Cookies & Tracking
            </h2>
            <p className="text-body text-oe-muted leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and personalize content. You can manage your cookie preferences through your browser settings. Essential cookies are required for the basic functionality of our Services.
            </p>
          </div>

          {/* Children's Privacy */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-parent-line text-oe-primary" aria-hidden="true" />
              </span>
              Children's Privacy
            </h2>
            <p className="text-body text-oe-muted leading-relaxed">
              Our Services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a minor, please contact us immediately.
            </p>
          </div>

          {/* Changes to Policy */}
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-refresh-line text-oe-primary" aria-hidden="true" />
              </span>
              Changes to This Policy
            </h2>
            <p className="text-body text-oe-muted leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-3xl border border-oe-line bg-oe-surface p-6 md:p-8">
            <h2 className="mb-3 text-2xl font-semibold">Questions About Privacy?</h2>
            <p className="mb-6 text-body text-oe-muted">
              If you have any questions about this Privacy Policy or our data practices, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="mailto:privacy@openearemedy.com" className="oe-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-oe-primary px-6 py-3 text-sm font-semibold text-white hover:bg-oe-primary-hover">
                <i className="ri-mail-line" aria-hidden="true" />
                privacy@openearemedy.com
              </a>
              <Link to="/contact" className="oe-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-oe-line bg-white px-6 py-3 text-sm font-semibold text-oe-ink">
                <i className="ri-message-3-line" aria-hidden="true" />
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/terms" className="text-sm text-oe-primary hover:underline flex items-center gap-2 cursor-pointer">
            <i className="ri-file-text-line" aria-hidden="true" />
            Terms of Service
          </Link>
          <span className="hidden sm:block text-oe-line">|</span>
          <Link to="/" className="text-sm text-oe-muted hover:text-oe-primary flex items-center gap-2 cursor-pointer">
            <i className="ri-arrow-left-line" aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
