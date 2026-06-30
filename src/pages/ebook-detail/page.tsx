import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';

interface Ebook {
  id: string;
  title: string;
  author: string;
  description: string;
  short_description: string;
  price: number;
  category: string;
  cover_image_url: string;
  file_format: 'PDF' | 'EPUB';
  file_size: number;
  publication_date: string;
  isbn?: string;
  sample_pages_url?: string;
}

export default function EbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwned, setIsOwned] = useState(false);
  const { addItem, items } = useCart();

  useEffect(() => {
    const loadEbookFromStorage = () => {
      const savedEbooks = localStorage.getItem('admin-ebooks');
      if (savedEbooks) {
        const allEbooks = JSON.parse(savedEbooks);
        const foundEbook = allEbooks.find((ebook: Ebook) => ebook.id === id);
        if (foundEbook) {
          setEbook(foundEbook);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to sample data
      const sampleEbook: Ebook = {
        id: id || '1',
        title: 'Mindful Moments: A Guide to Daily Meditation',
        author: 'Dr. Sarah Johnson',
        description: `This comprehensive guide offers practical meditation techniques designed for busy individuals seeking mental clarity and stress relief. 

Dr. Sarah Johnson, a renowned mindfulness expert with over 15 years of experience, shares evidence-based practices that can be seamlessly integrated into your daily routine.

The book covers:
• Basic meditation fundamentals
• Breathing techniques for anxiety relief
• Mindful eating practices
• Walking meditation exercises
• Dealing with difficult emotions
• Creating a sustainable practice

Whether you're a complete beginner or looking to deepen your existing practice, this book provides the tools and guidance needed to cultivate lasting inner peace and emotional resilience.`,
        short_description: 'Practical meditation guide for daily stress relief.',
        price: 12.99,
        category: 'mindfulness',
        cover_image_url: '/api/placeholder/400/600',
        file_format: 'PDF',
        file_size: 2.5 * 1024 * 1024, // 2.5 MB
        publication_date: '2024-01-15',
        isbn: '978-1234567890',
        sample_pages_url: '/sample/mindful-moments-sample.pdf'
      };

      setEbook(sampleEbook);
      setLoading(false);
    };

    loadEbookFromStorage();
  }, [id]);

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
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
                Ebook Store
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
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
                    <i className="ri-book-line text-6xl text-[#6B6B6B]"></i>
                  </div>

                  {/* Price and Format */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-bold text-[#0096FF]">
                      ${ebook.price}
                    </span>
                    <span className="bg-[#E6F5FF] text-[#0096FF] px-3 py-1 rounded-full text-sm font-medium">
                      {ebook.file_format}
                    </span>
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
                        <Link
                          to="/checkout"
                          className="block w-full px-4 py-3 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors font-medium text-center"
                        >
                          Buy Now
                        </Link>
                      </>
                    )}
                    
                    {ebook.sample_pages_url && (
                      <button className="w-full px-4 py-3 border border-gray-300 text-[#6B6B6B] rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        <i className="ri-eye-line mr-2"></i>
                        Preview Sample
                      </button>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">File Size:</span>
                      <span className="text-[#2A2A2A]">{formatFileSize(ebook.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Format:</span>
                      <span className="text-[#2A2A2A]">{ebook.file_format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Published:</span>
                      <span className="text-[#2A2A2A]">{formatDate(ebook.publication_date)}</span>
                    </div>
                    {ebook.isbn && (
                      <div className="flex justify-between">
                        <span className="text-[#6B6B6B]">ISBN:</span>
                        <span className="text-[#2A2A2A]">{ebook.isbn}</span>
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
                  <p className="text-lg text-[#6B6B6B]">
                    by <span className="font-medium text-[#2A2A2A]">{ebook.author}</span>
                  </p>
                </div>

                {/* Category */}
                <div className="mb-6">
                  <span className="inline-block bg-[#E6F5FF] text-[#0096FF] px-3 py-1 rounded-full text-sm font-medium capitalize">
                    {ebook.category.replace('-', ' ')}
                  </span>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-[#2A2A2A] mb-4">About This Book</h2>
                  <div className="prose prose-gray max-w-none">
                    {ebook.description.split('\n').map((paragraph, index) => (
                      <p key={index} className="text-[#6B6B6B] leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Author Bio */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-[#2A2A2A] mb-4">About the Author</h2>
                  <p className="text-[#6B6B6B] leading-relaxed">
                    Dr. Sarah Johnson is a licensed clinical psychologist and mindfulness expert with over 15 years of experience helping individuals develop sustainable meditation practices. She holds a Ph.D. in Clinical Psychology from Stanford University and has published numerous research papers on the therapeutic benefits of mindfulness meditation.
                  </p>
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