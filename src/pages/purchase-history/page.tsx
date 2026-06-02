import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLibrary = () => {
      if (!user) {
        setPurchases([]);
        setLoading(false);
        return;
      }
      const raw = localStorage.getItem('user-library');
      if (raw) {
        try {
          const library = JSON.parse(raw) as Array<{
            id: string;
            title: string;
            author: string;
            purchase_date?: string;
          }>;
          setPurchases(
            library.map((item) => ({
              id: item.id,
              ebook_title: item.title,
              ebook_author: item.author,
              amount_paid: 0,
              purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
              status: 'completed' as const,
            })),
          );
        } catch {
          setPurchases([]);
        }
      } else {
        setPurchases([]);
      }
      setLoading(false);
    };

    loadLibrary();
  }, [user]);

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

  const getTotalSpent = () => {
    return purchases
      .filter((purchase) => purchase.status === 'completed')
      .reduce((total, purchase) => total + purchase.amount_paid, 0);
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16 text-center">
          <p className="text-[#6B6B6B] mb-4">Sign in to view purchase history.</p>
          <Link to="/signin" className="text-[#0096FF] font-medium hover:underline">
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
            <p className="text-[#6B6B6B]">Ebook purchases from your account library</p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : purchases.length === 0 ? (
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
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <p className="text-sm text-[#6B6B6B]">Items in library</p>
                <p className="text-2xl font-bold text-[#2A2A2A]">{purchases.length}</p>
              </div>
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="bg-white rounded-xl shadow-sm p-6 flex flex-wrap justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold text-[#2A2A2A]">{purchase.ebook_title}</h3>
                      <p className="text-sm text-[#6B6B6B]">{purchase.ebook_author}</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">{formatDate(purchase.purchase_date)}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium h-fit ${getStatusColor(purchase.status)}`}
                    >
                      {purchase.status}
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
