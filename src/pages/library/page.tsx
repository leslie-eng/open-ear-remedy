import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, downloadEbook, type Ebook } from '../../lib/api';

interface LibraryEntry {
  ebook: Ebook;
  purchased_at: string;
  order_reference: string | null;
}

function safeFilename(title: string, format: Ebook['file_format']) {
  const base = title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'ebook';
  const ext = format === 'EPUB' ? 'epub' : 'pdf';
  return `${base}.${ext}`;
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
      await downloadEbook(ebook.id, safeFilename(ebook.title, ebook.file_format));
    } catch (err) {
      setDownloadError(
        `Could not download "${ebook.title}": ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-lock-line text-6xl text-[#6B6B6B] mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Sign in required</h3>
                <p className="text-[#6B6B6B] mb-6">
                  Please sign in to access your ebook library.
                </p>
                <Link
                  to="/signin"
                  state={{ returnTo: '/library' }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                >
                  <i className="ri-login-box-line"></i>
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#6B6B6B]">Loading your library...</p>
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
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
              My Library
            </h1>
            <p className="text-[#6B6B6B]">
              {error
                ? 'We could not load your library'
                : library.length > 0
                  ? `${library.length} product${library.length !== 1 ? 's' : ''} in your library`
                  : 'No products in your library yet'
              }
            </p>
          </div>

          {downloadError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <i className="ri-error-warning-line text-red-600"></i>
              <p className="text-red-700 text-sm">{downloadError}</p>
            </div>
          )}

          {error ? (
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Something went wrong</h3>
                <p className="text-[#6B6B6B] mb-6">{error}</p>
                <button
                  onClick={() => void loadLibrary()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                >
                  <i className="ri-refresh-line"></i>
                  Try Again
                </button>
              </div>
            </div>
          ) : library.length === 0 ? (
            /* Empty Library */
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-book-line text-6xl text-[#6B6B6B] mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No products yet</h3>
                <p className="text-[#6B6B6B] mb-6">
                  Start building your library by purchasing products from our store.
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
            /* Library Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {library.map(({ ebook, purchased_at }) => (
                <div key={ebook.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                  {/* Cover Image */}
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {ebook.cover_image_url ? (
                      <img src={ebook.cover_image_url} alt={ebook.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <i className="ri-book-line text-4xl text-[#6B6B6B]"></i>
                    )}
                  </div>

                  {/* Book Info */}
                  <h3 className="font-semibold text-[#2A2A2A] mb-2 line-clamp-2">
                    {ebook.title}
                  </h3>

                  {ebook.author && (
                    <p className="text-sm text-[#6B6B6B] mb-4">
                      by {ebook.author}
                    </p>
                  )}

                  {/* File Info */}
                  <div className="space-y-2 mb-4 text-xs text-[#6B6B6B]">
                    {ebook.file_format && (
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span className="bg-[#E6F5FF] text-[#0096FF] px-2 py-0.5 rounded-full">
                          {ebook.file_format}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(ebook.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Purchased:</span>
                      <span>{formatDate(purchased_at)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => void handleDownload(ebook)}
                      disabled={downloadingId === ebook.id}
                      className="w-full px-4 py-2 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingId === ebook.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <i className="ri-download-line"></i>
                          Download
                        </>
                      )}
                    </button>
                    <Link
                      to={`/ebook/${ebook.id}`}
                      className="block w-full text-center px-4 py-2 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Purchase History Link */}
          {!error && library.length > 0 && (
            <div className="mt-12 text-center">
              <Link
                to="/purchase-history"
                className="inline-flex items-center gap-2 text-[#0096FF] hover:text-[#0077CC] transition-colors"
              >
                <i className="ri-history-line"></i>
                View Purchase History
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}