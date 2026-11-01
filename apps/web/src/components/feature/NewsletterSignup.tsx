import { useId, useState, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';

/** Small inline newsletter form for dark footers. Replaces the old timed popup. */
export default function NewsletterSignup() {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    try {
      await apiFetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email: trimmed }) });
      setStatus('success');
      setMessage('Thank you. You’re subscribed.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-sm">
      <label htmlFor={inputId} className="block text-sm uppercase text-white/80 mb-2 tracking-wider">
        Gentle updates by email
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-oe-sm border border-white/50 bg-white/10 px-4 py-2.5 text-body text-white placeholder:text-white/60 focus:border-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="oe-btn rounded-oe-sm bg-white px-4 py-2.5 font-semibold text-oe-deep disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>
      <p aria-live="polite" className={`mt-2 text-sm ${status === 'error' ? 'text-oe-crisis-tint' : 'text-white/85'}`}>
        {status === 'success' || status === 'error' ? message : 'No spam. Unsubscribe anytime.'}
      </p>
    </form>
  );
}
