import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, downloadEbook, type Ebook } from '../../lib/api';

interface LibraryEntry {
  ebook: Ebook;
  purchased_at: string;
  order_reference: string | null;
}

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const loadLibrary = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ library: LibraryEntry[] }>('/api/user/library', { signal });
      setLibrary(Array.isArray(data.library) ? data.library.filter((entry) => entry?.ebook) : []);
    } catch (err) {
      if (signal?.aborted) return;
      setLibrary([]);
      setError(err instanceof Error ? err.message : 'Failed to load your library.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLibrary([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadLibrary(controller.signal);
    return () => controller.abort();
  }, [user, authLoading, loadLibrary]);

  const formatFileSize = (bytes: number) => {
    const mb = (bytes || 0) / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownload = async (ebook: Ebook) => {
    setDownloadError('');
    setDownloadingId(ebook.id);
    try {
      await downloadEbook(ebook.id);
    } catch (err) {
      setDownloadError(
        `Could not download "${ebook.title}": ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const shell = (content: ReactNode) => (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">{content}</main>
      <SiteFooter />
    </div>
  );

  if (!authLoading && !user) {
    return shell(
      <div className="mx-auto max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
        <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
          <i className="ri-lock-line" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Sign in to see your library</h1>
        <p className="mt-2 text-oe-muted">Your books are kept with your account.</p>
        <Link
          to="/signin"
          state={{ returnTo: '/library' }}
          className="oe-btn mt-6 inline-flex items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
        >
          <i className="ri-login-box-line" aria-hidden="true"></i>
          Sign in
        </Link>
      </div>,
    );
  }

  if (loading || authLoading) {
    return shell(
      <div className="py-20 text-center" role="status">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-oe-primary border-t-transparent" aria-hidden="true"></div>
        <p className="text-oe-muted">Loading your library…</p>
      </div>,
    );
  }

  return shell(
    <>
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
            <i className="ri-book-open-line" aria-hidden="true" /> My Library
          </p>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Your bookshelf.</h1>
          <p className="mt-3 max-w-2xl text-lg text-oe-muted">
            {error
              ? 'We could not load your library'
              : library.length > 0
                ? `${library.length} book${library.length !== 1 ? 's' : ''} in your library`
                : 'No books in your library yet'}
          </p>
        </div>
        {!error && library.length > 0 && (
          <Link
            to="/purchase-history"
            className="inline-flex items-center gap-2 self-start rounded-full border border-oe-line bg-white px-5 py-2.5 text-sm font-medium text-oe-ink hover:bg-oe-surface-low md:self-auto"
          >
            <i className="ri-history-line" aria-hidden="true"></i>
            Purchase history
          </Link>
        )}
      </div>

      {downloadError && (
        <p role="alert" className="mt-8 flex items-center gap-2 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
          <i className="ri-error-warning-line" aria-hidden="true"></i>
          {downloadError}
        </p>
      )}

      {error ? (
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-crisis-tint text-2xl text-oe-crisis">
            <i className="ri-error-warning-line" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">Something went wrong</h2>
          <p role="alert" className="mt-2 text-oe-muted">
            {error}
          </p>
          <button
            onClick={() => void loadLibrary()}
            className="oe-btn mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
          >
            <i className="ri-refresh-line" aria-hidden="true"></i>
            Try again
          </button>
        </div>
      ) : library.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
            <i className="ri-book-line" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">Your shelf is empty</h2>
          <p className="mt-2 text-oe-muted">Books you buy from the store will appear here, ready to read or download.</p>
          <Link
            to="/ebook-store"
            className="oe-btn mt-6 inline-flex items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
          >
            <i className="ri-shopping-bag-line" aria-hidden="true"></i>
            Browse the store
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {library.map(({ ebook, purchased_at }) => (
            <li key={ebook.id} className="flex flex-col rounded-3xl border border-oe-line bg-white p-5 transition-shadow hover:shadow-oe-md">
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-oe-surface-low">
                {ebook.cover_image_url ? (
                  <img src={ebook.cover_image_url} alt={ebook.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <i className="ri-book-line text-4xl text-oe-muted" aria-hidden="true"></i>
                )}
              </div>

              <h2 className="mt-4 line-clamp-2 text-lg font-semibold leading-snug">{ebook.title}</h2>
              {ebook.author && <p className="mt-1 text-sm text-oe-muted">by {ebook.author}</p>}

              <dl className="mb-4 mt-4 space-y-1.5 rounded-2xl bg-oe-surface-low p-3 text-xs text-oe-muted">
                {ebook.file_format && (
                  <div className="flex justify-between">
                    <dt>Format</dt>
                    <dd className="font-medium text-oe-ink">{ebook.file_format}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Size</dt>
                  <dd className="text-oe-ink">{formatFileSize(ebook.file_size)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Bought</dt>
                  <dd className="text-oe-ink">{formatDate(purchased_at)}</dd>
                </div>
              </dl>

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => void handleDownload(ebook)}
                  disabled={downloadingId === ebook.id}
                  className="oe-btn flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-5 py-2.5 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingId === ebook.id ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
                      Downloading…
                    </>
                  ) : (
                    <>
                      <i className="ri-download-line" aria-hidden="true"></i>
                      Download
                    </>
                  )}
                </button>
                <Link
                  to={`/ebook/${ebook.id}`}
                  className="block w-full rounded-full border border-oe-line bg-white px-5 py-2.5 text-center text-sm font-medium text-oe-ink hover:bg-oe-surface-low"
                >
                  About this book
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>,
  );
}
