import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenState, setTokenState] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const resetToken = searchParams.get('token') || '';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!resetToken) {
        if (!cancelled) {
          setTokenState('invalid');
          setError('Invalid or expired reset link. Please request a new one.');
        }
        return;
      }
      try {
        const data = await apiFetch<{ valid: boolean }>(
          `/api/auth/reset-password/validate?token=${encodeURIComponent(resetToken)}`,
        );
        if (!cancelled) {
          setTokenState(data.valid ? 'valid' : 'invalid');
          if (!data.valid) {
            setError('Invalid or expired reset link. Please request a new one.');
          }
        }
      } catch {
        if (!cancelled) {
          setTokenState('invalid');
          setError('Invalid or expired reset link. Please request a new one.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(resetToken, password);
      setSuccess(true);
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const checking = tokenState === 'checking';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="ri-phone-line text-3xl text-white"></i>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
          <p className="text-gray-600">
            {success ? 'Password updated successfully!' : 'Enter your new password below'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {checking && !success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 text-sm">Verifying your reset link…</p>
            </div>
          ) : tokenState === 'invalid' ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <i className="ri-error-warning-line text-3xl text-red-600"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Reset Link</h3>
                <p className="text-gray-600 text-sm">{error || 'This password reset link is invalid or has expired.'}</p>
              </div>
              <Link
                to="/forgot-password"
                className="inline-block bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-medium"
              >
                Request New Link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <i className="ri-check-line text-3xl text-green-600"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Updated!</h3>
                <p className="text-gray-600 text-sm">Redirecting to sign in...</p>
              </div>
              <Link to="/signin" className="inline-block bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-medium">
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
              <div className="text-center">
                <Link to="/signin" className="text-sm text-gray-600">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
