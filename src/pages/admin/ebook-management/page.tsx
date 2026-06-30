import { useState, useEffect } from 'react';
import Navbar from '../../../components/feature/Navbar';

interface Ebook {
  id: string;
  title: string;
  author: string;
  description: string;
  short_description: string;
  price: number;
  category: string;
  cover_image_url: string;
  file_url: string;
  file_format: 'PDF' | 'EPUB';
  file_size: number;
  publication_date: string;
  isbn?: string;
  sample_pages_url?: string;
  is_active: boolean;
}

export default function EbookManagementPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    short_description: '',
    price: '',
    category: 'mental-wellness',
    cover_image_url: '',
    file_url: '',
    file_format: 'PDF' as 'PDF' | 'EPUB',
    file_size: '',
    publication_date: '',
    isbn: '',
    sample_pages_url: '',
    is_active: true
  });

  const categories = [
    { id: 'mental-wellness', name: 'Mental Wellness' },
    { id: 'self-help', name: 'Self-Help' },
    { id: 'anxiety-management', name: 'Anxiety Management' },
    { id: 'depression-support', name: 'Depression Support' },
    { id: 'mindfulness', name: 'Mindfulness' },
    { id: 'relationships', name: 'Relationships' }
  ];

  useEffect(() => {
    loadEbooks();
  }, []);

  const loadEbooks = async () => {
    // In a real app, this would fetch from your database
    // For now, we'll load from localStorage or use sample data
    const savedEbooks = localStorage.getItem('admin-ebooks');
    if (savedEbooks) {
      setEbooks(JSON.parse(savedEbooks));
    } else {
      // Initialize with sample data
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
          file_url: '/ebooks/mindful-moments.pdf',
          file_format: 'PDF',
          file_size: 2.5 * 1024 * 1024,
          publication_date: '2024-01-15',
          isbn: '978-1234567890',
          sample_pages_url: '/samples/mindful-moments-sample.pdf',
          is_active: true
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
          file_url: '/ebooks/overcoming-anxiety.epub',
          file_format: 'EPUB',
          file_size: 1.8 * 1024 * 1024,
          publication_date: '2024-02-20',
          isbn: '978-1234567891',
          sample_pages_url: '',
          is_active: true
        }
      ];
      setEbooks(sampleEbooks);
      localStorage.setItem('admin-ebooks', JSON.stringify(sampleEbooks));
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEbook: Ebook = {
      id: editingEbook?.id || Date.now().toString(),
      title: formData.title,
      author: formData.author,
      description: formData.description,
      short_description: formData.short_description,
      price: parseFloat(formData.price),
      category: formData.category,
      cover_image_url: formData.cover_image_url || '/api/placeholder/300/400',
      file_url: formData.file_url,
      file_format: formData.file_format,
      file_size: parseInt(formData.file_size) || 0,
      publication_date: formData.publication_date,
      isbn: formData.isbn,
      sample_pages_url: formData.sample_pages_url,
      is_active: formData.is_active
    };

    let updatedEbooks;
    if (editingEbook) {
      updatedEbooks = ebooks.map(ebook => 
        ebook.id === editingEbook.id ? newEbook : ebook
      );
    } else {
      updatedEbooks = [...ebooks, newEbook];
    }

    setEbooks(updatedEbooks);
    localStorage.setItem('admin-ebooks', JSON.stringify(updatedEbooks));
    
    // Reset form
    setFormData({
      title: '', author: '', description: '', short_description: '', price: '',
      category: 'mental-wellness', cover_image_url: '', file_url: '', file_format: 'PDF',
      file_size: '', publication_date: '', isbn: '', sample_pages_url: '', is_active: true
    });
    setShowAddForm(false);
    setEditingEbook(null);
  };

  const handleEdit = (ebook: Ebook) => {
    setEditingEbook(ebook);
    setFormData({
      title: ebook.title,
      author: ebook.author,
      description: ebook.description,
      short_description: ebook.short_description,
      price: ebook.price.toString(),
      category: ebook.category,
      cover_image_url: ebook.cover_image_url,
      file_url: ebook.file_url,
      file_format: ebook.file_format,
      file_size: ebook.file_size.toString(),
      publication_date: ebook.publication_date,
      isbn: ebook.isbn || '',
      sample_pages_url: ebook.sample_pages_url || '',
      is_active: ebook.is_active
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this ebook?')) {
      const updatedEbooks = ebooks.filter(ebook => ebook.id !== id);
      setEbooks(updatedEbooks);
      localStorage.setItem('admin-ebooks', JSON.stringify(updatedEbooks));
    }
  };

  const toggleActive = (id: string) => {
    const updatedEbooks = ebooks.map(ebook => 
      ebook.id === id ? { ...ebook, is_active: !ebook.is_active } : ebook
    );
    setEbooks(updatedEbooks);
    localStorage.setItem('admin-ebooks', JSON.stringify(updatedEbooks));
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#6B6B6B]">Loading ebooks...</p>
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
                Ebook Management
              </h1>
              <p className="text-[#6B6B6B]">
                Manage your ebook catalog - add, edit, and organize your digital library
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingEbook(null);
                setFormData({
                  title: '', author: '', description: '', short_description: '', price: '',
                  category: 'mental-wellness', cover_image_url: '', file_url: '', file_format: 'PDF',
                  file_size: '', publication_date: '', isbn: '', sample_pages_url: '', is_active: true
                });
              }}
              className="px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Add New Ebook
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
              <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">
                {editingEbook ? 'Edit Ebook' : 'Add New Ebook'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Author *
                    </label>
                    <input
                      type="text"
                      name="author"
                      required
                      value={formData.author}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                    Short Description *
                  </label>
                  <input
                    type="text"
                    name="short_description"
                    required
                    value={formData.short_description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    placeholder="Brief description for card display"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                    Full Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    placeholder="Detailed description for the ebook detail page"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      required
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      File Format *
                    </label>
                    <select
                      name="file_format"
                      required
                      value={formData.file_format}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    >
                      <option value="PDF">PDF</option>
                      <option value="EPUB">EPUB</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      File URL *
                    </label>
                    <input
                      type="url"
                      name="file_url"
                      required
                      value={formData.file_url}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                      placeholder="https://example.com/ebook.pdf"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      name="cover_image_url"
                      value={formData.cover_image_url}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                      placeholder="https://example.com/cover.jpg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      File Size (bytes)
                    </label>
                    <input
                      type="number"
                      name="file_size"
                      value={formData.file_size}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Publication Date
                    </label>
                    <input
                      type="date"
                      name="publication_date"
                      value={formData.publication_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      ISBN
                    </label>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                    Sample Pages URL
                  </label>
                  <input
                    type="url"
                    name="sample_pages_url"
                    value={formData.sample_pages_url}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    placeholder="https://example.com/sample.pdf"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#0096FF] border-gray-300 rounded focus:ring-[#0096FF]"
                  />
                  <label className="text-sm font-medium text-[#2A2A2A]">
                    Active (visible in store)
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                  >
                    {editingEbook ? 'Update Ebook' : 'Add Ebook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEbook(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-[#6B6B6B] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ebooks List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#2A2A2A]">
                Current Ebooks ({ebooks.length})
              </h2>
            </div>
            
            {ebooks.length === 0 ? (
              <div className="p-12 text-center">
                <i className="ri-book-line text-6xl text-[#6B6B6B] mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No ebooks yet</h3>
                <p className="text-[#6B6B6B]">Add your first ebook to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                        Ebook
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ebooks.map((ebook) => (
                      <tr key={ebook.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                              <i className="ri-book-line text-[#6B6B6B]"></i>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-[#2A2A2A]">
                                {ebook.title}
                              </div>
                              <div className="text-sm text-[#6B6B6B]">
                                by {ebook.author}
                              </div>
                              <div className="text-xs text-[#6B6B6B]">
                                {ebook.file_format} • {formatFileSize(ebook.file_size)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#E6F5FF] text-[#0096FF]">
                            {categories.find(c => c.id === ebook.category)?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2A2A2A]">
                          ${ebook.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(ebook.id)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              ebook.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {ebook.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(ebook)}
                              className="text-[#0096FF] hover:text-[#0077CC] transition-colors"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(ebook.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}