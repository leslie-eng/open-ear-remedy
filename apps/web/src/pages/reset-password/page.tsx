import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
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
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-md px-5 pb-20 pt-28 md:px-8">
        <div className="text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
            <i className="ri-lock-password-line" />
          </span>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">Set a new password.</h1>
          <p className="mt-3 text-oe-muted">
            {success ? 'Your password has been updated.' : 'Choose a password with at least 6 characters.'}
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          {checking && !success ? (
            <div className="space-y-4 py-6 text-center" role="status">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-oe-primary border-t-transparent" aria-hidden="true" />
              <p className="text-sm text-oe-muted">Checking your reset link…</p>
            </div>
          ) : tokenState === 'invalid' ? (
            <div className="space-y-5 text-center">
              <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-crisis-tint text-2xl text-oe-crisis">
                <i className="ri-link-unlink" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">This link has expired</h2>
                <p role="alert" className="mt-2 text-sm text-oe-muted">
                  {error || 'This password reset link is invalid or has expired.'}
                </p>
              </div>
              <Link to="/forgot-password" className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover">
                Request a new link
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-5 text-center" role="status">
              <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
                <i className="ri-check-line" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Password updated</h2>
                <p className="mt-2 text-sm text-oe-muted">Taking you to sign in…</p>
              </div>
              <Link to="/signin" className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover">
                Go to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <p role="alert" className="rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  New password
                </label>
                <input
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium">
                  Confirm new password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </section>

        <p className="mt-6 text-center text-sm">
          <Link to="/signin" className="inline-flex items-center gap-1 font-medium text-oe-primary hover:underline">
            <i className="ri-arrow-left-line" aria-hidden="true" /> Back to sign in
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
