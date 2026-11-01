import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import NewsletterSignup from '../../components/feature/NewsletterSignup';
import Hero from '../../components/home/Hero';
import TrustBlock from '../../components/home/TrustBlock';
import HowItWorksSteps from '../../components/home/HowItWorksSteps';
import PricingEstimator from '../../components/home/PricingEstimator';
import MobileActionBar, { MOBILE_BAR_PADDING } from '../../components/home/MobileActionBar';
import { useReveal } from '../../hooks/useReveal';
import { siteConfig } from '../../config/site';
import { useSEO, generateOrganizationSchema, generateServiceSchema } from '../../utils/seo';

const SUPPORT_STYLES = [
  {
    icon: 'ri-phone-line',
    title: 'Voice Connection',
    points: [
      'Real-time emotional support',
      'Secure, private calls',
      'Pay per minute - simple pricing',
      'Connect instantly when you need it',
    ],
    cta: { to: '/call', label: 'Start a Call' },
  },
  {
    icon: 'ri-calendar-check-line',
    title: 'Book Appointment',
    points: [
      'Schedule at your convenience',
      'Email & calendar reminders',
      'Flexible rescheduling',
      'Dedicated support time',
    ],
    cta: { to: '/call', label: 'Book Now' },
  },
  {
    icon: 'ri-timer-line',
    title: 'Flexible Minutes',
    points: [
      'Buy minutes in packages',
      'Save more with larger packs',
      'Minutes never expire',
      'No long-term commitment',
    ],
    cta: { to: '/pricing', label: 'View Pricing' },
  },
];

// TODO(testimonials): these came with the original site template. Confirm they are real,
// consented quotes before launch, or remove them.
const QUOTES = [
  {
    initial: 'S',
    name: 'Sarah M.',
    role: 'Student',
    text: 'Open Ear has been a lifeline during stressful exam periods. Having someone to talk to without judgment makes all the difference.',
  },
  {
    initial: 'M',
    name: 'Michael T.',
    role: 'Working Professional',
    text: 'The pay-per-minute model is perfect. I can get support on my schedule without worrying about subscription fees.',
  },
  {
    initial: 'J',
    name: 'Jessica L.',
    role: '',
    text: 'A safe space when I needed it most.',
  },
  {
    initial: 'D',
    name: 'David R.',
    role: 'Entrepreneur',
    text: 'Running a business can be isolating. Open Ear gives me a place to process my thoughts and feelings without the pressure of formal therapy.',
  },
  {
    initial: 'A',
    name: 'Amanda K.',
    role: 'Freelancer',
    text: 'Being able to call whenever I need support has been life-changing. The booking system makes it easy to plan ahead.',
  },
  {
    initial: 'R',
    name: 'Robert P.',
    role: 'Teacher',
    text: 'I appreciate the pay-per-session model. I can use it when I need it without feeling locked into a subscription.',
  },
];

const FOOTER_LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
];

const SOCIAL_LINKS = [
  { href: 'https://instagram.com', icon: 'ri-instagram-line', label: 'Instagram' },
  { href: 'https://twitter.com', icon: 'ri-twitter-x-line', label: 'X (Twitter)' },
  { href: 'https://facebook.com', icon: 'ri-facebook-fill', label: 'Facebook' },
  { href: 'https://linkedin.com', icon: 'ri-linkedin-fill', label: 'LinkedIn' },
];

