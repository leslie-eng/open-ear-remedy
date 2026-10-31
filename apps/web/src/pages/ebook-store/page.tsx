import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';
import { apiFetch, formatMoney, type Ebook } from '../../lib/api';

export default function EbookStorePage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { addItem, items } = useCart();

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'clothing', name: 'Clothing' },
    { id: 'ebooks', name: 'Ebooks' }
  ];

  const loadEbooks = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ ebooks: Ebook[] }>('/api/ebooks', { signal });
      setEbooks(Array.isArray(data.ebooks) ? data.ebooks : []);
    } catch (err) {
      if (signal?.aborted) return;
      setEbooks([]);
      setError(err instanceof Error ? err.message : 'Failed to load ebooks.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadEbooks(controller.signal);
    return () => controller.abort();
  }, [loadEbooks]);

  const query = searchQuery.trim().toLowerCase();
  const filteredEbooks = ebooks.filter(ebook => {
    const matchesSearch = !query ||
                         ebook.title.toLowerCase().includes(query) ||
                         (ebook.author || '').toLowerCase().includes(query) ||
                         (ebook.description || '').toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'all' || ebook.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (ebook: Ebook) => {
    addItem(ebook);
  };

  const isInCart = (ebookId: string) => {
    return items.some(item => item.ebook.id === ebookId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF] font-['Poppins',sans-serif]">
      <Navbar />
      
      <div className="pt-28 pb-14 md:pt-32 md:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 lg:px-14">
          {/* Header */}
          <div className="text-center mb-10 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-[2.8rem] font-bold text-[#2A2A2A] mb-3">
              Store
            </h1>
            <p className="text-base md:text-lg text-[#6B6B6B] max-w-2xl mx-auto leading-relaxed">
              Discover our collection of mental wellness and self-help ebooks to support your emotional journey.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 flex flex-col gap-3 sm:gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm sm:text-base"></i>
                <input
                  type="text"
                  placeholder="Search ebooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full md:w-60">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#6B6B6B]">Loading ebooks...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="text-center py-16">
              <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Couldn't load the store</h3>
              <p className="text-[#6B6B6B] mb-6">{error}</p>
              <button
                onClick={() => void loadEbooks()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
              >
                <i className="ri-refresh-line"></i>
                Try Again
              </button>
            </div>
          )}

          {/* Ebooks Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {filteredEbooks.map(ebook => (
                <div key={ebook.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-2.5 sm:p-3 md:p-4">
                  <div className="aspect-[3/2.8] bg-gray-100 rounded-md mb-2 sm:mb-2.5 flex items-center justify-center overflow-hidden">
                    {ebook.cover_image_url ? (
                      <img src={ebook.cover_image_url} alt={ebook.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <i className="ri-book-line text-2xl sm:text-3xl text-[#6B6B6B]"></i>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-[#2A2A2A] text-xs sm:text-sm mb-1 line-clamp-2 leading-snug">
                    {ebook.title}
                  </h3>
                  
                  {ebook.author && (
                    <p className="text-[11px] sm:text-xs text-[#6B6B6B] mb-1">
                      by {ebook.author}
                    </p>
                  )}
                  
                  <p className="text-[11px] sm:text-xs text-[#6B6B6B] mb-2 line-clamp-2">
                    {ebook.short_description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm sm:text-base font-bold text-[#0096FF]">
                      {ebook.price > 0 ? formatMoney(ebook.price, ebook.currency) : 'Free'}
                    </span>
                    {ebook.file_format && (
                      <span className="text-[10px] bg-[#E6F5FF] text-[#0096FF] px-1.5 py-0.5 rounded-full">
                        {ebook.file_format}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Link
                      to={`/ebook/${ebook.id}`}
                      className="block w-full text-center px-2 py-1.5 text-[11px] sm:text-xs border border-[#0096FF] text-[#0096FF] rounded-md hover:bg-[#E6F5FF] transition-colors"
                    >
                      View Details
                    </Link>
                    <button 
                      onClick={() => handleAddToCart(ebook)}
                      disabled={isInCart(ebook.id)}
                      className={`w-full px-2 py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                        isInCart(ebook.id)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#0096FF] text-white hover:bg-[#0077CC]'
                      }`}
                    >
                      {isInCart(ebook.id) ? 'In Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && !error && filteredEbooks.length === 0 && (
            <div className="text-center py-16">
              <i className="ri-search-line text-6xl text-[#6B6B6B] mb-4"></i>
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No products found</h3>
              <p className="text-[#6B6B6B]">
                {ebooks.length === 0
                  ? 'The store is empty right now. Please check back soon.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}