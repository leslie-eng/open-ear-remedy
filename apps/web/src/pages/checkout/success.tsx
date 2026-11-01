import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, ApiError, formatMoney, type EbookOrder } from '../../lib/api';

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

type ViewState = 'checking' | 'completed' | 'failed' | 'processing' | 'error' | 'missing';

const primaryBtn =
  'oe-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full border border-oe-line bg-white px-6 py-3 font-medium text-oe-ink hover:bg-oe-surface-low';

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
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">{content}</main>
      <SiteFooter />
    </div>
  );

  if (needsSignIn) {
    return shell(
      <div className="mx-auto max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
        <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
          <i className="ri-lock-line" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Sign in to see your order</h1>
        <p className="mt-2 text-oe-muted">Please sign in with the account you used to buy.</p>
        <button
          onClick={() =>
            navigate('/signin', { state: { returnTo: `${location.pathname}${location.search}` } })
          }
          className={`${primaryBtn} mt-6`}
        >
          <i className="ri-login-box-line" aria-hidden="true"></i>
          Sign in
        </button>
      </div>,
    );
  }

  if (view === 'checking' || (authLoading && !!reference)) {
    return shell(
      <div className="rounded-3xl border border-oe-line bg-white p-10 text-center" role="status">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-oe-primary border-t-transparent" aria-hidden="true"></div>
        <h1 className="text-3xl font-bold">Confirming your payment…</h1>
        <p className="mt-3 text-oe-muted">This usually takes a few seconds. Please don&rsquo;t close this page.</p>
      </div>,
    );
  }

  if (view === 'missing' || view === 'error' || view === 'failed' || view === 'processing') {
    const config = {
      missing: {
        icon: 'ri-question-line',
        tone: 'bg-oe-surface text-oe-muted',
        title: 'No order to show',
        body: 'We could not find an order reference in this link. If you just paid, check your library or purchase history.',
      },
      error: {
        icon: 'ri-error-warning-line',
        tone: 'bg-oe-crisis-tint text-oe-crisis',
        title: 'We could not load your order',
        body: errorMessage || 'Something went wrong while checking your order.',
      },
      failed: {
        icon: 'ri-close-line',
        tone: 'bg-oe-crisis-tint text-oe-crisis',
        title: 'Payment didn’t go through',
        body: 'Your payment was not completed and you have not been charged for this order. Your cart has been kept so you can try again.',
      },
      processing: {
        icon: 'ri-time-line',
        tone: 'bg-oe-accent-tint text-oe-accent',
        title: 'Still confirming',
        body: 'Your payment is taking longer than usual to confirm. Your books will appear in your library as soon as it goes through.',
      },
    }[view];

    return shell(
      <section className="rounded-3xl border border-oe-line bg-white p-8 text-center md:p-10">
        <span aria-hidden="true" className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${config.tone}`}>
          <i className={config.icon} />
        </span>
        <h1 className="mt-5 text-3xl font-bold md:text-4xl">{config.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-oe-muted" role={view === 'error' || view === 'failed' ? 'alert' : undefined}>
          {config.body}
        </p>
        {reference && (
          <p className="mx-auto mt-6 inline-block rounded-2xl bg-oe-surface-low px-4 py-2 text-sm text-oe-muted">
            Reference: <span className="font-mono text-oe-ink">{reference}</span>
          </p>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          {view === 'processing' && (
            <button onClick={() => setPollKey((k) => k + 1)} className={primaryBtn}>
              <i className="ri-refresh-line" aria-hidden="true"></i>
              Check again
            </button>
          )}
          {view === 'failed' && (
            <Link to="/checkout" className={primaryBtn}>
              <i className="ri-smartphone-line" aria-hidden="true"></i>
              Try again
            </Link>
          )}
          <Link to="/library" className={secondaryBtn}>
            <i className="ri-book-open-line" aria-hidden="true"></i>
            Go to My Library
          </Link>
          <Link to="/contact" className={secondaryBtn}>
            <i className="ri-customer-service-line" aria-hidden="true"></i>
            Contact us
          </Link>
        </div>
      </section>,
    );
  }

  // view === 'completed'
  return shell(
    <>
      <section className="text-center" role="status">
        <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
          <i className="ri-check-line" />
        </span>
        <h1 className="mt-5 text-4xl font-bold md:text-5xl">Your books are ready.</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-oe-muted">
          Thank you. Your books are now in My Library, ready to read or download whenever you like.
        </p>
      </section>

      {order && (
        <div className="mt-10 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          <div className="flex justify-between gap-3 text-sm text-oe-muted">
            <span>Reference</span>
            <span className="font-mono text-oe-ink">{order.reference}</span>
          </div>
          <ul className="mt-4 space-y-2">
            {order.items.map((item) => (
              <li key={item.ebook_id} className="flex justify-between gap-3 text-sm">
                <span>{item.title}</span>
                <span className="text-oe-muted">{formatMoney(item.price, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-oe-line pt-3 font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.total, order.currency)}</span>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to="/library" className="group rounded-3xl border border-oe-line bg-white p-6 transition-shadow hover:shadow-oe-md">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
            <i className="ri-book-open-line" />
          </span>
          <h2 className="mt-4 text-xl font-semibold group-hover:text-oe-primary">Open My Library</h2>
          <p className="mt-1 text-sm text-oe-muted">Read or download the books you&rsquo;ve bought.</p>
        </Link>
        <Link to="/ebook-store" className="group rounded-3xl border border-oe-line bg-white p-6 transition-shadow hover:shadow-oe-md">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
            <i className="ri-shopping-bag-line" />
          </span>
          <h2 className="mt-4 text-xl font-semibold group-hover:text-oe-primary">Keep browsing</h2>
          <p className="mt-1 text-sm text-oe-muted">Find more self-help books to read.</p>
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-oe-line bg-oe-surface p-6 md:p-8">
        <h2 className="text-2xl font-semibold">What happens next?</h2>
        <ul className="mt-5 space-y-4">
          <li className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
              <i className="ri-download-line" />
            </span>
            <div>
              <p className="font-semibold">Read any time</p>
              <p className="text-sm text-oe-muted">Your books stay in My Library, so you can download them again whenever you need.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
              <i className="ri-history-line" />
            </span>
            <div>
              <p className="font-semibold">Your receipt</p>
              <p className="text-sm text-oe-muted">This order is saved in your purchase history.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
              <i className="ri-customer-service-line" />
            </span>
            <div>
              <p className="font-semibold">Need a hand?</p>
              <p className="text-sm text-oe-muted">If a download doesn&rsquo;t work, get in touch and we&rsquo;ll sort it out.</p>
            </div>
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/purchase-history" className={secondaryBtn}>
          <i className="ri-history-line" aria-hidden="true"></i>
          View purchase history
        </Link>
        <Link to="/contact" className={secondaryBtn}>
          <i className="ri-customer-service-line" aria-hidden="true"></i>
          Contact us
        </Link>
      </div>
    </>,
  );
}
