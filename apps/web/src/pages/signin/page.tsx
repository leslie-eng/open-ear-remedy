import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useSEO } from '../../utils/seo';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import GoogleSignInButton from '../../components/feature/GoogleSignInButton';
import { googleSignInAvailable } from '../../lib/googleIdentity';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../lib/api';

const inputClass =
  'mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30';
const primaryButton =
  'oe-btn inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

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
    title: 'Sign in | Open Ear',
    description: 'Sign in to Open Ear to talk with a trained Listener whenever you need to be heard.',
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
  const { user, signUp, signIn, signInWithGoogle, verifyOtp, resendOtp } = useAuth();

  const returnTo = safeReturnPath(location.state);

  const postSignInPath = () => returnTo ?? '/dashboard';
  const postSignUpPath = () => returnTo ?? '/';

  useEffect(() => {
    // Check if signup=true is in URL params
    if (searchParams.get('signup') === 'true') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  // Intentionally mount-only: redirect users who arrive here already signed in. Re-running on
  // `user` changes would race with the sign-up/verify flow, which navigates on its own.
  useEffect(() => {
    if (user) {
      navigate(safeReturnPath(location.state) ?? '/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async (credential: string) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signInWithGoogle(credential);
      navigate(postSignInPath(), { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
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


  const messages = (
    <>
      {error && (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
          <i className="ri-error-warning-line mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {success && (
        <p role="status" className="mt-6 flex items-start gap-2 rounded-2xl bg-oe-primary-tint px-5 py-3 text-sm text-oe-ink">
          <i className="ri-checkbox-circle-line mt-0.5 text-oe-primary" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}
    </>
  );

  // Code entry screen
  if (codeSent) {
    return (
      <div className="min-h-screen bg-oe-bg text-oe-ink">
        <Navbar />
        <main className="oe-route mx-auto max-w-md px-5 pb-20 pt-28 md:px-8">
          <div className="text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
              <i className="ri-mail-check-line" />
            </span>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Check your email.</h1>
            <p className="mt-3 text-oe-muted">
              We sent a code to <span className="font-semibold text-oe-ink">{email}</span>
            </p>
          </div>

          <section className="mt-8 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label htmlFor="verify-code" className="block text-sm font-medium">
                  Verification code
                </label>
                <input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${inputClass} text-center text-lg tracking-[0.4em]`}
                  placeholder="123456"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className={primaryButton}>
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin" aria-hidden="true" /> Checking…
                  </>
                ) : (
                  'Verify and continue'
                )}
              </button>
            </form>

            {messages}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendingCode}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-surface px-5 py-2.5 font-medium text-oe-ink disabled:opacity-50"
              >
                {resendingCode ? (
                  <>
                    <i className="ri-loader-4-line animate-spin" aria-hidden="true" /> Sending…
                  </>
                ) : (
                  <>
                    <i className="ri-refresh-line" aria-hidden="true" /> Send a new code
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setIsSignUp(false);
                  setError('');
                  setSuccess('');
                  setCode('');
                }}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-oe-line bg-white px-5 py-2.5 font-medium text-oe-ink"
              >
                <i className="ri-arrow-left-line" aria-hidden="true" /> Back
              </button>
            </div>
          </section>

          <p className="mt-5 text-center text-sm text-oe-muted">Didn&rsquo;t get it? Check your spam folder, or send a new code.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-md px-5 pb-20 pt-28 md:px-8">
        <div className="text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
            <i className={isSignUp ? 'ri-user-add-line' : 'ri-user-line'} aria-hidden="true" />
            {isSignUp ? 'Create an account' : 'Sign in'}
          </p>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{isSignUp ? 'Welcome to Open Ear.' : 'Welcome back.'}</h1>
          <p className="mt-3 text-oe-muted">
            {isSignUp
              ? 'An account lets you talk with a Listener whenever you need someone to hear you.'
              : 'Sign in to talk with a Listener or pick up where you left off.'}
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          {googleSignInAvailable && (
            <div className="mb-6">
              <GoogleSignInButton
                text={isSignUp ? 'signup_with' : 'signin_with'}
                onCredential={(credential) => void handleGoogle(credential)}
                onError={setError}
              />
              <div className="mt-6 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-oe-line" />
                <span className="text-xs text-oe-muted">or with email</span>
                <span className="h-px flex-1 bg-oe-line" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="signin-name" className="block text-sm font-medium">
                  Your name
                </label>
                <input
                  id="signin-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your full name"
                  required={isSignUp}
                />
                <p className="mt-1.5 text-xs text-oe-muted">Listeners never see this. You choose a separate name before each Conversation.</p>
              </div>
            )}

            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="signin-password" className="block text-sm font-medium">
                  Password
                </label>
                {!isSignUp && (
                  <Link to="/forgot-password" className="text-sm font-medium text-oe-primary hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                id="signin-password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="signin-confirm" className="block text-sm font-medium">
                  Confirm password
                </label>
                <input
                  id="signin-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Type it again"
                  required={isSignUp}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className={`${primaryButton} !mt-6`}>
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
                  {isSignUp ? 'Creating your account…' : 'Signing in…'}
                </>
              ) : isSignUp ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {messages}

          <div className="mt-6 rounded-2xl bg-oe-surface-low p-4 text-center text-sm text-oe-muted">
            {isSignUp ? 'Already have an account?' : 'New to Open Ear?'}{' '}
            <button
              type="button"
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
              className="cursor-pointer font-semibold text-oe-primary hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-oe-muted">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-oe-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-oe-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-3 text-center text-xs text-oe-muted">
          Not ready to sign in?{' '}
          <Link to="/check-in" className="text-oe-primary hover:underline">
            Try the check-in
          </Link>
          , no account needed.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
