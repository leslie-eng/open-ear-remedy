import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

interface MoodLog {
  id: string;
  mood: string;
  mood_score: number;
  note: string | null;
  created_at: string;
}

// `color` fills the chart bars: calm, earthy steps from green (great) to clay (struggling).
const moods = [
  { name: 'Great', score: 5, emoji: '😄', color: 'bg-oe-primary' },
  { name: 'Good', score: 4, emoji: '🙂', color: 'bg-forest-400' },
  { name: 'Okay', score: 3, emoji: '😐', color: 'bg-oe-accent/60' },
  { name: 'Low', score: 2, emoji: '😔', color: 'bg-oe-accent' },
  { name: 'Struggling', score: 1, emoji: '😢', color: 'bg-oe-crisis/60' },
];

const card = 'rounded-3xl border border-oe-line bg-white p-6 md:p-8';

export default function MoodTrackerPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<typeof moods[0] | null>(null);
  const [note, setNote] = useState('');
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'insights'>('log');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    void (async () => {
      await fetchMoodLogs();
      setIsLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const fetchMoodLogs = async () => {
    try {
      const { data } = await apiFetch<{ data: MoodLog[] }>('/api/user/mood-logs?limit=30');
      setMoodLogs(data || []);
    } catch {
      setMoodLogs([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood || !user) return;

    setIsSubmitting(true);

    try {
      await apiFetch('/api/user/mood-logs', {
        method: 'POST',
        body: JSON.stringify({
          mood: selectedMood.name,
          mood_score: selectedMood.score,
          note: note.trim() || null,
        }),
      });
      setShowSuccess(true);
      setSelectedMood(null);
      setNote('');
      await fetchMoodLogs();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // submission failed
    }
    setIsSubmitting(false);
  };

  const getMoodByScore = (score: number) => moods.find(m => m.score === score) || moods[2];

  const getAverageMood = () => {
    if (moodLogs.length === 0) return null;
    const avg = moodLogs.reduce((sum, log) => sum + log.mood_score, 0) / moodLogs.length;
    return avg.toFixed(1);
  };

  const getMoodTrend = () => {
    if (moodLogs.length < 2) return 'neutral';
    const recent = moodLogs.slice(0, 7);
    const older = moodLogs.slice(7, 14);
    if (older.length === 0) return 'neutral';

    const recentAvg = recent.reduce((sum, log) => sum + log.mood_score, 0) / recent.length;
    const olderAvg = older.reduce((sum, log) => sum + log.mood_score, 0) / older.length;

    if (recentAvg > olderAvg + 0.3) return 'up';
    if (recentAvg < olderAvg - 0.3) return 'down';
    return 'neutral';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getLast7DaysData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLogs = moodLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === date.toDateString();
      });
      const avgScore = dayLogs.length > 0
        ? dayLogs.reduce((sum, log) => sum + log.mood_score, 0) / dayLogs.length
        : null;
      days.push({
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        score: avgScore,
        count: dayLogs.length
      });
    }
    return days;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oe-bg" aria-busy="true" aria-label="Loading">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-oe-primary border-t-transparent" />
      </div>
    );
  }

  const trend = getMoodTrend();

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        {/* Header */}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-sun-cloudy-line" aria-hidden="true" /> Mood tracker
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">How are you, really?</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Note how you feel, as often as you like. Over time you may start to notice patterns.
        </p>

        {/* Success message */}
        {showSuccess && (
          <div role="status" className="mt-6 flex animate-fade-in items-center gap-3 rounded-2xl bg-oe-primary-tint px-5 py-3 text-sm">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-oe-primary text-white">
              <i className="ri-check-line" />
            </span>
            <span>
              <span className="font-semibold">Mood logged.</span> Thank you for checking in with yourself.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Mood tracker" className="mt-8 flex w-fit gap-1 rounded-full border border-oe-line bg-white p-1">
          {[
            { id: 'log', label: 'Log mood', icon: 'ri-add-circle-line' },
            { id: 'history', label: 'History', icon: 'ri-history-line' },
            { id: 'insights', label: 'Patterns', icon: 'ri-line-chart-line' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5 ${
                activeTab === tab.id ? 'bg-oe-primary text-white' : 'text-oe-muted hover:bg-oe-surface hover:text-oe-ink'
              }`}
            >
              <i className={tab.icon} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Log mood tab */}
        {activeTab === 'log' && (
          <section className={`mt-6 ${card}`} aria-labelledby="log-heading">
            <h2 id="log-heading" className="text-2xl font-semibold">
              How are you feeling right now?
            </h2>

            <div role="radiogroup" aria-label="Mood" className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.name}
                  role="radio"
                  aria-checked={selectedMood?.name === mood.name}
                  onClick={() => setSelectedMood(mood)}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-4 transition-colors ${
                    selectedMood?.name === mood.name
                      ? 'border-oe-primary bg-oe-primary-tint'
                      : 'border-transparent bg-oe-surface-low hover:border-oe-primary/40'
                  }`}
                >
                  <span aria-hidden="true" className="text-3xl md:text-4xl">
                    {mood.emoji}
                  </span>
                  <span className="text-xs font-medium text-oe-muted md:text-sm">{mood.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <label htmlFor="mood-note" className="block text-sm font-medium">
                Add a note <span className="font-normal text-oe-muted">(optional)</span>
              </label>
              <textarea
                id="mood-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="What's on your mind? What happened today?"
                className="mt-2 w-full resize-none rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 text-sm focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30"
                rows={3}
                maxLength={500}
              />
              <p className="mt-1 text-right text-xs text-oe-faint">{note.length}/500</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedMood || isSubmitting}
              className="oe-btn mt-4 w-full cursor-pointer whitespace-nowrap rounded-full bg-oe-primary py-3.5 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                  Saving…
                </span>
              ) : (
                'Log my mood'
              )}
            </button>
          </section>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <section className={`mt-6 ${card}`} aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-2xl font-semibold">
              Recent moods
            </h2>

            {moodLogs.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-oe-surface-low p-8 text-center">
                <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-primary-soft text-xl text-oe-primary-deep">
                  <i className="ri-emotion-line" />
                </span>
                <p className="mt-4 text-oe-muted">Nothing logged yet.</p>
                <button
                  onClick={() => setActiveTab('log')}
                  className="mt-5 cursor-pointer whitespace-nowrap rounded-full bg-oe-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-oe-primary-hover"
                >
                  Log your first mood
                </button>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {moodLogs.map((log) => {
                  const mood = getMoodByScore(log.mood_score);
                  return (
                    <li key={log.id} className="flex items-start gap-4 rounded-2xl bg-oe-surface-low p-4">
                      <span aria-hidden="true" className="text-3xl">
                        {mood.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3">
                          <span className="font-semibold">{log.mood}</span>
                          <span className="text-xs text-oe-muted">{formatDate(log.created_at)}</span>
                        </div>
                        {log.note && <p className="mt-1 line-clamp-2 text-sm text-oe-muted">{log.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Patterns tab */}
        {activeTab === 'insights' && (
          <div className="mt-6 space-y-6">
            <dl className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-oe-line bg-white p-5 text-center">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Logs</dt>
                <dd className="mt-1 font-heading text-3xl font-semibold">{moodLogs.length}</dd>
              </div>
              <div className="rounded-3xl border border-oe-line bg-white p-5 text-center">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Average</dt>
                <dd className="mt-1 font-heading text-3xl font-semibold text-oe-primary-deep">{getAverageMood() || '-'}</dd>
              </div>
              <div className="rounded-3xl border border-oe-line bg-white p-5 text-center">
                <dt className="text-xs font-medium uppercase tracking-wide text-oe-muted">Trend</dt>
                <dd className="mt-2 flex items-center justify-center gap-1 font-semibold">
                  {trend === 'up' && (
                    <>
                      <i className="ri-arrow-up-line text-xl text-oe-primary" aria-hidden="true" />
                      <span className="text-oe-primary-deep">Up</span>
                    </>
                  )}
                  {trend === 'down' && (
                    <>
                      <i className="ri-arrow-down-line text-xl text-oe-accent" aria-hidden="true" />
                      <span className="text-oe-accent">Down</span>
                    </>
                  )}
                  {trend === 'neutral' && (
                    <>
                      <i className="ri-subtract-line text-xl text-oe-muted" aria-hidden="true" />
                      <span className="text-oe-muted">Steady</span>
                    </>
                  )}
                </dd>
              </div>
            </dl>

            {/* Weekly chart */}
            <section className={card} aria-labelledby="week-heading">
              <h2 id="week-heading" className="text-xl font-semibold">
                Last 7 days
              </h2>
              <div className="mt-8 flex h-40 items-end justify-between gap-2">
                {getLast7DaysData().map((day, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center">
                    <div className="flex h-28 w-full flex-col items-center justify-end">
                      {day.score !== null ? (
                        <div
                          className={`w-full max-w-[40px] rounded-t-xl ${getMoodByScore(Math.round(day.score)).color} transition-all`}
                          style={{ height: `${(day.score / 5) * 100}%` }}
                          title={`${day.day}: ${getMoodByScore(Math.round(day.score)).name}`}
                        >
                          <div className="-mt-7 text-center">
                            <span className="text-lg" aria-hidden="true">
                              {getMoodByScore(Math.round(day.score)).emoji}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-2 w-full max-w-[40px] rounded-t-xl bg-oe-surface" />
                      )}
                    </div>
                    <span className="mt-2 text-xs text-oe-muted">{day.day}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Mood mix */}
            <section className={card} aria-labelledby="mix-heading">
              <h2 id="mix-heading" className="text-xl font-semibold">
                Your mood mix
              </h2>
              <div className="mt-5 space-y-3">
                {moods.map((mood) => {
                  const count = moodLogs.filter(log => log.mood_score === mood.score).length;
                  const percentage = moodLogs.length > 0 ? (count / moodLogs.length) * 100 : 0;
                  return (
                    <div key={mood.name} className="flex items-center gap-3">
                      <span className="w-8 text-xl" aria-hidden="true">
                        {mood.emoji}
                      </span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium">{mood.name}</span>
                          <span className="text-xs text-oe-muted">
                            {count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-oe-surface">
                          <div className={`h-full rounded-full ${mood.color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {moodLogs.length < 5 && (
              <p className="flex items-center gap-3 rounded-2xl bg-oe-accent-tint px-5 py-3 text-sm text-oe-accent">
                <i className="ri-lightbulb-line text-lg" aria-hidden="true" />
                Log a few more moods and your patterns will start to show.
              </p>
            )}
          </div>
        )}

        {/* Gentle next step */}
        <aside className="mt-10 flex flex-col gap-4 rounded-3xl border border-oe-line bg-oe-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Feeling low?</p>
            <p className="mt-1 text-sm text-oe-muted">
              A Listener can hear you out. In an emergency, call 999 or 112, or see{' '}
              <Link to={siteConfig.crisisPath} className="font-medium text-oe-crisis underline-offset-2 hover:underline">
                Crisis Help
              </Link>
              .
            </p>
          </div>
          <Link
            to="/call"
            className="oe-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
          >
            <i className="ri-voiceprint-line" aria-hidden="true" /> Talk now
          </Link>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}
