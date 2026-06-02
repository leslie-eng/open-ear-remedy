import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';

interface LibraryEbook {
  id: string;
  title: string;
  author: string;
  file_format: 'PDF' | 'EPUB';
  file_size: number;
  purchase_date: string;
  download_count: number;
  last_downloaded?: string;
  cover_image_url: string;
}

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [libraryEbooks, setLibraryEbooks] = useState<LibraryEbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLibraryEbooks([]);
      setLoading(false);
      return;
    }

    const userLibrary = localStorage.getItem('user-library');
    if (userLibrary) {
      setLibraryEbooks(JSON.parse(userLibrary));
    } else {
      setLibraryEbooks([]);
    }
    setLoading(false);

    // Listen for storage changes to update library when purchases are made
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user-library') {
        const updatedLibrary = localStorage.getItem('user-library');
        setLibraryEbooks(updatedLibrary ? JSON.parse(updatedLibrary) : []);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, authLoading]);

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownload = (ebookId: string, title: string) => {
    alert(`Downloading "${title}"...`);
    
    // Update download count
    setLibraryEbooks(ebooks => 
      ebooks.map(ebook => 
        ebook.id === ebookId 
          ? { 
              ...ebook, 
              download_count: ebook.download_count + 1,
              last_downloaded: new Date().toISOString().split('T')[0]
            }
          : ebook
      )
    );
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

  if (loading) {
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
              {libraryEbooks.length > 0 
                ? `${libraryEbooks.length} product${libraryEbooks.length !== 1 ? 's' : ''} in your library`
                : 'No products in your library yet'
              }
            </p>
          </div>

          {libraryEbooks.length === 0 ? (
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
              {libraryEbooks.map(ebook => (
                <div key={ebook.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                  {/* Cover Image */}
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <i className="ri-book-line text-4xl text-[#6B6B6B]"></i>
                  </div>
                  
                  {/* Book Info */}
                  <h3 className="font-semibold text-[#2A2A2A] mb-2 line-clamp-2">
                    {ebook.title}
                  </h3>
                  
                  <p className="text-sm text-[#6B6B6B] mb-4">
                    by {ebook.author}
                  </p>

                  {/* File Info */}
                  <div className="space-y-2 mb-4 text-xs text-[#6B6B6B]">
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="bg-[#E6F5FF] text-[#0096FF] px-2 py-0.5 rounded-full">
                        {ebook.file_format}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(ebook.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Purchased:</span>
                      <span>{formatDate(ebook.purchase_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Downloads:</span>
                      <span>{ebook.download_count}</span>
                    </div>
                    {ebook.last_downloaded && (
                      <div className="flex justify-between">
                        <span>Last downloaded:</span>
                        <span>{formatDate(ebook.last_downloaded)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDownload(ebook.id, ebook.title)}
                      className="w-full px-4 py-2 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="ri-download-line"></i>
                      Download
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
          {libraryEbooks.length > 0 && (
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