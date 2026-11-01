import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import MicCheck from '../../components/feature/MicCheck';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO, generateWebPageSchema } from '../../utils/seo';
import ConnectingOverlay from '../../components/ui/ConnectingOverlay';
import {
  CREDITS_PER_CALL_MINUTE,
  FREE_TRIAL_CREDITS,
  callSecondsAvailable,
} from '@openear/shared/pricing';
import type { Balance } from '../../hooks/useBalance';
import { useCallSession } from '../../hooks/useCallSession';
import { useNotesNoticeGate } from '../../hooks/useNotesNoticeGate';
import NotesNotice from '../../components/feature/NotesNotice';
import { Link, useSearchParams } from 'react-router-dom';

const END_MESSAGES: Record<string, string> = {
  hangup: 'Call ended.',
  no_answer: 'No listener could answer in time. Nothing was charged. Please try again soon, or try our AI chat.',
  cancelled: 'Call cancelled. Nothing was charged.',
  dropped: 'The connection was lost, so the call ended. You were only charged up to the moment it dropped.',
  time_limit: 'Your call time ran out, so the call ended.',
};

const SAFE_BASELINE = [
  {
    icon: 'ri-hourglass-line',
    title: 'You set the pace',
    body: 'Silence is welcome. You don’t have to fill every gap with words. The Listener follows your lead.',
  },
  {
    icon: 'ri-shield-keyhole-line',
    title: 'No diagnosis, never recorded',
    body: 'Listeners aren’t clinicians and calls are never recorded. A Listener may keep a short private note, which you can turn off.',
  },
  {
    icon: 'ri-logout-box-r-line',
    title: 'Leave anytime',
    body: 'If it doesn’t feel right, or you need to step away, end the call with one tap. No hard feelings.',
  },
  {
    icon: 'ri-chat-off-line',
    title: 'No unasked-for advice',
    body: 'Listeners listen. They won’t try to fix things unless you ask for another pair of eyes.',
  },
];

async function sendLowCreditNotification(currentCredits: number) {
  if (currentCredits > 50) return;

  try {
    await apiFetch('/api/notifications/low-credit', {
      method: 'POST',
      body: JSON.stringify({ credits: currentCredits }),
    });
  } catch (error) {
    console.error('Error sending low credit notification:', error);
  }
}

