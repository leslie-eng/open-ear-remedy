import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/feature/Navbar';
import { apiFetch, apiUpload, formatMoney, type AdminEbook } from '../../../lib/api';

type FileFormat = 'PDF' | 'EPUB';

const emptyForm = {
  title: '',
  author: '',
  description: '',
  short_description: '',
  price: '',
  category: 'ebooks',
  cover_image_url: '',
  file_url: '',
  file_format: 'PDF' as FileFormat,
  file_size: '',
  publication_date: '',
  is_active: true
};

export default function EbookManagementPage() {
  const navigate = useNavigate();
  const [ebooks, setEbooks] = useState<AdminEbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEbook, setEditingEbook] = useState<AdminEbook | null>(null);
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const categories = [
    { id: 'clothing', name: 'Clothing' },
    { id: 'ebooks', name: 'Ebooks' }
  ];

  const loadEbooks = useCallback(async () => {
    setListError('');
    try {
      const data = await apiFetch<{ ebooks: AdminEbook[] }>('/api/admin/ebooks');
      setEbooks(Array.isArray(data.ebooks) ? data.ebooks : []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to load ebooks.');
    }
  }, []);

  // Admin guard: verify with the server before showing anything.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await apiFetch<{ role: string }>('/api/admin/check');
      } catch {
        if (!cancelled) navigate('/admin-login', { replace: true });
        return;
      }
      if (cancelled) return;
      await loadEbooks();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, loadEbooks]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEbookFile(null);
    setCoverFile(null);
    setFormError('');
  };

  const upsertLocal = (saved: AdminEbook) => {
    setEbooks(prev =>
      prev.some(e => e.id === saved.id)
        ? prev.map(e => (e.id === saved.id ? saved : e))
        : [saved, ...prev]
    );
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
    setFormError('');
    setNotice('');

    const price = Number.parseFloat(formData.price);
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Price must be a number of 0 or more (e.g. 29.99).');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = formData.file_url.trim();
      let coverUrl = formData.cover_image_url.trim();
      let fileSize = Number.parseInt(formData.file_size, 10) || 0;
      let fileFormat: FileFormat = formData.file_format;

      if (ebookFile) {
        const name = ebookFile.name.toLowerCase();
        if (!name.endsWith('.pdf') && !name.endsWith('.epub')) {
          throw new Error('Please upload a PDF or EPUB file for ebook content.');
        }
        const uploaded = await apiUpload('ebook', ebookFile);
        fileUrl = uploaded.path;
        fileSize = uploaded.size;
        fileFormat = uploaded.format;
      }

      if (coverFile) {
        if (!coverFile.type.startsWith('image/')) {
          throw new Error('Please upload a valid image file for cover.');
        }
        const { publicUrl } = await apiUpload('cover', coverFile);
        coverUrl = publicUrl;
      }

      if (!fileUrl) {
        throw new Error('Ebook file is required. Upload a PDF or EPUB file.');
      }

      const body = {
        title: formData.title.trim(),
        author: formData.author.trim() || null,
        description: formData.description,
        short_description: formData.short_description,
        price: Math.round(price * 100) / 100,
        category: formData.category,
        cover_image_url: coverUrl || null,
        file_url: fileUrl,
        file_format: fileFormat,
        file_size: fileSize,
        publication_date: formData.publication_date || null,
        is_active: formData.is_active
      };

      const { ebook: saved } = editingEbook
        ? await apiFetch<{ ebook: AdminEbook }>(`/api/admin/ebooks/${encodeURIComponent(editingEbook.id)}`, {
            method: 'PUT',
            body: JSON.stringify(body)
          })
        : await apiFetch<{ ebook: AdminEbook }>('/api/admin/ebooks', {
            method: 'POST',
            body: JSON.stringify(body)
          });

      upsertLocal(saved);
      resetForm();
      setShowAddForm(false);
      setEditingEbook(null);
    } catch (error) {
      setFormError(error instanceof Error && error.message ? error.message : 'Failed to save ebook. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (ebook: AdminEbook) => {
    setEditingEbook(ebook);
    setFormData({
      title: ebook.title,
      author: ebook.author || '',
      description: ebook.description || '',
      short_description: ebook.short_description || '',
      price: String(ebook.price ?? ''),
      category: ebook.category || 'ebooks',
      cover_image_url: ebook.cover_image_url || '',
      file_url: ebook.file_url || '',
      file_format: ebook.file_format || 'PDF',
      file_size: String(ebook.file_size ?? ''),
      publication_date: ebook.publication_date ? ebook.publication_date.slice(0, 10) : '',
      is_active: ebook.is_active
    });
    setEbookFile(null);
    setCoverFile(null);
    setFormError('');
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ebook?')) return;
    setNotice('');
    setListError('');
    setBusyId(id);
    try {
      const result = await apiFetch<{ success: boolean; deactivated?: boolean }>(
        `/api/admin/ebooks/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      if (result.deactivated) {
        setEbooks(prev => prev.map(e => (e.id === id ? { ...e, is_active: false } : e)));
        setNotice('This ebook has already been purchased, so it was deactivated instead of deleted. Existing owners keep access.');
      } else {
        setEbooks(prev => prev.filter(e => e.id !== id));
      }
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to delete ebook.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (ebook: AdminEbook) => {
    setNotice('');
    setListError('');
    setBusyId(ebook.id);
    try {
      const { ebook: saved } = await apiFetch<{ ebook: AdminEbook }>(
        `/api/admin/ebooks/${encodeURIComponent(ebook.id)}`,
        { method: 'PUT', body: JSON.stringify({ is_active: !ebook.is_active }) }
      );
      upsertLocal(saved);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to update ebook.');
    } finally {
      setBusyId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = (bytes || 0) / (1024 * 1024);
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
                resetForm();
              }}
              className="px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Add New Ebook
            </button>
          </div>

          {notice && (
            <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              {notice}
            </div>
          )}
          {listError && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-4">
              <span>{listError}</span>
              <button onClick={() => void loadEbooks()} className="underline whitespace-nowrap">
                Retry
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
              <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">
                {editingEbook ? 'Edit Ebook' : 'Add New Ebook'}
              </h2>
              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {formError}
                </div>
              )}

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
                      Price (e.g. 29.99) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
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
                      Upload Ebook (PDF or EPUB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.epub,application/pdf,application/epub+zip"
                      onChange={(e) => setEbookFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                    <p className="text-xs text-[#6B6B6B] mt-1">
                      If selected, this uploads to private storage and sets the file, size and format.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Upload Cover Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                    <p className="text-xs text-[#6B6B6B] mt-1">
                      Optional. If selected, this uploads and auto-fills Cover Image URL.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Stored File (set by upload)
                    </label>
                    <input
                      type="text"
                      name="file_url"
                      value={formData.file_url}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-[#6B6B6B] focus:outline-none"
                      placeholder={ebookFile ? ebookFile.name : 'Upload a file above'}
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
                      placeholder="https://openear.com/images/cover.jpg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      File Size (bytes)
                    </label>
                    <input
                      type="number"
                      name="file_size"
                      value={formData.file_size}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-[#6B6B6B] focus:outline-none"
                      placeholder={ebookFile ? String(ebookFile.size) : ''}
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
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="ebook-is-active"
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#0096FF] border-gray-300 rounded focus:ring-[#0096FF]"
                  />
                  <label htmlFor="ebook-is-active" className="text-sm font-medium text-[#2A2A2A]">
                    Active (visible in store)
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading
                      ? 'Uploading...'
                      : editingEbook
                        ? 'Update Ebook'
                        : 'Add Ebook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEbook(null);
                      resetForm();
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
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">No products yet</h3>
                <p className="text-[#6B6B6B]">Add your first product to get started.</p>
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
                            <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {ebook.cover_image_url ? (
                                <img src={ebook.cover_image_url} alt={ebook.title} className="w-full h-full object-cover" />
                              ) : (
                                <i className="ri-book-line text-[#6B6B6B]"></i>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-[#2A2A2A]">
                                {ebook.title}
                              </div>
                              {ebook.author && (
                                <div className="text-sm text-[#6B6B6B]">
                                  by {ebook.author}
                                </div>
                              )}
                              <div className="text-xs text-[#6B6B6B]">
                                {ebook.file_format || 'No file'} • {formatFileSize(ebook.file_size)} • {ebook.purchase_count ?? 0} sold
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#E6F5FF] text-[#0096FF]">
                            {categories.find(c => c.id === ebook.category)?.name || ebook.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2A2A2A]">
                          {formatMoney(ebook.price, ebook.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => void toggleActive(ebook)}
                            disabled={busyId === ebook.id}
                            className={`disabled:opacity-50 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                              onClick={() => void handleDelete(ebook.id)}
                              disabled={busyId === ebook.id}
                              className="disabled:opacity-50 text-red-600 hover:text-red-800 transition-colors"
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