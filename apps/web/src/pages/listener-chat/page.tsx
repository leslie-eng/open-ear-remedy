import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CREDITS_PER_CALL_MINUTE } from '@openear/shared/pricing';
import { MAX_CHAT_MESSAGE_CHARS } from '@openear/shared/calls';
import Navbar from '../../components/feature/Navbar';
import NotesNotice from '../../components/feature/NotesNotice';
import SiteFooter from '../../components/feature/SiteFooter';
import CrisisLink from '../../components/ui/CrisisLink';
import { useAuth } from '../../contexts/AuthContext';
import { useTextChatSession } from '../../hooks/useTextChatSession';
import { useNotesNoticeGate } from '../../hooks/useNotesNoticeGate';
import { apiFetch } from '../../lib/api';
import { useSEO } from '../../utils/seo';

const END_LABELS: Record<string, string> = {
  hangup: 'The chat has ended.',
  dropped: 'The connection was lost and the chat ended.',
  time_limit: 'Your chat time ran out.',
  no_answer: 'No Listener was free to answer. Please try again soon.',
  cancelled: 'You cancelled the request.',
};

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Text Chat with a Listener: like a Call, but typed. Same price and rules; nothing is saved. */
export default function ListenerChatPage() {
  useSEO({
    title: 'Text a Listener | Open Ear',
    description: 'Type with a trained Open Ear Listener in real time. Private, and never saved.',
    keywords: 'text a listener, emotional support chat, talk to someone',
    canonical: '/listener-chat',
  });

  const { user, loading } = useAuth();
  const chat = useTextChatSession();
  const notesGate = useNotesNoticeGate();
  // Joining a booked text chat from the dashboard: /listener-chat?booking=<id>.
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  const [displayName, setDisplayName] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { phase } = chat.state;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.state.lines.length]);

  const begin = async () => {
    setError('');
    try {
      await apiFetch('/api/user/display-name', { method: 'PUT', body: JSON.stringify({ displayName }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your display name.');
      return;
    }
    await notesGate.gate(() => chat.start(bookingId ?? undefined));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (chat.send(draft)) setDraft('');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      {notesGate.noticeOpen && <NotesNotice onChoose={(allow) => void notesGate.choose(allow)} onCancel={notesGate.cancel} />}
      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-chat-3-line" aria-hidden="true" /> Text Chat
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Text a Listener</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Type with a trained Listener in real time. {CREDITS_PER_CALL_MINUTE} credits a minute, the same as a call. Nothing you
          type is saved.
        </p>
        <CrisisLink className="mt-3" />

        {!user ? (
          <section className="mt-10 rounded-3xl border border-oe-line bg-white p-8 text-center">
            <p className="text-oe-muted">Sign in to text a Listener.</p>
            <Link
              to="/signin"
              state={{ returnTo: bookingId ? `/listener-chat?booking=${bookingId}` : '/listener-chat' }}
              className="oe-btn mt-5 inline-block rounded-full bg-oe-primary px-8 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              Sign in
            </Link>
          </section>
        ) : phase === 'idle' || phase === 'ended' ? (
          <>
            {phase === 'ended' && chat.state.endReason && (
              <p role="status" className="mt-8 rounded-2xl bg-oe-primary-tint px-5 py-3 text-sm text-oe-ink">
                {END_LABELS[chat.state.endReason] ?? 'The chat has ended.'}
                {chat.state.billedSeconds > 0 && ` Chat time ${formatTime(chat.state.billedSeconds)}.`}
                {chat.state.billedSeconds > 0 && chat.state.callId && (
                  <>
                    {' '}
                    <Link to={`/book?again=${chat.state.callId}`} className="font-medium text-oe-primary underline">
                      Book again with this Listener
                    </Link>
                  </>
                )}
              </p>
            )}
            {(error || chat.state.error) && (
              <p role="alert" className="mt-6 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis">
                {error || chat.state.error}
              </p>
            )}
            <section className="mt-8 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                  <i className="ri-user-heart-line" />
                </span>
                <div>
                  <h2 className="font-sans text-lg font-semibold">
                    {bookingId && phase !== 'ended' ? 'Your booked chat' : 'A trained Listener'}
                  </h2>
                  <p className="text-sm text-oe-muted">
                    {bookingId && phase !== 'ended'
                      ? 'Your Listener is expecting you. Join when you’re ready.'
                      : 'The first free Listener will answer. You’re only charged once you’re chatting.'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="display-name" className="block text-sm font-medium">
                  Name the Listener will see (optional)
                </label>
                <input
                  id="display-name"
                  value={displayName}
                  maxLength={40}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Anonymous"
                  className="mt-2 w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                />
                <p className="mt-2 text-xs text-oe-muted">Listeners never see your email or phone number.</p>
              </div>
            </section>

            <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-3xl bg-oe-surface p-5 sm:flex-row">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link to="/call" className="px-2 font-medium text-oe-primary hover:underline">
                  Prefer to talk? Call a Listener
                </Link>
                <Link to="/book" className="px-2 font-medium text-oe-primary hover:underline">
                  Book a time
                </Link>
              </div>
              <button
                onClick={() => void begin()}
                className="oe-btn inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-oe-primary px-8 py-3.5 font-semibold text-white hover:bg-oe-primary-hover sm:w-auto"
              >
                {bookingId && phase !== 'ended' ? 'Join my booked chat' : phase === 'ended' ? 'Start another chat' : 'Find a Listener'}
                <i className="ri-arrow-right-line" aria-hidden="true" />
              </button>
            </div>
          </>
        ) : phase === 'ringing' || phase === 'waiting' ? (
          <section className="mt-10 rounded-3xl border border-oe-line bg-white p-8 text-center md:p-12" role="status" aria-live="polite">
            <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
              <i className="ri-chat-heart-line" />
            </span>
            <p className="mt-5 font-heading text-2xl font-semibold">
              {phase === 'waiting' ? 'Waiting for your Listener to join…' : 'Finding a Listener…'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-oe-muted">
              {phase === 'waiting'
                ? 'They’ll be with you shortly. Stay on this page; you’re only charged once you’re chatting.'
                : 'This usually takes under a minute. You are not charged until someone joins.'}
            </p>
            <button
              onClick={chat.end}
              className="mt-8 cursor-pointer rounded-full border border-oe-line bg-white px-6 py-2.5 font-medium text-oe-ink hover:bg-oe-surface"
            >
              Cancel
            </button>
          </section>
        ) : (
          <section className="mt-8 flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-oe-line bg-white">
            <div className="flex items-center gap-3 border-b border-oe-line px-5 py-4">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                <i className="ri-user-heart-line" />
              </span>
              <div className="flex-1">
                <h2 className="font-sans text-base font-semibold">You&apos;re chatting with a Listener</h2>
                <p className="text-xs text-oe-muted">
                  {formatTime(chat.state.elapsed)} of {formatTime(chat.state.maxSeconds)}
                  {chat.state.peerReconnecting && ' · the Listener’s connection dropped, waiting…'}
                </p>
              </div>
              <button
                onClick={chat.end}
                className="shrink-0 cursor-pointer rounded-full bg-oe-crisis px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                End chat
              </button>
            </div>
            {chat.state.lowTimeWarning && (
              <p role="alert" className="bg-oe-accent-tint px-5 py-2 text-sm font-medium text-oe-accent">
                About 2 minutes of chat time left.
              </p>
            )}
            <div className="flex-1 space-y-3 overflow-y-auto bg-oe-surface-low/40 p-5" aria-live="polite">
              {chat.state.lines.length === 0 && (
                <p className="text-center text-sm text-oe-muted">Say hello whenever you&apos;re ready.</p>
              )}
              {chat.state.lines.map((line) => (
                <div key={line.id} className={`flex ${line.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <p
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      line.from === 'me' ? 'rounded-br-md bg-oe-primary text-white' : 'rounded-bl-md bg-oe-surface text-oe-ink'
                    }`}
                  >
                    {line.text}
                  </p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-oe-line p-3 md:p-4">
              <label htmlFor="chat-draft" className="sr-only">
                Message
              </label>
              <input
                id="chat-draft"
                value={draft}
                maxLength={MAX_CHAT_MESSAGE_CHARS}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message"
                autoComplete="off"
                className="flex-1 rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="cursor-pointer rounded-full bg-oe-primary px-6 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