export default function CallPage() {
  // SEO Configuration
  useSEO({
    title: 'Voice Call Support - Real-Time Emotional Support | Open Ear',
    description:
      'Connect through secure voice calls for real-time emotional support. Available 24/7 with credit-based pricing. Start a call instantly or book an appointment for later.',
    keywords:
      'voice call support, talk to a listener, someone to listen, emotional support calls, feeling depressed',
    canonical: '/call',
    ogType: 'website',
    schema: generateWebPageSchema(
      'Voice Call Support',
      'Real-time emotional support through secure voice calls',
      '/call'
    ),
  });

  const [credits, setCredits] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [passSecondsLeft, setPassSecondsLeft] = useState(0);
  const availableSeconds = callSecondsAvailable({ credits, passSecondsLeft });
  const {
    user,
    signUp,
    signIn,
    resendOtp,
    forgotPassword: sendForgotPassword,
  } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [callError, setCallError] = useState('');
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [claimingFreeCredits, setClaimingFreeCredits] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      const data = await apiFetch<Balance>('/api/user/credits');
      setCredits(data.credits);
      setPassSecondsLeft(data.pass?.callSecondsLeft ?? 0);
      setIsFirstTimeUser(Boolean(data.free_credits_available));
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  }, []);

  const notesGate = useNotesNoticeGate();
  // Joining a booked Conversation from the dashboard: /call?booking=<id>.
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  const call = useCallSession({
    onEnded: () => {
      void fetchCredits();
      // The server checks the real balance; this only asks it to email a low-balance notice if due.
      void sendLowCreditNotification(0);
    },
  });
  const callInProgress = ['preparing', 'waiting', 'ringing', 'connecting', 'live'].includes(call.state.phase);

  useEffect(() => {
    if (user) {
      void fetchCredits();
    }
  }, [user, fetchCredits]);

  // The display name is the only thing a listener sees about the caller.
  useEffect(() => {
    if (!user) return;
    apiFetch<{ display_name: string | null }>('/api/user/profile')
      .then((profile) => setDisplayName(profile.display_name ?? ''))
      .catch(() => {});
  }, [user]);

  const claimFreeCredits = async () => {
    if (!user) return;

    setClaimingFreeCredits(true);
    setCallError('');
    try {
      const data = await apiFetch<{ credits: number }>('/api/user/claim-free-credits', {
        method: 'POST',
      });
      setCredits(data.credits);
      setIsFirstTimeUser(false);
      setCallError(`✓ ${FREE_TRIAL_CREDITS} free credits added to your account!`);
      setTimeout(() => setCallError(''), 5000);
    } catch (error) {
      setCallError(
        error instanceof Error ? error.message : 'Unable to claim free credits. Please try again.',
      );
      await fetchCredits();
    } finally {
      setClaimingFreeCredits(false);
    }
  };

  const startCall = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (availableSeconds < 60) {
      setCallError(
        `You need at least 1 minute of call time: ${CREDITS_PER_CALL_MINUTE} credits or Monthly Pass time.`
      );
      setTimeout(() => setCallError(''), 5000);
      return;
    }
    setCallError('');
    try {
      await apiFetch('/api/user/display-name', {
        method: 'PUT',
        body: JSON.stringify({ displayName }),
      });
    } catch (error) {
      setCallError(error instanceof Error ? error.message : 'Could not save your display name.');
      return;
    }
    // First Conversation: tell them about Listener notes before connecting.
    await notesGate.gate(() => void call.start(bookingId ?? undefined));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      if (forgotPassword) {
        await sendForgotPassword(email);
        setAuthError('Password reset link sent! Check your email.');
        return;
      }

      if (isSignUp) {
        if (password.length < 6) {
          setAuthError('Password must be at least 6 characters');
          setIsAuthLoading(false);
          return;
        }

        const { needsVerification } = await signUp(email, password, name);
        if (needsVerification) {
          setVerificationSent(true);
        } else {
          setShowAuthModal(false);
          await fetchCredits();
        }
      } else {
        await signIn(email, password);
        setShowAuthModal(false);
        await fetchCredits();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.includes('verify') || message.includes('confirmed')) {
        setAuthError(
          'Please verify your email before signing in. Check your inbox for the verification link.',
        );
        return;
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setAuthError('');

    try {
      await resendOtp(email);
      setAuthError('Verification email resent! Please check your inbox.');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Failed to resend verification');
    } finally {
      setResendingVerification(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const isLive = call.state.phase === 'live';

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      {notesGate.noticeOpen && <NotesNotice onChoose={(allow) => void notesGate.choose(allow)} onCancel={notesGate.cancel} />}
      <ConnectingOverlay
        open={['preparing', 'waiting', 'ringing', 'connecting'].includes(call.state.phase)}
        title={
          call.state.phase === 'connecting'
            ? 'Connecting you to a listener…'
            : call.state.phase === 'waiting'
              ? 'Waiting for your Listener to join…'
              : 'Finding a listener for you…'
        }
        detail={
          call.state.phase === 'preparing'
            ? 'If your browser asks, allow the microphone so the listener can hear you.'
            : call.state.phase === 'waiting'
              ? 'They’ll be with you shortly. Stay on this page; you’re only charged once you’re talking.'
              : 'Take a slow breath. There’s no rush.'
        }
        action={{ label: 'Cancel', onClick: call.hangup }}
      />

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        {isLive ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-oe-line bg-white p-8 text-center md:p-12">
            <p className="inline-flex items-center gap-2 rounded-full bg-oe-primary-tint px-3 py-1 text-xs font-medium text-oe-primary-deep">
              <span aria-hidden="true" className="oe-breathe" /> You&rsquo;re talking with a Listener
            </p>
            <p className="mt-8 font-heading text-6xl font-semibold text-oe-ink" aria-live="off">
              {formatTime(call.state.elapsed)}
            </p>
            <p className="mt-2 text-sm text-oe-muted">Up to {formatTime(call.state.maxSeconds)} on your balance</p>
            {call.state.peerReconnecting && (
              <p role="status" className="mx-auto mt-6 max-w-md rounded-xl bg-oe-accent-tint p-3 text-sm font-medium text-oe-accent">
                The connection is unstable. Trying to reconnect…
              </p>
            )}
            {call.state.lowTimeWarning && (
              <p role="alert" className="mx-auto mt-6 max-w-md rounded-xl bg-orange-100 p-3 text-sm font-medium text-orange-700">
                About 2 minutes of call time left. The call will end when it runs out.
              </p>
            )}
            <p className="mt-8 text-sm text-oe-muted">Silence is welcome. You can leave whenever you want.</p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={call.toggleMute}
                aria-label={call.state.muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={call.state.muted}
                className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full ${
                  call.state.muted ? 'bg-oe-crisis text-white' : 'bg-oe-surface text-oe-ink hover:bg-oe-primary-tint'
                }`}
              >
                <i className={`${call.state.muted ? 'ri-mic-off-line' : 'ri-mic-line'} text-2xl`} aria-hidden="true" />
              </button>
              <button
                onClick={call.hangup}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-crisis px-8 py-4 font-semibold text-white hover:opacity-90"
              >
                <i className="ri-phone-line rotate-[135deg]" aria-hidden="true" /> End call
              </button>
            </div>
          </section>
        ) : (
          <>
            <p className="inline-flex items-center gap-2 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-oe-accent" /> Getting ready · Zero pressure
            </p>
            <h1 className="mt-4 text-4xl font-bold md:text-5xl">
              {bookingId ? 'Getting ready for your booked call.' : 'Getting ready to connect.'}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-oe-muted">
              Take 30 seconds to settle in. There&rsquo;s no performance here, just an honest conversation with someone who
              listens.
            </p>

            {call.state.phase === 'ended' && call.state.endReason && (
              <p role="status" className="mt-6 max-w-2xl rounded-2xl bg-oe-primary-tint px-5 py-3 text-sm text-oe-ink">
                {END_MESSAGES[call.state.endReason]}
                {call.state.billedSeconds > 0 && ` Talk time: ${formatTime(call.state.billedSeconds)}.`}
                {call.state.billedSeconds > 0 && call.state.callId && (
                  <>
                    {' '}
                    <Link to={`/book?again=${call.state.callId}`} className="font-medium text-oe-primary underline">
                      Book again with this Listener
                    </Link>
                  </>
                )}
              </p>
            )}
            {callError && (
              <p
                role="alert"
                className={`mt-6 max-w-2xl rounded-2xl px-5 py-3 text-sm ${
                  callError.includes('✓') ? 'bg-oe-primary-tint text-oe-primary-deep' : 'bg-oe-crisis-tint text-oe-crisis'
                }`}
              >
                {callError}
              </p>
            )}

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className="space-y-5">
                <section className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
                      <i className="ri-user-heart-line" />
                    </span>
                    <div>
                      <h2 className="font-sans text-lg font-semibold">A trained Listener</h2>
                      <p className="text-sm text-oe-muted">The first free Listener will pick up. You won&rsquo;t need to explain who you are.</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {['Calm presence', 'Slow pace', 'Non-judgmental'].map((t) => (
                          <span key={t} className="rounded-full bg-oe-surface px-3 py-1 text-oe-ink">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <blockquote className="mt-6 rounded-2xl bg-oe-surface-low px-5 py-4 text-sm italic text-oe-muted">
                    &ldquo;Take your time. We don&rsquo;t have to solve your life in twenty minutes. We just start right where you
                    are.&rdquo;
                  </blockquote>
                  <div className="mt-5">
                    <MicCheck disabled={callInProgress} />
                  </div>
                </section>

                <section className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
                  {user ? (
                    <>
                      <label htmlFor="display-name" className="block text-sm font-medium">
                        Name the Listener will see (optional)
                      </label>
                      <input
                        id="display-name"
                        type="text"
                        maxLength={40}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Anonymous"
                        className="mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                      />
                      <p className="mt-2 text-xs text-oe-muted">Listeners never see your email or phone number.</p>
                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 rounded-full bg-oe-surface px-4 py-2">
                          <i className="ri-copper-coin-line text-oe-primary" aria-hidden="true" />
                          <strong>{credits}</strong> credits
                          <span className="text-oe-muted">
                            ({Math.floor(availableSeconds / 60)} min{passSecondsLeft > 0 ? ' incl. Monthly Pass' : ''})
                          </span>
                        </span>
                        {isFirstTimeUser && (
                          <button
                            onClick={claimFreeCredits}
                            disabled={claimingFreeCredits}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary-tint px-4 py-2 font-medium text-oe-primary-deep disabled:opacity-50"
                          >
                            <i className="ri-gift-line" aria-hidden="true" />
                            {claimingFreeCredits ? 'Claiming…' : `Claim ${FREE_TRIAL_CREDITS} free credits`}
                          </button>
                        )}
                        <Link to="/pricing" className="text-oe-primary hover:underline">
                          Top up
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-oe-muted">
                      You&rsquo;ll be asked to sign in when you&rsquo;re ready, so we can keep track of your call time. New here?{' '}
                      {FREE_TRIAL_CREDITS} free credits ({CREDITS_PER_CALL_MINUTE} credits a minute).
                    </p>
                  )}
                </section>
              </div>

              <section className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="font-sans text-xl font-semibold">Safe baseline</h2>
                  <span className="rounded-full bg-oe-primary-tint px-3 py-1 text-xs text-oe-primary-deep">Open Ear principles</span>
                </div>
                <p className="mt-2 text-sm text-oe-muted">
                  Every call is designed to take the pressure off. You are in control from the first second.
                </p>
                <ul className="mt-6 space-y-3">
                  {SAFE_BASELINE.map((item) => (
                    <li key={item.title} className="flex gap-4 rounded-2xl bg-oe-surface-low p-4">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
                        <i className={item.icon} />
                      </span>
                      <span>
                        <span className="block font-semibold">{item.title}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-oe-muted">{item.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-3xl bg-oe-surface p-5 sm:flex-row">
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/check-in/reflection" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-oe-primary-deep">
                  <i className="ri-time-line" aria-hidden="true" /> I need a few more minutes
                </Link>
                <Link to="/listener-chat" className="px-2 text-sm font-medium text-oe-primary hover:underline">
                  Prefer to type?
                </Link>
                <Link to="/book" className="px-2 text-sm font-medium text-oe-primary hover:underline">
                  Book a time instead
                </Link>
              </div>
              <button
                onClick={() => void startCall()}
                className="oe-btn inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-8 py-4 text-lg font-semibold text-white hover:bg-oe-primary-hover sm:w-auto"
              >
                {bookingId ? 'Join my booked call' : 'Find a Listener now'} <i className="ri-arrow-right-line" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-oe-muted">
              Calls are private and never recorded · In danger? Call{' '}
              <a href="tel:999" className="font-semibold text-oe-crisis underline">
                999
              </a>{' '}
              or{' '}
              <a href="tel:112" className="font-semibold text-oe-crisis underline">
                112
              </a>
            </p>
          </>
        )}
      </main>

      <SiteFooter />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Verification Sent State */}
            {verificationSent ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-mail-check-fill text-4xl text-forest-600"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-3">
                  Verify Your Email
                </h2>
                <p className="text-sm md:text-base text-oe-muted mb-2">
                  We've sent a verification link to:
                </p>
                <p className="text-sm md:text-base font-semibold text-oe-primary mb-6">
                  {email}
                </p>
                <div className="bg-oe-primary-tint rounded-xl p-4 mb-6">
                  <p className="text-sm text-oe-ink">
                    <i className="ri-information-fill text-oe-primary mr-2"></i>
                    Click the link in your email to activate your account and start using Open Ear.
                  </p>
                </div>
                
                {authError && (
                  <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                    authError.includes('resent')
                      ? 'bg-forest-50 border border-forest-200 text-forest-700'
                      : 'bg-oe-crisis-tint border border-oe-crisis text-oe-crisis'
                  }`}>
                    {authError}
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="w-full px-6 py-3 bg-white border-2 border-oe-primary text-oe-primary rounded-xl font-semibold hover:border-oe-primary-hover hover:bg-oe-primary-tint transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    {resendingVerification ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="ri-loader-4-line animate-spin"></i>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <i className="ri-refresh-line mr-2"></i>
                        Resend Verification Email
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setVerificationSent(false);
                      setIsSignUp(false);
                      setAuthError('');
                    }}
                    className="w-full px-6 py-3 bg-oe-primary text-white rounded-xl font-semibold hover:bg-oe-primary-hover transition-all whitespace-nowrap cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
                
                <p className="text-xs text-oe-muted mt-6">
                  Didn't receive the email? Check your spam folder or try a different email address.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${forgotPassword ? 'ri-lock-unlock-fill' : 'ri-user-fill'} text-3xl md:text-4xl text-oe-primary`}></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-2">
                    {forgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-sm md:text-base text-oe-muted">
                    {forgotPassword ? 'Enter your email to receive a reset link' : isSignUp ? 'Sign up to start calling' : 'Sign in to continue'}
                  </p>
                </div>

                {!forgotPassword && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-oe-line"></div>
                      <span className="text-xs text-oe-muted">Sign in with email</span>
                      <div className="flex-1 h-px bg-oe-line"></div>
                    </div>
                  </>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {!forgotPassword && isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-oe-ink mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-oe-ink mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  {!forgotPassword && (
                    <div>
                      <label className="block text-sm font-medium text-oe-ink mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                        placeholder={isSignUp ? 'Min. 6 characters' : '••••••••'}
                        required
                      />
                    </div>
                  )}

                  {/* Forgot Password Link - Only show on sign in */}
                  {!isSignUp && !forgotPassword && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPassword(true);
                          setAuthError('');
                        }}
                        className="text-sm text-oe-primary font-medium hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className={`px-4 py-3 rounded-xl text-sm ${
                      authError.includes('Check your email') || authError.includes('reset link sent') || authError.includes('resent')
                        ? 'bg-oe-primary-tint border border-oe-primary text-oe-primary'
                        : 'bg-oe-crisis-tint border border-oe-crisis text-oe-crisis'
                    }`}>
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full px-6 py-3 md:py-4 bg-oe-primary text-white rounded-xl text-base md:text-lg font-semibold hover:bg-oe-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  >
                    {isAuthLoading
                      ? 'Please wait...'
                      : forgotPassword
                      ? 'Send Reset Link'
                      : isSignUp
                      ? 'Create Account'
                      : 'Sign In'}
                  </button>
                </form>

                <div className="mt-5 text-center space-y-2">
                  {forgotPassword ? (
                    <button
                      onClick={() => {
                        setForgotPassword(false);
                        setAuthError('');
                      }}
                      className="text-sm md:text-base text-oe-primary font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                    >
                      <i className="ri-arrow-left-line"></i>
                      Back to Sign In
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError('');
                      }}
                      className="text-sm md:text-base text-oe-primary font-semibold hover:underline cursor-pointer"
                    >
                      {isSignUp
                        ? 'Already have an account? Sign In'
                        : "Don't have an account? Sign Up"}
                    </button>
                  )}
                </div>
              </>
            )}

            <button
              onClick={() => {
                setShowAuthModal(false);
                setForgotPassword(false);
                setVerificationSent(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-oe-muted hover:text-oe-ink transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl md:text-2xl"></i>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}