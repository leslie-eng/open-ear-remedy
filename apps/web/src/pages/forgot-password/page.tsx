import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-md px-5 pb-20 pt-28 md:px-8">
        <div className="text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
            <i className={sent ? 'ri-mail-check-line' : 'ri-key-2-line'} />
          </span>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{sent ? 'Check your email.' : 'Forgot your password?'}</h1>
          <p className="mt-3 text-oe-muted">
            {sent
              ? 'If there’s an account for that email, a reset link is on its way.'
              : 'It happens. Enter your email and we’ll send you a link to set a new one.'}
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <p role="alert" className="rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <p role="status" className="rounded-2xl bg-oe-primary-tint px-5 py-3 text-sm">
                Reset link sent to <span className="font-semibold">{email}</span>
              </p>
              <p className="text-sm text-oe-muted">Can&rsquo;t see it? Check your spam folder.</p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="cursor-pointer rounded-full bg-oe-surface px-5 py-2.5 font-medium text-oe-ink"
              >
                Try a different email
              </button>
            </div>
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
