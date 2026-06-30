import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useSEO } from '../../utils/seo';
import Navbar from '../../components/feature/Navbar';

const supabase = createClient(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
);

export default function SignInPage() {
  // SEO Configuration - noindex for auth pages
  useSEO({
    title: 'Sign In - Open Ear',
    description: 'Sign in to your Open Ear account to access emotional support services.',
    keywords: 'sign in, login, account access',
    canonical: '/signin',
  });

  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          }
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
          setError(''); // Clear any errors
          setVerificationSent(true);
        } else if (data.session) {
          // Auto-confirmed (e.g., if email confirmation is disabled)
          navigate('/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Check if it's an unverified email error
          if (error.message.includes('Email not confirmed')) {
            setError('Please verify your email before signing in. Check your inbox for the verification link.');
            setLoading(false);
            return;
          }
          throw error;
        }

        if (data.user) {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setError('');
    setSuccess('');
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });
      
      if (error) throw error;
      setSuccess('Verification email resent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResendingVerification(false);
    }
  };

  // Verification Sent Screen
  if (verificationSent) {
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
                <i className="ri-mail-check-fill text-3xl text-green-600"></i>
              </div>
              
              <h2 className="text-xl font-bold text-[#2A2A2A] mb-2">
                Verify Your Email
              </h2>
              
              <p className="text-sm text-[#6B6B6B] mb-2">
                We've sent a verification link to:
              </p>
              
              <p className="text-sm font-semibold text-[#0096FF] mb-5">
                {email}
              </p>
              
              <div className="bg-[#E6F5FF] rounded-xl p-4 mb-5">
                <p className="text-sm text-[#2A2A2A]">
                  <i className="ri-information-fill text-[#0096FF] mr-2"></i>
                  Click the link in your email to activate your account and start using Open Ear.
                </p>
              </div>

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
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="w-full py-2.5 bg-white border-2 border-[#0096FF] text-[#0096FF] rounded-lg font-semibold text-sm hover:bg-[#E6F5FF] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
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
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full py-2.5 bg-[#0096FF] text-white rounded-lg font-semibold text-sm hover:bg-[#0077CC] transition-all whitespace-nowrap cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
              
              <p className="text-xs text-[#6B6B6B] mt-5">
                Didn't receive the email? Check your spam folder or try a different email address.
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
            <form onSubmit={handleSubmit} className="space-y-3">
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
                    placeholder={isSignUp ? 'Create a password (min. 6 characters)' : 'Enter your password'}
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