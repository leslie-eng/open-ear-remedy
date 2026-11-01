import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SiteFooter from '../../components/feature/SiteFooter';
import Navbar from '../../components/feature/Navbar';
import MpesaPaymentModal from '../../components/feature/MpesaPaymentModal';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO, generateWebPageSchema, generateProductSchema, generateFAQSchema } from '../../utils/seo';
import {
  CREDIT_PACKS,
  CREDITS_PER_CALL_MINUTE,
  CREDITS_PER_CHAT_MESSAGE,
  FREE_TRIAL_CREDITS,
  callMinutesFor,
  MONTHLY_PASS,
  formatPrice,
  type CreditPackId,
  type Offer,
} from '@openear/shared/pricing';

type CheckoutOffer = Pick<Offer, 'id' | 'name' | 'price'>;

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutOffer | null>(null);
  // The offer being paid for with M-Pesa (the payment window is open while set).
  const [paying, setPaying] = useState<CheckoutOffer | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Check for purchase status from URL params
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus === 'cancelled') {
      setNotification({ type: 'info', message: 'Purchase was cancelled. You can try again anytime.' });
      // Clear the URL param
      window.history.replaceState({}, '', '/pricing');
    }
  }, [searchParams]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // SEO Configuration
  const faqData = [
    {
      question: 'How do credits work?',
      answer: `Credits are what you spend on Open Ear. A call or a text chat with a Listener uses ${CREDITS_PER_CALL_MINUTE} credits a minute, billed by the second. A message to the AI Companion uses ${CREDITS_PER_CHAT_MESSAGE} credit.`,
    },
    {
      question: 'Can I use the same credits for calls, text chats and the AI Companion?',
      answer: 'Yes. One balance covers all three, so you can call one day and type the next.',
    },
    {
      question: 'What happens if I run out of credits?',
      answer: 'You can buy more on this page at any time and pay with M-Pesa.',
    },
    {
      question: 'Is there a free trial?',
      answer: `Yes. New accounts get ${FREE_TRIAL_CREDITS} free credits (${callMinutesFor(FREE_TRIAL_CREDITS)} minutes of calls) once you verify your email. Nothing to pay to start.`,
    },
    {
      question: 'Do credits expire?',
      answer: 'No. Credits you buy never expire. Use them whenever you need someone to talk to.',
    },
    {
      question: 'What is the Monthly Pass?',
      answer: `${MONTHLY_PASS.name} costs ${formatPrice(MONTHLY_PASS.price)} for ${MONTHLY_PASS.days} days and includes ${MONTHLY_PASS.callSeconds / 60} minutes of calls and ${MONTHLY_PASS.aiMessagesPerDay} AI messages a day. It is used before your credits and never renews by itself.`,
    },
    {
      question: 'Is what I say private?',
      answer: 'Calls are never recorded, and text chats and AI messages are never saved. We never sell your information.',
    },
  ];

  useSEO({
    title: 'Prices in Kenyan Shillings: Credits and Monthly Pass | Open Ear',
    description: `Pay only for the time you use. ${CREDIT_PACKS.map((p) => `${p.credits} credits for ${formatPrice(p.price)}`).join(', ')}. Use them for calls, text chats with a Listener, or the AI Companion.`,
    keywords: 'emotional support pricing, talk to someone, listener credits, affordable emotional support, pay per minute, monthly pass',
    canonical: '/pricing',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        generateWebPageSchema('Prices', 'Credit packs and the Monthly Pass, in Kenyan shillings', '/pricing'),
        generateProductSchema(CREDIT_PACKS[0].name, `${CREDIT_PACKS[0].credits} credits for calls, text chats and AI chat`, CREDIT_PACKS[0].price),
        generateFAQSchema(faqData),
      ],
    },
  });

  // Prices, credits and rates come from @openear/shared/pricing; only the marketing copy lives here.
  const PLAN_COPY: Record<CreditPackId, { description: string; popular: boolean }> = {
    starter: { description: 'A gentle way to try a call or a chat', popular: false },
    standard: { description: 'For regular conversations', popular: true },
    value: { description: 'The lowest price per minute', popular: false },
  };

  const plans = CREDIT_PACKS.map((pack) => ({
    ...pack,
    ...PLAN_COPY[pack.id],
    perCredit: pack.price / pack.credits,
    features: [
      `${pack.credits} credits`,
      `${callMinutesFor(pack.credits)} min of calls or text chat`,
      `or ${Math.floor(pack.credits / CREDITS_PER_CHAT_MESSAGE)} AI Companion messages`,
      'Credits never expire',
    ],
  }));

  const handleSelectPlan = async (plan: CheckoutOffer) => {
    if (!user) {
      setSelectedPlan(plan);
      setShowAuthModal(true);
      return;
    }

    setPaying(plan);
  };

  const startPayment = async (phone: string) => {
    if (!paying) throw new Error('Choose a plan first.');
    const { paymentId } = await apiFetch<{ paymentId: string }>('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ offerId: paying.id, phone }),
    });
    return paymentId;
  };

  const handleSignIn = () => {
    setShowAuthModal(false);
    navigate('/signin', { state: { returnTo: '/pricing', selectedPlan: selectedPlan?.name } });
  };


  const toastTone =
    notification?.type === 'success'
      ? 'bg-oe-primary-tint text-oe-ink'
      : notification?.type === 'error'
        ? 'bg-oe-crisis-tint text-oe-crisis'
        : 'bg-oe-surface text-oe-ink';
  const toastIcon =
    notification?.type === 'success'
      ? 'ri-checkbox-circle-line text-oe-primary'
      : notification?.type === 'error'
        ? 'ri-error-warning-line'
        : 'ri-information-line text-oe-muted';

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      {paying && (
        <MpesaPaymentModal
          title={paying.name}
          amountLabel={formatPrice(paying.price)}
          start={startPayment}
          onPaid={() =>
            setNotification({
              type: 'success',
              message: 'id' in paying && paying.id === MONTHLY_PASS.id ? 'Your Monthly Pass is ready.' : 'Your credits have been added.',
            })
          }
          onClose={() => setPaying(null)}
        />
      )}

      {notification && (
        <div className="fixed left-1/2 top-24 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 animate-fade-in">
          <div
            role={notification.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-3 rounded-2xl border border-oe-line px-5 py-3 text-sm shadow-oe-md ${toastTone}`}
          >
            <i className={`text-lg ${toastIcon}`} aria-hidden="true" />
            <span className="flex-1 font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              aria-label="Dismiss message"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/60"
            >
              <i className="ri-close-line text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-coins-line" aria-hidden="true" /> Prices
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Pay only for the time you use.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Buy credits and spend them on calls, text chats or the AI Companion. No subscriptions, and nothing renews by
          itself. All prices are in Kenyan shillings.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-oe-accent-tint px-4 py-2 text-sm font-medium text-oe-accent">
            <i className="ri-gift-line" aria-hidden="true" />
            New here? {FREE_TRIAL_CREDITS} free credits ({callMinutesFor(FREE_TRIAL_CREDITS)} min of calls)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-oe-surface px-4 py-2 text-sm text-oe-ink">
            <i className="ri-voiceprint-line text-oe-primary" aria-hidden="true" />
            Call or text chat: {CREDITS_PER_CALL_MINUTE} credits / min
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-oe-surface px-4 py-2 text-sm text-oe-ink">
            <i className="ri-sparkling-2-line text-oe-primary" aria-hidden="true" />
            AI Companion: {CREDITS_PER_CHAT_MESSAGE} credit / message
          </span>
        </div>

        {/* Credit packs */}
        <section aria-labelledby="packs-heading" className="mt-12">
          <h2 id="packs-heading" className="sr-only">
            Credit packs
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-3xl bg-white p-7 ${
                  plan.popular ? 'border-2 border-oe-primary shadow-oe-md' : 'border border-oe-line'
                }`}
              >
                {plan.popular && (
                  <p className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-oe-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    <i className="ri-star-line" aria-hidden="true" /> Most popular
                  </p>
                )}
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                  <i className="ri-copper-coin-line" />
                </span>
                <h3 className="mt-5 text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oe-muted">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                  <span className="text-sm text-oe-muted"> for {plan.credits} credits</span>
                </p>
                <p className="mt-1 text-xs text-oe-primary">{formatPrice(plan.perCredit)} per credit</p>
                <ul className="mt-5 flex-1 space-y-2 rounded-2xl bg-oe-surface-low p-4 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <i className="ri-check-line mt-0.5 text-oe-primary" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={paying !== null}
                  className={`oe-btn mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.popular ? 'bg-oe-primary text-white hover:bg-oe-primary-hover' : 'bg-oe-surface text-oe-ink'
                  }`}
                >
                  {`Buy ${plan.credits} credits`}
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Monthly Pass */}
        <section
          aria-labelledby="pass-heading"
          className="mt-8 flex flex-col gap-6 rounded-3xl border border-oe-line bg-oe-surface p-6 md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div className="flex gap-4">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-oe-accent-tint text-xl text-oe-accent">
              <i className="ri-calendar-check-line" />
            </span>
            <div>
              <h2 id="pass-heading" className="text-2xl font-semibold">
                {MONTHLY_PASS.name}
              </h2>
              <p className="mt-1 text-oe-muted">
                {formatPrice(MONTHLY_PASS.price)} for {MONTHLY_PASS.days} days. Bought when you want it; it never renews by itself.
              </p>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <li className="flex gap-2">
                  <i className="ri-check-line text-oe-primary" aria-hidden="true" />
                  {MONTHLY_PASS.callSeconds / 60} minutes of calls
                </li>
                <li className="flex gap-2">
                  <i className="ri-check-line text-oe-primary" aria-hidden="true" />
                  {MONTHLY_PASS.aiMessagesPerDay} AI chat messages every day
                </li>
                <li className="flex gap-2">
                  <i className="ri-check-line text-oe-primary" aria-hidden="true" />
                  Used before your credits, so your credits last longer
                </li>
                <li className="flex gap-2">
                  <i className="ri-check-line text-oe-primary" aria-hidden="true" />
                  Renew early and the next pass starts when this one ends
                </li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => handleSelectPlan(MONTHLY_PASS)}
            disabled={paying !== null}
            className="oe-btn shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-oe-primary px-6 py-3.5 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {`Get the pass for ${formatPrice(MONTHLY_PASS.price)}`}
          </button>
        </section>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-oe-muted">
          <i className="ri-shield-check-line text-oe-primary" aria-hidden="true" />
          Pay securely with M-Pesa. We never see your PIN.
        </p>

        {/* What credits buy */}
        <section aria-labelledby="examples-heading" className="mt-16">
          <h2 id="examples-heading" className="text-3xl font-semibold">
            What can you do with credits?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className="rounded-2xl border border-oe-line bg-white p-5">
                <p className="text-xl font-bold text-oe-primary">{pack.credits} credits</p>
                <p className="mt-1 text-sm">{callMinutesFor(pack.credits)} min of calls or text chat</p>
                <p className="text-sm text-oe-muted">or {Math.floor(pack.credits / CREDITS_PER_CHAT_MESSAGE)} AI messages</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="mx-auto mt-16 max-w-3xl">
          <h2 id="faq-heading" className="text-3xl font-semibold">
            Questions about paying
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
        <section className="mt-16 flex flex-col gap-6 rounded-3xl border border-oe-line bg-oe-surface p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight">Ready when you are.</h2>
            <p className="mt-3 text-sm leading-relaxed text-oe-muted">
              New accounts get {FREE_TRIAL_CREDITS} free credits. Nothing to pay to start.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/call')}
              className="oe-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-voiceprint-line" aria-hidden="true" />
              Talk now
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className="oe-btn inline-flex cursor-pointer items-center justify-center rounded-full border border-oe-line bg-white px-6 py-3 font-semibold text-oe-ink"
            >
              How it works
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />

      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-signin-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-oe-line bg-white p-7 shadow-oe-md">
            <div className="text-center">
              <span aria-hidden="true" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                <i className="ri-user-line" />
              </span>
              <h2 id="pricing-signin-title" className="mt-4 text-xl font-semibold">
                Sign in to continue
              </h2>
              <p className="mt-1 text-sm text-oe-muted">
                Sign in to buy {selectedPlan?.name} for {selectedPlan ? formatPrice(selectedPlan.price) : ''}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleSignIn}
                className="oe-btn w-full cursor-pointer rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin?signup=true');
                }}
                className="w-full cursor-pointer rounded-full border border-oe-line bg-white px-6 py-3 font-medium text-oe-ink"
              >
                Create account
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full cursor-pointer rounded-full px-6 py-2.5 text-sm text-oe-muted hover:text-oe-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
