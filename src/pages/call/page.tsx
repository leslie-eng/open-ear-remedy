import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useSEO, generateWebPageSchema } from '../../utils/seo';

export default function CallPage() {
  // SEO Configuration
  useSEO({
    title: 'Voice Call Support - Real-Time Emotional Support | Open Ear',
    description:
      'Connect through secure voice calls for real-time emotional support. Available 24/7 with credit-based pricing. Start a call instantly or book an appointment for later.',
    keywords:
      'voice call support, phone therapy, real-time counseling, emotional support calls, mental health hotline',
    canonical: '/call',
    ogType: 'website',
    schema: generateWebPageSchema(
      'Voice Call Support',
      'Real-time emotional support through secure voice calls',
      '/call'
    ),
  });

  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [credits, setCredits] = useState(0);
  const {
    user,
    signUp,
    signIn,
    resendOtp,
    forgotPassword: sendForgotPassword,
  } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
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
  const [callId, setCallId] = useState<string | null>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [callError, setCallError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [addingTestCredits, setAddingTestCredits] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [claimingFreeCredits, setClaimingFreeCredits] = useState(false);
  // Duplicate declaration removed – the state is now defined only once
  const [lowCreditWarning, setLowCreditWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastWarningRef = useRef<number>(0);

  useEffect(() => {
    if (user) {
      void fetchCredits();
      void checkFirstTimeUser();
    }
  }, [user]);

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  // Check for low credits during call
  useEffect(() => {
    if (isCallActive && user) {
      const creditsUsed = Math.ceil(callDuration / 60) * 10;
      const remainingCredits = credits - creditsUsed;

      // Warning thresholds: 50, 30, 20, 10 credits
      const thresholds = [50, 30, 20, 10];

      for (const threshold of thresholds) {
        if (
          remainingCredits <= threshold &&
          remainingCredits > threshold - 10 &&
          lastWarningRef.current !== threshold
        ) {
          lastWarningRef.current = threshold;
          const minutesLeft = Math.floor(remainingCredits / 10);

          if (threshold === 10) {
            setLowCreditWarning(
              `⚠️ Critical: Only ${remainingCredits} credits left (~${minutesLeft} min)! Call will end soon.`
            );
          } else if (threshold === 20) {
            setLowCreditWarning(
              `⚠️ Low credits: ${remainingCredits} credits remaining (~${minutesLeft} min)`
            );
          } else if (threshold === 30) {
            setLowCreditWarning(
              `Credits running low: ${remainingCredits} credits (~${minutesLeft} min left)`
            );
          } else {
            setLowCreditWarning(
              `Reminder: ${remainingCredits} credits remaining (~${minutesLeft} min)`
            );
          }

          // Auto-dismiss after 5 seconds for non‑critical warnings
          if (threshold > 10) {
            setTimeout(() => setLowCreditWarning(null), 5000);
          }
          break;
        }
      }

      // Auto‑end call if credits depleted
      if (remainingCredits <= 0) {
        setLowCreditWarning('❌ Credits depleted! Ending call...');
        setTimeout(() => endCall(), 2000);
      }
    }
  }, [callDuration, isCallActive, credits, user]);

  // Reset warning when call ends
  useEffect(() => {
    if (!isCallActive) {
      lastWarningRef.current = 0;
      setLowCreditWarning(null);
    }
  }, [isCallActive]);

  const checkFirstTimeUser = async () => {
    try {
      const data = await apiFetch<{ credits: number }>('/api/user/credits');
      setIsFirstTimeUser(data.credits === 0);
    } catch (error) {
      console.error('Error checking first time user:', error);
    }
  };

  const claimFreeCredits = async () => {
    if (!user) return;

    setClaimingFreeCredits(true);
    setCallError('Free credit grants require a backend endpoint. Please purchase credits on the pricing page.');
    setIsFirstTimeUser(false);
    setClaimingFreeCredits(false);
  };

  const fetchCredits = async () => {
    try {
      const data = await apiFetch<{ credits: number }>('/api/user/credits');
      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const sendLowCreditNotification = async (currentCredits: number) => {
    if (currentCredits > 50) return;

    try {
      await apiFetch('/api/notifications/low-credit', {
        method: 'POST',
        body: JSON.stringify({ credits: currentCredits }),
      });
    } catch (error) {
      console.error('Error sending low credit notification:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const startCall = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (credits < 10) {
      setCallError(
        'Insufficient credits. You need at least 10 credits to start a call (1 minute).'
      );
      setTimeout(() => setCallError(''), 5000);
      return;
    }
    setShowPhoneModal(true);
  };

  const addTestCredits = async () => {
    if (!user) {
      setCallError('Please sign in first');
      return;
    }

    setAddingTestCredits(true);
    setCallError('Test credit grants are not available via the API.');
    setAddingTestCredits(false);
  };

  const initiateCall = async () => {
    if (!phoneNumber.trim()) {
      setCallError('Please enter a phone number');
      return;
    }

    setIsInitiating(true);
    setCallError('');

    try {
      if (demoMode) {
        // Demo mode – simulate call without Twilio
        setCallId('demo-' + Date.now());
        setCallSid('demo-sid-' + Date.now());
        setIsCallActive(true);
        setCallDuration(0);
        setShowPhoneModal(false);
        setPhoneNumber('');
        setCallError('🎭 Demo Mode: Simulated call started (no real call made)');
        setTimeout(() => setCallError(''), 5000);
        return;
      }

      const data = await apiFetch<{
        callId: string;
        callSid: string;
        success: boolean;
      }>('/api/calls/initiate', {
        method: 'POST',
        body: JSON.stringify({ toNumber: phoneNumber }),
      });

      setCallId(data.callId);
      setCallSid(data.callSid);
      setIsCallActive(true);
      setCallDuration(0);
      setShowPhoneModal(false);
      setPhoneNumber('');
    } catch (error: any) {
      setCallError(error.message || 'Failed to start call');
    } finally {
      setIsInitiating(false);
    }
  };

  const endCall = async () => {
    if (!callId) {
      setIsCallActive(false);
      return;
    }

    try {
      if (demoMode || callId.startsWith('demo-')) {
        // Demo mode – simulate credit deduction (10 credits per minute)
        const creditsUsed = Math.ceil(callDuration / 60) * 10;
        const newCredits = Math.max(0, credits - creditsUsed);
        setCredits(newCredits);
        setIsCallActive(false);
        setCallId(null);
        setCallSid(null);
        setCallError(
          `🎭 Demo call ended. Would have used ${creditsUsed} credits (${Math.ceil(
            callDuration / 60
          )} minutes)`
        );
        // Send email notification if credits are low
        await sendLowCreditNotification(newCredits);
        setTimeout(() => setCallError(''), 5000);
        return;
      }

      const data = await apiFetch<{
        remainingCredits: number;
        creditsUsed: number;
      }>('/api/calls/end', {
        method: 'POST',
        body: JSON.stringify({
          callId,
          durationSeconds: callDuration,
        }),
      });

      setCredits(data.remainingCredits);
      await sendLowCreditNotification(data.remainingCredits);
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setIsCallActive(false);
      setCallId(null);
      setCallSid(null);
      await fetchCredits();
    }
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
          await checkFirstTimeUser();
        }
      } else {
        await signIn(email, password);
        setShowAuthModal(false);
        await fetchCredits();
        await checkFirstTimeUser();
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
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />

      <div className="pt-20 md:pt-24 px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 bg-[#0096FF]/10 rounded-full mb-4 md:mb-6">
              <i className="ri-phone-fill text-[#0096FF] text-sm md:text-base"></i>
              <span className="text-xs md:text-sm font-medium text-[#0096FF]">
                Voice Support
              </span>
            </div>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2A2A2A] mb-4"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Connect Through Voice
            </h1>
            <p className="text-base md:text-lg text-[#6B6B6B] max-w-2xl mx-auto">
              Real-time emotional support when you need it most. 10 credits per
              minute.
            </p>
            {user && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
                  <i className="ri-copper-coin-fill text-[#0096FF]"></i>
                  <span className="font-semibold text-[#2A2A2A]">
                    {credits} Credits
                  </span>
                  <span className="text-xs text-[#6B6B6B]">
                    ({Math.floor(credits / 10)} min)
                  </span>
                </div>
                {isFirstTimeUser && (
                  <button
                    onClick={claimFreeCredits}
                    disabled={claimingFreeCredits}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer text-sm font-medium animate-pulse"
                  >
                    <i className="ri-gift-fill"></i>
                    {claimingFreeCredits
                      ? 'Claiming...'
                      : 'Claim 50 Free Credits!'}
                  </button>
                )}
                <button
                  onClick={addTestCredits}
                  disabled={addingTestCredits}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0096FF] text-white rounded-full shadow-md hover:bg-[#0077CC] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer text-sm font-medium"
                >
                  <i className="ri-add-circle-fill"></i>
                  {addingTestCredits ? 'Adding...' : 'Add 200 Test Credits'}
                </button>
              </div>
            )}
            {!user && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                <i className="ri-gift-fill text-green-600"></i>
                <span className="text-green-700 font-medium text-sm">
                  First-time users get 50 FREE credits!
                </span>
              </div>
            )}
          </div>

          {/* Demo Mode Toggle */}
          {user && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <i className="ri-flask-fill text-2xl text-yellow-600"></i>
                  <div>
                    <p className="font-semibold text-yellow-900 text-sm">
                      Demo Mode
                    </p>
                    <p className="text-xs text-yellow-700">
                      Test without making real calls
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDemoMode(!demoMode)}
                  className={`relative w-14 h-7 rounded-full transition-all cursor-pointer ${
                    demoMode ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      demoMode ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {callError && (
            <div
              className={`max-w-2xl mx-auto mb-6 p-4 border rounded-2xl flex items-start gap-3 ${
                callError.includes('✓') || callError.includes('🎭')
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <i
                className={`text-xl mt-0.5 ${
                  callError.includes('✓') || callError.includes('🎭')
                    ? 'ri-checkbox-circle-fill text-green-500'
                    : 'ri-error-warning-fill text-red-500'
                }`}
              ></i>
              <p
                className={`text-sm ${
                  callError.includes('✓') || callError.includes('🎭')
                    ? 'text-green-700'
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
              {!isCallActive ? (
                <>
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#0096FF] to-[#0077CC] rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-lg">
                    <i className="ri-phone-fill text-4xl md:text-5xl text-white"></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-3">
                    Ready to Connect
                  </h2>
                  <p className="text-sm md:text-base text-[#6B6B6B]">
                    Start an instant call or book an appointment
                  </p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#0096FF] to-[#0077CC] rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-lg animate-pulse">
                    <i className="ri-phone-fill text-4xl md:text-5xl text-white"></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-3">
                    Call in Progress
                  </h2>
                  <div className="text-3xl md:text-4xl font-bold text-[#0096FF] mb-2">
                    {formatTime(callDuration)}
                  </div>
                  <p className="text-sm md:text-base text-[#6B6B6B]">
                    Credits used: {Math.ceil(callDuration / 60) * 10}
                  </p>

                  {/* Low Credit Warning During Call */}
                  {lowCreditWarning && (
                    <div
                      className={`mt-4 mx-auto max-w-md p-3 rounded-xl flex items-center justify-center gap-2 animate-pulse ${
                        lowCreditWarning.includes('Critical') ||
                        lowCreditWarning.includes('depleted')
                          ? 'bg-red-100 border-2 border-red-400'
                          : lowCreditWarning.includes('Low')
                          ? 'bg-orange-100 border-2 border-orange-400'
                          : 'bg-yellow-100 border-2 border-yellow-400'
                      }`}
                    >
                      <i
                        className={`text-lg ${
                          lowCreditWarning.includes('Critical') ||
                          lowCreditWarning.includes('depleted')
                            ? 'ri-error-warning-fill text-red-600'
                            : lowCreditWarning.includes('Low')
                            ? 'ri-alert-fill text-orange-600'
                            : 'ri-information-fill text-yellow-600'
                        }`}
                      ></i>
                      <span
                        className={`text-sm font-medium ${
                          lowCreditWarning.includes('Critical') ||
                          lowCreditWarning.includes('depleted')
                            ? 'text-red-700'
                            : lowCreditWarning.includes('Low')
                            ? 'text-orange-700'
                            : 'text-yellow-700'
                        }`}
                      >
                        {lowCreditWarning}
                      </span>
                      {(lowCreditWarning.includes('Critical') ||
                        lowCreditWarning.includes('Low')) && (
                        <button
                          onClick={() => {
                            endCall();
                            navigate('/pricing');
                          }}
                          className="ml-2 px-3 py-1 bg-[#0096FF] text-white rounded-lg text-xs font-medium hover:bg-[#0077CC] transition-all cursor-pointer whitespace-nowrap"
                        >
                          Buy Credits
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Call Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-8">
              {!isCallActive ? (
                <>
                  <button
                    onClick={startCall}
                    className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-[#0096FF] text-white rounded-2xl font-semibold hover:bg-[#0077CC] transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-phone-fill text-lg md:text-xl"></i>
                    Start Call
                  </button>
                  <button
                    onClick={openBookingModal}
                    className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-white text-[#0096FF] border-2 border-[#0096FF] rounded-2xl font-semibold hover:bg-[#0077CC] hover:text-white transition-all flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-calendar-fill text-lg md:text-xl"></i>
                    Book Appointment
                  </button>
                </>
              ) : (
                <button
                  onClick={endCall}
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
                onClick={toggleMute}
                disabled={!isCallActive}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#F5F5F5] hover:bg-[#E6F5FF]'
                } ${
                  !isCallActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <i
                  className={`${
                    isMuted
                      ? 'ri-mic-off-fill text-white'
                      : 'ri-mic-fill text-[#2A2A2A]'
                  } text-xl md:text-2xl`}
                ></i>
              </button>

              <button
                onClick={toggleVideo}
                disabled={!isCallActive}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isVideoOn
                    ? 'bg-[#0096FF] hover:bg-[#0077CC]'
                    : 'bg-[#F5F5F5] hover:bg-[#E6F5FF]'
                } ${
                  !isCallActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <i
                  className={`${
                    isVideoOn
                      ? 'ri-video-on-fill text-white'
                      : 'ri-video-off-fill text-[#2A2A2A]'
                  } text-xl md:text-2xl`}
                ></i>
              </button>

              <button
                onClick={toggleSpeaker}
                disabled={!isCallActive}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isSpeakerOn
                    ? 'bg-[#F5F5F5] hover:bg-[#E6F5FF]'
                    : 'bg-red-500 hover:bg-red-600'
                } ${
                  !isCallActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <i
                  className={`${
                    isSpeakerOn
                      ? 'ri-volume-up-fill text-[#2A2A2A]'
                      : 'ri-volume-mute-fill text-white'
                  } text-xl md:text-2xl`}
                ></i>
              </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-6 text-center">
                <i className="ri-shield-check-fill text-2xl md:text-3xl text-[#0096FF] mb-2 md:mb-3 block"></i>
                <p className="text-xs md:text-sm font-semibold text-[#2A2A2A] mb-1">
                  Secure & Private
                </p>
                <p className="text-xs text-[#6B6B6B]">End-to-end encrypted</p>
              </div>

              <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-6 text-center">
                <i className="ri-time-fill text-2xl md:text-3xl text-[#0096FF] mb-2 md:mb-3 block"></i>
                <p className="text-xs md:text-sm font-semibold text-[#2A2A2A] mb-1">
                  Available 24/7
                </p>
                <p className="text-xs text-[#6B6B6B]">Connect anytime</p>
              </div>

              <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-6 text-center">
                <i className="ri-heart-3-fill text-2xl md:text-3xl text-[#0096FF] mb-2 md:mb-3 block"></i>
                <p className="text-xs md:text-sm font-semibold text-[#2A2A2A] mb-1">
                  Judgment‑Free
                </p>
                <p className="text-xs text-[#6B6B6B]">Safe space to share</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl relative">
            <div className="text-center mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <i className="ri-phone-fill text-3xl md:text-4xl text-[#0096FF]"></i>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2">
                Enter Phone Number
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B]">
                We'll call you at this number
              </p>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                  placeholder="+1234567890"
                  required
                />
                <p className="text-xs text-[#6B6B6B] mt-2">
                  Include country code (e.g., +1 for US)
                </p>
              </div>

              <button
                onClick={initiateCall}
                disabled={isInitiating || !phoneNumber.trim()}
                className="w-full px-6 py-3 md:py-4 bg-[#0096FF] text-white rounded-xl text-base md:text-lg font-semibold hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {isInitiating ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Initiating Call...
                  </span>
                ) : (
                  'Start Call'
                )}
              </button>
            </div>

            <button
              onClick={() => {
                setShowPhoneModal(false);
                setPhoneNumber('');
                setCallError('');
              }}
              className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#2A2A2A] transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl md:text-2xl"></i>
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Verification Sent State */}
            {verificationSent ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-mail-check-fill text-4xl text-green-600"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-3">
                  Verify Your Email
                </h2>
                <p className="text-sm md:text-base text-[#6B6B6B] mb-2">
                  We've sent a verification link to:
                </p>
                <p className="text-sm md:text-base font-semibold text-[#0096FF] mb-6">
                  {email}
                </p>
                <div className="bg-[#E6F5FF] rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#2A2A2A]">
                    <i className="ri-information-fill text-[#0096FF] mr-2"></i>
                    Click the link in your email to activate your account and start using Open Ear.
                  </p>
                </div>
                
                {authError && (
                  <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                    authError.includes('resent')
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-[#FFE6E6] border border-[#FF4444] text-[#FF4444]'
                  }`}>
                    {authError}
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="w-full px-6 py-3 bg-white border-2 border-[#0096FF] text-[#0096FF] rounded-xl font-semibold hover:border-[#0077CC] hover:bg-[#E6F5FF] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
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
                    className="w-full px-6 py-3 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] transition-all whitespace-nowrap cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
                
                <p className="text-xs text-[#6B6B6B] mt-6">
                  Didn't receive the email? Check your spam folder or try a different email address.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${forgotPassword ? 'ri-lock-unlock-fill' : 'ri-user-fill'} text-3xl md:text-4xl text-[#0096FF]`}></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2">
                    {forgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-sm md:text-base text-[#6B6B6B]">
                    {forgotPassword ? 'Enter your email to receive a reset link' : isSignUp ? 'Sign up to start calling' : 'Sign in to continue'}
                  </p>
                </div>

                {!forgotPassword && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[#E5E5E5]"></div>
                      <span className="text-xs text-[#6B6B6B]">Sign in with email</span>
                      <div className="flex-1 h-px bg-[#E5E5E5]"></div>
                    </div>
                  </>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {!forgotPassword && isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  {!forgotPassword && (
                    <div>
                      <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
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
                        className="text-sm text-[#0096FF] font-medium hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className={`px-4 py-3 rounded-xl text-sm ${
                      authError.includes('Check your email') || authError.includes('reset link sent') || authError.includes('resent')
                        ? 'bg-[#E6F5FF] border border-[#0096FF] text-[#0096FF]'
                        : 'bg-[#FFE6E6] border border-[#FF4444] text-[#FF4444]'
                    }`}>
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full px-6 py-3 md:py-4 bg-[#0096FF] text-white rounded-xl text-base md:text-lg font-semibold hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
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
                      className="text-sm md:text-base text-[#0096FF] font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
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
                      className="text-sm md:text-base text-[#0096FF] font-semibold hover:underline cursor-pointer"
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
              className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#2A2A2A] transition-colors cursor-pointer"
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
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0096FF]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <i className="ri-calendar-fill text-3xl md:text-4xl text-[#0096FF]"></i>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2">
                Book Appointment
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B]">
                Schedule a call at your convenience
              </p>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={bookingPhoneNumber}
                  onChange={(e) => setBookingPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                  placeholder="+1234567890"
                  required
                />
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Include country code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm md:text-base resize-none"
                  rows={3}
                  placeholder="Any specific topics you'd like to discuss..."
                />
              </div>

              {bookingError && (
                <div className="bg-[#FFE6E6] border border-[#FF4444] text-[#FF4444] px-4 py-3 rounded-xl text-sm">
                  {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div className="bg-[#E6F5FF] border border-[#0096FF] text-[#0096FF] px-4 py-3 rounded-xl text-sm">
                  ✓ Appointment booked! Admin notified and calendar updated.
                  Check your email for confirmation.
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full px-6 py-3 md:py-4 bg-[#0096FF] text-white rounded-xl text-base md:text-lg font-semibold hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>

            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#2A2A2A] transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl md:text-2xl"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}