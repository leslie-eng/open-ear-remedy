import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth, type AuthUser } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO } from '../../utils/seo';

interface UserProfile {
  email: string;
  phone_number: string | null;
  credits: number;
  created_at: string;
}

interface CallHistoryItem {
  id: string;
  duration_seconds: number;
  credits_used: number;
  status: string;
  started_at: string;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  credits: number;
  description: string;
  status: string;
  created_at: string;
}

export default function ProfilePage() {
  useSEO({
    title: 'My Profile - Open Ear | Account Settings',
    description: 'Manage your Open Ear account settings, view call history, and update your profile information.',
    keywords: 'profile, account settings, Open Ear, user dashboard',
    canonical: '/profile',
  });

  const navigate = useNavigate();
  const { user: authUser, loading: authLoading, signOut, updatePassword } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'purchases' | 'security'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      navigate('/signin');
      return;
    }
    setUser(authUser);
    void (async () => {
      await fetchProfile();
      await fetchCallHistory();
      await fetchTransactions();
      setIsLoading(false);
    })();
  }, [authUser, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus !== 'success') return;

    showSuccess('Payment received. Your credits will update in a moment.');
    void fetchProfile();
    void fetchTransactions();

    const next = new URLSearchParams(searchParams);
    next.delete('purchase');
    setSearchParams(next, { replace: true });
  }, [user, searchParams, setSearchParams]);

  const fetchProfile = async () => {
    const data = await apiFetch<UserProfile>('/api/user/profile');
    setProfile(data);
    setPhoneNumber(data.phone_number || '');
  };

  const fetchCallHistory = async () => {
    const { data } = await apiFetch<{ data: CallHistoryItem[] }>(
      '/api/user/call-history?limit=10',
    );
    setCallHistory(data || []);
  };

  const fetchTransactions = async () => {
    const { data } = await apiFetch<{ data: CreditTransaction[] }>(
      '/api/user/transactions?limit=20',
    );
    setTransactions(data || []);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      await apiFetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      showSuccess('Profile updated successfully!');
      await fetchProfile();
    } catch {
      // apiFetch throws ApiError
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(newPassword);
      showSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    }
    setIsSaving(false);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    // Note: Full account deletion requires admin privileges
    signOut();
    localStorage.clear();
    navigate('/');
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'ri-shopping-cart-line';
      case 'bonus':
        return 'ri-gift-line';
      case 'refund':
        return 'ri-refund-line';
      case 'usage':
        return 'ri-phone-line';
      default:
        return 'ri-exchange-line';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-600';
      case 'bonus':
        return 'bg-amber-100 text-amber-600';
      case 'refund':
        return 'bg-blue-100 text-blue-600';
      case 'usage':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refunded':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateInvoiceNumber = (transaction: CreditTransaction) => {
    const date = new Date(transaction.created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = transaction.id.slice(0, 8).toUpperCase();
    return `INV-${year}${month}-${shortId}`;
  };

  const downloadInvoice = async (transaction: CreditTransaction) => {
    setIsDownloading(true);
    
    const invoiceNumber = generateInvoiceNumber(transaction);
    const invoiceDate = formatDateTime(transaction.created_at);
    const transactionType = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2A2A2A; padding: 40px; }
          .invoice-container { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0096FF; }
          .logo { font-size: 28px; font-weight: bold; color: #0096FF; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 32px; color: #2A2A2A; margin-bottom: 5px; }
          .invoice-number { color: #6B6B6B; font-size: 14px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .info-block h3 { font-size: 12px; text-transform: uppercase; color: #6B6B6B; margin-bottom: 8px; letter-spacing: 1px; }
          .info-block p { font-size: 14px; line-height: 1.6; }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .details-table th { background: #F8FAFC; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6B6B6B; letter-spacing: 1px; border-bottom: 2px solid #E5E7EB; }
          .details-table td { padding: 16px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
          .details-table .description { width: 50%; }
          .details-table .amount { text-align: right; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB; }
          .totals-row.total { border-bottom: none; border-top: 2px solid #2A2A2A; font-weight: bold; font-size: 18px; padding-top: 15px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .status-completed { background: #D1FAE5; color: #065F46; }
          .status-pending { background: #FEF3C7; color: #92400E; }
          .status-failed { background: #FEE2E2; color: #991B1B; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B6B6B; font-size: 12px; }
          .footer p { margin-bottom: 5px; }
          .credits-highlight { background: #E6F5FF; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .credits-highlight h4 { color: #0096FF; font-size: 14px; margin-bottom: 5px; }
          .credits-highlight .credits-value { font-size: 32px; font-weight: bold; color: #0077CC; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="logo">Open Ear</div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p class="invoice-number">${invoiceNumber}</p>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-block">
              <h3>Billed To</h3>
              <p><strong>${profile?.email || 'Customer'}</strong></p>
              <p>Account ID: ${user?.id?.slice(0, 8).toUpperCase() || 'N/A'}</p>
            </div>
            <div class="info-block">
              <h3>Invoice Details</h3>
              <p><strong>Date:</strong> ${invoiceDate}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${transaction.status}">${transaction.status.toUpperCase()}</span></p>
              <p><strong>Transaction ID:</strong> ${transaction.id.slice(0, 12)}...</p>
            </div>
          </div>

          <div class="credits-highlight">
            <h4>Credits ${transaction.type === 'usage' ? 'Used' : 'Added'}</h4>
            <div class="credits-value">${transaction.type === 'usage' ? '-' : '+'}${transaction.credits} Credits</div>
          </div>
          
          <table class="details-table">
            <thead>
              <tr>
                <th class="description">Description</th>
                <th>Type</th>
                <th>Credits</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="description">${transaction.description || `${transactionType} - Open Ear Credits`}</td>
                <td>${transactionType}</td>
                <td>${transaction.type === 'usage' ? '-' : '+'}${transaction.credits}</td>
                <td class="amount">${transaction.amount > 0 ? formatCurrency(transaction.amount) : '-'}</td>
              </tr>
            </tbody>
          </table>
          
          ${transaction.amount > 0 ? `
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>${formatCurrency(transaction.amount)}</span>
            </div>
            <div class="totals-row">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div class="totals-row total">
              <span>Total</span>
              <span>${formatCurrency(transaction.amount)}</span>
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <p><strong>Open Ear</strong> - AI-Powered Support Platform</p>
            <p>Thank you for your business!</p>
            <p style="margin-top: 15px; color: #9CA3AF;">This invoice was generated automatically. For questions, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create a new window and print to PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setIsDownloading(false);
        }, 250);
      };
    } else {
      // Fallback: download as HTML file
      const blob = new Blob([invoiceHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0096FF] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[#6B6B6B]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-24 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <i className="ri-check-line text-lg"></i>
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      <div className="pt-28 pb-16 px-4 md:px-8 lg:px-14">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              My Profile
            </h1>
            <p className="text-sm text-[#6B6B6B]">Manage your account settings and preferences</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* User Info Header */}
            <div className="bg-gradient-to-r from-[#0096FF] to-[#0077CC] p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    {profile?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg md:text-xl font-semibold text-white mb-1">{profile?.email}</h2>
                  <p className="text-sm text-white/80">Member since {formatDate(profile?.created_at || '')}</p>
                </div>
                <div className="hidden md:block text-right">
                  <div className="bg-white/20 rounded-xl px-4 py-2">
                    <p className="text-xs text-white/80 mb-0.5">Available Credits</p>
                    <p className="text-2xl font-bold text-white">{profile?.credits}</p>
                  </div>
                </div>
              </div>
              <div className="md:hidden mt-4 bg-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-white/80">Available Credits</p>
                <p className="text-xl font-bold text-white">{profile?.credits}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 md:flex-none px-6 py-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'text-[#0096FF] border-b-2 border-[#0096FF]'
                      : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                  }`}
                >
                  <i className="ri-user-line mr-2"></i>
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 md:flex-none px-6 py-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'text-[#0096FF] border-b-2 border-[#0096FF]'
                      : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                  }`}
                >
                  <i className="ri-history-line mr-2"></i>
                  Call History
                </button>
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`flex-1 md:flex-none px-6 py-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'purchases'
                      ? 'text-[#0096FF] border-b-2 border-[#0096FF]'
                      : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                  }`}
                >
                  <i className="ri-wallet-line mr-2"></i>
                  Purchases
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 md:flex-none px-6 py-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'security'
                      ? 'text-[#0096FF] border-b-2 border-[#0096FF]'
                      : 'text-[#6B6B6B] hover:text-[#2A2A2A]'
                  }`}
                >
                  <i className="ri-shield-keyhole-line mr-2"></i>
                  Security
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 md:p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#6B6B6B] cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="text-xs bg-gray-200 text-[#6B6B6B] px-2 py-1 rounded-md">Verified</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-1.5">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#2A2A2A] focus:outline-none focus:border-[#0096FF] focus:ring-2 focus:ring-[#0096FF]/20 transition-all"
                    />
                    <p className="text-xs text-[#6B6B6B] mt-1.5">Used for call notifications</p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-[#2A2A2A] mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Link
                        to="/pricing"
                        className="flex items-center gap-3 p-4 bg-[#E6F5FF] rounded-xl hover:bg-[#D6EFFF] transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-[#0096FF]/20 rounded-full flex items-center justify-center">
                          <i className="ri-add-circle-line text-[#0096FF] text-lg"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#2A2A2A]">Buy Credits</p>
                          <p className="text-xs text-[#6B6B6B]">Add more minutes to your account</p>
                        </div>
                      </Link>
                      <Link
                        to="/call"
                        className="flex items-center gap-3 p-4 bg-[#E6F5FF] rounded-xl hover:bg-[#D6EFFF] transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-[#0096FF]/20 rounded-full flex items-center justify-center">
                          <i className="ri-phone-line text-[#0096FF] text-lg"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#2A2A2A]">Start a Call</p>
                          <p className="text-xs text-[#6B6B6B]">Connect with support now</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Call History Tab */}
              {activeTab === 'history' && (
                <div>
                  {callHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-phone-line text-2xl text-[#6B6B6B]"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">No calls yet</h3>
                      <p className="text-sm text-[#6B6B6B] mb-6">Start your first call to see your history here</p>
                      <Link
                        to="/call"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-phone-line"></i>
                        Start a Call
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callHistory.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#0096FF]/10 rounded-full flex items-center justify-center">
                              <i className="ri-phone-line text-[#0096FF]"></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#2A2A2A]">
                                {formatDate(call.started_at)}
                              </p>
                              <p className="text-xs text-[#6B6B6B]">
                                Duration: {formatDuration(call.duration_seconds)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                              {call.status}
                            </span>
                            <span className="text-sm font-medium text-[#2A2A2A]">
                              -{call.credits_used} credits
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Purchases Tab */}
              {activeTab === 'purchases' && (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <i className="ri-coin-line text-green-600 text-lg"></i>
                        </div>
                        <div>
                          <p className="text-xs text-green-700/70">Total Purchased</p>
                          <p className="text-xl font-bold text-green-700">
                            {transactions
                              .filter(t => t.type === 'purchase' && t.status === 'completed')
                              .reduce((sum, t) => sum + t.credits, 0)} credits
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <i className="ri-gift-line text-amber-600 text-lg"></i>
                        </div>
                        <div>
                          <p className="text-xs text-amber-700/70">Bonus Credits</p>
                          <p className="text-xl font-bold text-amber-700">
                            {transactions
                              .filter(t => t.type === 'bonus' && t.status === 'completed')
                              .reduce((sum, t) => sum + t.credits, 0)} credits
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#E6F5FF] to-[#D6EFFF] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0096FF]/20 rounded-full flex items-center justify-center">
                          <i className="ri-money-dollar-circle-line text-[#0096FF] text-lg"></i>
                        </div>
                        <div>
                          <p className="text-xs text-[#0077CC]/70">Total Spent</p>
                          <p className="text-xl font-bold text-[#0077CC]">
                            {formatCurrency(
                              transactions
                                .filter(t => t.type === 'purchase' && t.status === 'completed')
                                .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction List */}
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-wallet-line text-2xl text-[#6B6B6B]"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">No transactions yet</h3>
                      <p className="text-sm text-[#6B6B6B] mb-6">Purchase credits to see your transaction history here</p>
                      <Link
                        to="/pricing"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-add-circle-line"></i>
                        Buy Credits
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[#2A2A2A]">Transaction History</h3>
                        <button
                          onClick={() => user && fetchTransactions()}
                          className="text-sm text-[#0096FF] hover:text-[#0077CC] flex items-center gap-1 cursor-pointer"
                        >
                          <i className="ri-refresh-line"></i>
                          Refresh
                        </button>
                      </div>
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          onClick={() => setSelectedTransaction(transaction)}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                              <i className={`${getTransactionIcon(transaction.type)}`}></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#2A2A2A]">
                                {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`}
                              </p>
                              <p className="text-xs text-[#6B6B6B]">
                                {formatDate(transaction.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                              {transaction.status}
                            </span>
                            <div className="text-right">
                              {transaction.amount > 0 && (
                                <p className="text-xs text-[#6B6B6B]">{formatCurrency(transaction.amount)}</p>
                              )}
                              <p className={`text-sm font-semibold ${transaction.type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
                                {transaction.type === 'usage' ? '-' : '+'}{transaction.credits} credits
                              </p>
                            </div>
                            <div className="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <i className="ri-arrow-right-s-line text-[#6B6B6B]"></i>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transaction Detail Modal */}
                  {selectedTransaction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedTransaction(null)}></div>
                      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#0096FF] to-[#0077CC] p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white/80 mb-1">Transaction Details</p>
                              <h3 className="text-lg font-bold text-white">
                                {generateInvoiceNumber(selectedTransaction)}
                              </h3>
                            </div>
                            <button
                              onClick={() => setSelectedTransaction(null)}
                              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                            >
                              <i className="ri-close-line text-white"></i>
                            </button>
                          </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                          {/* Status Badge */}
                          <div className="flex items-center justify-between mb-6">
                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedTransaction.status)}`}>
                              {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                            </span>
                            <span className="text-sm text-[#6B6B6B]">
                              {formatDateTime(selectedTransaction.created_at)}
                            </span>
                          </div>

                          {/* Credits Card */}
                          <div className={`rounded-xl p-5 mb-6 ${selectedTransaction.type === 'usage' ? 'bg-red-50' : 'bg-green-50'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`text-sm font-medium ${selectedTransaction.type === 'usage' ? 'text-red-600' : 'text-green-600'}`}>
                                  Credits {selectedTransaction.type === 'usage' ? 'Used' : 'Added'}
                                </p>
                                <p className={`text-3xl font-bold ${selectedTransaction.type === 'usage' ? 'text-red-700' : 'text-green-700'}`}>
                                  {selectedTransaction.type === 'usage' ? '-' : '+'}{selectedTransaction.credits}
                                </p>
                              </div>
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedTransaction.type === 'usage' ? 'bg-red-100' : 'bg-green-100'}`}>
                                <i className={`${getTransactionIcon(selectedTransaction.type)} text-2xl ${selectedTransaction.type === 'usage' ? 'text-red-600' : 'text-green-600'}`}></i>
                              </div>
                            </div>
                          </div>

                          {/* Transaction Details */}
                          <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                              <span className="text-sm text-[#6B6B6B]">Type</span>
                              <span className="text-sm font-medium text-[#2A2A2A] capitalize">{selectedTransaction.type}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                              <span className="text-sm text-[#6B6B6B]">Description</span>
                              <span className="text-sm font-medium text-[#2A2A2A] text-right max-w-[200px]">
                                {selectedTransaction.description || `${selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)} transaction`}
                              </span>
                            </div>
                            {selectedTransaction.amount > 0 && (
                              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <span className="text-sm text-[#6B6B6B]">Amount Paid</span>
                                <span className="text-sm font-bold text-[#2A2A2A]">{formatCurrency(selectedTransaction.amount)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                              <span className="text-sm text-[#6B6B6B]">Transaction ID</span>
                              <span className="text-xs font-mono text-[#6B6B6B] bg-gray-100 px-2 py-1 rounded">
                                {selectedTransaction.id.slice(0, 16)}...
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => setSelectedTransaction(null)}
                              className="flex-1 px-6 py-3 bg-gray-100 text-[#2A2A2A] rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Close
                            </button>
                            <button
                              onClick={() => downloadInvoice(selectedTransaction)}
                              disabled={isDownloading}
                              className="flex-1 px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                            >
                              {isDownloading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <i className="ri-download-line"></i>
                                  Download Invoice
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  {/* Change Password */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#2A2A2A] mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#2A2A2A] mb-2">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#2A2A2A] focus:outline-none focus:border-[#0096FF] focus:ring-2 focus:ring-[#0096FF]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2A2A2A] mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#2A2A2A] focus:outline-none focus:border-[#0096FF] focus:ring-2 focus:ring-[#0096FF]/20 transition-all"
                        />
                      </div>
                      {passwordError && (
                        <p className="text-sm text-red-500 flex items-center gap-2">
                          <i className="ri-error-warning-line"></i>
                          {passwordError}
                        </p>
                      )}
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving || !newPassword || !confirmPassword}
                        className="px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-lg font-semibold text-[#2A2A2A] mb-4">Session</h3>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-[#2A2A2A] rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-logout-box-line"></i>
                      Sign Out
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-sm text-[#6B6B6B] mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-delete-bin-line"></i>
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)}></div>
          <div className="relative bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-red-600"></i>
              </div>
              <h3 className="text-xl font-bold text-[#2A2A2A] mb-2">Delete Account?</h3>
              <p className="text-sm text-[#6B6B6B]">
                This action cannot be undone. All your data, credits, and call history will be permanently deleted.
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#2A2A2A] focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-[#2A2A2A] rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0096FF] text-white py-8 px-4 md:px-8 lg:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link
              to="/"
              className="text-xl font-bold hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Open Ear
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/pricing" className="text-sm text-white/80 hover:text-white transition-colors cursor-pointer">
                Pricing
              </Link>
              <Link to="/how-it-works" className="text-sm text-white/80 hover:text-white transition-colors cursor-pointer">
                How It Works
              </Link>
              <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-white transition-colors cursor-pointer">
                Powered by Readdy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
