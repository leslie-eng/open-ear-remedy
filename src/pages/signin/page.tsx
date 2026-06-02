import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useSEO } from '../../utils/seo';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../lib/api';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function safeReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;
  const path = (state as { returnTo?: unknown }).returnTo;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export default function SignInPage() {
  // SEO Configuration - noindex for auth pages
  useSEO({
    title: 'Sign In - Open Ear',
    description: 'Sign in to your Open Ear account to access emotional support services.',
    keywords: 'sign in, login, account access',
    canonical: '/signin',
  });

  const [isSignUp, setIsSignUp] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [pendingAuthMode, setPendingAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, signUp, signIn, verifyOtp, resendOtp } = useAuth();

  const returnTo = safeReturnPath(location.state);

  const postSignInPath = () => returnTo ?? '/dashboard';
  const postSignUpPath = () => returnTo ?? '/';

  useEffect(() => {
    // Check if signup=true is in URL params
    if (searchParams.get('signup') === 'true') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    if (user) {
      navigate(safeReturnPath(location.state) ?? '/dashboard', { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const authEmail = normalizeEmail(email);
      if (!authEmail) throw new Error('Please enter your email address.');

      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        setPendingAuthMode('signup');
        await signUp(authEmail, password, name.trim());
        setCodeSent(true);
        setSuccess('We sent your verification code. Enter it below to activate your account.');
      } else {
        await signIn(authEmail, password);
        navigate(postSignInPath(), { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err instanceof ApiError || err instanceof Error ? err.message : null) ||
        'Failed to send verification code. Please try again.';
      if (message.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (message.toLowerCase().includes('email not confirmed')) {
        setPendingAuthMode('signup');
        setCodeSent(true);
        setError('');
        setSuccess('Your account is not verified yet. Enter the code sent to your email.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = code.replace(/\s+/g, '');
      if (!token) throw new Error('Please enter the verification code.');

      const authEmail = normalizeEmail(email);
      if (!authEmail) throw new Error('Please enter your email address.');

      await verifyOtp(authEmail, token, pendingAuthMode === 'signup' ? 'signup' : 'email');
      navigate(pendingAuthMode === 'signup' ? postSignUpPath() : postSignInPath(), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendingCode(true);
    setError('');
    setSuccess('');
    
    try {
      const authEmail = normalizeEmail(email);
      if (!authEmail) throw new Error('Please enter your email address.');

      await resendOtp(authEmail);
      setSuccess('Verification code resent! Please check your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setResendingCode(false);
    }
  };

  // Code entry screen
  if (codeSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-5">
            <Link to="/" className="inline-block">
              <h1 className="text-2xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Open Ear
              </h1>
            </Link>
          </div>

          {/* Verification Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-shield-check-fill text-3xl text-green-600"></i>
            </div>
            
            <h2 className="text-xl font-bold text-[#2A2A2A] mb-2">
              Enter verification code
            </h2>
            
            <p className="text-sm text-[#6B6B6B] mb-2">
              We sent a code to:
            </p>
            
            <p className="text-sm font-semibold text-[#0096FF] mb-5">
              {email}
            </p>

            <form onSubmit={verifyCode} className="space-y-3">
              <div className="text-left">
                <label className="block text-xs font-semibold text-[#2A2A2A] mb-1.5">
                  Verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F5F5F5] border border-transparent rounded-lg focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm text-center tracking-widest"
                  placeholder="123456"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0096FF] text-white rounded-lg font-semibold text-sm hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Verifying...
                  </span>
                ) : (
                  'Verify & Continue'
                )}
              </button>
            </form>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-xs">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-xs">{success}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleResendCode}
                disabled={resendingCode}
                className="w-full py-2.5 bg-white border-2 border-[#0096FF] text-[#0096FF] rounded-lg font-semibold text-sm hover:bg-[#E6F5FF] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {resendingCode ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Sending...
                  </span>
                ) : (
                  <>
                    <i className="ri-refresh-line mr-2"></i>
                    Resend Code
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setCodeSent(false);
                  setIsSignUp(false);
                  setError('');
                  setSuccess('');
                  setCode('');
                }}
                className="w-full py-2.5 bg-[#0096FF] text-white rounded-lg font-semibold text-sm hover:bg-[#0077CC] transition-all whitespace-nowrap cursor-pointer"
              >
                Back
              </button>
            </div>
            
            <p className="text-xs text-[#6B6B6B] mt-5">
              Didnâ€™t receive the code? Check spam, or resend it.
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-[#0096FF] hover:underline flex items-center justify-center gap-1 cursor-pointer">
              <i className="ri-arrow-left-line text-sm"></i>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      <div className="pt-24 pb-16 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-5">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Open Ear
            </h1>
          </Link>
          <p className="text-sm text-[#6B6B6B] mt-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Header */}
          <div className="mb-5">
            <div className="w-10 h-10 bg-[#0096FF]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <i className={`${isSignUp ? 'ri-user-add-fill' : 'ri-user-fill'} text-xl text-[#0096FF]`}></i>
            </div>
            <h2 className="text-lg font-bold text-[#2A2A2A] text-center">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-xs text-[#6B6B6B] text-center mt-1">
              {isSignUp ? 'Join Open Ear and start your journey' : 'Continue your journey with Open Ear'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <i className="ri-error-warning-fill text-red-500 text-base mt-0.5"></i>
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <i className="ri-checkbox-circle-fill text-green-500 text-base mt-0.5"></i>
              <p className="text-green-700 text-xs">{success}</p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-[#2A2A2A] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                    <i className="ri-user-fill text-sm text-[#6B6B6B]"></i>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F5F5F5] border border-transparent rounded-lg focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm"
                    placeholder="Enter your full name"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#2A2A2A] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                  <i className="ri-mail-fill text-sm text-[#6B6B6B]"></i>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F5F5F5] border border-transparent rounded-lg focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2A2A2A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                  <i className="ri-lock-fill text-sm text-[#6B6B6B]"></i>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F5F5F5] border border-transparent rounded-lg focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm"
                  placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                  required
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-[#2A2A2A] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                    <i className="ri-lock-fill text-sm text-[#6B6B6B]"></i>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F5F5F5] border border-transparent rounded-lg focus:border-[#0096FF] focus:bg-white transition-all outline-none text-sm"
                    placeholder="Confirm your password"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#E5E5E5] text-[#0096FF] focus:ring-[#0096FF]" />
                  <span className="text-[#6B6B6B]">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-[#0096FF] font-semibold hover:underline cursor-pointer">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0096FF] text-white rounded-lg font-semibold text-sm hover:bg-[#0077CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Sign In/Sign Up */}
          <div className="mt-4 pt-4 border-t border-[#E5E5E5] text-center">
            <p className="text-xs text-[#6B6B6B]">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                  setName('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setCode('');
                }}
                className="text-[#0096FF] font-semibold hover:underline cursor-pointer"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-3 text-center">
            <Link to="/" className="text-xs text-[#0096FF] hover:underline flex items-center justify-center gap-1 cursor-pointer">
              <i className="ri-arrow-left-line text-sm"></i>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Terms & Privacy */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-[#6B6B6B]">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-[#0096FF] hover:underline cursor-pointer">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-[#0096FF] hover:underline cursor-pointer">Privacy Policy</Link>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-[#6B6B6B] flex items-center justify-center gap-1">
            <i className="ri-shield-check-fill text-sm text-[#0096FF]"></i>
            Your data is secure and encrypted
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
