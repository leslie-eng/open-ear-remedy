import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';

interface Purchase {
  id: string;
  ebook_title: string;
  ebook_author: string;
  amount_paid: number;
  purchase_date: string;
  status: 'completed' | 'pending' | 'failed';
  receipt_url?: string;
}

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sample purchase history data - will be replaced with API call
    const samplePurchases: Purchase[] = [
      {
        id: '1',
        ebook_title: 'Mindful Moments: A Guide to Daily Meditation',
        ebook_author: 'Dr. Sarah Johnson',
        amount_paid: 12.99,
        purchase_date: '2024-03-15',
        status: 'completed',
        receipt_url: '/receipts/receipt-1.pdf'
      },
      {
        id: '2',
        ebook_title: 'Building Resilience: Your Mental Health Toolkit',
        ebook_author: 'Dr. Emily Rodriguez',
        amount_paid: 18.99,
        purchase_date: '2024-03-10',
        status: 'completed',
        receipt_url: '/receipts/receipt-2.pdf'
      },
      {
        id: '3',
        ebook_title: 'Overcoming Anxiety: Practical Strategies',
        ebook_author: 'Michael Chen',
        amount_paid: 15.99,
        purchase_date: '2024-03-05',
        status: 'failed'
      }
    ];

    setTimeout(() => {
      setPurchases(samplePurchases);
      setLoading(false);
    }, 500);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const getTotalSpent = () => {
    return purchases
      .filter(purchase => purchase.status === 'completed')
      .reduce((total, purchase) => total + purchase.amount_paid, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#6B6B6B]">Loading purchase history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/library"
                className="text-[#0096FF] hover:text-[#0077CC] transition-colors"
              >
                <i className="ri-arrow-left-line text-xl"></i>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A]">
                Purchase History
              </h1>
            </div>
            <p className="text-[#6B6B6B]">
              {purchases.length > 0 
                ? `${purchases.length} transaction${purchases.length !== 1 ? 's' : ''} • Total spent: $${getTotalSpent().toFixed(2)}`
                : 'No purchases yet'
              }
            </p>
          </div>

          {purchases.length === 0 ? (
            /* Empty History */
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-receipt-line text-6xl text-[#6B6B6B] mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No purchases yet</h3>
                <p className="text-[#6B6B6B] mb-6">
                  Your purchase history will appear here after you buy your first ebook.
                </p>
                <Link
                  to="/ebook-store"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                >
                  <i className="ri-shopping-bag-line"></i>
                  Browse Store
                </Link>
              </div>
            </div>
          ) : (
            /* Purchase History */
            <div className="space-y-4">
              {purchases.map(purchase => (
                <div key={purchase.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Purchase Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-[#2A2A2A] mb-1">
                            {purchase.ebook_title}
                          </h3>
                          <p className="text-sm text-[#6B6B6B]">
                            by {purchase.ebook_author}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(purchase.status)}`}>
                          {purchase.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-[#6B6B6B]">
                        <span>{formatDate(purchase.purchase_date)}</span>
                        <span>•</span>
                        <span className="font-medium text-[#2A2A2A]">
                          ${purchase.amount_paid.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {purchase.status === 'completed' && purchase.receipt_url && (
                        <button className="px-4 py-2 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors text-sm">
                          <i className="ri-download-line mr-1"></i>
                          Receipt
                        </button>
                      )}
                      
                      {purchase.status === 'failed' && (
                        <button className="px-4 py-2 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors text-sm">
                          <i className="ri-refresh-line mr-1"></i>
                          Retry
                        </button>
                      )}
                      
                      {purchase.status === 'completed' && (
                        <Link
                          to="/library"
                          className="px-4 py-2 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors text-sm"
                        >
                          <i className="ri-book-line mr-1"></i>
                          View in Library
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {purchases.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#2A2A2A] mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#0096FF]">
                    {purchases.filter(p => p.status === 'completed').length}
                  </div>
                  <div className="text-sm text-[#6B6B6B]">Completed Purchases</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0096FF]">
                    ${getTotalSpent().toFixed(2)}
                  </div>
                  <div className="text-sm text-[#6B6B6B]">Total Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0096FF]">
                    {purchases.filter(p => p.status === 'failed').length}
                  </div>
                  <div className="text-sm text-[#6B6B6B]">Failed Transactions</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}