import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MAX_CHAT_MESSAGE_CHARS, MAX_NOTE_CHARS, type ListenerNote } from '@openear/shared/calls';
import { Link } from 'react-router-dom';
import ListenerSchedule from '../../components/feature/ListenerSchedule';
import Navbar from '../../components/feature/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useListenerSession } from '../../hooks/useListenerSession';
import { useSEO } from '../../utils/seo';

const END_LABELS: Record<string, string> = {
  hangup: 'The call ended.',
  dropped: 'The connection was lost and the call ended.',
  time_limit: "The caller's time ran out.",
  no_answer: 'The call stopped ringing.',
  cancelled: 'The caller cancelled.',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Counts down a listener's quiet time after a call. */
function useSecondsUntil(at: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [at]);
  return at ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
}

export default function ListenerConsolePage() {
  useSEO({
    title: 'Listener Console | Open Ear',
    description: 'Console for Open Ear listeners to take calls.',
    keywords: 'Open Ear listener',
    canonical: '/listener',
  });

  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <div className="min-h-screen bg-oe-bg">
      <Navbar />
      <main className="pt-24 md:pt-28 px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          {user ? (
            <Console />
          ) : (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-oe-ink mb-3">Listener console</h1>
              <p className="text-oe-muted mb-6">Sign in with your listener account to take calls.</p>
              <Link to="/signin" className="inline-block px-8 py-3 bg-oe-primary text-white rounded-2xl font-semibold hover:bg-oe-primary-hover">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NotesPanel({ notes }: { notes: ListenerNote[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-oe-muted">No earlier notes about this person.</p>;
  }
  return (
    <ul className="space-y-2">
      {notes.map((n, i) => (
        <li key={i} className="rounded-xl bg-oe-surface-low p-3 text-sm">
          <p className="mb-1 text-xs text-oe-muted">
            {new Date(n.at).toLocaleDateString()} · {n.mode === 'text' ? 'Text chat' : 'Call'}
            {n.byYou && ' · your note'}
          </p>
          <p className="whitespace-pre-wrap text-oe-ink">{n.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Console() {
  const session = useListenerSession();
  const cooldownSeconds = useSecondsUntil(session.cooldownUntil);
  const [reportReason, setReportReason] = useState('');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const threadEnd = useRef<HTMLDivElement>(null);
  const lineCount = session.active?.lines.length ?? 0;

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lineCount]);

  const submitNote = async (e: FormEvent, callId: string) => {
    e.preventDefault();
    setNoteError('');
    try {
      await session.saveNote(callId, note);
      setNote('');
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Could not save the note.');
    }
  };

  if (session.role === 'caller') {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-oe-ink mb-3">Listener console</h1>
        <p className="text-oe-muted">
          This page is for Open Ear listeners. If you should be a listener, ask an admin to add your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-oe-ink">Listener console</h1>
            <p className="text-sm text-oe-muted mt-1" role="status" aria-live="polite">
              {session.connection !== 'ready'
                ? session.connection === 'reconnecting'
                  ? 'Reconnecting…'
                  : 'Connecting…'
                : session.online
                  ? cooldownSeconds > 0
                    ? `Online. Taking a breather: calls resume in ${formatTime(cooldownSeconds)}.`
                    : 'Online. You will hear and see incoming calls here.'
                  : 'Offline. Callers cannot reach you.'}
            </p>
          </div>
          {!session.active && (
            <button
              onClick={session.online ? session.goOffline : session.goOnline}
              disabled={session.connection !== 'ready'}
              className={`px-6 py-3 rounded-2xl font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                session.online
                  ? 'bg-white text-oe-primary border-2 border-oe-primary hover:bg-oe-primary-tint'
                  : 'bg-oe-primary text-white hover:bg-oe-primary-hover'
              }`}
            >
              {session.online ? 'Go offline' : 'Go online'}
            </button>
          )}
        </div>
        {session.error && (
          <p role="alert" className="mt-4 px-4 py-3 rounded-xl text-sm bg-oe-crisis-tint border border-oe-crisis text-oe-crisis">
            {session.error}
          </p>
        )}
      </div>

      {session.active && (
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 text-center">
          <p className="text-sm text-oe-muted mb-1">{session.active.booked ? 'Booked ' : ''}{session.active.mode === 'text' ? (session.active.booked ? 'text chat with' : 'Text chat with') : session.active.booked ? 'call with' : 'On a call with'}</p>
          <h2 className="text-2xl font-bold text-oe-ink mb-4">{session.active.callerName}</h2>
          <div className="text-3xl font-bold text-oe-primary mb-2">
            {session.active.phase === 'live' ? formatTime(session.active.elapsed) : session.active.mode === 'text' ? 'Starting…' : 'Connecting audio…'}
          </div>
          {session.active.peerReconnecting && (
            <p role="status" className="mb-4 text-sm text-yellow-700">The caller's connection dropped. Waiting up to 30 seconds for them…</p>
          )}
          {session.active.mode === 'text' && (
            <div className="mt-4 text-left">
              <div className="h-72 space-y-2 overflow-y-auto rounded-2xl border border-gray-100 p-3" aria-live="polite">
                {session.active.lines.length === 0 && <p className="text-center text-sm text-oe-muted">No messages yet.</p>}
                {session.active.lines.map((line) => (
                  <div key={line.id} className={`flex ${line.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <p
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                        line.from === 'me' ? 'rounded-br-md bg-oe-primary text-white' : 'rounded-bl-md bg-oe-surface text-oe-ink'
                      }`}
                    >
                      {line.text}
                    </p>
                  </div>
                ))}
                <div ref={threadEnd} />
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (session.sendChat(draft)) setDraft('');
                }}
              >
                <label htmlFor="listener-draft" className="sr-only">
                  Message
                </label>
                <input
                  id="listener-draft"
                  value={draft}
                  maxLength={MAX_CHAT_MESSAGE_CHARS}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={session.active.phase !== 'live'}
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
          <details className="mt-4 text-left" open={session.active.notes.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold text-oe-ink">
              Earlier notes about {session.active.callerName} ({session.active.notes.length})
            </summary>
            <div className="mt-2">
              <NotesPanel notes={session.active.notes} />
            </div>
          </details>
          <div className="flex items-center justify-center gap-4 mt-6">
            {session.active.mode === 'voice' && (
            <button
              onClick={session.toggleMute}
              aria-label={session.muted ? 'Unmute microphone' : 'Mute microphone'}
              aria-pressed={session.muted}
              className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer ${
                session.muted ? 'bg-red-500 hover:bg-red-600' : 'bg-oe-surface hover:bg-oe-primary-tint'
              }`}
            >
              <i className={`${session.muted ? 'ri-mic-off-fill text-white' : 'ri-mic-fill text-oe-ink'} text-2xl`}></i>
            </button>
            )}
            <button
              onClick={session.hangup}
              className="px-8 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 cursor-pointer"
            >
              {session.active.mode === 'text' ? 'End chat' : 'End call'}
            </button>
          </div>
        </div>
      )}

      {!session.active && session.incoming.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8" role="alert">
          <h2 className="text-xl font-bold text-oe-ink mb-4">Incoming {session.incoming.length === 1 ? 'call' : 'calls'}</h2>
          <ul className="space-y-3">
            {session.incoming.map((call) => (
              <li key={call.callId} className="flex items-center justify-between gap-4 p-4 bg-oe-primary-tint rounded-2xl">
                <span className="font-semibold text-oe-ink">
                  {call.callerName}
                  <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-oe-primary">
                    {call.mode === 'text' ? 'Text chat' : 'Call'}
                  </span>
                </span>
                <button
                  onClick={() => void session.accept(call)}
                  className="px-6 py-2 bg-oe-primary text-white rounded-xl font-semibold hover:bg-oe-primary-hover cursor-pointer"
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!session.active && session.lastCall && (
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-oe-ink">{session.lastCall.mode === 'text' ? 'Last chat' : 'Last call'}: {session.lastCall.callerName}</h2>
              <p className="text-sm text-oe-muted">
                {session.lastCall.mode === 'text' && session.lastCall.reason === 'hangup'
                  ? 'The chat ended.'
                  : (END_LABELS[session.lastCall.reason] ?? 'The call ended.')}{' '}
                {session.lastCall.mode === 'text' ? 'Chat' : 'Talk'} time {formatTime(session.lastCall.billedSeconds)}.
              </p>
            </div>
            <button onClick={session.dismissLastCall} aria-label="Dismiss" className="text-oe-muted hover:text-oe-ink cursor-pointer">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          {session.lastCall.noteSaved ? (
            <p className="mt-4 text-sm text-oe-ink">Note saved. The next Listener will see it.</p>
          ) : (
            <form className="mt-4" onSubmit={(e) => void submitNote(e, session.lastCall!.callId)}>
              <label htmlFor="listener-note" className="mb-2 block text-sm font-medium text-oe-ink">
                Private note for the next Listener (optional)
              </label>
              <textarea
                id="listener-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={MAX_NOTE_CHARS}
                rows={3}
                placeholder="What would help the next Listener? Avoid full names, addresses or anything not needed."
                className="w-full rounded-xl border-2 border-oe-line px-4 py-3 text-sm focus:border-oe-primary focus:outline-none"
              />
              {noteError && (
                <p role="alert" className="mt-1 text-sm text-oe-crisis">
                  {noteError}
                </p>
              )}
              <button type="submit" disabled={!note.trim()} className="mt-2 cursor-pointer rounded-xl bg-oe-primary px-6 py-2 font-semibold text-white hover:bg-oe-primary-hover disabled:opacity-50">
                Save note
              </button>
            </form>
          )}
          {session.lastCall.reported ? (
            <p className="mt-4 text-sm text-oe-ink">Thank you. An admin will review your report.</p>
          ) : (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reportReason.trim() || !session.lastCall) return;
                session.report(session.lastCall.callId, reportReason.trim());
                setReportReason('');
              }}
            >
              <label htmlFor="report-reason" className="block text-sm font-medium text-oe-ink mb-2">
                Report this caller (only if something was wrong)
              </label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What happened?"
                className="w-full px-4 py-3 border-2 border-oe-line rounded-xl focus:border-oe-primary focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!reportReason.trim()}
                className="mt-3 px-6 py-2 bg-white text-oe-crisis border-2 border-oe-crisis rounded-xl font-semibold hover:bg-oe-crisis-tint disabled:opacity-50 cursor-pointer"
              >
                Send report
              </button>
            </form>
          )}
        </div>
      )}
      <ListenerSchedule refreshKey={session.lastCall?.callId ?? null} />
    </div>
  );
}
