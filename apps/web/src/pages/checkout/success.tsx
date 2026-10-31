import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, ApiError, formatMoney, type EbookOrder } from '../../lib/api';

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

type ViewState = 'checking' | 'completed' | 'failed' | 'processing' | 'error' | 'missing';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';

  const [view, setView] = useState<ViewState>(reference ? 'checking' : 'missing');
  const [order, setOrder] = useState<EbookOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pollKey, setPollKey] = useState(0);

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!reference) {
      setView('missing');
      return;
    }
    if (authLoading || !user) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    setView('checking');
    setErrorMessage('');

    const poll = async () => {
      attempt += 1;
      try {
        const data = await apiFetch<{ order: EbookOrder }>(
          `/api/ebooks/orders/${encodeURIComponent(reference)}`,
        );
        if (cancelled) return;
        setOrder(data.order);
        if (data.order.status === 'completed') {
          setView('completed');
          return;
        }
        if (data.order.status === 'failed') {
          setView('failed');
          return;
        }
      } catch (err) {
        if (cancelled) return;
        // Not found / not ours / unauthorized won't fix themselves by retrying.
        if (err instanceof ApiError && [401, 403, 404].includes(err.status)) {
          setErrorMessage(
            err.status === 404
              ? 'We could not find this order.'
              : err.message || 'You do not have access to this order.',
          );
          setView('error');
          return;
        }
        // Network / 5xx: keep trying within the attempt budget.
      }
      if (attempt >= MAX_ATTEMPTS) {
        setView('processing');
        return;
      }
      timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reference, user, authLoading, pollKey]);

  useEffect(() => {
    if (view === 'completed') clearCart();
  }, [view, clearCart]);

  const needsSignIn = !!reference && !authLoading && !user;

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center">{content}</div>
        </div>
      </div>
    </div>
  );

  if (needsSignIn) {
    return shell(
      <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
        <i className="ri-lock-line text-6xl text-[#6B6B6B] mb-4"></i>
        <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Sign in to view your order</h3>
        <p className="text-[#6B6B6B] mb-6">
          Please sign in with the account you used to purchase.
        </p>
        <button
          onClick={() =>
            navigate('/signin', { state: { returnTo: `${location.pathname}${location.search}` } })
          }
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
        >
          <i className="ri-login-box-line"></i>
          Sign In
        </button>
      </div>,
    );
  }

  if (view === 'checking' || (authLoading && !!reference)) {
    return shell(
      <div className="py-16">
        <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2">Confirming your payment...</h1>
        <p className="text-[#6B6B6B]">This usually takes just a few seconds. Please don&apos;t close this page.</p>
      </div>,
    );
  }

  if (view === 'missing' || view === 'error' || view === 'failed' || view === 'processing') {
    const config = {
      missing: {
        icon: 'ri-question-line',
        iconWrap: 'bg-gray-100',
        iconColor: 'text-[#6B6B6B]',
        title: 'No order to show',
        body: 'We could not find an order reference in this link. If you just paid, check your library or purchase history.',
      },
      error: {
        icon: 'ri-error-warning-line',
        iconWrap: 'bg-red-100',
        iconColor: 'text-red-600',
        title: 'We could not load your order',
        body: errorMessage || 'Something went wrong while checking your order.',
      },
      failed: {
        icon: 'ri-close-line',
        iconWrap: 'bg-red-100',
        iconColor: 'text-red-600',
        title: 'Payment failed',
        body: 'Your payment was not completed and you have not been charged for this order. Your cart has been kept so you can try again.',
      },
      processing: {
        icon: 'ri-time-line',
        iconWrap: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        title: 'Still processing',
        body: 'Your payment is taking longer than usual to confirm. Your ebooks will appear in your library as soon as it goes through.',
      },
    }[view];

    return shell(
      <>
        <div className={`w-24 h-24 ${config.iconWrap} rounded-full flex items-center justify-center mx-auto mb-8`}>
          <i className={`${config.icon} text-4xl ${config.iconColor}`}></i>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-4">{config.title}</h1>
        <p className="text-lg text-[#6B6B6B] mb-8 max-w-2xl mx-auto">{config.body}</p>
        {reference && (
          <p className="text-sm text-[#6B6B6B] mb-8">
            Reference: <span className="font-mono text-[#2A2A2A]">{reference}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {view === 'processing' && (
            <button
              onClick={() => setPollKey((k) => k + 1)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
            >
              <i className="ri-refresh-line"></i>
              Check Again
            </button>
          )}
          {view === 'failed' && (
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
            >
              <i className="ri-bank-card-line"></i>
              Try Again
            </Link>
          )}
          <Link
            to="/library"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors"
          >
            <i className="ri-book-open-line"></i>
            Go to Library
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-[#6B6B6B] rounded-lg hover:bg-gray-50 transition-colors"
          >
            <i className="ri-customer-service-line"></i>
            Contact Support
          </Link>
        </div>
      </>,
    );
  }

  // view === 'completed'
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <i className="ri-check-line text-4xl text-green-600"></i>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-4">
              Purchase Successful!
            </h1>
            <p className="text-lg text-[#6B6B6B] mb-8 max-w-2xl mx-auto">
              Thank you for your purchase! Your ebooks have been added to your library and you should receive a confirmation email shortly.
            </p>

            {order && (
              <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto mb-12 text-left">
                <div className="flex justify-between text-sm text-[#6B6B6B] mb-4">
                  <span>Reference</span>
                  <span className="font-mono text-[#2A2A2A]">{order.reference}</span>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div key={item.ebook_id} className="flex justify-between text-sm">
                      <span className="text-[#2A2A2A]">{item.title}</span>
                      <span className="text-[#6B6B6B]">{formatMoney(item.price, order.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-semibold text-[#2A2A2A] pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatMoney(order.total, order.currency)}</span>
                </div>
              </div>
            )}

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto">
              <Link
                to="/library"
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center group"
              >
                <div className="w-16 h-16 bg-[#E6F5FF] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#D6EFFF] transition-colors">
                  <i className="ri-book-open-line text-2xl text-[#0096FF]"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">
                  Access Your Library
                </h3>
                <p className="text-sm text-[#6B6B6B]">
                  Download and read your purchased ebooks
                </p>
              </Link>

              <Link
                to="/ebook-store"
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center group"
              >
                <div className="w-16 h-16 bg-[#E6F5FF] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#D6EFFF] transition-colors">
                  <i className="ri-shopping-bag-line text-2xl text-[#0096FF]"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">
                  Continue Shopping
                </h3>
                <p className="text-sm text-[#6B6B6B]">
                  Discover more mental wellness ebooks
                </p>
              </Link>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-sm p-8 max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">What happens next?</h2>

              <div className="space-y-4 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-mail-line text-green-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#2A2A2A] mb-1">
                      Confirmation Email
                    </h4>
                    <p className="text-sm text-[#6B6B6B]">
                      You'll receive a confirmation email with your purchase details and download instructions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-download-line text-blue-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#2A2A2A] mb-1">
                      Instant Access
                    </h4>
                    <p className="text-sm text-[#6B6B6B]">
                      Your ebooks are now available in your library for unlimited downloads.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-customer-service-line text-purple-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#2A2A2A] mb-1">
                      Support Available
                    </h4>
                    <p className="text-sm text-[#6B6B6B]">
                      Need help? Our support team is here to assist you with any questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/purchase-history"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors"
              >
                <i className="ri-history-line"></i>
                View Purchase History
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-[#6B6B6B] rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="ri-customer-service-line"></i>
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
