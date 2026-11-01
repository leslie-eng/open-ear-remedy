import { Link } from 'react-router-dom';
import {
  CREDITS_PER_CALL_MINUTE,
  CREDITS_PER_CHAT_MESSAGE,
  FREE_TRIAL_CREDITS,
  MAX_CALL_SECONDS,
  MONTHLY_PASS,
  formatPrice,
} from '@openear/shared/pricing';
import SiteFooter from '../../components/feature/SiteFooter';
import Navbar from '../../components/feature/Navbar';
import { siteConfig } from '../../config/site';
import { useSEO, generateWebPageSchema, generateFAQSchema } from '../../utils/seo';

const STEPS = [
  {
    icon: 'ri-leaf-line',
    label: 'Optional',
    title: 'Take a 2-minute check-in',
    body: 'A few gentle questions about how you are. No sign-in needed, and your answers stay in this browser. We suggest the way to talk that might suit you best.',
    link: { to: '/check-in', label: 'Start the check-in' },
  },
  {
    icon: 'ri-route-line',
    label: 'Choose',
    title: 'Pick how you want to talk',
    body: 'Talk now on a call in your browser, text a Listener, chat with the AI Companion, or book a time for later. Sign in when you are ready to start.',
    link: null,
  },
  {
    icon: 'ri-chat-smile-3-line',
    label: 'Talk',
    title: 'Say as much or as little as you like',
    body: 'A trained Listener hears you out, without judgment. They only see the name you choose. Leave whenever you want.',
    link: null,
  },
  {
    icon: 'ri-coins-line',
    label: 'Pay',
    title: 'Pay only for the time you use',
    body: 'Calls and text chats are billed by the second, with credits or the Monthly Pass. AI messages are paid one at a time.',
    link: { to: '/pricing', label: 'See prices' },
  },
];

const OPTIONS = [
  {
    icon: 'ri-voiceprint-line',
    title: 'Talk now',
    body: 'A live voice call with a Listener, straight from your browser. Nothing to install.',
    note: 'Calls are never recorded',
    to: '/call',
    cta: 'Connect to a Listener',
  },
  {
    icon: 'ri-chat-3-line',
    title: 'Text a Listener',
    body: 'Type with a Listener in real time, for when saying it out loud feels like too much.',
    note: 'Nothing you type is saved',
    to: '/listener-chat',
    cta: 'Open text chat',
  },
  {
    icon: 'ri-sparkling-2-line',
    title: 'AI Companion',
    body: 'A gentle AI to talk things through, any time of day or night. It is not a person.',
    note: 'Messages are never stored',
    to: '/chat',
    cta: 'Start AI chat',
  },
  {
    icon: 'ri-calendar-line',
    title: 'Book a time',
    body: 'Pick a time later today or this week, 30 or 45 minutes, by call or text. Same price.',
    note: 'Cancelling is always free',
    to: '/book',
    cta: 'Pick a time',
  },
];

