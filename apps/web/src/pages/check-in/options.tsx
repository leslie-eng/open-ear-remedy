import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CREDIT_PACKS,
  CREDITS_PER_CALL_MINUTE,
  CREDITS_PER_CHAT_MESSAGE,
  FREE_TRIAL_CREDITS,
  MONTHLY_PASS,
  formatPrice,
} from '@openear/shared/pricing';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { siteConfig } from '../../config/site';
import { useListenerAvailability } from '../../hooks/useListenerAvailability';
import { clearCheckIn, loadCheckIn, recommend, type SupportOption } from '../../lib/checkIn';
import { useSEO } from '../../utils/seo';

// Cheapest shillings-per-credit across packs, so "from" prices are never understated.
const lowestPerCredit = Math.min(...CREDIT_PACKS.map((p) => p.price / p.credits));
const perMinute = formatPrice(Math.round(lowestPerCredit * CREDITS_PER_CALL_MINUTE * 100) / 100);
const perMessage = formatPrice(Math.round(lowestPerCredit * CREDITS_PER_CHAT_MESSAGE * 100) / 100);

interface Plan {
  id: SupportOption | 'ai';
  icon: string;
  title: string;
  body: string;
  detail: { icon: string; text: string };
  price: string;
  unit: string;
  note: string;
  cta: { to: string; label: string };
  footnote: string;
}

const PLANS: Plan[] = [
  {
    id: 'talk',
    icon: 'ri-voiceprint-line',
    title: 'Talk now',
    body: 'A live voice call with a trained Listener, straight from your browser.',
    detail: { icon: 'ri-mic-line', text: 'Speak at your pace. Silence is welcome.' },
    price: `from ${perMinute}`,
    unit: '/ min',
    note: 'Billed by the second. Pay only for the time you use.',
    cta: { to: '/call', label: 'Connect to a Listener' },
    footnote: 'Calls are never recorded',
  },
  {
    id: 'text',
    icon: 'ri-chat-3-line',
    title: 'Text a Listener',
    body: 'Real-time typed conversation for when saying words aloud feels like too much.',
    detail: { icon: 'ri-message-2-line', text: 'Live text with a trained Listener.' },
    price: `from ${perMinute}`,
    unit: '/ min',
    note: 'Same price as a call. Nothing you type is saved.',
    cta: { to: '/listener-chat', label: 'Open text chat' },
    footnote: 'Low bandwidth friendly',
  },
  {
    id: 'ai',
    icon: 'ri-sparkling-2-line',
    title: 'AI Companion',
    body: 'A gentle AI to talk things through any time, day or night.',
    detail: { icon: 'ri-time-line', text: 'Always on, 24/7. Not a person and not a therapist.' },
    price: `from ${perMessage}`,
    unit: '/ message',
    note: 'Messages are never stored.',
    cta: { to: '/chat', label: 'Start AI chat' },
    footnote: 'Points you to crisis help if needed',
  },
];

export default function CheckInOptionsPage() {
  useSEO({
    title: 'Here’s what might help | Open Ear',
    description: 'Talk now, text a Listener, or chat with the AI Companion. Pay only for what you use, in shillings.',
    keywords: 'talk to someone, text a listener, emotional support price',
    canonical: '/check-in/options',
  });

  const [recommended] = useState(() => recommend(loadCheckIn()));
  const [cleared, setCleared] = useState(false);
  const available = useListenerAvailability();

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium text-oe-primary-deep">
          <i className="ri-leaf-line" aria-hidden="true" /> Your options
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Here&rsquo;s what might help.</h1>
        <p className="mt-3 max-w-xl text-oe-muted">
          Based on what you shared. Pick the way that feels easiest today. No subscriptions, no pressure.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isRecommended = plan.id === recommended;
            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-3xl bg-white p-7 ${
                  isRecommended ? 'border-2 border-oe-primary shadow-oe-md' : 'border border-oe-line'
                }`}
              >
                {isRecommended && (
                  <p className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-oe-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    <i className="ri-checkbox-circle-line" aria-hidden="true" /> Recommended for you
                  </p>
                )}
                <div className="flex items-start justify-between">
                  <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                    <i className={plan.icon} />
                  </span>
                  {plan.id !== 'ai' && available === true && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-tint px-2.5 py-1 text-xs text-oe-primary-deep">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-oe-primary" /> Listeners available
                    </span>
                  )}
                </div>
                <h2 className="mt-5 text-2xl font-semibold">{plan.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-oe-muted">{plan.body}</p>
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-oe-surface-low px-4 py-3 text-sm">
                  <i className={`${plan.detail.icon} text-oe-primary`} aria-hidden="true" />
                  {plan.detail.text}
                </p>
                <p className="mt-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-oe-muted"> {plan.unit}</span>
                </p>
                <p className="mt-1 flex-1 text-xs text-oe-primary">{plan.note}</p>
                <Link
                  to={plan.cta.to}
                  className={`oe-btn mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-semibold ${
                    isRecommended ? 'bg-oe-primary text-white hover:bg-oe-primary-hover' : 'bg-oe-surface text-oe-ink'
                  }`}
                >
                  {plan.cta.label} <i className="ri-arrow-right-line" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-center text-xs text-oe-muted">{plan.footnote}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-oe-line bg-oe-surface p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
              <i className="ri-coins-line" />
            </span>
            <div>
              <h2 className="font-sans text-base font-semibold">Save with credit packs or the Monthly Pass</h2>
              <p className="text-sm text-oe-muted">
                Packs from {formatPrice(CREDIT_PACKS[0].price)}, and credits never expire. {MONTHLY_PASS.name}{' '}
                {formatPrice(MONTHLY_PASS.price)} for {MONTHLY_PASS.callSeconds / 60} call minutes. New here?{' '}
                {FREE_TRIAL_CREDITS} free credits.
              </p>
            </div>
          </div>
          <Link to="/pricing" className="shrink-0 rounded-full bg-white px-5 py-2.5 text-center text-sm font-medium text-oe-ink">
            View prices
          </Link>
        </section>

        <section className="mt-8 rounded-3xl border border-oe-line bg-white p-10 text-center">
          <span aria-hidden="true" className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
            <i className="ri-bookmark-line" />
          </span>
          <h2 className="mt-4 font-sans text-xl font-semibold">Not ready?</h2>
          <p className="mx-auto mt-2 max-w-md text-oe-muted">
            Your check-in is kept privately in this browser, so you can come back anytime.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/" className="rounded-full bg-oe-surface px-5 py-2.5 text-sm font-medium text-oe-ink">
              Back to home
            </Link>
            <button
              onClick={() => {
                clearCheckIn();
                setCleared(true);
              }}
              disabled={cleared}
              className="cursor-pointer rounded-full px-5 py-2.5 text-sm text-oe-muted hover:text-oe-ink disabled:cursor-default"
            >
              {cleared ? 'Check-in forgotten' : 'Forget my check-in'}
            </button>
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
