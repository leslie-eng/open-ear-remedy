import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, ApiError, formatMoney, type Ebook } from '../../lib/api';

export default function EbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwned, setIsOwned] = useState(false);
  const { addItem, items } = useCart();

  const loadEbook = useCallback(async (signal?: AbortSignal) => {
    if (!id) {
      setEbook(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ ebook: Ebook }>(`/api/ebooks/${encodeURIComponent(id)}`, { signal });
      setEbook(data.ebook ?? null);
    } catch (err) {
      if (signal?.aborted) return;
      setEbook(null);
      // 404 -> "not found" state; anything else -> error state
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : 'Failed to load ebook.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEbook(controller.signal);
    return () => controller.abort();
  }, [loadEbook]);

  // Check ownership for signed-in users
  useEffect(() => {
    if (!user || !id) {
      setIsOwned(false);
      return;
    }
    const controller = new AbortController();
    apiFetch<{ library: { ebook: { id: string } }[] }>('/api/user/library', { signal: controller.signal })
      .then((data) => {
        setIsOwned((data.library || []).some((entry) => entry.ebook?.id === id));
      })
      .catch(() => {
        if (!controller.signal.aborted) setIsOwned(false);
      });
    return () => controller.abort();
  }, [user, id]);

  const formatFileSize = (bytes: number) => {
    const mb = (bytes || 0) / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleAddToCart = () => {
    if (ebook) {
      addItem(ebook);
    }
  };

  const handleBuyNow = () => {
    if (ebook) {
      addItem(ebook);
      navigate('/checkout');
    }
  };

  const isInCart = () => {
    return ebook ? items.some(item => item.ebook.id === ebook.id) : false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#6B6B6B]">Loading ebook details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Couldn&apos;t load this ebook</h3>
              <p className="text-[#6B6B6B] mb-6">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => void loadEbook()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                >
                  <i className="ri-refresh-line"></i>
                  Try Again
                </button>
                <Link
                  to="/ebook-store"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors"
                >
                  <i className="ri-arrow-left-line"></i>
                  Back to Store
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <i className="ri-book-line text-6xl text-[#6B6B6B] mb-4"></i>
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Ebook not found</h3>
              <p className="text-[#6B6B6B] mb-6">The ebook you're looking for doesn't exist.</p>
              <Link
                to="/ebook-store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
              >
                <i className="ri-arrow-left-line"></i>
                Back to Store
              </Link>
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
          {/* Breadcrumb */}
          <div className="mb-8">
            <nav className="flex items-center gap-2 text-sm text-[#6B6B6B]">
              <Link to="/ebook-store" className="hover:text-[#0096FF] transition-colors">
                Store
              </Link>
              <i className="ri-arrow-right-s-line"></i>
              <span className="text-[#2A2A2A]">{ebook.title}</span>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Cover and Actions */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  {/* Cover Image */}
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                    {ebook.cover_image_url ? (
                      <img src={ebook.cover_image_url} alt={ebook.title} className="w-full h-full object-cover" />
                    ) : (
                      <i className="ri-book-line text-6xl text-[#6B6B6B]"></i>
                    )}
                  </div>

                  {/* Price and Format */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-bold text-[#0096FF]">
                      {ebook.price > 0 ? formatMoney(ebook.price, ebook.currency) : 'Free'}
                    </span>
                    {ebook.file_format && (
                      <span className="bg-[#E6F5FF] text-[#0096FF] px-3 py-1 rounded-full text-sm font-medium">
                        {ebook.file_format}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {isOwned ? (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                          <i className="ri-check-line"></i>
                          <span className="font-medium">Already Owned</span>
                        </div>
                        <Link
                          to="/library"
                          className="block w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                        >
                          View in Library
                        </Link>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={handleAddToCart}
                          disabled={isInCart()}
                          className={`w-full px-4 py-3 rounded-lg transition-colors font-medium ${
                            isInCart()
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-[#0096FF] text-white hover:bg-[#0077CC]'
                          }`}
                        >
                          {isInCart() ? 'In Cart' : 'Add to Cart'}
                        </button>
                        <button
                          onClick={handleBuyNow}
                          className="block w-full px-4 py-3 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors font-medium text-center"
                        >
                          Buy Now
                        </button>
                      </>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">File Size:</span>
                      <span className="text-[#2A2A2A]">{formatFileSize(ebook.file_size)}</span>
                    </div>
                    {ebook.file_format && (
                      <div className="flex justify-between">
                        <span className="text-[#6B6B6B]">Format:</span>
                        <span className="text-[#2A2A2A]">{ebook.file_format}</span>
                      </div>
                    )}
                    {ebook.publication_date && (
                      <div className="flex justify-between">
                        <span className="text-[#6B6B6B]">Published:</span>
                        <span className="text-[#2A2A2A]">{formatDate(ebook.publication_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-8">
                {/* Title and Author */}
                <div className="mb-6">
                  <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                    {ebook.title}
                  </h1>
                  {ebook.author && (
                    <p className="text-lg text-[#6B6B6B]">
                      by <span className="font-medium text-[#2A2A2A]">{ebook.author}</span>
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="mb-6">
                  <span className="inline-block bg-[#E6F5FF] text-[#0096FF] px-3 py-1 rounded-full text-sm font-medium capitalize">
                    {(ebook.category || '').replace('-', ' ')}
                  </span>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-[#2A2A2A] mb-4">About This Book</h2>
                  <div className="prose prose-gray max-w-none">
                    {(ebook.description || ebook.short_description || '').split('\n').map((paragraph, index) => (
                      <p key={index} className="text-[#6B6B6B] leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Reviews Section (Placeholder) */}
                <div>
                  <h2 className="text-xl font-semibold text-[#2A2A2A] mb-4">Customer Reviews</h2>
                  <div className="text-center py-8 text-[#6B6B6B]">
                    <i className="ri-star-line text-4xl mb-2"></i>
                    <p>No reviews yet. Be the first to review this ebook!</p>
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