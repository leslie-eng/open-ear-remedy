import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useSEO } from '../../utils/seo';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

interface MinutePackage {
  id: number;
  minutes: number;
  price: number;
  perMinute: number;
  credits: number;
  popular?: boolean;
}

interface CallHistoryItem {
  id: string;
  duration_seconds: number;
  credits_used: number;
  status: string;
  started_at: string;
  ended_at: string;
  created_at: string;
}

const moodOptions = [
  { name: 'Great', score: 5, emoji: '😄', color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-300' },
  { name: 'Good', score: 4, emoji: '🙂', color: 'bg-teal-500', lightColor: 'bg-teal-50', textColor: 'text-teal-600', borderColor: 'border-teal-300' },
  { name: 'Okay', score: 3, emoji: '😐', color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-300' },
  { name: 'Low', score: 2, emoji: '😔', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-300' },
  { name: 'Struggling', score: 1, emoji: '😢', color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-600', borderColor: 'border-rose-300' },
];

function MoodCheckIn({ user }: { user: any }) {
  const [selectedMood, setSelectedMood] = useState<typeof moodOptions[0] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastMood, setLastMood] = useState<{ mood: string; emoji: string; created_at: string } | null>(null);

  useEffect(() => {
    if (user) fetchLastMood();
  }, [user]);

  const fetchLastMood = async () => {
    const { data } = await apiFetch<{ data: Array<{ mood: string; mood_score: number; created_at: string }> }>(
      '/api/user/mood-logs?limit=1',
    );
    const latest = data[0];

    if (latest) {
      const found = moodOptions.find(m => m.score === latest.mood_score);
      setLastMood({ mood: latest.mood, emoji: found?.emoji || '😐', created_at: latest.created_at });
    }
  };

  const handleQuickLog = async (mood: typeof moodOptions[0]) => {
    if (!user || isSaving) return;
    setSelectedMood(mood);
    setIsSaving(true);

    try {
      await apiFetch('/api/user/mood-logs', {
        method: 'POST',
        body: JSON.stringify({ mood: mood.name, mood_score: mood.score, note: null }),
      });
      setSaved(true);
      setLastMood({ mood: mood.name, emoji: mood.emoji, created_at: new Date().toISOString() });
      setTimeout(() => {
        setSaved(false);
        setSelectedMood(null);
      }, 2500);
    } catch {
      /* ignore */
    }
    setIsSaving(false);
  };

  const getTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg mb-8 md:mb-12 overflow-hidden relative">
      {/* Subtle decorative gradient */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#0096FF]/5 to-transparent rounded-bl-full pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-100 to-rose-100 rounded-2xl flex items-center justify-center">
            <span className="text-xl">🌤️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2A2A2A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Quick Mood Check-in</h2>
            <p className="text-xs text-[#6B6B6B]">How are you feeling right now?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastMood && !saved && (
            <span className="text-xs text-[#9CA3AF] flex items-center gap-1.5">
              <span>Last: {lastMood.emoji}</span>
              <span className="text-[#D1D5DB]">·</span>
              <span>{getTimeLabel(lastMood.created_at)}</span>
            </span>
          )}
          <Link
            to="/mood-tracker"
            className="text-xs font-medium text-[#0096FF] hover:text-[#0077CC] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            View Full Tracker
            <i className="ri-arrow-right-s-line text-sm"></i>
          </Link>
        </div>
      </div>

      {/* Mood Buttons */}
      {saved ? (
        <div className="flex items-center justify-center gap-3 py-4 animate-fade-in">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedMood?.color || 'bg-emerald-500'}`}>
            <i className="ri-check-line text-white text-lg"></i>
          </div>
          <div>
            <p className="font-semibold text-[#2A2A2A] text-sm">Feeling {selectedMood?.name} {selectedMood?.emoji}</p>
            <p className="text-xs text-[#6B6B6B]">Mood logged successfully!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {moodOptions.map((mood) => (
            <button
              key={mood.name}
              onClick={() => handleQuickLog(mood)}
              disabled={isSaving}
              className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer disabled:opacity-60 ${
                selectedMood?.name === mood.name
                  ? `${mood.lightColor} ${mood.borderColor} scale-95`
                  : `border-transparent bg-[#FAFAFA] hover:${mood.lightColor} hover:border-${mood.borderColor}`
              }`}
            >
              <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">{mood.emoji}</span>
              <span className={`text-xs font-medium ${selectedMood?.name === mood.name ? mood.textColor : 'text-[#6B6B6B] group-hover:' + mood.textColor}`}>
                {mood.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  // SEO Configuration - noindex for private pages
  useSEO({
    title: 'Dashboard - Open Ear',
    description: 'Manage your minutes and view your support history.',
    keywords: 'dashboard, account management, minutes',
    canonical: '/dashboard',
  });

  const [credits, setCredits] = useState<number | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutesUsed, setTotalMinutesUsed] = useState(0);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPkg, setLoadingPkg] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<MinutePackage | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchParams] = useSearchParams();

  const minutePackages: MinutePackage[] = [
    { id: 1, minutes: 5, price: 29, perMinute: 5.80, credits: 100 },
    { id: 2, minutes: 15, price: 79, perMinute: 5.27, credits: 300, popular: true },
    { id: 3, minutes: 50, price: 199, perMinute: 3.98, credits: 1000 },
  ];

  const navigate = useNavigate();
  const { user: authUser, signOut: authSignOut } = useAuth();

  useEffect(() => {
    void checkUserAndFetchData();
  }, [authUser?.id]);

  // Check for purchase status from URL params
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus === 'cancelled') {
      setNotification({ type: 'info', message: 'Purchase was cancelled. You can try again anytime.' });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const checkUserAndFetchData = async () => {
    setLoading(true);
    setUser(authUser);
    if (authUser) {
      await Promise.all([fetchCredits(), fetchCallHistory()]);
    }
    setLoading(false);
  };

  const fetchCredits = async () => {
    try {
      const data = await apiFetch<{ credits: number }>('/api/user/credits');
      setCredits(data.credits ?? 0);
    } catch {
      setCredits(0);
    }
  };

  const fetchCallHistory = async () => {
    try {
      const { data } = await apiFetch<{ data: CallHistoryItem[] }>('/api/user/call-history?limit=10');
      setCallHistory(data || []);
      setTotalSessions(data?.length || 0);
      const totalSeconds = data?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0;
      setTotalMinutesUsed(Math.ceil(totalSeconds / 60));
    } catch (e) {
      console.error('Error fetching call history:', e);
    }
  };

  // Convert credits to minutes (20 credits = 1 minute)
  const creditsToMinutes = (credits: number) => {
    return Math.floor(credits / 20);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const handleSignOut = () => {
    authSignOut();
    setUser(null);
    setCredits(0);
    navigate('/');
  };

  const handleBuyMinutes = async (pkg: MinutePackage) => {
    if (!authUser) {
      setSelectedPkg(pkg);
      setShowAuthModal(true);
      return;
    }
    await initiatePaystackCheckout(pkg, authUser.id, authUser.email || undefined);
  };

  const initiatePaystackCheckout = async (pkg: MinutePackage, userId: string, userEmail?: string) => {
    setLoadingPkg(pkg.id);

    try {
      const data = await apiFetch<{ url?: string; authorization_url?: string }>(
        '/api/payments/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            userId,
            userEmail,
            packageName: `${pkg.minutes} Minutes - ${pkg.credits} Credits`,
            credits: pkg.credits,
            price: pkg.price,
            successUrl: `${window.location.origin}/profile?purchase=success`,
            cancelUrl: `${window.location.origin}/dashboard?purchase=cancelled`,
          }),
        },
      );

      const payUrl = data.url ?? data.authorization_url;
      if (payUrl) {
        window.location.href = payUrl;
      } else {
        throw new Error('No payment authorization URL returned from Paystack.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setNotification({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to start Paystack checkout. Please try again.',
      });
    } finally {
      setLoadingPkg(null);
    }
  };

  const displayMinutes = credits !== null ? creditsToMinutes(credits) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar transparent={false} />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-gray-700 text-white'
          }`}>
            <i className={`text-lg ${
              notification.type === 'success' ? 'ri-check-circle-fill' :
              notification.type === 'error' ? 'ri-error-warning-fill' :
              'ri-information-fill'
            }`}></i>
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-80 cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-8 md:py-12 pt-32">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2A2A2A] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-base md:text-lg text-[#6B6B6B]">
            Manage your minutes and view your support history
          </p>
        </div>

        {/* Quick Action - Make a Call */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/call')}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#0096FF] to-[#0077CC] text-white rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer group"
          >
            <i className="ri-phone-fill text-xl group-hover:animate-pulse"></i>
            Make a Test Call
            <i className="ri-arrow-right-line text-xl group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>

        {/* Quick Mood Check-in */}
        {!loading && user && <MoodCheckIn user={user} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                <i className="ri-timer-fill text-2xl md:text-3xl text-[#0096FF]"></i>
              </div>
              <span className="text-xs md:text-sm font-medium text-[#0096FF] bg-[#0096FF]/10 px-3 py-1 rounded-full">
                Available
              </span>
            </div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">{displayMinutes}</p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Minutes Remaining</p>
                <p className="text-xs text-[#9CA3AF] mt-1">({credits} credits)</p>
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                <i className="ri-phone-fill text-2xl md:text-3xl text-[#0096FF]"></i>
              </div>
              <span className="text-xs md:text-sm font-medium text-[#0096FF] bg-[#0096FF]/10 px-3 py-1 rounded-full">
                Calls
              </span>
            </div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">{totalSessions}</p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Total Sessions</p>
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/10 rounded-2xl flex items-center justify-center">
                <i className="ri-time-fill text-2xl md:text-3xl text-[#0096FF]"></i>
              </div>
              <span className="text-xs md:text-sm font-medium text-[#0096FF] bg-[#0096FF]/10 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">{totalMinutesUsed}</p>
                <p className="text-sm md:text-base text-[#6B6B6B]">Minutes Used</p>
              </>
            )}
          </div>
        </div>

        {/* Minute Packages */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Buy Minutes</h2>
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0096FF]/10 rounded-full">
              <i className="ri-secure-payment-fill text-[#0096FF] text-sm"></i>
              <span className="text-xs md:text-sm font-medium text-[#0096FF]">Secure Payment</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {minutePackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-6 md:p-8 border-2 transition-all cursor-pointer ${
                  pkg.popular
                    ? 'border-[#0096FF] bg-[#E6F5FF]'
                    : 'border-[#E5E5E5] hover:border-[#0096FF] bg-white'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0096FF] text-white text-xs font-semibold rounded-full">
                    Best Value
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <p className="text-4xl md:text-5xl font-bold text-[#2A2A2A] mb-2">{pkg.minutes}</p>
                  <p className="text-sm md:text-base text-[#6B6B6B] mb-4">Minutes</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#0096FF]">${pkg.price}</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">${pkg.perMinute.toFixed(2)}/min</p>
                </div>

                <button
                  onClick={() => handleBuyMinutes(pkg)}
                  disabled={loadingPkg !== null}
                  className={`w-full px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
                    pkg.popular
                      ? 'bg-[#0096FF] text-white hover:bg-[#0077CC]'
                      : 'bg-[#F5F5F5] text-[#2A2A2A] hover:bg-[#0096FF] hover:text-white'
                  }`}
                >
                  {loadingPkg === pkg.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin"></i>
                      Processing...
                    </span>
                  ) : (
                    'Purchase'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6 md:mb-8">Recent Activity</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 md:p-6 bg-[#FAFAFA] rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-200"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : callHistory.length > 0 ? (
            <div className="space-y-4">
              {callHistory.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 md:p-6 bg-[#FAFAFA] rounded-2xl hover:bg-[#E6F5FF] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-[#0096FF]/10">
                      <i className="ri-phone-fill text-lg md:text-xl text-[#0096FF]"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-[#2A2A2A] text-sm md:text-base">Voice call session</p>
                      <p className="text-xs md:text-sm text-[#6B6B6B]">{formatTimeAgo(call.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#0096FF] text-sm md:text-base">
                      -{Math.ceil((call.duration_seconds || 0) / 60)}
                    </p>
                    <p className="text-xs text-[#6B6B6B]">minutes</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-phone-line text-3xl text-[#0096FF]"></i>
              </div>
              <p className="text-[#6B6B6B] mb-2">No calls yet</p>
              <p className="text-sm text-[#9CA3AF]">Start your first call to see your activity here</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
          <Link to="/call">
            <button className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-[#0096FF] text-white rounded-2xl font-semibold hover:bg-[#0077CC] transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer">
              <i className="ri-phone-fill text-lg"></i>
              Start a Call
            </button>
          </Link>
          <Link to="/chat">
            <button className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-[#0096FF] text-white rounded-2xl font-semibold hover:bg-[#0077CC] transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer">
              <i className="ri-message-3-fill text-lg"></i>
              Start Chat
            </button>
          </Link>
          <Link to="/pricing">
            <button className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-white text-[#0096FF] border-2 border-[#0096FF] rounded-2xl font-semibold hover:bg-[#0096FF] hover:text-white transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer">
              <i className="ri-price-tag-3-fill text-lg"></i>
              Buy More Minutes
            </button>
          </Link>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-line text-xl text-[#0096FF]"></i>
              </div>
              <h3 className="text-lg font-bold text-[#2A2A2A] mb-1">Sign In to Continue</h3>
              <p className="text-[#6B6B6B] text-xs">
                Sign in to purchase {selectedPkg?.minutes} minutes for ${selectedPkg?.price}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin', { state: { returnTo: '/dashboard' } });
                }}
                className="w-full py-2.5 bg-[#0096FF] text-white rounded-lg text-sm font-semibold hover:bg-[#0077CC] transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin?signup=true');
                }}
                className="w-full py-2.5 bg-[#F5F5F5] text-[#2A2A2A] rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Create Account
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2.5 text-[#6B6B6B] text-sm hover:text-[#2A2A2A] transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
