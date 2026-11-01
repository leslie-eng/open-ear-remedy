import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { canJoin, type Booking } from '@openear/shared/booking';
import { apiFetch } from '../../lib/api';
import { STATUS_LABELS, downloadCalendarFile, formatBookingTime, joinPath } from '../../lib/bookings';

/** The person's booked Conversations: Join (5 minutes before), cancel, add to calendar. */
export default function MyBookingsCard() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    apiFetch<{ bookings: Booking[] }>('/api/bookings/mine')
      .then((d) => setBookings(d.bookings))
      .catch(() => setBookings([]));
  }, []);

  useEffect(load, [load]);
  // Re-check every 30 seconds so the Join button appears on time.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this booking? Your held credits come straight back.')) return;
    setError('');
    try {
      await apiFetch(`/api/bookings/${id}/cancel`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel.');
    }
  };

  const upcoming = (bookings ?? []).filter((b) => b.status === 'booked' || b.status === 'joined');
  const past = (bookings ?? []).filter((b) => b.status !== 'booked' && b.status !== 'joined').slice(0, 5);

  return (
    <section aria-labelledby="bookings-heading" className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 id="bookings-heading" className="text-xl font-semibold">
          Your bookings
        </h2>
        <Link to="/book" className="rounded-full bg-oe-surface px-4 py-2 text-sm font-medium text-oe-ink hover:bg-oe-primary-tint">
          Book a time
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-oe-crisis-tint px-4 py-2 text-sm text-oe-crisis">
          {error}
        </p>
      )}
      {bookings === null ? (
        <p className="mt-4 text-sm text-oe-muted">Loading…</p>
      ) : upcoming.length === 0 ? (
        <p className="mt-4 text-sm text-oe-muted">Nothing booked. Prefer a set time? Book one, and cancelling is always free.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {upcoming.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 rounded-2xl bg-oe-surface-low p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{formatBookingTime(b.startsAt)}</p>
                <p className="text-sm text-oe-muted">
                  {b.minutes} minutes · {b.mode === 'text' ? 'Text chat' : 'Call'} · {STATUS_LABELS[b.status]}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canJoin(b, now) ? (
                  <Link to={joinPath(b)} className="rounded-full bg-oe-primary px-5 py-2 text-sm font-semibold text-white hover:bg-oe-primary-hover">
                    Join
                  </Link>
                ) : (
                  <span className="text-xs text-oe-muted">Join opens 5 min before</span>
                )}
                <button
                  onClick={() => void downloadCalendarFile(b.id).catch(() => setError('Could not get the calendar file.'))}
                  aria-label="Add to calendar"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-oe-ink"
                >
                  <i className="ri-calendar-event-line" aria-hidden="true" />
                </button>
                {b.status === 'booked' && (
                  <button onClick={() => void cancel(b.id)} className="cursor-pointer px-2 text-sm text-oe-muted hover:text-oe-crisis">
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-oe-muted">Earlier bookings</summary>
          <ul className="mt-2 space-y-1">
            {past.map((b) => (
              <li key={b.id} className="text-oe-muted">
                {formatBookingTime(b.startsAt)} · {STATUS_LABELS[b.status]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
