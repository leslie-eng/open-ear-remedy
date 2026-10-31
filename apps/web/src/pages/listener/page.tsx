import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      <main className="pt-24 md:pt-28 px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          {user ? (
            <Console />
          ) : (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-[#2A2A2A] mb-3">Listener console</h1>
              <p className="text-[#6B6B6B] mb-6">Sign in with your listener account to take calls.</p>
              <Link to="/signin" className="inline-block px-8 py-3 bg-[#0096FF] text-white rounded-2xl font-semibold hover:bg-[#0077CC]">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Console() {
  const session = useListenerSession();
  const cooldownSeconds = useSecondsUntil(session.cooldownUntil);
  const [reportReason, setReportReason] = useState('');

  if (session.role === 'caller') {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-[#2A2A2A] mb-3">Listener console</h1>
        <p className="text-[#6B6B6B]">
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
            <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A]">Listener console</h1>
            <p className="text-sm text-[#6B6B6B] mt-1" role="status" aria-live="polite">
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
                  ? 'bg-white text-[#0096FF] border-2 border-[#0096FF] hover:bg-[#E6F5FF]'
                  : 'bg-[#0096FF] text-white hover:bg-[#0077CC]'
              }`}
            >
              {session.online ? 'Go offline' : 'Go online'}
            </button>
          )}
        </div>
        {session.error && (
          <p role="alert" className="mt-4 px-4 py-3 rounded-xl text-sm bg-[#FFE6E6] border border-[#FF4444] text-[#C62828]">
            {session.error}
          </p>
        )}
      </div>

      {session.active && (
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 text-center">
          <p className="text-sm text-[#6B6B6B] mb-1">On a call with</p>
          <h2 className="text-2xl font-bold text-[#2A2A2A] mb-4">{session.active.callerName}</h2>
          <div className="text-3xl font-bold text-[#0096FF] mb-2">
            {session.active.phase === 'live' ? formatTime(session.active.elapsed) : 'Connecting audio…'}
          </div>
          {session.active.peerReconnecting && (
            <p role="status" className="mb-4 text-sm text-yellow-700">The caller's connection dropped. Waiting up to 30 seconds for them…</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={session.toggleMute}
              aria-label={session.muted ? 'Unmute microphone' : 'Mute microphone'}
              aria-pressed={session.muted}
              className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer ${
                session.muted ? 'bg-red-500 hover:bg-red-600' : 'bg-[#F5F5F5] hover:bg-[#E6F5FF]'
              }`}
            >
              <i className={`${session.muted ? 'ri-mic-off-fill text-white' : 'ri-mic-fill text-[#2A2A2A]'} text-2xl`}></i>
            </button>
            <button
              onClick={session.hangup}
              className="px-8 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 cursor-pointer"
            >
              End call
            </button>
          </div>
        </div>
      )}

      {!session.active && session.incoming.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8" role="alert">
          <h2 className="text-xl font-bold text-[#2A2A2A] mb-4">Incoming {session.incoming.length === 1 ? 'call' : 'calls'}</h2>
          <ul className="space-y-3">
            {session.incoming.map((call) => (
              <li key={call.callId} className="flex items-center justify-between gap-4 p-4 bg-[#E6F5FF] rounded-2xl">
                <span className="font-semibold text-[#2A2A2A]">{call.callerName}</span>
                <button
                  onClick={() => void session.accept(call.callId)}
                  className="px-6 py-2 bg-[#0096FF] text-white rounded-xl font-semibold hover:bg-[#0077CC] cursor-pointer"
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
              <h2 className="text-lg font-bold text-[#2A2A2A]">Last call: {session.lastCall.callerName}</h2>
              <p className="text-sm text-[#6B6B6B]">
                {END_LABELS[session.lastCall.reason] ?? 'The call ended.'} Talk time {formatTime(session.lastCall.billedSeconds)}.
              </p>
            </div>
            <button onClick={session.dismissLastCall} aria-label="Dismiss" className="text-[#6B6B6B] hover:text-[#2A2A2A] cursor-pointer">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          {session.lastCall.reported ? (
            <p className="mt-4 text-sm text-[#2A2A2A]">Thank you. An admin will review your report.</p>
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
              <label htmlFor="report-reason" className="block text-sm font-medium text-[#2A2A2A] mb-2">
                Report this caller (only if something was wrong)
              </label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What happened?"
                className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-xl focus:border-[#0096FF] focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!reportReason.trim()}
                className="mt-3 px-6 py-2 bg-white text-[#C62828] border-2 border-[#C62828] rounded-xl font-semibold hover:bg-[#FFE6E6] disabled:opacity-50 cursor-pointer"
              >
                Send report
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
