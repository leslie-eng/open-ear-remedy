import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useSEO } from '../../utils/seo';
import {
  CREDIT_PACKS,
  CREDITS_PER_CALL_MINUTE,
  CREDITS_PER_CHAT_MESSAGE,
  FREE_TRIAL_CREDITS,
  callMinutesFor,
  formatPrice,
} from '@openear/shared/pricing';

const starterPack = CREDIT_PACKS[0];
const valuePack = CREDIT_PACKS[CREDIT_PACKS.length - 1];

export default function GetStartedPage() {
  // SEO Configuration - noindex for onboarding pages
  useSEO({
    title: 'Get Started - Open Ear',
    description: 'Start your journey to emotional wellness with Open Ear.',
    keywords: 'get started, sign up, onboarding',
    canonical: '/get-started',
  });

  const [step, setStep] = useState(1);
  const [selectedSupport, setSelectedSupport] = useState<'call' | 'chat' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'payper' | 'monthly' | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (step === 1 && selectedSupport) {
      setStep(2);
    } else if (step === 2 && selectedPlan) {
      setStep(3);
    }
  };

  const handleGetStarted = () => {
    // Navigate based on selected support type
    if (selectedSupport === 'chat') {
      navigate('/chat');
    } else {
      navigate('/signin');
    }
  };

  return (
    <div className="min-h-screen bg-oe-bg">
      <Navbar transparent={false} />

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 pt-32">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= 1 ? 'bg-oe-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
              1
            </div>
            <span className={`text-sm font-medium ${step >= 1 ? 'text-oe-primary' : 'text-gray-400'}`}>Choose Support</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded-full ${step >= 2 ? 'bg-oe-primary' : 'bg-gray-200'}`}></div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= 2 ? 'bg-oe-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
              2
            </div>
            <span className={`text-sm font-medium ${step >= 2 ? 'text-oe-primary' : 'text-gray-400'}`}>Select Plan</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded-full ${step >= 3 ? 'bg-oe-primary' : 'bg-gray-200'}`}></div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= 3 ? 'bg-oe-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
              3
            </div>
            <span className={`text-sm font-medium ${step >= 3 ? 'text-oe-primary' : 'text-gray-400'}`}>Create Account</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        {/* Step 1: Choose Support Type */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-oe-ink mb-4">
                How would you like to connect?
              </h1>
              <p className="text-lg text-oe-muted">
                Choose the support style that feels right for you
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Voice Call Option */}
              <div
                onClick={() => setSelectedSupport('call')}
                className={`bg-white rounded-3xl p-8 cursor-pointer transition-all ${
                  selectedSupport === 'call'
                    ? 'ring-4 ring-oe-primary shadow-xl scale-105'
                    : 'hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-oe-primary/10 rounded-full flex items-center justify-center">
                    <i className="ri-phone-fill text-3xl text-oe-primary"></i>
                  </div>
                  {selectedSupport === 'call' && (
                    <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center">
                      <i className="ri-check-line text-white text-lg"></i>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-oe-ink mb-3">Voice Connection</h3>
                <p className="text-oe-muted mb-6 leading-relaxed">
                  Talk to someone in real-time. Perfect for when you need immediate emotional support and human connection.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Real-time conversations</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Secure, private calls</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Credit-based system</span>
                  </li>
                </ul>
              </div>

              {/* Chat Option */}
              <div
                onClick={() => setSelectedSupport('chat')}
                className={`bg-white rounded-3xl p-8 cursor-pointer transition-all ${
                  selectedSupport === 'chat'
                    ? 'ring-4 ring-oe-primary shadow-xl scale-105'
                    : 'hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-oe-primary/10 rounded-full flex items-center justify-center">
                    <i className="ri-message-3-fill text-3xl text-oe-primary"></i>
                  </div>
                  {selectedSupport === 'chat' && (
                    <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center">
                      <i className="ri-check-line text-white text-lg"></i>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-oe-ink mb-3">AI Chat Assistant</h3>
                <p className="text-oe-muted mb-6 leading-relaxed">
                  Chat with our AI assistant anytime. Great for processing thoughts at your own pace, day or night.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>24/7 availability</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Instant responses</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Private and confidential</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleContinue}
                disabled={!selectedSupport}
                className={`px-12 py-4 rounded-full text-lg font-semibold transition-all whitespace-nowrap ${
                  selectedSupport
                    ? 'bg-oe-primary text-white hover:bg-oe-primary-hover cursor-pointer shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue to Pricing
                <i className="ri-arrow-right-line ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Plan */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-oe-ink mb-4">
                Choose your plan
              </h1>
              <p className="text-lg text-oe-muted">
                Buy credits and use them for calls or chat
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Starter Pack */}
              <div
                onClick={() => setSelectedPlan('payper')}
                className={`bg-white rounded-3xl p-8 cursor-pointer transition-all ${
                  selectedPlan === 'payper'
                    ? 'ring-4 ring-oe-primary shadow-xl scale-105'
                    : 'hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-oe-ink mb-2">Starter Pack</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-oe-primary">{formatPrice(starterPack.price)}</span>
                      <span className="text-oe-muted">{starterPack.credits} credits</span>
                    </div>
                  </div>
                  {selectedPlan === 'payper' && (
                    <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center">
                      <i className="ri-check-line text-white text-lg"></i>
                    </div>
                  )}
                </div>
                <p className="text-oe-muted mb-6">
                  Perfect for trying out our support services
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>100 credits to use anytime</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>10 min calls OR 20 chat messages</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Credits never expire</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Access to both call and chat</span>
                  </li>
                </ul>
              </div>

              {/* Value Pack */}
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`bg-white rounded-3xl p-8 cursor-pointer transition-all relative ${
                  selectedPlan === 'monthly'
                    ? 'ring-4 ring-oe-primary shadow-xl scale-105'
                    : 'hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="absolute -top-3 right-8 bg-oe-primary text-white px-4 py-1 rounded-full text-xs font-semibold">
                  BEST VALUE
                </div>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-oe-ink mb-2">Value Pack</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-oe-primary">{formatPrice(valuePack.price)}</span>
                      <span className="text-oe-muted">{valuePack.credits} credits</span>
                    </div>
                  </div>
                  {selectedPlan === 'monthly' && (
                    <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center">
                      <i className="ri-check-line text-white text-lg"></i>
                    </div>
                  )}
                </div>
                <p className="text-oe-muted mb-6">
                  Best value for ongoing emotional support
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>1000 credits ($0.20/credit)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>100 min calls OR 200 chat messages</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>VIP priority support</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-oe-muted">
                    <i className="ri-check-line text-oe-primary text-lg mt-0.5"></i>
                    <span>Credits never expire</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 border-2 border-oe-primary text-oe-primary rounded-full font-semibold hover:bg-oe-primary hover:text-white transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedPlan}
                className={`px-12 py-4 rounded-full text-lg font-semibold transition-all whitespace-nowrap ${
                  selectedPlan
                    ? 'bg-oe-primary text-white hover:bg-oe-primary-hover cursor-pointer shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue to Sign Up
                <i className="ri-arrow-right-line ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create Account */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="ri-checkbox-circle-fill text-5xl text-oe-primary"></i>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-oe-ink mb-4">
                You're all set!
              </h1>
              <p className="text-lg text-oe-muted mb-8">
                Create your account to start your journey to emotional wellness
              </p>
            </div>

            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-lg">
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4 p-4 bg-oe-primary-tint rounded-2xl">
                  <i className="ri-check-double-line text-2xl text-oe-primary mt-1"></i>
                  <div>
                    <p className="font-semibold text-oe-ink mb-1">
                      {selectedSupport === 'call' ? 'Voice Connection' : 'AI Chat Assistant'}
                    </p>
                    <p className="text-sm text-oe-muted">
                      {selectedSupport === 'call' 
                        ? `Real-time emotional support (${CREDITS_PER_CALL_MINUTE} credits/min)`
                        : `24/7 AI-powered chat support (${CREDITS_PER_CHAT_MESSAGE} credits/msg)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-oe-primary-tint rounded-2xl">
                  <i className="ri-copper-coin-line text-2xl text-oe-primary mt-1"></i>
                  <div>
                    <p className="font-semibold text-oe-ink mb-1">
                      {selectedPlan === 'payper' ? `Starter Pack - ${formatPrice(starterPack.price)}` : `Value Pack - ${formatPrice(valuePack.price)}`}
                    </p>
                    <p className="text-sm text-oe-muted">
                      {selectedPlan === 'payper'
                        ? '100 credits • 10 min calls or 20 messages'
                        : '1000 credits • 100 min calls or 200 messages'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-forest-50 rounded-2xl border border-forest-200">
                  <i className="ri-gift-line text-2xl text-forest-600 mt-1"></i>
                  <div>
                    <p className="font-semibold text-forest-800 mb-1">
                      First-Time Bonus!
                    </p>
                    <p className="text-sm text-forest-700">
                      Get {FREE_TRIAL_CREDITS} FREE credits when you sign up ({callMinutesFor(FREE_TRIAL_CREDITS)} min of calls)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm text-oe-muted">
                  <i className="ri-shield-check-line text-xl text-oe-primary"></i>
                  <span>Your privacy is protected with end-to-end encryption</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-oe-muted">
                  <i className="ri-time-line text-xl text-oe-primary"></i>
                  <span>Start your first session immediately after signup</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-oe-muted">
                  <i className="ri-customer-service-2-line text-xl text-oe-primary"></i>
                  <span>24/7 support available whenever you need it</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-8 py-3 border-2 border-oe-primary text-oe-primary rounded-full font-semibold hover:bg-oe-primary hover:text-white transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Back
                </button>
                <button
                  onClick={handleGetStarted}
                  className="w-full sm:flex-1 px-12 py-4 bg-oe-primary text-white rounded-full text-lg font-semibold hover:bg-oe-primary-hover transition-all shadow-lg hover:shadow-xl whitespace-nowrap cursor-pointer"
                >
                  Create Account
                  <i className="ri-arrow-right-line ml-2"></i>
                </button>
              </div>

              <p className="text-xs text-center text-oe-muted mt-6">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-oe-primary hover:underline cursor-pointer">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-oe-primary hover:underline cursor-pointer">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <i className="ri-shield-check-line text-3xl text-oe-primary mb-2"></i>
              <p className="text-sm font-semibold text-oe-ink">Secure & Private</p>
            </div>
            <div className="text-center">
              <i className="ri-time-line text-3xl text-oe-primary mb-2"></i>
              <p className="text-sm font-semibold text-oe-ink">24/7 Available</p>
            </div>
            <div className="text-center">
              <i className="ri-heart-3-line text-3xl text-oe-primary mb-2"></i>
              <p className="text-sm font-semibold text-oe-ink">Judgment-Free</p>
            </div>
            <div className="text-center">
              <i className="ri-customer-service-2-line text-3xl text-oe-primary mb-2"></i>
              <p className="text-sm font-semibold text-oe-ink">Expert Support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
