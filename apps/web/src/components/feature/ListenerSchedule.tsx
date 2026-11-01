import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { SLOT_SPACING_MINUTES, type Booking, type OpenSlot } from '@openear/shared/booking';
import { apiFetch } from '../../lib/api';
import { downloadCalendarFile, formatBookingTime } from '../../lib/bookings';

interface Schedule {
  slots: OpenSlot[];
  bookings: Booking[];
  allowRebook: boolean;
}

/** A Listener's free times and booked Conversations. Being online in the console at the time is how they join. */
/** `refreshKey` changes when a Conversation ends, so finished bookings drop off the list. */
export default function ListenerSchedule({ refreshKey }: { refreshKey?: string | null }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [when, setWhen] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    apiFetch<Schedule>('/api/bookings/listener/schedule')
      .then(setSchedule)
      .catch(() => setSchedule({ slots: [], bookings: [], allowRebook: true }));
  }, []);
  useEffect(load, [load, refreshKey]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!when) return;
    setError('');
    try {
      setSchedule(
        await apiFetch<Schedule>('/api/bookings/listener/slots', {
          method: 'POST',
          body: JSON.stringify({ startsAt: [new Date(when).toISOString()] }),
        }),
      );
      setWhen('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that time.');
    }
  };

  const remove = async (slotId: string) => {
    setError('');
    try {
      await apiFetch(`/api/bookings/listener/slots/${slotId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that time.');
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this booking? The person gets their credits back and an email to say sorry.')) return;
    try {
      await apiFetch(`/api/bookings/${id}/cancel`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel.');
    }
  };

  const setRebook = async (allow: boolean) => {
    setSchedule(await apiFetch<Schedule>('/api/bookings/listener/rebook', { method: 'PUT', body: JSON.stringify({ allow }) }));
  };

  return (
    <section aria-labelledby="schedule-heading" className="rounded-3xl border border-oe-line bg-white p-6 text-left md:p-8">
      <h2 id="schedule-heading" className="text-xl font-semibold">
        Your schedule
      </h2>
      <p className="mt-1 text-sm text-oe-muted">
        Add times you&rsquo;re free for bookings. Be online here 5 minutes before a booking; the person is connected to you
        directly.
      </p>

      {schedule && schedule.bookings.length > 0 && (
        <ul className="mt-5 space-y-2">
          {schedule.bookings.map((b) => (
            <li key={b.id} className="flex flex-col gap-2 rounded-2xl bg-oe-primary-tint p-4 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block font-medium">{formatBookingTime(b.startsAt)}</span>
                <span className="text-sm text-oe-muted">
                  {b.clientName} · {b.minutes} min · {b.mode === 'text' ? 'Text chat' : 'Call'}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  onClick={() => void downloadCalendarFile(b.id).catch(() => setError('Could not get the calendar file.'))}
                  className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-sm"
                >
                  Add to calendar
                </button>
                {b.status === 'booked' && (
                  <button onClick={() => void cancel(b.id)} className="cursor-pointer px-2 text-sm text-oe-muted hover:text-oe-crisis">
                    Cancel
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void add(e)} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="free-time" className="sr-only">
          Free time
        </label>
        <input
          id="free-time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="flex-1 rounded-xl border border-oe-line bg-oe-surface-low px-4 py-2.5 focus:border-oe-primary focus:outline-none"
        />
        <button type="submit" disabled={!when} className="cursor-pointer rounded-xl bg-oe-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50">
          Add free time
        </button>
      </form>
      <p className="mt-1 text-xs text-oe-muted">Up to 14 days ahead, at least {SLOT_SPACING_MINUTES} minutes apart, in your time zone.</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-oe-crisis">
          {error}
        </p>
      )}

      {schedule && schedule.slots.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {schedule.slots.map((s) => (
            <li key={s.slotId} className="flex items-center gap-1 rounded-full bg-oe-surface px-3 py-1.5 text-sm">
              {formatBookingTime(s.startsAt)}
              <button onClick={() => void remove(s.slotId)} aria-label={`Remove ${formatBookingTime(s.startsAt)}`} className="cursor-pointer px-1 text-oe-muted hover:text-oe-crisis">
                <i className="ri-close-line" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {schedule && (
        <label className="mt-5 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={schedule.allowRebook} onChange={(e) => void setRebook(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--oe-primary))]" />
          Let people choose &ldquo;Book again with this Listener&rdquo; (they still won&rsquo;t see who you are)
        </label>
      )}
    </section>
  );
}
