import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, ApiError, formatMoney } from '../../lib/api';

interface CheckoutResponse {
  url: string | null;
  reference: string;
  free?: boolean;
}

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const currency = items[0]?.ebook.currency || 'USD';

  const goToSignIn = () => {
    navigate('/signin', { state: { returnTo: '/checkout' } });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isProcessing || authLoading) return;
    if (!user) {
      goToSignIn();
      return;
    }

    setIsProcessing(true);
    setPaymentError('');

    try {
      const data = await apiFetch<CheckoutResponse>('/api/ebooks/checkout', {
        method: 'POST',
        body: JSON.stringify({ ebookIds: items.map((item) => item.ebook.id) }),
      });

      if (data.free || !data.url) {
        if (!data.reference) throw new Error('Checkout did not return an order reference.');
        // Free order: already added to library. Success page clears the cart once confirmed.
        navigate(`/checkout/success?reference=${encodeURIComponent(data.reference)}`);
        return;
      }

      // Hand off to Paystack's hosted payment page. Keep the spinner while the browser navigates.
      window.location.assign(data.url);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        goToSignIn();
        return;
      }
      console.error('Checkout error:', error);
      setPaymentError(
        error instanceof Error && error.message
          ? error.message
          : 'We could not start checkout. Please try again.',
      );
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-shopping-cart-line text-6xl text-[#6B6B6B] mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Your cart is empty</h3>
                <p className="text-[#6B6B6B] mb-6">
                  Add some ebooks to your cart before proceeding to checkout.
                </p>
                <Link
                  to="/ebook-store"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                >
                  <i className="ri-book-line"></i>
                  Browse Ebooks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const buttonLabel = (() => {
    if (authLoading) return 'Loading...';
    if (!user) return 'Sign in to Checkout';
    if (totalPrice <= 0) return 'Get for Free';
    return `Pay ${formatMoney(totalPrice, currency)}`;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
              Checkout
            </h1>
            <p className="text-[#6B6B6B]">
              Complete your purchase to get instant access to your ebooks
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Details */}
            <div className="lg:col-span-2">
              <form id="checkout-form" onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Account</h2>

                {/* Payment Error */}
                {paymentError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <i className="ri-error-warning-line text-red-600"></i>
                      <p className="text-red-700 text-sm">{paymentError}</p>
                    </div>
                  </div>
                )}

                {authLoading ? (
                  <div className="flex items-center gap-3 text-[#6B6B6B] mb-8">
                    <div className="w-5 h-5 border-2 border-[#0096FF] border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking your account...</span>
                  </div>
                ) : user ? (
                  <div className="mb-8 p-4 bg-[#E6F5FF] rounded-xl flex items-center gap-3">
                    <i className="ri-user-line text-[#0096FF] text-xl"></i>
                    <div className="min-w-0">
                      <p className="text-sm text-[#6B6B6B]">Purchasing as</p>
                      <p className="font-medium text-[#2A2A2A] truncate">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-[#2A2A2A] mb-3">
                      Please sign in so your ebooks can be added to your library.
                    </p>
                    <button
                      type="button"
                      onClick={goToSignIn}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors text-sm"
                    >
                      <i className="ri-login-box-line"></i>
                      Sign In
                    </button>
                  </div>
                )}

                {/* Payment Section */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-[#2A2A2A] mb-4">Payment Method</h3>
                  <div className="bg-[#E6F5FF] rounded-xl p-6 text-center">
                    <i className="ri-secure-payment-line text-4xl text-[#0096FF] mb-2"></i>
                    <p className="text-[#0096FF] font-medium mb-1">Secure Payment Processing</p>
                    <p className="text-sm text-[#6B6B6B]">
                      You&apos;ll be redirected to Paystack to complete your payment securely. We never see or store your card details.
                    </p>
                  </div>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Order Summary</h2>

                {/* Items */}
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.ebook.id} className="flex gap-3">
                      <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.ebook.cover_image_url ? (
                          <img src={item.ebook.cover_image_url} alt={item.ebook.title} className="w-full h-full object-cover" />
                        ) : (
                          <i className="ri-book-line text-[#6B6B6B]"></i>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#2A2A2A] text-sm line-clamp-2">
                          {item.ebook.title}
                        </h4>
                        {item.ebook.author && (
                          <p className="text-xs text-[#6B6B6B]">
                            by {item.ebook.author}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-[#0096FF] mt-1">
                          {formatMoney(item.ebook.price, item.ebook.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Subtotal</span>
                    <span>{formatMoney(totalPrice, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Tax</span>
                    <span>{formatMoney(0, currency)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-[#2A2A2A] pt-3 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatMoney(totalPrice, currency)}</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    Final price is confirmed by our server before payment.
                  </p>
                </div>

                {/* Checkout Button */}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing || authLoading}
                  className="w-full px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Redirecting...
                    </div>
                  ) : (
                    buttonLabel
                  )}
                </button>

                {/* Security Info */}
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-[#6B6B6B] mb-2">
                    <i className="ri-shield-check-line text-green-600"></i>
                    <span>Secured by Paystack</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-[#6B6B6B]">
                    <i className="ri-download-line text-[#0096FF]"></i>
                    <span>Instant digital delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
