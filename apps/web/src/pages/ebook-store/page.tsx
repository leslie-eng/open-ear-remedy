import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
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
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        {/* Header */}
        <header>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
            <i className="ri-book-open-line" aria-hidden="true" /> Self-help books
          </p>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Something to read, at your own pace.</h1>
          <p className="mt-3 max-w-2xl text-lg text-oe-muted">
            Practical self-help books for low days and busy minds. Pay with M-Pesa, then read or download them any time from My Library.
          </p>
        </header>

        {/* Search and filter */}
        <div className="mt-10 flex flex-col gap-3 rounded-3xl border border-oe-line bg-oe-surface p-4 md:flex-row md:p-5">
          <div className="relative flex-1">
            <label htmlFor="ebook-search" className="sr-only">
              Search books
            </label>
            <i className="ri-search-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-oe-muted" aria-hidden="true"></i>
            <input
              id="ebook-search"
              type="text"
              placeholder="Search by title, author or topic"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-oe-line bg-white py-3 pl-11 pr-4 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
            />
          </div>
          <div className="w-full md:w-60">
            <label htmlFor="ebook-category" className="sr-only">
              Category
            </label>
            <select
              id="ebook-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-oe-line bg-white px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center" role="status">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-oe-primary border-t-transparent" aria-hidden="true"></div>
            <p className="text-oe-muted">Loading the shelves…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-crisis-tint text-2xl text-oe-crisis">
              <i className="ri-error-warning-line" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">Couldn&rsquo;t load the store</h2>
            <p role="alert" className="mt-2 text-oe-muted">
              {error}
            </p>
            <button
              onClick={() => void loadEbooks()}
              className="oe-btn mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-refresh-line" aria-hidden="true"></i>
              Try again
            </button>
          </div>
        )}

        {/* Books */}
        {!loading && !error && filteredEbooks.length > 0 && (
          <ul className="mt-10 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
            {filteredEbooks.map(ebook => (
              <li
                key={ebook.id}
                className="flex flex-col rounded-3xl border border-oe-line bg-white p-3 transition-shadow hover:shadow-oe-md sm:p-4 md:p-5"
              >
                <Link
                  to={`/ebook/${ebook.id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-oe-surface-low"
                >
                  {ebook.cover_image_url ? (
                    <img src={ebook.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <i className="ri-book-line text-4xl text-oe-muted"></i>
                  )}
                </Link>

                <div className="mt-4 flex flex-1 flex-col">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug md:text-lg">
                    <Link to={`/ebook/${ebook.id}`} className="hover:text-oe-primary">
                      {ebook.title}
                    </Link>
                  </h3>
                  {ebook.author && <p className="mt-1 text-xs text-oe-muted sm:text-sm">by {ebook.author}</p>}
                  {ebook.short_description && (
                    <p className="mt-2 line-clamp-2 hidden text-sm text-oe-muted sm:block">{ebook.short_description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="font-semibold text-oe-primary-deep sm:text-lg">
                      {ebook.price > 0 ? formatMoney(ebook.price, ebook.currency) : 'Free'}
                    </span>
                    {ebook.file_format && (
                      <span className="rounded-full bg-oe-surface px-2.5 py-0.5 text-xs font-medium text-oe-muted">
                        {ebook.file_format}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleAddToCart(ebook)}
                      disabled={isInCart(ebook.id)}
                      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isInCart(ebook.id)
                          ? 'cursor-not-allowed bg-oe-primary-tint text-oe-primary-deep'
                          : 'oe-btn cursor-pointer bg-oe-primary text-white hover:bg-oe-primary-hover'
                      }`}
                    >
                      <i className={isInCart(ebook.id) ? 'ri-check-line' : 'ri-shopping-bag-line'} aria-hidden="true"></i>
                      {isInCart(ebook.id) ? 'In your cart' : 'Add to cart'}
                    </button>
                    <Link
                      to={`/ebook/${ebook.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-oe-line bg-white px-4 py-2.5 text-sm font-medium text-oe-ink hover:bg-oe-surface-low"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* No results */}
        {!loading && !error && filteredEbooks.length === 0 && (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
              <i className="ri-search-line" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">{ebooks.length === 0 ? 'The shelves are empty' : 'No books found'}</h2>
            <p className="mt-2 text-oe-muted">
              {ebooks.length === 0
                ? 'The store is empty right now. Please check back soon.'
                : 'Try a different search or category.'}
            </p>
          </div>
        )}

        {/* Honest note */}
        <aside className="mt-14 flex flex-col gap-4 rounded-3xl border border-oe-line bg-oe-surface p-6 sm:flex-row sm:items-center">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
            <i className="ri-chat-heart-line" />
          </span>
          <p className="flex-1 text-sm text-oe-muted">
            These books are for reading and reflection, not treatment. If you&rsquo;d rather talk it through, a trained Listener is there by call or text.
          </p>
          <Link
            to="/call"
            className="rounded-full border border-oe-line bg-white px-5 py-2.5 text-center text-sm font-medium text-oe-ink hover:bg-oe-surface-low"
          >
            Talk to someone
          </Link>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}
