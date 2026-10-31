import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const completedOrders = orders.filter((order) => order.status === 'completed');
  const totalSpentCurrency = completedOrders[0]?.currency || 'USD';
  const totalSpent = completedOrders.reduce((total, order) => total + (Number(order.total) || 0), 0);
  const mixedCurrencies = new Set(completedOrders.map((order) => order.currency)).size > 1;

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16 text-center">
          <p className="text-[#6B6B6B] mb-4">Sign in to view purchase history.</p>
          <Link
            to="/signin"
            state={{ returnTo: '/purchase-history' }}
            className="text-[#0096FF] font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">Purchase History</h1>
            <p className="text-[#6B6B6B]">Your ebook orders</p>
          </div>

          {loading || authLoading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md mx-auto">
              <i className="ri-error-warning-line text-6xl text-red-500 mb-4 block" />
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Something went wrong</h3>
              <p className="text-[#6B6B6B] mb-6">{error}</p>
              <button
                onClick={() => void loadOrders()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg"
              >
                Try again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md mx-auto">
              <i className="ri-receipt-line text-6xl text-[#6B6B6B] mb-4 block" />
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No purchases yet</h3>
              <p className="text-[#6B6B6B] mb-6">Completed ebook checkouts will appear here.</p>
              <Link
                to="/ebook-store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg"
              >
                Browse store
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-sm text-[#6B6B6B]">Completed orders</p>
                  <p className="text-2xl font-bold text-[#2A2A2A]">{completedOrders.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-sm text-[#6B6B6B]">Total spent</p>
                  <p className="text-2xl font-bold text-[#2A2A2A]">
                    {mixedCurrencies ? '—' : formatMoney(totalSpent, totalSpentCurrency)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.reference}
                    className="bg-white rounded-xl shadow-sm p-6 flex flex-wrap justify-between gap-4"
                  >
                    <div className="min-w-0">
                      {order.items.map((item) => (
                        <h3 key={item.ebook_id} className="font-semibold text-[#2A2A2A]">
                          {item.title}
                        </h3>
                      ))}
                      <p className="text-sm text-[#6B6B6B]">
                        {formatMoney(order.total, order.currency)}
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        {formatDate(order.completed_at || order.created_at)} · Ref{' '}
                        <span className="font-mono">{order.reference}</span>
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium h-fit ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
