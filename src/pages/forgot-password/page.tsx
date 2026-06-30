import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        // Handle rate limit error specifically
        if (resetError.message.includes('rate limit')) {
          throw new Error('Too many reset attempts. Please wait a few minutes before trying again.');
        }
        throw resetError;
      }

      setSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSent(false);
    setEmail('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="ri-phone-line text-3xl text-white"></i>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            {sent ? 'Check your email' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <i className="ri-error-warning-fill text-lg flex-shrink-0 mt-0.5"></i>
                    <div>
                      <p className="font-medium mb-1">Unable to send reset email</p>
                      <p>{error}</p>
                      {error.includes('rate limit') && (
                        <p className="mt-2 text-xs">
                          This is a security measure. Please wait 5-10 minutes before requesting another reset email.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center space-y-2">
                <Link
                  to="/signin"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium inline-block"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
                <i className="ri-mail-check-line text-3xl text-teal-600"></i>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h3>
                <p className="text-gray-600 text-sm">
                  We've sent a password reset link to:
                </p>
                <p className="text-teal-600 font-medium mt-1">{email}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-700">
                  <strong>Next steps:</strong>
                </p>
                <ol className="text-sm text-gray-600 mt-2 space-y-1 list-decimal list-inside">
                  <li>Check your email inbox</li>
                  <li>Click the reset link in the email</li>
                  <li>Enter your new password</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-2">
                  <i className="ri-information-fill text-yellow-600 flex-shrink-0 mt-0.5"></i>
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium mb-1">Important:</p>
                    <p>If you don't receive the email within 5 minutes, please wait at least 10 minutes before requesting another reset link due to security rate limits.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResend}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Try a different email address
                </button>
                <div>
                  <Link
                    to="/signin"
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
