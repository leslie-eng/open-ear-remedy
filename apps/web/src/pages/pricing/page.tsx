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
      question: 'How does the credit system work?',
      answer: `Credits are our universal currency for support. Voice calls use ${CREDITS_PER_CALL_MINUTE} credits per minute, and AI chat uses ${CREDITS_PER_CHAT_MESSAGE} credits per message. Buy credits in packages and use them however you prefer!`
    },
    {
      question: 'Can I use credits for both calls and chat?',
      answer: 'Yes! Credits work for both voice calls and AI chat. Use them flexibly based on your needs - calls for real-time support, chat for anytime assistance.'
    },
    {
      question: 'What happens if I run out of credits?',
      answer: 'You can purchase additional credit packages anytime from your dashboard. Your call or chat will notify you when credits are running low.'
    },
    {
      question: 'Is there a free trial?',
      answer: `Yes! First-time users get ${FREE_TRIAL_CREDITS} free credits (${callMinutesFor(FREE_TRIAL_CREDITS)} minutes of voice calls) to try our service. No credit card required to start.`
    },
    {
      question: 'Do credits expire?',
      answer: 'No! Your purchased credits never expire. Use them whenever you need support.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Absolutely. We use bank-level encryption and never share your conversations. Your privacy is our top priority.'
    }
  ];

  useSEO({
    title: 'Pricing Plans - Credit-Based Support | Open Ear',
    description: `Flexible credit-based pricing for emotional support. ${CREDIT_PACKS.map((p) => `${p.credits} credits for ${formatPrice(p.price)}`).join(', ')}. Use for voice calls or AI chat.`,
    keywords: 'emotional support pricing, talk to someone, listener credits, affordable emotional support, pay per minute, monthly pass',
    canonical: '/pricing',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        generateWebPageSchema('Pricing Plans', 'Flexible credit-based pricing for emotional support services', '/pricing'),
        generateProductSchema(CREDIT_PACKS[0].name, `${CREDIT_PACKS[0].credits} credits for calls and AI chat`, CREDIT_PACKS[0].price),
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
      `${callMinutesFor(pack.credits)} min voice calls OR ${Math.floor(pack.credits / CREDITS_PER_CHAT_MESSAGE)} chat messages`,
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent={false} />

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

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-forest-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-gray-700 text-white'
          }`}>
            <i className={`text-lg ${
              notification.type === 'success' ? 'ri-check-circle-fill' :
              notification.type === 'error' ? 'ri-error-warning-fill' :
              'ri-information-fill'
            }`}></i>
            <span className="text-sm font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-80 cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Simple Credit-Based Pricing
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mb-6">
          Buy credits and use them for voice calls or AI chat. No subscriptions, no commitments. Flexible support on your terms.
        </p>

        {/* Free Trial Highlight */}
        <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-200 px-4 py-2 rounded-full mb-4">
          <i className="ri-gift-fill text-forest-600 text-base"></i>
          <span className="text-forest-700 font-semibold text-sm">First-time users get {FREE_TRIAL_CREDITS} FREE credits ({callMinutesFor(FREE_TRIAL_CREDITS)} min call)</span>
        </div>

        {/* Credit Usage Info */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2 bg-oe-primary-tint px-4 py-2 rounded-full">
            <i className="ri-phone-fill text-oe-primary text-base"></i>
            <span className="text-oe-primary font-medium text-sm">Voice: {CREDITS_PER_CALL_MINUTE} credits/min</span>
          </div>
          <div className="flex items-center gap-2 bg-oe-primary-tint px-4 py-2 rounded-full">
            <i className="ri-message-3-fill text-oe-primary text-base"></i>
            <span className="text-oe-primary font-medium text-sm">Chat: {CREDITS_PER_CHAT_MESSAGE} credits/message</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-xl p-5 transition-all ${
                plan.popular
                  ? 'border-2 border-oe-primary shadow-lg scale-105'
                  : 'border border-gray-200 shadow-md hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-oe-primary text-white px-4 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-xs mb-4">
                  {plan.description}
                </p>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  for {plan.credits} credits
                </p>
                <p className="text-xs text-oe-primary font-medium">
                  {formatPrice(plan.perCredit)}/credit
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <i className="ri-copper-coin-fill text-lg text-oe-primary"></i>
                  <span className="text-sm font-semibold text-gray-900">
                    {plan.credits} Credits
                  </span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <i className="ri-check-line text-base text-oe-primary mt-0.5"></i>
                      <span className="text-gray-700 text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={paying !== null}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-oe-primary text-white hover:bg-oe-primary'
                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {`Buy ${plan.credits} Credits`}
              </button>
            </div>
          ))}
        </div>

        {/* Monthly Pass */}
        <div className="mt-10 bg-white rounded-2xl border-2 border-oe-primary p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{MONTHLY_PASS.name}</h3>
            <p className="text-gray-600 mb-4">
              {formatPrice(MONTHLY_PASS.price)} for {MONTHLY_PASS.days} days. Bought when you want it; it never renews by itself.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><i className="ri-check-line text-oe-primary"></i>{MONTHLY_PASS.callSeconds / 60} minutes of calls</li>
              <li className="flex gap-2"><i className="ri-check-line text-oe-primary"></i>{MONTHLY_PASS.aiMessagesPerDay} AI chat messages every day</li>
              <li className="flex gap-2"><i className="ri-check-line text-oe-primary"></i>Used before your credits, so your credits last longer</li>
              <li className="flex gap-2"><i className="ri-check-line text-oe-primary"></i>Renew early and the next pass starts when this one ends</li>
            </ul>
          </div>
          <button
            onClick={() => handleSelectPlan(MONTHLY_PASS)}
            disabled={paying !== null}
            className="px-6 py-3 rounded-xl bg-oe-primary text-white font-semibold hover:bg-oe-primary-hover disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {`Get the pass for ${formatPrice(MONTHLY_PASS.price)}`}
          </button>
        </div>

        {/* Secure Payment Badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-gray-500">
          <i className="ri-shield-check-fill text-forest-500"></i>
          <span className="text-xs">Pay securely with M-Pesa</span>
        </div>

        {/* Credit Usage Examples */}
        <div className="mt-10 bg-oe-primary-tint rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-bold text-oe-ink mb-4 text-center">What Can You Do With Credits?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className="bg-white rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-oe-primary mb-1">{pack.credits} credits</p>
                <p className="text-sm text-gray-700">{callMinutesFor(pack.credits)} min of calls</p>
                <p className="text-sm text-gray-500">or {Math.floor(pack.credits / CREDITS_PER_CHAT_MESSAGE)} AI messages</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-14">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-gray-600 text-center mb-10">
            Everything you need to know about our credit system
          </p>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <details
                key={index}
                className="bg-white rounded-lg p-4 cursor-pointer group"
              >
                <summary className="flex items-center justify-between font-semibold text-sm text-gray-900 cursor-pointer list-none">
                  {faq.question}
                  <i className="ri-arrow-down-s-line text-xl text-gray-400 group-open:rotate-180 transition-transform"></i>
                </summary>
                <p className="mt-3 text-gray-600 text-xs leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-xl mx-auto">
          First-time users get {FREE_TRIAL_CREDITS} free credits - no credit card required.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/call')}
            className="px-6 py-2.5 bg-oe-primary text-white rounded-lg text-sm hover:bg-oe-primary transition-colors cursor-pointer whitespace-nowrap"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => navigate('/how-it-works')}
            className="px-6 py-2.5 bg-gray-50 text-gray-900 rounded-lg text-sm hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Footer */}
      <SiteFooter />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-line text-xl text-oe-primary"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Sign In to Continue
              </h3>
              <p className="text-gray-600 text-xs">
                Sign in to buy {selectedPlan?.name} for {selectedPlan ? formatPrice(selectedPlan.price) : ''}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                className="w-full py-2.5 bg-oe-primary text-white rounded-lg text-sm hover:bg-oe-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin?signup=true');
                }}
                className="w-full py-2.5 bg-gray-50 text-gray-900 rounded-lg text-sm hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Create Account
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors cursor-pointer whitespace-nowrap"
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
