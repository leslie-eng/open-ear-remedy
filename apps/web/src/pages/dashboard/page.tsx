import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MyBookingsCard from '../../components/feature/MyBookingsCard';
import Navbar from '../../components/feature/Navbar';
import MpesaPaymentModal from '../../components/feature/MpesaPaymentModal';
import { useSEO } from '../../utils/seo';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import Skeleton from '../../components/ui/Skeleton';
import { CREDIT_PACKS, callMinutesFor, formatPrice, type CreditPackId } from '@openear/shared/pricing';
import type { Balance } from '../../hooks/useBalance';

interface MinutePackage {
  id: number;
  packId: CreditPackId;
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
  { name: 'Great', score: 5, emoji: '😄', color: 'bg-forest-500', lightColor: 'bg-forest-50', textColor: 'text-forest-600', borderColor: 'border-forest-300' },
  { name: 'Good', score: 4, emoji: '🙂', color: 'bg-forest-500', lightColor: 'bg-forest-50', textColor: 'text-forest-600', borderColor: 'border-forest-300' },
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
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-oe-primary/5 to-transparent rounded-bl-full pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-oe-accent-tint rounded-2xl flex items-center justify-center">
            <span className="text-xl">🌤️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-oe-ink">Quick Mood Check-in</h2>
            <p className="text-xs text-oe-muted">How are you feeling right now?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastMood && !saved && (
            <span className="text-xs text-oe-faint flex items-center gap-1.5">
              <span>Last: {lastMood.emoji}</span>
              <span className="text-oe-line">·</span>
              <span>{getTimeLabel(lastMood.created_at)}</span>
            </span>
          )}
          <Link
            to="/mood-tracker"
            className="text-xs font-medium text-oe-primary hover:text-oe-primary-hover transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            View Full Tracker
            <i className="ri-arrow-right-s-line text-sm"></i>
          </Link>
        </div>
      </div>

      {/* Mood Buttons */}
      {saved ? (
        <div className="flex items-center justify-center gap-3 py-4 animate-fade-in">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedMood?.color || 'bg-forest-500'}`}>
            <i className="ri-check-line text-white text-lg"></i>
          </div>
          <div>
            <p className="font-semibold text-oe-ink text-sm">Feeling {selectedMood?.name} {selectedMood?.emoji}</p>
            <p className="text-xs text-oe-muted">Mood logged successfully!</p>
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
                  : `border-transparent bg-oe-surface-low hover:${mood.lightColor} hover:border-${mood.borderColor}`
              }`}
            >
              <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">{mood.emoji}</span>
              <span className={`text-xs font-medium ${selectedMood?.name === mood.name ? mood.textColor : 'text-oe-muted group-hover:' + mood.textColor}`}>
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
  const [pass, setPass] = useState<Balance['pass']>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutesUsed, setTotalMinutesUsed] = useState(0);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // The pack being paid for with M-Pesa (the payment window is open while set).
  const [payingPkg, setPayingPkg] = useState<MinutePackage | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<MinutePackage | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchParams] = useSearchParams();

  const minutePackages: MinutePackage[] = CREDIT_PACKS.map((pack, i) => {
    const minutes = callMinutesFor(pack.credits);
    return {
      id: i + 1,
      packId: pack.id,
      minutes,
      price: pack.price,
      perMinute: pack.price / minutes,
      credits: pack.credits,
      popular: pack.id === 'standard',
    };
  });

  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setUser(authUser);
      if (authUser) {
        await Promise.all([fetchCredits(), fetchCallHistory()]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

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

  const fetchCredits = async () => {
    try {
      const data = await apiFetch<Balance>('/api/user/credits');
      setCredits(data.credits ?? 0);
      setPass(data.pass);
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

  const handleBuyMinutes = async (pkg: MinutePackage) => {
    if (!authUser) {
      setSelectedPkg(pkg);
      setShowAuthModal(true);
      return;
    }
    setPayingPkg(pkg);
  };

  const startPayment = async (phone: string) => {
    if (!payingPkg) throw new Error('Choose a pack first.');
    const { paymentId } = await apiFetch<{ paymentId: string }>('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ offerId: payingPkg.packId, phone }),
    });
    return paymentId;
  };

  const displayMinutes = credits !== null ? callMinutesFor(credits) : 0;

  return (
    <div className="min-h-screen bg-oe-bg">
      <Navbar transparent={false} />

      {payingPkg && (
        <MpesaPaymentModal
          title={`${payingPkg.credits} credits`}
          amountLabel={formatPrice(payingPkg.price)}
          start={startPayment}
          onPaid={() => {
            setNotification({ type: 'success', message: `${payingPkg.credits} credits added.` });
            void fetchCredits();
          }}
          onClose={() => setPayingPkg(null)}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-forest-500 text-white' :
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
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-oe-ink mb-3">
            Dashboard
          </h1>
          <p className="text-base md:text-lg text-oe-muted">
            Manage your minutes and view your support history
          </p>
        </div>

        {/* Quick Action - Make a Call */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/call')}
            className="w-full md:w-auto px-8 py-4 bg-oe-primary text-white rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer group"
          >
            <i className="ri-phone-fill text-xl group-hover:animate-pulse"></i>
            Make a Test Call
            <i className="ri-arrow-right-line text-xl group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>

        {!loading && user && (
          <div className="mb-8">
            <MyBookingsCard />
          </div>
        )}

        {/* Quick Mood Check-in */}
        {!loading && user && <MoodCheckIn user={user} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-oe-primary/10 rounded-2xl flex items-center justify-center">
                <i className="ri-timer-fill text-2xl md:text-3xl text-oe-primary"></i>
              </div>
              <span className="text-xs md:text-sm font-medium text-oe-primary bg-oe-primary/10 px-3 py-1 rounded-full">
                Available
              </span>
            </div>
            {loading ? (
              <div aria-busy="true" aria-label="Loading">
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-oe-ink mb-2">{displayMinutes}</p>
                <p className="text-sm md:text-base text-oe-muted">Minutes Remaining</p>
                <p className="text-xs text-oe-faint mt-1">({credits} credits)</p>
                {pass && (
                  <p className="text-sm text-oe-ink mt-3">
                    Monthly Pass: {Math.floor(pass.callSecondsLeft / 60)} call min and {pass.aiMessagesLeftToday} AI
                    messages left today, until {new Date(pass.expiresAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-oe-primary/10 rounded-2xl flex items-center justify-center">
                <i className="ri-phone-fill text-2xl md:text-3xl text-oe-primary"></i>
              </div>
              <span className="text-xs md:text-sm font-medium text-oe-primary bg-oe-primary/10 px-3 py-1 rounded-full">
                Calls
              </span>
            </div>
            {loading ? (
              <div aria-busy="true" aria-label="Loading">
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-oe-ink mb-2">{totalSessions}</p>
                <p className="text-sm md:text-base text-oe-muted">Total Sessions</p>
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-oe-primary/10 rounded-2xl flex items-center justify-center">
                <i className="ri-time-fill text-2xl md:text-3xl text-oe-primary"></i>
              </div>
              <span className="text-xs md:text-sm font-medium text-oe-primary bg-oe-primary/10 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            {loading ? (
              <div aria-busy="true" aria-label="Loading">
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-oe-ink mb-2">{totalMinutesUsed}</p>
                <p className="text-sm md:text-base text-oe-muted">Minutes Used</p>
              </>
            )}
          </div>
        </div>

        {/* Minute Packages */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-oe-ink">Buy Minutes</h2>
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-oe-primary/10 rounded-full">
              <i className="ri-secure-payment-fill text-oe-primary text-sm"></i>
              <span className="text-xs md:text-sm font-medium text-oe-primary">Secure Payment</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {minutePackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-6 md:p-8 border-2 transition-all cursor-pointer ${
                  pkg.popular
                    ? 'border-oe-primary bg-oe-primary-tint'
                    : 'border-oe-line hover:border-oe-primary bg-white'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-oe-primary text-white text-xs font-semibold rounded-full">
                    Best Value
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <p className="text-4xl md:text-5xl font-bold text-oe-ink mb-2">{pkg.minutes}</p>
                  <p className="text-sm md:text-base text-oe-muted mb-4">Minutes</p>
                  <p className="text-2xl md:text-3xl font-bold text-oe-primary">{formatPrice(pkg.price)}</p>
                  <p className="text-xs text-oe-muted mt-1">{formatPrice(pkg.perMinute)}/min</p>
                </div>

                <button
                  onClick={() => handleBuyMinutes(pkg)}
                  disabled={payingPkg !== null}
                  className={`w-full px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
                    pkg.popular
                      ? 'bg-oe-primary text-white hover:bg-oe-primary-hover'
                      : 'bg-oe-surface text-oe-ink hover:bg-oe-primary hover:text-white'
                  }`}
                >
                  Purchase
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-6 md:mb-8">Recent Activity</h2>
          
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading recent activity">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 md:p-6 bg-oe-surface-low rounded-2xl">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 md:w-12 md:h-12 !rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Skeleton className="h-4 w-12 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : callHistory.length > 0 ? (
            <div className="space-y-4">
              {callHistory.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 md:p-6 bg-oe-surface-low rounded-2xl hover:bg-oe-primary-tint transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-oe-primary/10">
                      <i className="ri-phone-fill text-lg md:text-xl text-oe-primary"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-oe-ink text-sm md:text-base">Voice call session</p>
                      <p className="text-xs md:text-sm text-oe-muted">{formatTimeAgo(call.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-oe-primary text-sm md:text-base">
                      -{Math.ceil((call.duration_seconds || 0) / 60)}
                    </p>
                    <p className="text-xs text-oe-muted">minutes</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-phone-line text-3xl text-oe-primary"></i>
              </div>
              <p className="text-oe-muted mb-2">No calls yet</p>
              <p className="text-sm text-oe-faint">Start your first call to see your activity here</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
          <Link to="/call">
            <button className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-oe-primary text-white rounded-2xl font-semibold hover:bg-oe-primary-hover transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer">
              <i className="ri-phone-fill text-lg"></i>
              Start a Call
            </button>
          </Link>
          <Link to="/chat">
            <button className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-oe-primary text-white rounded-2xl font-semibold hover:bg-oe-primary-hover transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer">
              <i className="ri-message-3-fill text-lg"></i>
              Start Chat
            </button>
          </Link>
          <Link to="/pricing">
            <button className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-white text-oe-primary border-2 border-oe-primary rounded-2xl font-semibold hover:bg-oe-primary hover:text-white transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer">
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
              <div className="w-12 h-12 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-line text-xl text-oe-primary"></i>
              </div>
              <h3 className="text-lg font-bold text-oe-ink mb-1">Sign In to Continue</h3>
              <p className="text-oe-muted text-xs">
                Sign in to purchase {selectedPkg?.minutes} minutes for {selectedPkg ? formatPrice(selectedPkg.price) : ''}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin', { state: { returnTo: '/dashboard' } });
                }}
                className="w-full py-2.5 bg-oe-primary text-white rounded-lg text-sm font-semibold hover:bg-oe-primary-hover transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin?signup=true');
                }}
                className="w-full py-2.5 bg-oe-surface text-oe-ink rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Create Account
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2.5 text-oe-muted text-sm hover:text-oe-ink transition-colors cursor-pointer whitespace-nowrap"
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