export default function HomePage() {
  // SEO Configuration
  useSEO({
    title: 'Open Ear | Emotional Support by Call and Chat',
    description: 'Open Ear is your safe, judgment-free space for emotional support. Talk by call or chat anytime, with flexible pay-as-you-go options and instant access to support.',
    keywords: 'Open Ear, OpenEar, Open Ear support, emotional support, mental wellness support, call support, chat support, safe space to talk, someone to listen',
    canonical: '/',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: 'Open Ear',
          alternateName: 'OpenEar',
          url: 'https://openearemedy.com',
        },
        {
          '@type': 'WebPage',
          name: 'Open Ear Home',
          url: 'https://openearemedy.com/',
          description:
            'Open Ear offers judgment-free emotional support through call and chat for people who need someone to listen.',
          isPartOf: {
            '@type': 'WebSite',
            name: 'Open Ear',
            url: 'https://openearemedy.com',
          },
        },
        generateOrganizationSchema(),
        generateServiceSchema(),
      ],
    },
  });

  // The mobile action bar appears once the hero (and its CTAs) leave the viewport.
  const heroRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stylesHeadingRef = useReveal<HTMLDivElement>();
  const stylesGridRef = useReveal<HTMLDivElement>();
  const quotesHeadingRef = useReveal<HTMLDivElement>();
  const quotesGridRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();

  return (
    <div className={`min-h-screen bg-oe-cream text-oe-ink ${MOBILE_BAR_PADDING}`}>
      <Navbar transparent={true} />

      <main>
        <Hero ref={heroRef} />
        <TrustBlock />
        <HowItWorksSteps />

        {/* Support styles */}
        <section aria-labelledby="styles-heading" className="bg-white px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div ref={stylesHeadingRef} data-reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10 md:mb-12">
              <h2 id="styles-heading" className="font-heading text-3xl md:text-4xl font-bold text-oe-ink">
                Choose Your Support Style
              </h2>
              <p className="text-body text-oe-muted max-w-sm md:text-right">
                Real voice support when you need it most, with flexible pricing by the minute
              </p>
            </div>

            <div ref={stylesGridRef} data-reveal-group className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {SUPPORT_STYLES.map((style) => (
                <div key={style.title} className="oe-card flex flex-col bg-oe-cream rounded-oe-md border border-oe-line p-7 shadow-oe-sm">
                  <span className="w-12 h-12 rounded-full bg-oe-blue-tint text-oe-blue flex items-center justify-center mb-5">
                    <i className={`${style.icon} text-2xl`} aria-hidden="true" />
                  </span>
                  <h3 className="font-heading text-xl font-semibold text-oe-ink mb-4">{style.title}</h3>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {style.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-body text-oe-muted">
                        <i className="ri-check-line text-oe-sage text-lg mt-0.5" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={style.cta.to} className="inline-flex items-center gap-2 font-semibold text-oe-blue">
                    <span className="oe-link">{style.cta.label}</span>
                    <i className="ri-arrow-right-line" aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingEstimator />

        {/* Testimonials */}
        <section aria-labelledby="stories-heading" className="bg-oe-cream px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div ref={quotesHeadingRef} data-reveal className="text-center mb-10 md:mb-12">
              <h2 id="stories-heading" className="font-heading text-3xl md:text-4xl font-bold text-oe-ink">
                Real Stories, Real Support
              </h2>
            </div>

            <div ref={quotesGridRef} data-reveal-group className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {QUOTES.map((quote) => (
                <figure key={quote.name} className="oe-card bg-white rounded-oe-md border border-oe-line p-6 md:p-7 shadow-oe-sm">
                  <i className="ri-double-quotes-l text-3xl text-oe-sage block mb-2" aria-hidden="true" />
                  <blockquote className="text-body text-oe-ink mb-5">&ldquo;{quote.text}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full bg-oe-blue-tint text-oe-blue font-bold flex items-center justify-center"
                    >
                      {quote.initial}
                    </span>
                    <span>
                      <span className="block font-semibold text-oe-ink">{quote.name}</span>
                      {quote.role && <span className="block text-sm text-oe-muted">{quote.role}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="relative overflow-hidden">
          <img
            src="https://static.readdy.ai/image/7c6b8d1dcab40743d27d791ddb990d62/f1efb7ec7f8e2359adf77f5e3104e7ac.jpeg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,74,117,0.88)] to-[rgba(11,74,117,0.55)]" aria-hidden="true" />

          <div ref={ctaRef} data-reveal className="relative max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-white mb-3">Ready to talk?</h2>
              <p className="text-body-lg text-white/90">
                Connect with support in minutes.
                <br />
                No judgment, just listening.
              </p>
            </div>
            <Link
              to="/get-started"
              className="oe-btn self-start md:self-auto inline-flex items-center gap-3 rounded-oe-sm bg-white px-7 py-3.5 text-body font-semibold text-oe-ink hover:bg-oe-blue-tint"
            >
              Get Started Now
              <i className="ri-arrow-right-line text-oe-blue" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-oe-deep text-white px-5 md:px-8 py-14 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 mb-10">
            <div className="lg:col-span-4">
              <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">Open Ear</h2>
              <p className="text-body text-white/85 mb-6">
                We provide a safe, judgment-free space for emotional support. Whether you need to talk or chat, we&rsquo;re here to listen when you need it most.
              </p>
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="oe-btn w-10 h-10 border border-white/50 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10"
                  >
                    <i className={social.icon} aria-hidden="true" />
                  </a>
                ))}
              </div>
              <div className="mt-8">
                <NewsletterSignup />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-5">
              <div>
                <p className="text-sm uppercase text-white/80 mb-1 tracking-wider">Address</p>
                <p className="text-body text-white/90">Rantatie</p>
                <p className="text-body text-white/90">Ranua</p>
              </div>
              <div>
                <p className="text-sm uppercase text-white/80 mb-1 tracking-wider">Phone</p>
                <p className="text-body text-white/90">+358 41 7203762</p>
              </div>
              <div>
                <p className="text-sm uppercase text-white/80 mb-1 tracking-wider">Email</p>
                <p className="text-body text-white/90">support@openearemedy.com</p>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-oe-md overflow-hidden border-2 border-white/80 h-48 md:h-56 lg:h-60">
                <img
                  src="https://static.readdy.ai/image/7c6b8d1dcab40743d27d791ddb990d62/aead965964394cc03948dd12339d9860.jpeg"
                  alt="Community"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/25 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/80 text-center md:text-left">© 2026 Open Ear. All rights reserved.</p>
            <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link to={siteConfig.crisisPath} className="text-sm font-semibold text-white">
                <span className="oe-link">In crisis? Get urgent help</span>
              </Link>
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => window.scrollTo(0, 0)}
                  className="text-sm text-white/85 hover:text-white"
                >
                  <span className="oe-link">{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>

      <MobileActionBar visible={!heroVisible} />
    </div>
  );
}
