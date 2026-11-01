import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { siteConfig } from '../../config/site';
import { useSEO } from '../../utils/seo';
import {
  CREDIT_PACKS,
  CREDITS_PER_CALL_MINUTE,
  CREDITS_PER_CHAT_MESSAGE,
  FREE_TRIAL_CREDITS,
  MONTHLY_PASS,
  callMinutesFor,
  formatPrice,
} from '@openear/shared/pricing';

const starterPack = CREDIT_PACKS[0];

const STEPS = [
  {
    icon: 'ri-leaf-line',
    title: 'Take a quiet check-in',
    body: 'A few gentle questions to notice how you are. No account needed, and nothing is shared.',
  },
  {
    icon: 'ri-user-add-line',
    title: 'Create your account',
    body: `Sign up with Google or email. Verify your email and you can claim ${FREE_TRIAL_CREDITS} free credits.`,
  },
  {
    icon: 'ri-chat-heart-line',
    title: 'Talk when you’re ready',
    body: 'Call or text a trained Listener, book a time for later, or chat with the AI Companion.',
  },
];

const WAYS = [
  {
    icon: 'ri-phone-line',
    title: 'Call a Listener',
    body: `Talk out loud from your browser. ${CREDITS_PER_CALL_MINUTE} credits a minute. Calls are never recorded.`,
    to: '/call',
  },
  {
    icon: 'ri-chat-3-line',
    title: 'Text a Listener',
    body: `Type with a Listener in real time, at the same price as a call. Nothing you type is saved.`,
    to: '/listener-chat',
  },
  {
    icon: 'ri-calendar-line',
    title: 'Book a time',
    body: 'Pick a time that suits you. Cancelling is always free.',
    to: '/book',
  },
  {
    icon: 'ri-sparkling-line',
    title: 'AI Companion',
    body: `Chat at your own pace, day or night. ${CREDITS_PER_CHAT_MESSAGE} credit a message. It is not a person.`,
    to: '/chat',
  },
];

export default function GetStartedPage() {
  useSEO({
    title: 'Get started | Open Ear',
    description: 'How to start with Open Ear: take a quiet check-in, create an account, and talk with a trained Listener when you’re ready.',
    keywords: 'get started, sign up, talk to someone, listener',
    canonical: '/get-started',
  });

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar transparent={false} />
      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-seedling-line" aria-hidden="true" /> Get started
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Start small. We&rsquo;ll be here.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Open Ear is a place to talk and be heard when things feel heavy. There&rsquo;s no right way to begin, but here&rsquo;s
          how most people do.
        </p>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                  <i className={step.icon} />
                </span>
                <span className="text-sm font-medium text-oe-muted">Step {i + 1}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-oe-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/check-in"
            className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-8 py-3.5 font-semibold text-white hover:bg-oe-primary-hover"
          >
            Begin the check-in <i className="ri-arrow-right-line" aria-hidden="true" />
          </Link>
          <Link
            to="/signin?signup=true"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-oe-line bg-white px-8 py-3.5 font-medium text-oe-ink"
          >
            Create an account
          </Link>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold md:text-3xl">Ways to talk</h2>
          <p className="mt-2 max-w-2xl text-oe-muted">Talking needs an account. Choose whatever feels easiest today.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {WAYS.map((way) => (
              <Link
                key={way.to}
                to={way.to}
                className="group flex items-start gap-4 rounded-3xl border border-oe-line bg-white p-6 transition-colors hover:border-oe-primary/40"
              >
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
                  <i className={way.icon} />
                </span>
                <span>
                  <span className="block font-semibold group-hover:text-oe-primary-deep">{way.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-oe-muted">{way.body}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-oe-line bg-oe-surface p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-sans text-lg font-semibold">What it costs</h2>
              <ul className="mt-3 space-y-2 text-sm text-oe-muted">
                <li className="flex gap-2">
                  <i className="ri-gift-line text-oe-primary" aria-hidden="true" />
                  {FREE_TRIAL_CREDITS} free credits for new accounts, about {callMinutesFor(FREE_TRIAL_CREDITS)} minutes of talking.
                </li>
                <li className="flex gap-2">
                  <i className="ri-copper-coin-line text-oe-primary" aria-hidden="true" />
                  Credits from {formatPrice(starterPack.price)} for {starterPack.credits}. They never expire.
                </li>
                <li className="flex gap-2">
                  <i className="ri-calendar-check-line text-oe-primary" aria-hidden="true" />
                  Or a {MONTHLY_PASS.name} for {formatPrice(MONTHLY_PASS.price)}, paid with M-Pesa.
                </li>
              </ul>
            </div>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-6 py-3 font-medium text-oe-primary-deep md:self-auto"
            >
              See pricing <i className="ri-arrow-right-line" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-oe-muted">
          In danger right now? Call{' '}
          <a href="tel:999" className="font-semibold text-oe-crisis underline">
            999
          </a>{' '}
          or{' '}
          <a href="tel:112" className="font-semibold text-oe-crisis underline">
            112
          </a>
          , or see{' '}
          <Link to={siteConfig.crisisPath} className="font-semibold text-oe-crisis underline">
            Crisis Help
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
