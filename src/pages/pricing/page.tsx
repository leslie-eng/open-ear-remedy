import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { packageIdForCredits } from '../../lib/packages';
import { useSEO, generateWebPageSchema, generateProductSchema, generateFAQSchema } from '../../utils/seo';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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
      answer: 'Credits are our universal currency for support. Voice calls use 10 credits per minute, and AI chat uses 5 credits per message. Buy credits in packages and use them however you prefer!'
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
      answer: 'Yes! First-time users get 50 free credits (5 minutes of voice calls) to try our service. No credit card required to start.'
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
    description: 'Flexible credit-based pricing for emotional support. Buy 100 credits for $29, 300 credits for $79, or 1000 credits for $199. Use for voice calls or AI chat.',
    keywords: 'emotional support pricing, therapy pricing, mental health credits, affordable counseling, pay per use therapy, mental wellness plans',
    canonical: '/pricing',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        generateWebPageSchema('Pricing Plans', 'Flexible credit-based pricing for emotional support services', '/pricing'),
        generateProductSchema('Starter Plan', 'Perfect for trying out our support with 100 credits', 29),
        generateFAQSchema(faqData),
      ],
    },
  });

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for trying out our support',
      price: 29,
      credits: 100,
      perCredit: 0.29,
      features: [
        '100 credits',
        '10 min voice calls OR 20 chat messages',
        'Book appointments',
        'Email support',
        'Credits never expire'
      ],
      popular: false
    },
    {
      name: 'Standard',
      description: 'Most popular for regular support',
      price: 79,
      credits: 300,
      perCredit: 0.26,
      features: [
        '300 credits',
        '30 min voice calls OR 60 chat messages',
        'Priority booking',
        'Priority support',
        'Progress tracking',
        'Credits never expire'
      ],
      popular: true
    },
    {
      name: 'Value',
      description: 'Best value for ongoing support',
      price: 199,
      credits: 1000,
      perCredit: 0.20,
      features: [
        '1000 credits',
        '100 min voice calls OR 200 chat messages',
        'VIP booking priority',
        '24/7 priority support',
        'Detailed progress tracking',
        'Credits never expire'
      ],
      popular: false
    }
  ];

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (!user) {
      setSelectedPlan(plan);
      setShowAuthModal(true);
      return;
    }

    await initiatePaystackCheckout(plan);
  };

  const initiatePaystackCheckout = async (plan: typeof plans[0]) => {
    setIsLoading(true);
    setLoadingPlan(plan.name);

    try {
      const data = await apiFetch<{ url?: string; authorization_url?: string }>(
        '/api/payments/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ packageId: packageIdForCredits(plan.credits) }),
        },
      );

      const payUrl = data.url ?? data.authorization_url;
      if (payUrl) {
        // Use window.location.assign for better compatibility
        window.location.assign(payUrl);
      } else {
        throw new Error('No payment authorization URL returned from Paystack.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setNotification({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to start Paystack checkout. Please try again.',
      });
      setIsLoading(false);
      setLoadingPlan(null);
    }
  };

  const handleSignIn = () => {
    setShowAuthModal(false);
    navigate('/signin', { state: { returnTo: '/pricing', selectedPlan: selectedPlan?.name } });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent={false} />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
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
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-full mb-4">
          <i className="ri-gift-fill text-green-600 text-base"></i>
          <span className="text-green-700 font-semibold text-sm">First-time users get 50 FREE credits (5 min call)</span>
        </div>

        {/* Credit Usage Info */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2 bg-[#E6F5FF] px-4 py-2 rounded-full">
            <i className="ri-phone-fill text-[#0096FF] text-base"></i>
            <span className="text-[#0096FF] font-medium text-sm">Voice: 10 credits/min</span>
          </div>
          <div className="flex items-center gap-2 bg-[#E6F5FF] px-4 py-2 rounded-full">
            <i className="ri-message-3-fill text-[#0096FF] text-base"></i>
            <span className="text-[#0096FF] font-medium text-sm">Chat: 5 credits/message</span>
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
                  ? 'border-2 border-[#0096FF] shadow-lg scale-105'
                  : 'border border-gray-200 shadow-md hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0096FF] text-white px-4 py-1 rounded-full text-xs font-medium whitespace-nowrap">
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
                    ${plan.price}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  for {plan.credits} credits
                </p>
                <p className="text-xs text-[#0096FF] font-medium">
                  ${plan.perCredit.toFixed(2)}/credit
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <i className="ri-copper-coin-fill text-lg text-[#0096FF]"></i>
                  <span className="text-sm font-semibold text-gray-900">
                    {plan.credits} Credits
                  </span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <i className="ri-check-line text-base text-[#0096FF] mt-0.5"></i>
                      <span className="text-gray-700 text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-[#0096FF] text-white hover:bg-[#0085e6]'
                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {loadingPlan === plan.name ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Processing...
                  </span>
                ) : (
                  `Buy ${plan.credits} Credits`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Secure Payment Badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-gray-500">
          <i className="ri-shield-check-fill text-green-500"></i>
          <span className="text-xs">Secure payment powered by Paystack</span>
        </div>

        {/* Credit Usage Examples */}
        <div className="mt-10 bg-[#E6F5FF] rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-bold text-[#2A2A2A] mb-4 text-center">What Can You Do With Credits?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-[#0096FF] mb-1">100</p>
              <p className="text-xs text-gray-600">10 min call</p>
              <p className="text-xs text-gray-400">or 20 messages</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-[#0096FF] mb-1">300</p>
              <p className="text-xs text-gray-600">30 min call</p>
              <p className="text-xs text-gray-400">or 60 messages</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-[#0096FF] mb-1">500</p>
              <p className="text-xs text-gray-600">50 min call</p>
              <p className="text-xs text-gray-400">or 100 messages</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-[#0096FF] mb-1">1000</p>
              <p className="text-xs text-gray-600">100 min call</p>
              <p className="text-xs text-gray-400">or 200 messages</p>
            </div>
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
          First-time users get 50 free credits - no credit card required.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/call')}
            className="px-6 py-2.5 bg-[#0096FF] text-white rounded-lg text-sm hover:bg-[#0085e6] transition-colors cursor-pointer whitespace-nowrap"
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
      <footer className="bg-[#0096FF] text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <h3 className="text-base font-bold mb-3">Open Ear</h3>
              <p className="text-white/80 text-xs">
                Voice & chat support available 24/7
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-1.5 text-white/80 text-xs">
                <li>
                  <button onClick={() => navigate('/')} className="hover:text-white transition-colors cursor-pointer">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors cursor-pointer">
                    Pricing
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/call')} className="hover:text-white transition-colors cursor-pointer">
                    Voice Support
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/chat')} className="hover:text-white transition-colors cursor-pointer">
                    AI Chat
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-1.5 text-white/80 text-xs">
                <li>
                  <button onClick={() => navigate('/how-it-works')} className="hover:text-white transition-colors cursor-pointer">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors cursor-pointer">
                    Privacy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors cursor-pointer">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors cursor-pointer">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Connect</h4>
              <div className="flex gap-3">
                <a href="#" className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                  <i className="ri-twitter-fill text-base"></i>
                </a>
                <a href="#" className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                  <i className="ri-facebook-fill text-base"></i>
                </a>
                <a href="#" className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                  <i className="ri-instagram-fill text-base"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 pt-6 text-center text-white/80 text-xs">
            <p>© 2026 Open Ear. All rights reserved. <a href="https://readdy.ai/?ref=logo" className="hover:text-white transition-colors cursor-pointer">Powered by Readdy</a></p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-line text-xl text-[#0096FF]"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Sign In to Continue
              </h3>
              <p className="text-gray-600 text-xs">
                Sign in to purchase {selectedPlan?.credits} credits for ${selectedPlan?.price}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                className="w-full py-2.5 bg-[#0096FF] text-white rounded-lg text-sm hover:bg-[#0085e6] transition-colors cursor-pointer whitespace-nowrap"
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
