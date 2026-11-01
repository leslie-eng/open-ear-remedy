import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import MpesaPaymentModal from '../../components/feature/MpesaPaymentModal';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, ApiError, formatMoney } from '../../lib/api';

interface CheckoutResponse {
  reference: string;
  free?: boolean;
  /** Set for paid orders: the M-Pesa payment to wait for. */
  paymentId?: string;
}

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paying, setPaying] = useState(false);
  const orderReference = useRef<string | null>(null);
  const currency = items[0]?.ebook.currency || 'KES';

  const goToSignIn = () => {
    navigate('/signin', { state: { returnTo: '/checkout' } });
  };

  /** Creates the order; with a phone number it also sends the M-Pesa prompt. */
  const createOrder = (phone?: string) =>
    apiFetch<CheckoutResponse>('/api/ebooks/checkout', {
      method: 'POST',
      body: JSON.stringify({ ebookIds: items.map((item) => item.ebook.id), phone }),
    });

  const goToSuccess = (reference: string) => navigate(`/checkout/success?reference=${encodeURIComponent(reference)}`);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isProcessing || authLoading) return;
    if (!user) {
      goToSignIn();
      return;
    }
    setPaymentError('');
    // Paid orders need a phone number first: the M-Pesa window creates the order.
    if (totalPrice > 0) {
      setPaying(true);
      return;
    }

    setIsProcessing(true);
    try {
      const data = await createOrder();
      // Free order: already added to library. Success page clears the cart once confirmed.
      goToSuccess(data.reference);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        goToSignIn();
        return;
      }
      console.error('Checkout error:', error);
      setPaymentError(error instanceof Error && error.message ? error.message : 'We could not start checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  const startPayment = async (phone: string) => {
    const data = await createOrder(phone);
    if (!data.paymentId) throw new Error('Checkout did not start a payment.');
    orderReference.current = data.reference;
    return data.paymentId;
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-oe-bg text-oe-ink">
        <Navbar />
        <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
          <div className="mx-auto max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
              <i className="ri-shopping-bag-line" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold">Your cart is empty</h1>
            <p className="mt-2 text-oe-muted">Add a book or two to your cart before checking out.</p>
            <Link
              to="/ebook-store"
              className="oe-btn mt-6 inline-flex items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-book-open-line" aria-hidden="true"></i>
              Browse books
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const buttonLabel = (() => {
    if (authLoading) return 'Loading...';
    if (!user) return 'Sign in to check out';
    if (totalPrice <= 0) return 'Get it free';
    return `Pay ${formatMoney(totalPrice, currency)}`;
  })();

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      {paying && (
        <MpesaPaymentModal
          title="Your ebooks"
          amountLabel={formatMoney(totalPrice, currency)}
          start={startPayment}
          onPaid={() => orderReference.current && goToSuccess(orderReference.current)}
          onClose={() => setPaying(false)}
        />
      )}

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        {/* Header */}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-lock-line" aria-hidden="true" /> Checkout
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Almost there.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Pay with M-Pesa and your books go straight into My Library, ready to read or download.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Details */}
          <div className="lg:col-span-2">
            <form id="checkout-form" onSubmit={handleSubmit} className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
              <h2 className="text-2xl font-semibold">Your account</h2>

              {paymentError && (
                <p role="alert" className="mt-5 flex items-center gap-2 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
                  <i className="ri-error-warning-line" aria-hidden="true"></i>
                  {paymentError}
                </p>
              )}

              {authLoading ? (
                <div className="mt-5 flex items-center gap-3 text-oe-muted" role="status">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-oe-primary border-t-transparent" aria-hidden="true"></div>
                  <span>Checking your account…</span>
                </div>
              ) : user ? (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-oe-surface-low p-4">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                    <i className="ri-user-line" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-oe-muted">Buying as</p>
                    <p className="truncate font-medium">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-oe-accent-tint p-4">
                  <p className="text-sm">Please sign in so your books can be added to your library.</p>
                  <button
                    type="button"
                    onClick={goToSignIn}
                    className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-oe-primary-hover"
                  >
                    <i className="ri-login-box-line" aria-hidden="true"></i>
                    Sign in
                  </button>
                </div>
              )}

              <h2 className="mt-10 text-2xl font-semibold">How you&rsquo;ll pay</h2>
              <div className="mt-5 flex gap-4 rounded-2xl bg-oe-surface-low p-5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                  <i className="ri-smartphone-line" />
                </span>
                <div>
                  <p className="font-semibold">M-Pesa</p>
                  <p className="mt-1 text-sm text-oe-muted">
                    We send a prompt to your phone and you confirm with your PIN. We never see your PIN.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-1">
            <div className="rounded-3xl border border-oe-line bg-white p-6 md:p-8 lg:sticky lg:top-28">
              <h2 className="text-2xl font-semibold">Your order</h2>

              <ul className="mt-6 space-y-4">
                {items.map(item => (
                  <li key={item.ebook.id} className="flex gap-3">
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-oe-surface-low">
                      {item.ebook.cover_image_url ? (
                        <img src={item.ebook.cover_image_url} alt={item.ebook.title} className="h-full w-full object-cover" />
                      ) : (
                        <i className="ri-book-line text-oe-muted" aria-hidden="true"></i>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold">{item.ebook.title}</h3>
                      {item.ebook.author && <p className="text-xs text-oe-muted">by {item.ebook.author}</p>}
                      <p className="mt-1 text-sm font-semibold text-oe-primary-deep">
                        {formatMoney(item.ebook.price, item.ebook.currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-3 rounded-2xl bg-oe-surface-low p-4 text-sm">
                <div className="flex justify-between text-oe-muted">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(totalPrice, currency)}</dd>
                </div>
                <div className="flex justify-between text-oe-muted">
                  <dt>Tax</dt>
                  <dd>{formatMoney(0, currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-oe-line pt-3 text-base font-semibold text-oe-ink">
                  <dt>Total</dt>
                  <dd>{formatMoney(totalPrice, currency)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-oe-muted">Final price is confirmed by our server before payment.</p>

              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing || authLoading}
                className="oe-btn mt-6 w-full cursor-pointer rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    Redirecting…
                  </span>
                ) : (
                  buttonLabel
                )}
              </button>

              <ul className="mt-5 space-y-2 text-sm text-oe-muted">
                <li className="flex items-center gap-2">
                  <i className="ri-shield-check-line text-oe-primary" aria-hidden="true"></i>
                  Pay securely with M-Pesa
                </li>
                <li className="flex items-center gap-2">
                  <i className="ri-download-line text-oe-primary" aria-hidden="true"></i>
                  Ready in My Library right after payment
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
