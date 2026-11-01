import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, formatMoney, type EbookOrder } from '../../lib/api';

export default function PurchaseHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<EbookOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ orders: EbookOrder[] }>('/api/user/orders', { signal });
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      if (signal?.aborted) return;
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Failed to load purchase history.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [user, authLoading, loadOrders]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-oe-primary-tint text-oe-primary-deep';
      case 'pending':
        return 'bg-oe-accent-tint text-oe-accent';
      case 'failed':
        return 'bg-oe-crisis-tint text-oe-crisis';
      default:
        return 'bg-oe-surface text-oe-muted';
    }
  };

  const completedOrders = orders.filter((order) => order.status === 'completed');
  const totalSpentCurrency = completedOrders[0]?.currency || 'KES';
  const totalSpent = completedOrders.reduce((total, order) => total + (Number(order.total) || 0), 0);
  const mixedCurrencies = new Set(completedOrders.map((order) => order.currency)).size > 1;

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-oe-bg text-oe-ink">
        <Navbar />
        <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
          <div className="rounded-3xl border border-oe-line bg-white p-8 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
              <i className="ri-receipt-line" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold">Purchase history</h1>
            <p className="mt-2 text-oe-muted">Sign in to see your ebook orders.</p>
            <Link
              to="/signin"
              state={{ returnTo: '/purchase-history' }}
              className="oe-btn mt-6 inline-block rounded-full bg-oe-primary px-8 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              Sign in
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-book-open-line" aria-hidden="true" /> Ebooks
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Purchase history</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">Every ebook you&rsquo;ve ordered, newest first.</p>

        {loading || authLoading ? (
          <div className="mt-10 space-y-3" aria-busy="true" aria-label="Loading purchase history">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-oe-surface-low" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-3xl border border-oe-line bg-white p-8 text-center">
            <p role="alert" className="rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
              {error}
            </p>
            <button
              onClick={() => void loadOrders()}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-refresh-line" aria-hidden="true" /> Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-oe-line bg-white p-8 text-center md:p-10">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
              <i className="ri-receipt-line" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">No purchases yet</h2>
            <p className="mt-2 text-oe-muted">Ebooks you buy will show up here.</p>
            <Link
              to="/ebook-store"
              className="oe-btn mt-6 inline-flex items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              Browse the store
            </Link>
          </div>
        ) : (
          <>
            <dl className="mt-10 grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-oe-line bg-white p-6">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Completed orders</dt>
                <dd className="mt-1 font-heading text-3xl font-semibold">{completedOrders.length}</dd>
              </div>
              <div className="rounded-3xl border border-oe-line bg-white p-6">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Total spent</dt>
                <dd className="mt-1 font-heading text-3xl font-semibold">
                  {mixedCurrencies ? '—' : formatMoney(totalSpent, totalSpentCurrency)}
                </dd>
              </div>
            </dl>
            <ul className="mt-6 space-y-3">
              {orders.map((order) => (
                <li
                  key={order.reference}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-oe-line bg-white p-6"
                >
                  <div className="flex min-w-0 gap-4">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                      <i className="ri-book-2-line" />
                    </span>
                    <div className="min-w-0">
                      {order.items.map((item) => (
                        <h2 key={item.ebook_id} className="font-sans text-base font-semibold">
                          {item.title}
                        </h2>
                      ))}
                      <p className="mt-0.5 text-sm text-oe-muted">{formatMoney(order.total, order.currency)}</p>
                      <p className="mt-1 text-xs text-oe-faint">
                        {formatDate(order.completed_at || order.created_at)} · Ref{' '}
                        <span className="font-mono">{order.reference}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`h-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-oe-muted">
              Your ebooks are in{' '}
              <Link to="/library" className="font-medium text-oe-primary underline-offset-2 hover:underline">
                your library
              </Link>
              .
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