export default function HowItWorksPage() {
  // SEO Configuration
  const faqData = [
    {
      question: 'Is Open Ear a medical service?',
      answer:
        'No. Open Ear is a place to talk and be heard by someone who listens. Listeners do not diagnose or treat anything. If you need medical or professional care, please reach out to a doctor or a qualified professional.',
    },
    {
      question: 'Do I need to book?',
      answer:
        'No. You can talk now whenever a Listener is free, or use the AI Companion at any time. Booking a time is there if you would rather plan ahead.',
    },
    {
      question: 'Do I need an account?',
      answer:
        'The check-in needs no account. To talk to a Listener or the AI Companion, you sign in so we can keep your credits safe. Listeners only see the display name you choose.',
    },
    {
      question: 'How private is it?',
      answer:
        'Calls are never recorded, and text chats and AI messages are never saved. After a Conversation, a Listener may keep a brief private note so you do not have to repeat yourself next time. You can turn notes off at any time from your profile.',
    },
    {
      question: 'How long can a Conversation last?',
      answer: `As long as you need, up to ${MAX_CALL_SECONDS / 60} minutes per call. Some people talk for five minutes, others for half an hour. You can end it whenever you feel ready.`,
    },
    {
      question: 'How does paying work?',
      answer: `Calls and text chats with a Listener use ${CREDITS_PER_CALL_MINUTE} credits a minute, billed by the second. An AI message uses ${CREDITS_PER_CHAT_MESSAGE} credit. The ${MONTHLY_PASS.name} (${formatPrice(MONTHLY_PASS.price)} for ${MONTHLY_PASS.days} days) includes call time and daily AI messages. New accounts get ${FREE_TRIAL_CREDITS} free credits.`,
    },
    {
      question: 'What if I am in crisis?',
      answer:
        'Open Ear is not an emergency service. If you are in danger or thinking about harming yourself, call 999 or 112 in Kenya, or see our Crisis Help page for helplines.',
    },
  ];

  useSEO({
    title: 'How It Works | Open Ear',
    description:
      'Take an optional 2-minute check-in, then talk now, text a Listener, chat with the AI Companion, or book a time. Pay only for the time you use, in Kenyan shillings.',
    keywords: 'how emotional support works, talk to someone, be heard, AI chat support, call a listener, text a listener, book a time',
    canonical: '/how-it-works',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        generateWebPageSchema('How It Works', 'How to talk to someone and be heard on Open Ear', '/how-it-works'),
        generateFAQSchema(faqData),
      ],
    },
  });

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-compass-3-line" aria-hidden="true" /> How it works
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Talking here is simple.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Check in if you like, choose how you want to talk, and pay only for the time you use. You set the pace.
        </p>

        {/* Steps */}
        <section aria-labelledby="steps-heading" className="mt-12">
          <h2 id="steps-heading" className="sr-only">
            The steps
          </h2>
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col rounded-3xl border border-oe-line bg-white p-6">
                <div className="flex items-center justify-between">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                    <i className={step.icon} />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-oe-muted">
                    Step {i + 1} · {step.label}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-oe-muted">{step.body}</p>
                {step.link && (
                  <Link
                    to={step.link.to}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-oe-primary hover:text-oe-primary-hover"
                  >
                    {step.link.label} <i className="ri-arrow-right-line" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Ways to talk */}
        <section aria-labelledby="options-heading" className="mt-20">
          <p className="text-xs font-medium uppercase tracking-wide text-oe-muted">Your options</p>
          <h2 id="options-heading" className="mt-1 text-3xl font-semibold">
            Four ways to be heard
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {OPTIONS.map((option) => (
              <article key={option.title} className="flex flex-col rounded-3xl border border-oe-line bg-white p-6 md:p-7">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                  <i className={option.icon} />
                </span>
                <h3 className="mt-5 text-2xl font-semibold">{option.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oe-muted">{option.body}</p>
                <p className="mt-4 flex flex-1 items-start gap-2 text-sm">
                  <span className="flex w-full items-center gap-2 rounded-xl bg-oe-surface-low px-4 py-3">
                    <i className="ri-shield-check-line text-oe-primary" aria-hidden="true" />
                    {option.note}
                  </span>
                </p>
                <Link
                  to={option.to}
                  className="oe-btn mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-oe-surface px-6 py-3 font-semibold text-oe-ink"
                >
                  {option.cta} <i className="ri-arrow-right-line" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="mx-auto mt-20 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-oe-muted">Common questions</p>
          <h2 id="faq-heading" className="mt-1 text-3xl font-semibold">
            Questions people ask
          </h2>
          <div className="mt-6 space-y-3">
            {faqData.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-oe-line bg-white p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {faq.question}
                  <i className="ri-arrow-down-s-line text-xl text-oe-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-oe-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 flex flex-col gap-8 rounded-3xl border border-oe-line bg-oe-surface p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-md">
            <p className="text-xs font-medium uppercase tracking-wide text-oe-primary">Ready when you are</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight">Someone is ready to listen.</h2>
            <p className="mt-3 text-sm leading-relaxed text-oe-muted">
              Not sure where to start? The check-in takes two minutes and is free.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/check-in"
              className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-leaf-line" aria-hidden="true" />
              Start the check-in
            </Link>
            <Link
              to="/call"
              className="oe-btn inline-flex items-center justify-center gap-2 rounded-full border border-oe-line bg-white px-6 py-3 font-semibold text-oe-ink"
            >
              <i className="ri-voiceprint-line" aria-hidden="true" />
              Talk now
            </Link>
          </div>
        </section>

        <p className="mt-8 flex flex-col items-center justify-between gap-2 rounded-2xl border border-oe-crisis/30 bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis sm:flex-row">
          <span className="flex items-center gap-2">
            <i className="ri-alarm-warning-line" aria-hidden="true" /> In deep distress or in danger? Please get help now.
          </span>
          <span>
            Call <a href="tel:999" className="font-semibold underline">999</a> or{' '}
            <a href="tel:112" className="font-semibold underline">112</a> ·{' '}
            <Link to={siteConfig.crisisPath} className="font-semibold underline">
              Crisis help
            </Link>
          </span>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
