import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, ApiError, formatMoney, type Ebook } from '../../lib/api';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

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

  const backToStore = (
    <Link
      to="/ebook-store"
      className="inline-flex items-center justify-center gap-2 rounded-full border border-oe-line bg-white px-6 py-3 font-medium text-oe-ink hover:bg-oe-surface-low"
    >
      <i className="ri-arrow-left-line" aria-hidden="true"></i>
      Back to the store
    </Link>
  );

  if (loading) {
    return (
      <Shell>
        <div className="py-20 text-center" role="status">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-oe-primary border-t-transparent" aria-hidden="true"></div>
          <p className="text-oe-muted">Loading this book…</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="mx-auto mt-6 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-crisis-tint text-2xl text-oe-crisis">
            <i className="ri-error-warning-line" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">Couldn&rsquo;t load this book</h1>
          <p role="alert" className="mt-2 text-oe-muted">
            {error}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => void loadEbook()}
              className="oe-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-refresh-line" aria-hidden="true"></i>
              Try again
            </button>
            {backToStore}
          </div>
        </div>
      </Shell>
    );
  }

  if (!ebook) {
    return (
      <Shell>
        <div className="mx-auto mt-6 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
            <i className="ri-book-line" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">Book not found</h1>
          <p className="mt-2 text-oe-muted">We couldn&rsquo;t find the book you&rsquo;re looking for.</p>
          <div className="mt-6">{backToStore}</div>
        </div>
      </Shell>
    );
  }

  const paragraphs = (ebook.description || ebook.short_description || '').split('\n');

  return (
    <Shell>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-oe-muted">
        <Link to="/ebook-store" className="hover:text-oe-primary">
          Store
        </Link>
        <i className="ri-arrow-right-s-line" aria-hidden="true"></i>
        <span className="truncate text-oe-ink" aria-current="page">
          {ebook.title}
        </span>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-12">
        {/* Cover and actions */}
        <div>
          <div className="rounded-3xl border border-oe-line bg-white p-5 md:p-6 lg:sticky lg:top-28">
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-oe-surface-low">
              {ebook.cover_image_url ? (
                <img src={ebook.cover_image_url} alt={ebook.title} className="h-full w-full object-cover" />
              ) : (
                <i className="ri-book-line text-6xl text-oe-muted" aria-hidden="true"></i>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="font-heading text-3xl font-semibold text-oe-primary-deep">
                {ebook.price > 0 ? formatMoney(ebook.price, ebook.currency) : 'Free'}
              </span>
              {ebook.file_format && (
                <span className="rounded-full bg-oe-surface px-3 py-1 text-sm font-medium text-oe-muted">{ebook.file_format}</span>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {isOwned ? (
                <>
                  <p className="flex items-center justify-center gap-2 rounded-2xl bg-oe-primary-tint px-5 py-3 text-sm font-medium text-oe-primary-deep">
                    <i className="ri-check-line" aria-hidden="true"></i>
                    This book is already in your library
                  </p>
                  <Link
                    to="/library"
                    className="oe-btn block w-full rounded-full bg-oe-primary px-6 py-3 text-center font-semibold text-white hover:bg-oe-primary-hover"
                  >
                    Open My Library
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={handleBuyNow}
                    className="oe-btn block w-full cursor-pointer rounded-full bg-oe-primary px-6 py-3 text-center font-semibold text-white hover:bg-oe-primary-hover"
                  >
                    Buy now
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={isInCart()}
                    className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-medium transition-colors ${
                      isInCart()
                        ? 'cursor-not-allowed bg-oe-primary-tint text-oe-primary-deep'
                        : 'cursor-pointer border border-oe-line bg-white text-oe-ink hover:bg-oe-surface-low'
                    }`}
                  >
                    <i className={isInCart() ? 'ri-check-line' : 'ri-shopping-bag-line'} aria-hidden="true"></i>
                    {isInCart() ? 'In your cart' : 'Add to cart'}
                  </button>
                </>
              )}
            </div>

            <dl className="mt-6 space-y-2 rounded-2xl bg-oe-surface-low p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-oe-muted">File size</dt>
                <dd>{formatFileSize(ebook.file_size)}</dd>
              </div>
              {ebook.file_format && (
                <div className="flex justify-between">
                  <dt className="text-oe-muted">Format</dt>
                  <dd>{ebook.file_format}</dd>
                </div>
              )}
              {ebook.publication_date && (
                <div className="flex justify-between">
                  <dt className="text-oe-muted">Published</dt>
                  <dd>{formatDate(ebook.publication_date)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-oe-muted">
              <i className="ri-smartphone-line" aria-hidden="true"></i>
              Pay with M-Pesa · read or download from My Library
            </p>
          </div>
        </div>

        {/* Details */}
        <article className="rounded-3xl border border-oe-line bg-white p-6 md:p-10">
          {ebook.category && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
              {ebook.category.replace('-', ' ')}
            </p>
          )}
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">{ebook.title}</h1>
          {ebook.author && (
            <p className="mt-3 text-lg text-oe-muted">
              by <span className="font-medium text-oe-ink">{ebook.author}</span>
            </p>
          )}

          <h2 className="mt-10 text-2xl font-semibold">About this book</h2>
          <div className="mt-4 max-w-2xl space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="leading-relaxed text-oe-muted">
                {paragraph}
              </p>
            ))}
          </div>

          <aside className="mt-10 flex gap-4 rounded-2xl bg-oe-surface-low p-5">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
              <i className="ri-chat-heart-line" />
            </span>
            <p className="text-sm text-oe-muted">
              This is self-help reading, not treatment. If you&rsquo;d like to talk things through with a real person,{' '}
              <Link to="/call" className="font-medium text-oe-primary underline">
                a Listener is there
              </Link>
              .
            </p>
          </aside>
        </article>
      </div>
    </Shell>
  );
}
