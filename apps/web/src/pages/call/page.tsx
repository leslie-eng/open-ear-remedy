import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/feature/Navbar';
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
import { Link } from 'react-router-dom';

const END_MESSAGES: Record<string, string> = {
  hangup: 'Call ended.',
  no_answer: 'No listener could answer in time. Nothing was charged. Please try again soon, or try our AI chat.',
  cancelled: 'Call cancelled. Nothing was charged.',
  dropped: 'The connection was lost, so the call ended. You were only charged up to the moment it dropped.',
  time_limit: 'Your call time ran out, so the call ended.',
};

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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingPhoneNumber, setBookingPhoneNumber] = useState('');
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
  const call = useCallSession({
    onEnded: () => {
      void fetchCredits();
      // The server checks the real balance; this only asks it to email a low-balance notice if due.
      void sendLowCreditNotification(0);
    },
  });
  const callInProgress = ['preparing', 'ringing', 'connecting', 'live'].includes(call.state.phase);

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
    await notesGate.gate(() => void call.start());
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

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess(false);

    try {
      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          appointmentDate: bookingDate,
          appointmentTime: bookingTime,
          notes: bookingNotes,
          phoneNumber: bookingPhoneNumber,
        }),
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingDate('');
        setBookingTime('');
        setBookingNotes('');
        setBookingPhoneNumber('');
        setBookingSuccess(false);
      }, 3000);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const openBookingModal = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowBookingModal(true);
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-oe-bg">
      <Navbar />
      {notesGate.noticeOpen && <NotesNotice onChoose={(allow) => void notesGate.choose(allow)} onCancel={notesGate.cancel} />}
      <ConnectingOverlay
        open={['preparing', 'ringing', 'connecting'].includes(call.state.phase)}
        title={call.state.phase === 'connecting' ? 'Connecting you to a listener…' : 'Finding a listener for you…'}
        detail={
          call.state.phase === 'preparing'
            ? 'If your browser asks, allow the microphone so the listener can hear you.'
            : 'Take a slow breath. There’s no rush.'
        }
        action={{ label: 'Cancel', onClick: call.hangup }}
      />

      <div className="pt-20 md:pt-24 px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 bg-oe-primary/10 rounded-full mb-4 md:mb-6">
              <i className="ri-phone-fill text-oe-primary text-sm md:text-base"></i>
              <span className="text-xs md:text-sm font-medium text-oe-primary">
                Voice Support
              </span>
            </div>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-oe-ink mb-4"
             
            >
              Connect Through Voice
            </h1>
            <p className="text-base md:text-lg text-oe-muted max-w-2xl mx-auto">
              Real-time emotional support when you need it most. {CREDITS_PER_CALL_MINUTE} credits per
              minute.
            </p>
            {user && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
                  <i className="ri-copper-coin-fill text-oe-primary"></i>
                  <span className="font-semibold text-oe-ink">
                    {credits} Credits
                  </span>
                  <span className="text-xs text-oe-muted">
                    ({Math.floor(availableSeconds / 60)} min{passSecondsLeft > 0 ? ' incl. Monthly Pass' : ''})
                  </span>
                </div>
                {isFirstTimeUser && (
                  <button
                    onClick={claimFreeCredits}
                    disabled={claimingFreeCredits}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-forest-500 text-white rounded-full shadow-md hover:bg-forest-600 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer text-sm font-medium animate-pulse"
                  >
                    <i className="ri-gift-fill"></i>
                    {claimingFreeCredits
                      ? 'Claiming...'
                      : `Claim ${FREE_TRIAL_CREDITS} Free Credits!`}
                  </button>
                )}
              </div>
            )}
            {!user && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-forest-50 border border-forest-200 rounded-full">
                <i className="ri-gift-fill text-forest-600"></i>
                <span className="text-forest-700 font-medium text-sm">
                  First-time users get {FREE_TRIAL_CREDITS} FREE credits!
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {callError && (
            <div
              className={`max-w-2xl mx-auto mb-6 p-4 border rounded-2xl flex items-start gap-3 ${
                callError.includes('✓')
                  ? 'bg-forest-50 border-forest-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <i
                className={`text-xl mt-0.5 ${
                  callError.includes('✓')
                    ? 'ri-checkbox-circle-fill text-forest-500'
                    : 'ri-error-warning-fill text-red-500'
                }`}
              ></i>
              <p
                className={`text-sm ${
                  callError.includes('✓')
                    ? 'text-forest-700'
                    : 'text-red-700'
                }`}
              >
                {callError}
              </p>
            </div>
          )}

          {/* Call Interface */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            {/* Call Status */}
            <div className="text-center mb-8 md:mb-12">
              {call.state.phase !== 'live' ? (
                <>
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-oe-primary rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-lg">
                    <i className="ri-phone-fill text-4xl md:text-5xl text-white"></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-3">
                    Ready to Connect
                  </h2>
                  <p className="text-sm md:text-base text-oe-muted">
                    Talk with a listener from your browser, or book an appointment
                  </p>
                  {call.state.phase === 'ended' && call.state.endReason && (
                    <p role="status" className="mt-4 mx-auto max-w-md text-sm md:text-base text-oe-ink bg-oe-primary-tint rounded-xl p-3">
                      {END_MESSAGES[call.state.endReason]}
                      {call.state.billedSeconds > 0 && ` Talk time: ${formatTime(call.state.billedSeconds)}.`}
                    </p>
                  )}
                  {user && (
                    <div className="mt-6 mx-auto max-w-sm text-left">
                      <label htmlFor="display-name" className="block text-sm font-medium text-oe-ink mb-2">
                        Name the listener will see (optional)
                      </label>
                      <input
                        id="display-name"
                        type="text"
                        maxLength={40}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Anonymous"
                        className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                      />
                      <p className="text-xs text-oe-muted mt-2">
                        Listeners never see your email or phone number. Calls are never recorded.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-oe-primary rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-lg animate-pulse">
                    <i className="ri-phone-fill text-4xl md:text-5xl text-white"></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-3">
                    Call in Progress
                  </h2>
                  <div className="text-3xl md:text-4xl font-bold text-oe-primary mb-2" aria-live="off">
                    {formatTime(call.state.elapsed)}
                  </div>
                  <p className="text-sm md:text-base text-oe-muted">
                    Up to {formatTime(call.state.maxSeconds)} on your balance
                  </p>

                  {call.state.peerReconnecting && (
                    <p role="status" className="mt-4 mx-auto max-w-md p-3 rounded-xl bg-yellow-100 border-2 border-yellow-400 text-sm font-medium text-yellow-700">
                      The connection is unstable. Trying to reconnect…
                    </p>
                  )}
                  {call.state.lowTimeWarning && (
                    <div role="alert" className="mt-4 mx-auto max-w-md p-3 rounded-xl flex items-center justify-center gap-2 bg-orange-100 border-2 border-orange-400">
                      <i className="ri-alert-fill text-lg text-orange-600"></i>
                      <span className="text-sm font-medium text-orange-700">
                        About 2 minutes of call time left. The call will end when it runs out.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Call Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-8">
              {!callInProgress ? (
                <>
                  <button
                    onClick={() => void startCall()}
                    className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-oe-primary text-white rounded-2xl font-semibold hover:bg-oe-primary-hover transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-phone-fill text-lg md:text-xl"></i>
                    Start Call
                  </button>
                  <button
                    onClick={openBookingModal}
                    className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-white text-oe-primary border-2 border-oe-primary rounded-2xl font-semibold hover:bg-oe-primary-hover hover:text-white transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-calendar-fill text-lg md:text-xl"></i>
                    Book Appointment
                  </button>
                  <Link to="/listener-chat" className="text-sm font-medium text-oe-primary hover:underline">
                    Prefer to type? Text a Listener
                  </Link>
                </>
              ) : (
                <button
                  onClick={call.hangup}
                  className="px-8 md:px-12 py-3 md:py-4 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-phone-fill text-lg md:text-xl"></i>
                  End Call
                </button>
              )}
            </div>

            {/* Call Controls */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-8">
              <button
                onClick={call.toggleMute}
                disabled={call.state.phase !== 'live'}
                aria-label={call.state.muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={call.state.muted}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  call.state.muted
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-oe-surface hover:bg-oe-primary-tint'
                } ${
                  call.state.phase !== 'live' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <i
                  className={`${
                    call.state.muted
                      ? 'ri-mic-off-fill text-white'
                      : 'ri-mic-fill text-oe-ink'
                  } text-xl md:text-2xl`}
                ></i>
              </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-oe-primary-tint rounded-2xl p-4 md:p-6 text-center">
                <i className="ri-shield-check-fill text-2xl md:text-3xl text-oe-primary mb-2 md:mb-3 block"></i>
                <p className="text-xs md:text-sm font-semibold text-oe-ink mb-1">
                  Secure & Private
                </p>
                <p className="text-xs text-oe-muted">End-to-end encrypted</p>
              </div>

              <div className="bg-oe-primary-tint rounded-2xl p-4 md:p-6 text-center">
                <i className="ri-time-fill text-2xl md:text-3xl text-oe-primary mb-2 md:mb-3 block"></i>
                <p className="text-xs md:text-sm font-semibold text-oe-ink mb-1">
                  Available 24/7
                </p>
                <p className="text-xs text-oe-muted">Connect anytime</p>
              </div>

              <div className="bg-oe-primary-tint rounded-2xl p-4 md:p-6 text-center">
                <i className="ri-heart-3-fill text-2xl md:text-3xl text-oe-primary mb-2 md:mb-3 block"></i>
                <p className="text-xs md:text-sm font-semibold text-oe-ink mb-1">
                  Judgment‑Free
                </p>
                <p className="text-xs text-oe-muted">Safe space to share</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl relative">
            <div className="text-center mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-oe-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <i className="ri-calendar-fill text-3xl md:text-4xl text-oe-primary"></i>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-oe-ink mb-2">
                Book Appointment
              </h2>
              <p className="text-sm md:text-base text-oe-muted">
                Schedule a call at your convenience
              </p>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-sm font-medium text-oe-ink mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={bookingPhoneNumber}
                  onChange={(e) => setBookingPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                  placeholder="+233201234567"
                  required
                />
                <p className="text-xs text-oe-muted mt-1">
                  Include country code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-oe-ink mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-oe-ink mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-oe-ink mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm md:text-base resize-none"
                  rows={3}
                  placeholder="Any specific topics you'd like to discuss..."
                />
              </div>

              {bookingError && (
                <div className="bg-oe-crisis-tint border border-oe-crisis text-oe-crisis px-4 py-3 rounded-xl text-sm">
                  {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div className="bg-oe-primary-tint border border-oe-primary text-oe-primary px-4 py-3 rounded-xl text-sm">
                  ✓ Appointment booked! Admin notified and calendar updated.
                  Check your email for confirmation.
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full px-6 py-3 md:py-4 bg-oe-primary text-white rounded-xl text-base md:text-lg font-semibold hover:bg-oe-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>

            <button
              onClick={() => setShowBookingModal(false)}
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