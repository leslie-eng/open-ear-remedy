import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BOOKING_MINUTES, type Booking, type BookingMinutes, type OpenSlot } from '@openear/shared/booking';
import { CREDITS_PER_CALL_MINUTE } from '@openear/shared/pricing';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { downloadCalendarFile, formatBookingTime } from '../../lib/bookings';
import { useSEO } from '../../utils/seo';

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
const timeLabel = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function Choice({ on, onClick, title, body, icon }: { on: boolean; onClick: () => void; title: string; body: string; icon: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
        on ? 'border-oe-primary bg-oe-primary-tint' : 'border-oe-line bg-white hover:border-oe-primary/40'
      }`}
    >
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-surface text-oe-primary">
        <i className={icon} />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-oe-muted">{body}</span>
      </span>
    </button>
  );
}

export default function BookPage() {
  useSEO({
    title: 'Book a time | Open Ear',
    description: 'Book a call or text chat with a trained Listener at a time that suits you.',
    keywords: 'book a listener, schedule a call, talk to someone later',
    canonical: '/book',
  });

  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const again = params.get('again');
  const [minutes, setMinutes] = useState<BookingMinutes>(30);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [slots, setSlots] = useState<OpenSlot[] | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ slots: OpenSlot[] }>(`/api/bookings/slots${again ? `?again=${encodeURIComponent(again)}` : ''}`)
      .then((d) => setSlots(d.slots))
      .catch((err) => {
        setSlots([]);
        setError(err instanceof Error ? err.message : 'Could not load free times.');
      });
  }, [user, again]);

  const days = useMemo(() => {
    const groups = new Map<string, OpenSlot[]>();
    for (const slot of slots ?? []) groups.set(dayKey(slot.startsAt), [...(groups.get(dayKey(slot.startsAt)) ?? []), slot]);
    return [...groups.values()];
  }, [slots]);

  const chosen = slots?.find((s) => s.slotId === slotId) ?? null;

  const confirm = async () => {
    if (!slotId) return;
    setSaving(true);
    setError('');
    try {
      const { booking } = await apiFetch<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ slotId, minutes, mode, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      setBooked(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book that time.');
      // Someone else may have taken it: refresh the list.
      apiFetch<{ slots: OpenSlot[] }>(`/api/bookings/slots${again ? `?again=${encodeURIComponent(again)}` : ''}`)
        .then((d) => setSlots(d.slots))
        .catch(() => {});
      setSlotId(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-calendar-line" aria-hidden="true" /> Book a time
        </p>
        <h1 className="mt-4 text-4xl font-bold">{again ? 'Book again with your Listener.' : 'Pick a time that suits you.'}</h1>
        <p className="mt-3 text-oe-muted">
          {again
            ? 'Only this Listener’s free times are shown. You still won’t see who they are, and they won’t see more than your chosen name.'
            : 'A trained Listener will be there at the time you choose. Cancelling is always free.'}
        </p>

        {!user ? (
          <div className="mt-10 rounded-3xl border border-oe-line bg-white p-8 text-center">
            <p className="text-oe-muted">Sign in to book a time.</p>
            <Link
              to="/signin"
              state={{ returnTo: `/book${again ? `?again=${again}` : ''}` }}
              className="mt-5 inline-block rounded-full bg-oe-primary px-8 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              Sign in
            </Link>
          </div>
        ) : booked ? (
          <section className="mt-10 rounded-3xl border border-oe-line bg-white p-8 text-center" role="status">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
              <i className="ri-check-line" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">You&rsquo;re booked.</h2>
            <p className="mt-2 text-oe-muted">
              {formatBookingTime(booked.startsAt)} · {booked.minutes} minutes · {booked.mode === 'text' ? 'text chat' : 'call'}
            </p>
            <p className="mt-2 text-sm text-oe-muted">
              We&rsquo;ll email you a day and an hour before. The Join button appears on your dashboard 5 minutes before.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => void downloadCalendarFile(booked.id).catch(() => setError('Could not get the calendar file.'))}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-surface px-6 py-3 font-medium"
              >
                <i className="ri-calendar-event-line" aria-hidden="true" /> Add to calendar
              </button>
              <Link to="/dashboard" className="rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover">
                Go to my dashboard
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-oe-muted">How long?</h2>
              <div role="radiogroup" aria-label="Length" className="mt-3 flex flex-col gap-3 sm:flex-row">
                {BOOKING_MINUTES.map((m) => (
                  <Choice
                    key={m}
                    on={minutes === m}
                    onClick={() => setMinutes(m)}
                    icon="ri-hourglass-line"
                    title={`${m} minutes`}
                    body={`${m * CREDITS_PER_CALL_MINUTE} credits held, only time used is charged`}
                  />
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-oe-muted">Call or text?</h2>
              <div role="radiogroup" aria-label="Call or text" className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Choice on={mode === 'voice'} onClick={() => setMode('voice')} icon="ri-phone-line" title="Call" body="Talk out loud from your browser" />
                <Choice on={mode === 'text'} onClick={() => setMode('text')} icon="ri-chat-3-line" title="Text chat" body="Type with your Listener in real time" />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-oe-muted">When?</h2>
              {slots === null ? (
                <p className="mt-3 text-sm text-oe-muted">Loading free times…</p>
              ) : days.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-oe-line bg-white p-6 text-sm text-oe-muted">
                  No free times in the next 14 days{again ? ' for this Listener' : ''}. You can{' '}
                  <Link to="/call" className="font-medium text-oe-primary underline">
                    talk now
                  </Link>{' '}
                  if a Listener is free{again ? (
                    <>
                      , or{' '}
                      <Link to="/book" className="font-medium text-oe-primary underline">
                        book any Listener
                      </Link>
                    </>
                  ) : null}
                  .
                </div>
              ) : (
                <div className="mt-3 space-y-5">
                  {days.map((daySlots) => (
                    <div key={daySlots[0].startsAt}>
                      <p className="mb-2 text-sm font-medium">{dayLabel(daySlots[0].startsAt)}</p>
                      <div role="radiogroup" aria-label={dayLabel(daySlots[0].startsAt)} className="flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.slotId}
                            role="radio"
                            aria-checked={slot.slotId === slotId}
                            onClick={() => setSlotId(slot.slotId)}
                            className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-medium ${
                              slot.slotId === slotId
                                ? 'border-oe-primary bg-oe-primary text-white'
                                : 'border-oe-line bg-white text-oe-ink hover:border-oe-primary/40'
                            }`}
                          >
                            {timeLabel(slot.startsAt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-oe-muted">Times are shown in your time zone.</p>
            </section>

            {error && (
              <p role="alert" className="mt-6 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl bg-oe-surface p-5 sm:flex-row">
              <p className="text-sm text-oe-muted">
                {chosen
                  ? `${formatBookingTime(chosen.startsAt)} · ${minutes} min · ${mode === 'text' ? 'text chat' : 'call'}`
                  : 'Choose a time to continue.'}
              </p>
              <button
                onClick={() => void confirm()}
                disabled={!chosen || saving}
                className="oe-btn inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-8 py-3.5 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Booking…' : 'Book this time'}
              </button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
