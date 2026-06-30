import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  publication_date: string;
}

export default function EbookStorePage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { addItem, items } = useCart();

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'mental-wellness', name: 'Mental Wellness' },
    { id: 'self-help', name: 'Self-Help' },
    { id: 'anxiety-management', name: 'Anxiety Management' },
    { id: 'depression-support', name: 'Depression Support' },
    { id: 'mindfulness', name: 'Mindfulness' },
    { id: 'relationships', name: 'Relationships' }
  ];

  // Load ebooks from admin management system
  useEffect(() => {
    const loadEbooksFromStorage = () => {
      const savedEbooks = localStorage.getItem('admin-ebooks');
      if (savedEbooks) {
        const allEbooks = JSON.parse(savedEbooks);
        // Only show active ebooks in the store
        const activeEbooks = allEbooks.filter((ebook: Ebook) => ebook.is_active);
        setEbooks(activeEbooks);
      } else {
        // Fallback to sample data if no admin ebooks exist
        const sampleEbooks: Ebook[] = [
          {
            id: '1',
            title: 'Mindful Moments: A Guide to Daily Meditation',
            author: 'Dr. Sarah Johnson',
            description: 'Learn practical meditation techniques for everyday stress relief and mental clarity.',
            short_description: 'Practical meditation guide for daily stress relief.',
            price: 12.99,
            category: 'mindfulness',
            cover_image_url: '/api/placeholder/300/400',
            file_format: 'PDF',
            publication_date: '2024-01-15'
          },
          {
            id: '2',
            title: 'Overcoming Anxiety: Practical Strategies',
            author: 'Michael Chen',
            description: 'Evidence-based techniques to manage and overcome anxiety disorders.',
            short_description: 'Evidence-based anxiety management techniques.',
            price: 15.99,
            category: 'anxiety-management',
            cover_image_url: '/api/placeholder/300/400',
            file_format: 'EPUB',
            publication_date: '2024-02-20'
          },
          {
            id: '3',
            title: 'Building Resilience: Your Mental Health Toolkit',
            author: 'Dr. Emily Rodriguez',
            description: 'Comprehensive guide to building mental resilience and emotional strength.',
            short_description: 'Build mental resilience and emotional strength.',
            price: 18.99,
            category: 'mental-wellness',
            cover_image_url: '/api/placeholder/300/400',
            file_format: 'PDF',
            publication_date: '2024-03-10'
          }
        ];
        setEbooks(sampleEbooks);
      }
      setLoading(false);
    };

    loadEbooksFromStorage();

    // Listen for storage changes to update the store when admin adds/edits ebooks
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin-ebooks') {
        loadEbooksFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredEbooks = ebooks.filter(ebook => {
    const matchesSearch = ebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ebook.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ebook.description.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#2A2A2A] mb-4">
              Ebook Store
            </h1>
            <p className="text-lg text-[#6B6B6B] max-w-2xl mx-auto">
              Discover our collection of mental wellness and self-help ebooks to support your emotional journey.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <i className="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6B6B6B]"></i>
                <input
                  type="text"
                  placeholder="Search ebooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
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

          {/* Ebooks Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEbooks.map(ebook => (
                <div key={ebook.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <i className="ri-book-line text-4xl text-[#6B6B6B]"></i>
                  </div>
                  
                  <h3 className="font-semibold text-[#2A2A2A] mb-2 line-clamp-2">
                    {ebook.title}
                  </h3>
                  
                  <p className="text-sm text-[#6B6B6B] mb-2">
                    by {ebook.author}
                  </p>
                  
                  <p className="text-sm text-[#6B6B6B] mb-4 line-clamp-2">
                    {ebook.short_description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-[#0096FF]">
                      ${ebook.price}
                    </span>
                    <span className="text-xs bg-[#E6F5FF] text-[#0096FF] px-2 py-1 rounded-full">
                      {ebook.file_format}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <Link
                      to={`/ebook/${ebook.id}`}
                      className="block w-full text-center px-4 py-2 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors"
                    >
                      View Details
                    </Link>
                    <button 
                      onClick={() => handleAddToCart(ebook)}
                      disabled={isInCart(ebook.id)}
                      className={`w-full px-4 py-2 rounded-lg transition-colors ${
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
          {!loading && filteredEbooks.length === 0 && (
            <div className="text-center py-16">
              <i className="ri-search-line text-6xl text-[#6B6B6B] mb-4"></i>
              <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No ebooks found</h3>
              <p className="text-[#6B6B6B]">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}