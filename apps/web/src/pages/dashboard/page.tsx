import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MyBookingsCard from '../../components/feature/MyBookingsCard';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import MpesaPaymentModal from '../../components/feature/MpesaPaymentModal';
import { useSEO } from '../../utils/seo';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import Skeleton from '../../components/ui/Skeleton';
import {
  CREDIT_PACKS,
  CREDITS_PER_CALL_MINUTE,
  MONTHLY_PASS,
  callMinutesFor,
  formatPrice,
  type CreditPackId,
} from '@openear/shared/pricing';
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
  { name: 'Great', score: 5, emoji: '😄' },
  { name: 'Good', score: 4, emoji: '🙂' },
  { name: 'Okay', score: 3, emoji: '😐' },
  { name: 'Low', score: 2, emoji: '😔' },
  { name: 'Struggling', score: 1, emoji: '😢' },
];

const NEXT_STEPS = [
  { to: '/call', icon: 'ri-voiceprint-line', title: 'Talk now', body: 'A call with a Listener, in your browser.' },
  { to: '/listener-chat', icon: 'ri-chat-3-line', title: 'Text a Listener', body: 'Type in real time. Nothing is saved.' },
  { to: '/book', icon: 'ri-calendar-line', title: 'Book a time', body: 'Pick a time that suits you.' },
  { to: '/check-in', icon: 'ri-leaf-line', title: 'Check in', body: 'A few gentle questions, just for you.' },
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
    <section aria-labelledby="mood-heading" className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
            <i className="ri-sun-cloudy-line" />
          </span>
          <div>
            <h2 id="mood-heading" className="text-xl font-semibold">
              How are you feeling?
            </h2>
            <p className="text-sm text-oe-muted">One tap logs it to your mood tracker.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {lastMood && !saved && (
            <span className="text-oe-muted">
              Last: <span aria-hidden="true">{lastMood.emoji}</span> {lastMood.mood} · {getTimeLabel(lastMood.created_at)}
            </span>
          )}
          <Link to="/mood-tracker" className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-oe-primary hover:text-oe-primary-hover">
            Mood tracker <i className="ri-arrow-right-s-line" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {saved ? (
        <div role="status" className="mt-6 flex items-center gap-3 rounded-2xl bg-oe-primary-tint px-5 py-4">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-oe-primary text-white">
            <i className="ri-check-line" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              Feeling {selectedMood?.name} <span aria-hidden="true">{selectedMood?.emoji}</span>
            </p>
            <p className="text-sm text-oe-muted">Logged. Thank you for checking in.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">
          {moodOptions.map((mood) => (
            <button
              key={mood.name}
              onClick={() => handleQuickLog(mood)}
              disabled={isSaving}
              aria-pressed={selectedMood?.name === mood.name}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-4 transition-colors disabled:opacity-60 ${
                selectedMood?.name === mood.name
                  ? 'border-oe-primary bg-oe-primary-tint'
                  : 'border-transparent bg-oe-surface-low hover:border-oe-primary/40'
              }`}
            >
              <span aria-hidden="true" className="text-3xl">
                {mood.emoji}
              </span>
              <span className="text-xs font-medium text-oe-muted">{mood.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  // SEO Configuration - noindex for private pages
  useSEO({
    title: 'Dashboard | Open Ear',
    description: 'Your credits, Monthly Pass, bookings and recent Conversations in one place.',
    keywords: 'dashboard, credits, monthly pass, bookings',
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
  const passDate = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
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

      {/* Notification toast */}
      {notification && (
        <div className="fixed left-1/2 top-20 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 animate-fade-in">
          <div
            role={notification.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-3 rounded-2xl border border-oe-line px-5 py-3 text-sm shadow-oe-md ${
              notification.type === 'success'
                ? 'bg-oe-primary-tint text-oe-ink'
                : notification.type === 'error'
                  ? 'bg-oe-crisis-tint text-oe-crisis'
                  : 'bg-white text-oe-ink'
            }`}
          >
            <i
              aria-hidden="true"
              className={`text-lg ${
                notification.type === 'success'
                  ? 'ri-check-line text-oe-primary'
                  : notification.type === 'error'
                    ? 'ri-error-warning-line'
                    : 'ri-information-line text-oe-muted'
              }`}
            />
            <span className="flex-1 font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              aria-label="Dismiss"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-oe-surface"
            >
              <i className="ri-close-line text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        {/* Header */}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-home-heart-line" aria-hidden="true" /> Your space
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Welcome back.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Talk when you&rsquo;re ready. Your credits, Monthly Pass and bookings are all here.
        </p>

        {/* Next steps */}
        <nav aria-label="What would you like to do?" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NEXT_STEPS.map((step, i) => (
            <Link
              key={step.to}
              to={step.to}
              className={`group flex items-start gap-3 rounded-3xl border p-5 transition-colors ${
                i === 0
                  ? 'border-oe-primary bg-oe-primary text-white hover:bg-oe-primary-hover'
                  : 'border-oe-line bg-white hover:border-oe-primary/40'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  i === 0 ? 'bg-white/15 text-white' : 'bg-oe-primary-soft text-oe-primary-deep'
                }`}
              >
                <i className={step.icon} />
              </span>
              <span>
                <span className="flex items-center gap-1 font-semibold">
                  {step.title}
                  <i className="ri-arrow-right-line text-sm transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span className={`mt-0.5 block text-sm ${i === 0 ? 'text-white/80' : 'text-oe-muted'}`}>{step.body}</span>
              </span>
            </Link>
          ))}
        </nav>
        <p className="mt-3 text-sm text-oe-muted">
          Prefer to talk it through with AI any time of day?{' '}
          <Link to="/chat" className="font-medium text-oe-primary underline-offset-2 hover:underline">
            Open the AI Companion
          </Link>
          .
        </p>

        {/* Balance + Monthly Pass */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="balance-heading" className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
            <h2 id="balance-heading" className="text-xl font-semibold">
              Your credits
            </h2>
            {loading ? (
              <div className="mt-5" aria-busy="true" aria-label="Loading">
                <Skeleton className="mb-2 h-12 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-bold">{credits ?? 0}</span>
                  <span className="text-oe-muted">credits</span>
                </p>
                <p className="mt-1 text-sm text-oe-muted">
                  About {displayMinutes} minutes of call or text chat time ({CREDITS_PER_CALL_MINUTE} credits a minute). Credits never expire.
                </p>
              </>
            )}
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-oe-surface-low p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Recent calls</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold">
                  {loading ? <Skeleton className="h-7 w-10" /> : totalSessions}
                </dd>
              </div>
              <div className="rounded-2xl bg-oe-surface-low p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Minutes talked</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold">
                  {loading ? <Skeleton className="h-7 w-10" /> : totalMinutesUsed}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="pass-heading" className="rounded-3xl border border-oe-line bg-oe-surface p-6 md:p-8">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
              <i className="ri-calendar-check-line" aria-hidden="true" /> Monthly Pass
            </p>
            {loading ? (
              <div className="mt-5" aria-busy="true" aria-label="Loading">
                <Skeleton className="mb-2 h-6 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
            ) : pass ? (
              <>
                <h2 id="pass-heading" className="mt-4 text-xl font-semibold">
                  Your pass is active
                </h2>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <i className="ri-time-line text-oe-primary" aria-hidden="true" />
                    {Math.floor(pass.callSecondsLeft / 60)} call minutes left
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="ri-sparkling-2-line text-oe-primary" aria-hidden="true" />
                    {pass.aiMessagesLeftToday} AI messages left today
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="ri-calendar-line text-oe-primary" aria-hidden="true" />
                    Until {passDate(pass.expiresAt)}
                  </li>
                </ul>
                <p className="mt-4 text-xs text-oe-muted">Pass time is used before your credits.</p>
              </>
            ) : (
              <>
                <h2 id="pass-heading" className="mt-4 text-xl font-semibold">
                  Talk often? Try the pass.
                </h2>
                <p className="mt-2 text-sm text-oe-muted">
                  {formatPrice(MONTHLY_PASS.price)} for {MONTHLY_PASS.days} days: {Math.floor(MONTHLY_PASS.callSeconds / 60)} call
                  minutes and {MONTHLY_PASS.aiMessagesPerDay} AI messages a day. It doesn&rsquo;t renew by itself.
                </p>
                <Link
                  to="/pricing"
                  className="mt-5 inline-flex rounded-full border border-oe-line bg-white px-5 py-2.5 text-sm font-medium text-oe-ink hover:border-oe-primary/40"
                >
                  See the Monthly Pass
                </Link>
              </>
            )}
          </section>
        </div>

        {!loading && user && (
          <div className="mt-6">
            <MyBookingsCard />
          </div>
        )}

        {/* Quick mood check-in */}
        {!loading && user && (
          <div className="mt-6">
            <MoodCheckIn user={user} />
          </div>
        )}

        {/* Credit packs */}
        <section aria-labelledby="packs-heading" className="mt-6 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="packs-heading" className="text-xl font-semibold">
                Top up credits
              </h2>
              <p className="mt-1 text-sm text-oe-muted">Pay with M-Pesa. Credits never expire.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-oe-primary-tint px-3 py-1 text-xs font-medium text-oe-primary-deep sm:self-auto">
              <i className="ri-smartphone-line" aria-hidden="true" /> M-Pesa
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {minutePackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl border-2 p-6 ${
                  pkg.popular ? 'border-oe-primary bg-oe-primary-tint' : 'border-oe-line bg-oe-surface-low'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-oe-primary px-3 py-0.5 text-xs font-semibold text-white">
                    Suggested
                  </span>
                )}
                <p className="flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-bold">{pkg.credits}</span>
                  <span className="text-sm text-oe-muted">credits</span>
                </p>
                <p className="mt-1 text-sm text-oe-muted">About {pkg.minutes} minutes</p>
                <p className="mt-4 text-2xl font-semibold text-oe-primary-deep">{formatPrice(pkg.price)}</p>
                <p className="text-xs text-oe-muted">{formatPrice(pkg.perMinute)} a minute</p>
                <button
                  onClick={() => handleBuyMinutes(pkg)}
                  disabled={payingPkg !== null}
                  className={`mt-6 w-full cursor-pointer whitespace-nowrap rounded-full px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    pkg.popular
                      ? 'oe-btn bg-oe-primary text-white hover:bg-oe-primary-hover'
                      : 'border border-oe-line bg-white text-oe-ink hover:border-oe-primary/40'
                  }`}
                >
                  Buy {pkg.credits} credits
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section aria-labelledby="activity-heading" className="mt-6 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          <h2 id="activity-heading" className="text-xl font-semibold">
            Recent calls
          </h2>
          <p className="mt-1 text-sm text-oe-muted">Your last few calls. Calls are never recorded.</p>

          {loading ? (
            <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading recent activity">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl bg-oe-surface-low p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 !rounded-full" />
                    <div>
                      <Skeleton className="mb-2 h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : callHistory.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {callHistory.map((call) => (
                <li key={call.id} className="flex items-center justify-between gap-4 rounded-2xl bg-oe-surface-low p-4">
                  <div className="flex items-center gap-4">
                    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                      <i className="ri-phone-line" />
                    </span>
                    <div>
                      <p className="font-medium">Call with a Listener</p>
                      <p className="text-sm text-oe-muted">{formatTimeAgo(call.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-right text-sm">
                    <span className="font-semibold">{Math.ceil((call.duration_seconds || 0) / 60)} min</span>
                    {call.credits_used > 0 && <span className="block text-xs text-oe-muted">{call.credits_used} credits</span>}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl bg-oe-surface-low p-8 text-center">
              <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                <i className="ri-phone-line" />
              </span>
              <p className="mt-4 font-medium">No calls yet</p>
              <p className="mt-1 text-sm text-oe-muted">When you&rsquo;re ready, a Listener is a tap away.</p>
              <Link
                to="/call"
                className="oe-btn mt-5 inline-flex rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
              >
                Talk now
              </Link>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />

      {/* Sign-in prompt (shown if someone tries to buy while signed out) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-oe-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div className="w-full max-w-sm rounded-3xl border border-oe-line bg-white p-6 shadow-oe-md md:p-8">
            <div className="text-center">
              <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                <i className="ri-user-line" />
              </span>
              <h3 id="auth-modal-title" className="mt-4 text-xl font-semibold">
                Sign in to continue
              </h3>
              <p className="mt-1 text-sm text-oe-muted">
                Sign in to buy {selectedPkg?.credits} credits for {selectedPkg ? formatPrice(selectedPkg.price) : ''}.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin', { state: { returnTo: '/dashboard' } });
                }}
                className="w-full cursor-pointer whitespace-nowrap rounded-full bg-oe-primary py-3 font-semibold text-white hover:bg-oe-primary-hover"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signin?signup=true');
                }}
                className="w-full cursor-pointer whitespace-nowrap rounded-full bg-oe-surface py-3 font-medium text-oe-ink hover:bg-oe-primary-tint"
              >
                Create account
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full cursor-pointer whitespace-nowrap py-2 text-sm text-oe-muted hover:text-oe-ink"
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
