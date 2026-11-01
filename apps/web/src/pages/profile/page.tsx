import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteFooter from '../../components/feature/SiteFooter';
import Navbar from '../../components/feature/Navbar';
import NotesSettingsCard from '../../components/feature/NotesSettingsCard';
import { useAuth, type AuthUser } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { formatPrice } from '@openear/shared/pricing';
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
    title: 'Profile | Open Ear',
    description: 'Your Open Ear account: details, calls, credits, Listener notes and privacy settings.',
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
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

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
      await updatePassword(currentPassword, newPassword);
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
    if (deleteConfirmText !== 'DELETE' || !deletePassword) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiFetch('/api/user/account', {
        method: 'DELETE',
        // Accounts made with Google have no password: they confirm with their email instead.
        body: JSON.stringify(user?.has_password === false ? { confirm: deletePassword } : { password: deletePassword }),
      });
      setShowDeleteModal(false);
      signOut();
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError('');
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
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
      case 'active':
        return 'bg-oe-primary-tint text-oe-primary-deep';
      case 'failed':
        return 'bg-oe-crisis-tint text-oe-crisis';
      default:
        return 'bg-oe-surface text-oe-muted';
    }
  };

  // Amounts are stored in cents of a shilling.
  const formatCurrency = (amount: number) => formatPrice(amount / 100);

  // Usage and booking holds are stored as negative credits.
  const isDebit = (t: CreditTransaction) => t.credits < 0 || t.type === 'usage';
  const signedCredits = (t: CreditTransaction) => `${isDebit(t) ? '−' : '+'}${Math.abs(t.credits)}`;

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
      case 'refund':
        return 'bg-oe-primary-soft text-oe-primary-deep';
      case 'bonus':
        return 'bg-oe-accent-tint text-oe-accent';
      default:
        return 'bg-oe-surface text-oe-muted';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'refunded':
        return 'bg-oe-primary-tint text-oe-primary-deep';
      case 'pending':
        return 'bg-oe-accent-tint text-oe-accent';
      case 'failed':
        return 'bg-oe-crisis-tint text-oe-crisis';
      default:
        return 'bg-oe-surface text-oe-muted';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
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
          body { font-family: 'Nunito Sans', 'Segoe UI', sans-serif; color: #2A2A2A; padding: 40px; }
          .invoice-container { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #4a7c59; }
          .logo { font-size: 28px; font-weight: bold; color: #4a7c59; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 32px; color: #2A2A2A; margin-bottom: 5px; }
          .invoice-number { color: #6B6B6B; font-size: 14px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .info-block h3 { font-size: 12px; text-transform: uppercase; color: #6B6B6B; margin-bottom: 8px; letter-spacing: 1px; }
          .info-block p { font-size: 14px; line-height: 1.6; }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .details-table th { background: #faf6f0; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6B6B6B; letter-spacing: 1px; border-bottom: 2px solid #E5E7EB; }
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
          .credits-highlight { background: #eef3ec; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .credits-highlight h4 { color: #4a7c59; font-size: 14px; margin-bottom: 5px; }
          .credits-highlight .credits-value { font-size: 32px; font-weight: bold; color: #3a6347; }
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
            <h4>Credits ${isDebit(transaction) ? 'Used' : 'Added'}</h4>
            <div class="credits-value">${signedCredits(transaction)} Credits</div>
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
                <td>${signedCredits(transaction)}</td>
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
              <span>${formatPrice(0)}</span>
            </div>
            <div class="totals-row total">
              <span>Total</span>
              <span>${formatCurrency(transaction.amount)}</span>
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <p><strong>Open Ear</strong>: a place to talk and be heard</p>
            <p>Thank you.</p>
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

  const card = 'rounded-3xl border border-oe-line bg-white p-6 md:p-8';
  const inputClass =
    'w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 text-sm text-oe-ink focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30';
  const tabs = [
    { id: 'profile', label: 'Account', icon: 'ri-user-line' },
    { id: 'history', label: 'Calls', icon: 'ri-history-line' },
    { id: 'purchases', label: 'Credits', icon: 'ri-wallet-line' },
    { id: 'security', label: 'Privacy & security', icon: 'ri-shield-keyhole-line' },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oe-bg" aria-busy="true">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-oe-primary border-t-transparent" />
          <span className="text-oe-muted">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      {/* Success toast */}
      {showSuccessToast && (
        <div
          role="status"
          className="fixed right-5 top-24 z-50 flex animate-fade-in items-center gap-2 rounded-2xl border border-oe-line bg-oe-primary-tint px-5 py-3 text-sm shadow-oe-md"
        >
          <i className="ri-check-line text-lg text-oe-primary" aria-hidden="true" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        {/* Header */}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-user-heart-line" aria-hidden="true" /> Your account
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Profile</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">Your details, calls, credits and privacy choices.</p>

        {/* Identity */}
        <section className={`mt-8 flex flex-col gap-5 sm:flex-row sm:items-center ${card}`} aria-label="Account summary">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft font-heading text-2xl font-bold text-oe-primary-deep"
          >
            {profile?.email?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{profile?.email}</p>
            <p className="text-sm text-oe-muted">Member since {formatDate(profile?.created_at || '')}</p>
          </div>
          <div className="rounded-2xl bg-oe-surface-low px-5 py-3 sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-oe-muted">Credits</p>
            <p className="font-heading text-2xl font-bold">{profile?.credits}</p>
          </div>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Profile sections" className="mt-8 flex gap-1 overflow-x-auto rounded-full border border-oe-line bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-oe-primary text-white' : 'text-oe-muted hover:bg-oe-surface hover:text-oe-ink'
              }`}
            >
              <i className={tab.icon} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Account tab */}
        {activeTab === 'profile' && (
          <div className="mt-6 space-y-6">
            <section className={card} aria-labelledby="details-heading">
              <h2 id="details-heading" className="text-xl font-semibold">
                Your details
              </h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="profile-email" className="mb-2 block text-sm font-medium">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="profile-email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-oe-line bg-oe-surface px-4 py-3 text-sm text-oe-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white px-2.5 py-0.5 text-xs text-oe-muted">
                      Verified
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-oe-muted">Your email can&rsquo;t be changed.</p>
                </div>

                <div>
                  <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium">
                    Phone number <span className="font-normal text-oe-muted">(optional)</span>
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-oe-muted">
                    Kept with your account. We never ring you: calls happen in your browser.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="mt-6 cursor-pointer whitespace-nowrap rounded-full bg-oe-primary px-6 py-3 text-sm font-semibold text-white hover:bg-oe-primary-hover disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </section>

            <section className="grid gap-3 sm:grid-cols-2" aria-label="Quick links">
              <Link
                to="/pricing"
                className="flex items-center gap-3 rounded-3xl border border-oe-line bg-oe-surface p-5 transition-colors hover:border-oe-primary/40"
              >
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
                  <i className="ri-add-circle-line" />
                </span>
                <span>
                  <span className="block font-semibold">Credits &amp; Monthly Pass</span>
                  <span className="block text-sm text-oe-muted">Top up with M-Pesa</span>
                </span>
              </Link>
              <Link
                to="/call"
                className="flex items-center gap-3 rounded-3xl border border-oe-line bg-oe-surface p-5 transition-colors hover:border-oe-primary/40"
              >
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                  <i className="ri-voiceprint-line" />
                </span>
                <span>
                  <span className="block font-semibold">Talk now</span>
                  <span className="block text-sm text-oe-muted">A Listener is ready to hear you</span>
                </span>
              </Link>
            </section>
          </div>
        )}

        {/* Calls tab */}
        {activeTab === 'history' && (
          <section className={`mt-6 ${card}`} aria-labelledby="calls-heading">
            <h2 id="calls-heading" className="text-xl font-semibold">
              Your calls
            </h2>
            <p className="mt-1 text-sm text-oe-muted">When and how long. Calls are never recorded.</p>
            {callHistory.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-oe-surface-low p-8 text-center">
                <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                  <i className="ri-phone-line" />
                </span>
                <p className="mt-4 font-semibold">No calls yet</p>
                <p className="mt-1 text-sm text-oe-muted">When you&rsquo;re ready, a Listener is a tap away.</p>
                <Link
                  to="/call"
                  className="oe-btn mt-5 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-oe-primary px-6 py-3 text-sm font-semibold text-white hover:bg-oe-primary-hover"
                >
                  <i className="ri-voiceprint-line" aria-hidden="true" />
                  Talk now
                </Link>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {callHistory.map((call) => (
                  <li key={call.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-oe-surface-low p-4">
                    <div className="flex items-center gap-4">
                      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                        <i className="ri-phone-line" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{formatDate(call.started_at)}</p>
                        <p className="text-xs text-oe-muted">Length: {formatDuration(call.duration_seconds)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(call.status)}`}>{call.status}</span>
                      <span className="text-sm font-medium">−{call.credits_used} credits</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Credits tab */}
        {activeTab === 'purchases' && (
          <div className="mt-6 space-y-6">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-oe-line bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Bought</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold">
                  {transactions
                    .filter(t => t.type === 'purchase' && t.status === 'completed')
                    .reduce((sum, t) => sum + t.credits, 0)}{' '}
                  <span className="font-sans text-sm font-normal text-oe-muted">credits</span>
                </dd>
              </div>
              <div className="rounded-3xl border border-oe-line bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Free</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold">
                  {transactions
                    .filter(t => t.type === 'bonus' && t.status === 'completed')
                    .reduce((sum, t) => sum + t.credits, 0)}{' '}
                  <span className="font-sans text-sm font-normal text-oe-muted">credits</span>
                </dd>
              </div>
              <div className="rounded-3xl border border-oe-line bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Spent</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold">
                  {formatCurrency(
                    transactions
                      .filter(t => t.type === 'purchase' && t.status === 'completed')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </dd>
              </div>
            </dl>

            <section className={card} aria-labelledby="transactions-heading">
              <div className="flex items-center justify-between gap-4">
                <h2 id="transactions-heading" className="text-xl font-semibold">
                  Credit history
                </h2>
                {transactions.length > 0 && (
                  <button
                    onClick={() => user && fetchTransactions()}
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-oe-surface px-4 py-2 text-sm font-medium hover:bg-oe-primary-tint"
                  >
                    <i className="ri-refresh-line" aria-hidden="true" />
                    Refresh
                  </button>
                )}
              </div>

              {transactions.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-oe-surface-low p-8 text-center">
                  <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                    <i className="ri-wallet-line" />
                  </span>
                  <p className="mt-4 font-semibold">Nothing here yet</p>
                  <p className="mt-1 text-sm text-oe-muted">Credits you buy or use will show up here.</p>
                  <Link
                    to="/pricing"
                    className="oe-btn mt-5 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-oe-primary px-6 py-3 text-sm font-semibold text-white hover:bg-oe-primary-hover"
                  >
                    <i className="ri-add-circle-line" aria-hidden="true" />
                    Get credits
                  </Link>
                </div>
              ) : (
                <ul className="mt-6 space-y-3">
                  {transactions.map((transaction) => (
                    <li key={transaction.id}>
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="group flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl bg-oe-surface-low p-4 text-left transition-colors hover:bg-oe-primary-tint"
                      >
                        <span className="flex items-center gap-4">
                          <span aria-hidden="true" className={`flex h-10 w-10 items-center justify-center rounded-full ${getTransactionColor(transaction.type)}`}>
                            <i className={getTransactionIcon(transaction.type)} />
                          </span>
                          <span>
                            <span className="block text-sm font-medium">
                              {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`}
                            </span>
                            <span className="block text-xs text-oe-muted">{formatDate(transaction.created_at)}</span>
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadge(transaction.status)}`}>
                            {transaction.status}
                          </span>
                          <span className="text-right">
                            {transaction.amount > 0 && <span className="block text-xs text-oe-muted">{formatCurrency(transaction.amount)}</span>}
                            <span className={`block text-sm font-semibold ${isDebit(transaction) ? 'text-oe-ink' : 'text-oe-primary-deep'}`}>
                              {signedCredits(transaction)} credits
                            </span>
                          </span>
                          <i className="ri-arrow-right-s-line text-oe-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Transaction detail modal */}
            {selectedTransaction && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
                <div className="absolute inset-0 bg-oe-ink/40" onClick={() => setSelectedTransaction(null)} />
                <div className="relative w-full max-w-lg rounded-3xl border border-oe-line bg-white p-6 shadow-oe-md md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-oe-muted">Transaction</p>
                      <h3 id="transaction-title" className="mt-1 text-xl font-semibold">
                        {generateInvoiceNumber(selectedTransaction)}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      aria-label="Close"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-oe-surface hover:bg-oe-primary-tint"
                    >
                      <i className="ri-close-line" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusBadge(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </span>
                    <span className="text-sm text-oe-muted">{formatDateTime(selectedTransaction.created_at)}</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-oe-surface-low p-5">
                    <div>
                      <p className="text-sm text-oe-muted">Credits {isDebit(selectedTransaction) ? 'used' : 'added'}</p>
                      <p className="font-heading text-3xl font-bold">{signedCredits(selectedTransaction)}</p>
                    </div>
                    <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${getTransactionColor(selectedTransaction.type)}`}>
                      <i className={getTransactionIcon(selectedTransaction.type)} />
                    </span>
                  </div>

                  <dl className="mt-5 divide-y divide-oe-line text-sm">
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-oe-muted">Type</dt>
                      <dd className="font-medium capitalize">{selectedTransaction.type}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-oe-muted">Description</dt>
                      <dd className="max-w-[220px] text-right font-medium">
                        {selectedTransaction.description || `${selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)} transaction`}
                      </dd>
                    </div>
                    {selectedTransaction.amount > 0 && (
                      <div className="flex items-center justify-between py-3">
                        <dt className="text-oe-muted">Amount paid</dt>
                        <dd className="font-semibold">{formatCurrency(selectedTransaction.amount)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-oe-muted">Transaction ID</dt>
                      <dd className="rounded-lg bg-oe-surface px-2 py-1 font-mono text-xs text-oe-muted">{selectedTransaction.id.slice(0, 16)}…</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      className="flex-1 cursor-pointer whitespace-nowrap rounded-full bg-oe-surface px-6 py-3 text-sm font-medium hover:bg-oe-primary-tint"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => downloadInvoice(selectedTransaction)}
                      disabled={isDownloading}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-oe-primary px-6 py-3 text-sm font-semibold text-white hover:bg-oe-primary-hover disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                          Preparing…
                        </>
                      ) : (
                        <>
                          <i className="ri-download-line" aria-hidden="true" />
                          Download invoice
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy & security tab */}
        {activeTab === 'security' && (
          <div className="mt-6 space-y-6">
            <section className={card} aria-labelledby="password-heading">
              <h2 id="password-heading" className="text-xl font-semibold">
                Password
              </h2>
              {user?.has_password === false ? (
                <p className="mt-2 text-sm text-oe-muted">
                  You sign in with Google, so there&rsquo;s no Open Ear password to change.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="current-password" className="mb-2 block text-sm font-medium">
                      Current password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
                      New password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
                      Confirm new password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Type it again"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                  {passwordError && (
                    <p role="alert" className="flex items-center gap-2 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
                      <i className="ri-error-warning-line" aria-hidden="true" />
                      {passwordError}
                    </p>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                    className="cursor-pointer whitespace-nowrap rounded-full bg-oe-primary px-6 py-3 text-sm font-semibold text-white hover:bg-oe-primary-hover disabled:opacity-50"
                  >
                    {isSaving ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              )}
            </section>

            {/* Shared card brings its own top border and padding; drop them inside a Terra card. */}
            <section className={`${card} [&>div]:border-t-0 [&>div]:pt-0`}>
              <NotesSettingsCard />
            </section>

            <section className={card} aria-labelledby="session-heading">
              <h2 id="session-heading" className="text-xl font-semibold">
                Sign out
              </h2>
              <p className="mt-1 text-sm text-oe-muted">Sign out of Open Ear on this device.</p>
              <button
                onClick={handleSignOut}
                className="mt-5 flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-oe-surface px-6 py-3 text-sm font-medium hover:bg-oe-primary-tint"
              >
                <i className="ri-logout-box-line" aria-hidden="true" />
                Sign out
              </button>
            </section>

            <section className="rounded-3xl border border-oe-crisis/30 bg-white p-6 md:p-8" aria-labelledby="delete-heading">
              <h2 id="delete-heading" className="text-xl font-semibold text-oe-crisis">
                Delete account
              </h2>
              <p className="mt-1 text-sm text-oe-muted">This removes your account for good. It can&rsquo;t be undone.</p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-5 flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-oe-crisis-tint px-6 py-3 text-sm font-semibold text-oe-crisis hover:bg-oe-crisis/15"
              >
                <i className="ri-delete-bin-line" aria-hidden="true" />
                Delete account
              </button>
            </section>
          </div>
        )}
      </main>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="absolute inset-0 bg-oe-ink/40" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md rounded-3xl border border-oe-line bg-white p-6 shadow-oe-md md:p-8">
            <div className="text-center">
              <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-crisis-tint text-xl text-oe-crisis">
                <i className="ri-error-warning-line" />
              </span>
              <h3 id="delete-title" className="mt-4 text-xl font-semibold">
                Delete your account?
              </h3>
              <p className="mt-2 text-sm text-oe-muted">
                This can&rsquo;t be undone. Your account, credits and call history will be deleted.
              </p>
            </div>
            <div className="mt-6">
              <label htmlFor="delete-confirm" className="mb-2 block text-sm font-medium">
                Type <span className="font-bold text-oe-crisis">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 text-sm focus:border-oe-crisis focus:outline-none focus:ring-2 focus:ring-oe-crisis/30"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="delete-password" className="mb-2 block text-sm font-medium">
                {user?.has_password === false ? 'Enter your email address' : 'Enter your password'}
              </label>
              <input
                id="delete-password"
                type={user?.has_password === false ? 'email' : 'password'}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={user?.has_password === false ? user.email : 'Your password'}
                autoComplete={user?.has_password === false ? 'off' : 'current-password'}
                className="w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 text-sm focus:border-oe-crisis focus:outline-none focus:ring-2 focus:ring-oe-crisis/30"
              />
              {deleteError && (
                <p role="alert" className="mt-3 flex items-center gap-2 rounded-2xl bg-oe-crisis-tint px-4 py-2 text-sm text-oe-crisis">
                  <i className="ri-error-warning-line" aria-hidden="true" />
                  {deleteError}
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 cursor-pointer whitespace-nowrap rounded-full bg-oe-surface px-6 py-3 text-sm font-medium hover:bg-oe-primary-tint"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || !deletePassword || isDeleting}
                className="flex-1 cursor-pointer whitespace-nowrap rounded-full bg-oe-crisis px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
