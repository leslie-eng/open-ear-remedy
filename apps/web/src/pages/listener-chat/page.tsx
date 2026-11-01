import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CREDITS_PER_CALL_MINUTE } from '@openear/shared/pricing';
import { MAX_CHAT_MESSAGE_CHARS } from '@openear/shared/calls';
import Navbar from '../../components/feature/Navbar';
import NotesNotice from '../../components/feature/NotesNotice';
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
    <div className="min-h-screen bg-oe-bg">
      <Navbar />
      {notesGate.noticeOpen && <NotesNotice onChoose={(allow) => void notesGate.choose(allow)} onCancel={notesGate.cancel} />}
      <main className="px-4 pb-12 pt-24 md:pt-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-oe-ink">Text a Listener</h1>
            <p className="mt-2 text-oe-muted">
              Type with a trained Listener in real time. {CREDITS_PER_CALL_MINUTE} credits a minute, the same as a call.
              Nothing you type is saved.
            </p>
            <CrisisLink className="mt-2 justify-center" />
          </div>

          {!user ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
              <p className="mb-6 text-oe-muted">Sign in to text a Listener.</p>
              <Link to="/signin" state={{ returnTo: '/listener-chat' }} className="inline-block rounded-2xl bg-oe-primary px-8 py-3 font-semibold text-white hover:bg-oe-primary-hover">
                Sign in
              </Link>
            </div>
          ) : phase === 'idle' || phase === 'ended' ? (
            <div className="rounded-3xl bg-white p-6 shadow-lg md:p-8">
              {phase === 'ended' && chat.state.endReason && (
                <p role="status" className="mb-4 rounded-xl bg-oe-primary-tint px-4 py-3 text-sm text-oe-ink">
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
                <p role="alert" className="mb-4 rounded-xl border border-oe-crisis bg-oe-crisis-tint px-4 py-3 text-sm text-oe-crisis">
                  {error || chat.state.error}
                </p>
              )}
              <label htmlFor="display-name" className="mb-2 block text-sm font-medium text-oe-ink">
                Name the Listener will see (optional)
              </label>
              <input
                id="display-name"
                value={displayName}
                maxLength={40}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Anonymous"
                className="mb-4 w-full rounded-xl border-2 border-oe-line px-4 py-3 focus:border-oe-primary focus:outline-none"
              />
              <button onClick={() => void begin()} className="w-full cursor-pointer rounded-2xl bg-oe-primary py-3 font-semibold text-white hover:bg-oe-primary-hover">
                {bookingId && phase !== 'ended' ? 'Join my booked chat' : phase === 'ended' ? 'Start another chat' : 'Find a Listener'}
              </button>
              <p className="mt-4 text-center text-sm">
                <Link to="/call" className="text-oe-primary hover:underline">
                  Prefer to talk? Call a Listener
                </Link>
              </p>
            </div>
          ) : phase === 'ringing' || phase === 'waiting' ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-lg" role="status" aria-live="polite">
              <i className="ri-chat-heart-line mb-3 block text-4xl text-oe-primary" aria-hidden="true"></i>
              <p className="font-semibold text-oe-ink">{phase === 'waiting' ? 'Waiting for your Listener to join…' : 'Finding a Listener…'}</p>
              <p className="mt-1 text-sm text-oe-muted">
                {phase === 'waiting'
                  ? 'They’ll be with you shortly. Stay on this page; you’re only charged once you’re chatting.'
                  : 'This usually takes under a minute. You are not charged until someone joins.'}
              </p>
              <button onClick={chat.end} className="mt-6 cursor-pointer rounded-xl border-2 border-oe-line px-6 py-2 font-medium text-oe-ink">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex h-[70vh] flex-col overflow-hidden rounded-3xl bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div>
                  <p className="font-semibold text-oe-ink">You&apos;re chatting with a Listener</p>
                  <p className="text-xs text-oe-muted">
                    {formatTime(chat.state.elapsed)} of {formatTime(chat.state.maxSeconds)}
                    {chat.state.peerReconnecting && ' · the Listener’s connection dropped, waiting…'}
                  </p>
                </div>
                <button onClick={chat.end} className="cursor-pointer rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
                  End chat
                </button>
              </div>
              {chat.state.lowTimeWarning && (
                <p role="alert" className="bg-orange-100 px-5 py-2 text-sm text-orange-700">
                  About 2 minutes of chat time left.
                </p>
              )}
              <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
                {chat.state.lines.length === 0 && (
                  <p className="text-center text-sm text-oe-muted">Say hello whenever you&apos;re ready.</p>
                )}
                {chat.state.lines.map((line) => (
                  <div key={line.id} className={`flex ${line.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <p
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                        line.from === 'me' ? 'rounded-br-md bg-oe-primary text-white' : 'rounded-bl-md bg-oe-surface text-oe-ink'
                      }`}
                    >
                      {line.text}
                    </p>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={submit} className="flex gap-2 border-t border-gray-100 p-3">
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
                  className="flex-1 rounded-xl border-2 border-oe-line px-4 py-2 focus:border-oe-primary focus:outline-none"
                />
                <button type="submit" disabled={!draft.trim()} className="cursor-pointer rounded-xl bg-oe-primary px-5 font-semibold text-white hover:bg-oe-primary-hover disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
