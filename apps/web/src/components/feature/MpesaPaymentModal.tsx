import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';

interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed';
  receipt: string | null;
  message: string | null;
}

type Step = 'phone' | 'sending' | 'waiting' | 'paid' | 'failed';

const POLL_MS = 3000;
// Safaricom ends an unanswered prompt after about a minute; allow a little longer.
const GIVE_UP_MS = 2.5 * 60 * 1000;

/**
 * Pay with M-Pesa: the person enters their Safaricom number, gets a PIN prompt on their phone,
 * and this waits until the server has confirmed the payment with Safaricom.
 * `start(phone)` asks the API to send the prompt and resolves to the payment id.
 */
export default function MpesaPaymentModal({
  title,
  amountLabel,
  start,
  onPaid,
  onClose,
}: {
  title: string;
  amountLabel: string;
  start: (phone: string) => Promise<string>;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(() => localStorage.getItem('openear_mpesa_phone') ?? '');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  // Poll the payment until it ends (or we give up waiting).
  useEffect(() => {
    if (step !== 'waiting' || !paymentId) return;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const poll = async () => {
      try {
        const p = await apiFetch<PaymentStatus>(`/api/payments/${paymentId}`);
        if (cancelled) return;
        if (p.status === 'completed') {
          setReceipt(p.receipt);
          setStep('paid');
          onPaidRef.current();
          return;
        }
        if (p.status === 'failed') {
          setError(p.message ?? 'The payment did not go through.');
          setStep('failed');
          return;
        }
      } catch {
        // A dropped connection: keep trying until the time limit.
      }
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setError("We haven't heard back from M-Pesa. If money left your account, it will show up shortly; otherwise try again.");
        setStep('failed');
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, paymentId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('sending');
    try {
      const id = await start(phone);
      localStorage.setItem('openear_mpesa_phone', phone);
      setPaymentId(id);
      setStep('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send the M-Pesa prompt.');
      setStep('phone');
    }
  };

  const busy = step === 'sending' || step === 'waiting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="mpesa-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="mpesa-title" className="text-xl font-bold text-oe-ink">{title}</h2>
            <p className="text-sm text-oe-muted">{amountLabel} · paid with M-Pesa</p>
          </div>
          {!busy && (
            <button onClick={onClose} aria-label="Close" className="cursor-pointer text-oe-muted hover:text-oe-ink">
              <i className="ri-close-line text-2xl" aria-hidden="true"></i>
            </button>
          )}
        </div>

        {(step === 'phone' || step === 'sending') && (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="mpesa-phone" className="block text-sm font-medium text-oe-ink">
              Safaricom number
            </label>
            <input
              id="mpesa-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="w-full rounded-xl border-2 border-oe-line px-4 py-3 focus:border-oe-primary focus:outline-none"
            />
            {error && (
              <p role="alert" className="text-sm text-oe-crisis">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full cursor-pointer rounded-xl bg-oe-primary py-3 font-semibold text-white hover:bg-oe-primary-hover disabled:opacity-50"
            >
              {step === 'sending' ? 'Sending prompt…' : `Pay ${amountLabel}`}
            </button>
            <p className="text-xs text-oe-muted">You'll get an M-Pesa prompt on your phone. Enter your PIN there to pay.</p>
          </form>
        )}

        {step === 'waiting' && (
          <div className="py-6 text-center" role="status" aria-live="polite">
            <i className="ri-smartphone-line mb-3 block text-4xl text-oe-primary" aria-hidden="true"></i>
            <p className="font-semibold text-oe-ink">Check your phone</p>
            <p className="mt-1 text-sm text-oe-muted">Enter your M-Pesa PIN in the prompt. We'll confirm here as soon as it's done.</p>
          </div>
        )}

        {step === 'paid' && (
          <div className="py-6 text-center" role="status">
            <i className="ri-checkbox-circle-fill mb-3 block text-4xl text-forest-600" aria-hidden="true"></i>
            <p className="font-semibold text-oe-ink">Payment received</p>
            {receipt && <p className="mt-1 text-sm text-oe-muted">M-Pesa receipt {receipt}</p>}
            <button onClick={onClose} className="mt-5 cursor-pointer rounded-xl bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover">
              Done
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="py-4 text-center">
            <p role="alert" className="text-sm text-oe-crisis">
              {error}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={onClose} className="cursor-pointer rounded-xl border-2 border-oe-line px-5 py-2 font-medium text-oe-ink">
                Close
              </button>
              <button
                onClick={() => {
                  setError('');
                  setStep('phone');
                }}
                className="cursor-pointer rounded-xl bg-oe-primary px-5 py-2 font-semibold text-white hover:bg-oe-primary-hover"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
