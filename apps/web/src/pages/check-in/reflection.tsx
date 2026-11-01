import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { siteConfig } from '../../config/site';
import { loadCheckIn, reflection } from '../../lib/checkIn';
import { useSEO } from '../../utils/seo';

const GROUNDING_STEPS = [
  'Notice 5 things you can see around you right now.',
  'Notice 4 things you can feel: your feet, your chair, the air.',
  'Notice 3 things you can hear, near or far.',
  'Notice 2 things you can smell, or would like to.',
  'Notice 1 thing you can taste, and take one slow breath.',
];
const SECONDS_PER_STEP = 12;
const JOURNAL_KEY = 'openear.journal';

function GroundingCard() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (step === null || step >= GROUNDING_STEPS.length - 1) return;
    const id = window.setTimeout(() => setStep(step + 1), SECONDS_PER_STEP * 1000);
    return () => window.clearTimeout(id);
  }, [step]);

  return (
    <div className="flex flex-col rounded-2xl border border-oe-line bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium text-oe-primary-deep">
          <i className="ri-timer-line" aria-hidden="true" /> 1-minute grounding
        </span>
        <span className="text-xs text-oe-muted">Step by step</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">The 5-4-3-2-1 room scan</h3>
      <p className="mt-1 text-sm text-oe-muted">Anchor yourself in the present, one sense at a time.</p>
      <div className="mt-4 flex-1 rounded-xl bg-oe-surface-low p-5" aria-live="polite">
        <p className="text-xs text-oe-muted">{step === null ? 'Ready when you are' : `Step ${step + 1} of ${GROUNDING_STEPS.length}`}</p>
        <p className="mt-2 font-medium">{step === null ? GROUNDING_STEPS[0] : GROUNDING_STEPS[step]}</p>
      </div>
      <div className="mt-5 flex gap-2 border-t border-oe-line pt-5">
        <button
          onClick={() => setStep(0)}
          className="oe-btn inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-oe-primary-hover"
        >
          <i className="ri-play-line" aria-hidden="true" /> {step === null ? 'Begin' : 'Start again'}
        </button>
        {step !== null && step < GROUNDING_STEPS.length - 1 && (
          <button
            onClick={() => setStep(step + 1)}
            aria-label="Next step"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-oe-surface text-oe-ink"
          >
            <i className="ri-skip-forward-line" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function JournalCard() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(JOURNAL_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [saved, setSaved] = useState(false);

  const keep = () => {
    try {
      localStorage.setItem(JOURNAL_KEY, text);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };
  const clear = () => {
    setText('');
    setSaved(false);
    try {
      localStorage.removeItem(JOURNAL_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-oe-line bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-oe-surface px-3 py-1 text-xs font-medium text-oe-ink">
          <i className="ri-quill-pen-line" aria-hidden="true" /> Reflective unload
        </span>
        <span className="text-xs text-oe-muted">Private scratchpad</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">Quiet journaling prompt</h3>
      <label htmlFor="journal" className="mt-1 text-sm text-oe-muted">
        &ldquo;What&rsquo;s one thing you don&rsquo;t have to solve today?&rdquo;
      </label>
      <textarea
        id="journal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder="Put it here. Even just three words. No one else will see this."
        className="mt-4 flex-1 resize-none rounded-xl border-0 bg-oe-surface-low p-4 text-sm focus:outline-none focus:ring-2 focus:ring-oe-primary/40"
      />
      <p className="mt-2 flex items-center justify-between text-xs text-oe-muted">
        <span className="flex items-center gap-1">
          <i className="ri-lock-line" aria-hidden="true" /> Stays in this browser only
        </span>
        {saved && <span className="text-oe-primary">Kept</span>}
      </p>
      <div className="mt-4 flex justify-between border-t border-oe-line pt-5">
        <button onClick={clear} className="cursor-pointer px-2 text-sm text-oe-muted hover:text-oe-ink">
          Clear note
        </button>
        <button
          onClick={keep}
          disabled={!text.trim()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-surface px-5 py-2.5 text-sm font-medium text-oe-ink disabled:opacity-50"
        >
          <i className="ri-bookmark-line" aria-hidden="true" /> Keep for later
        </button>
      </div>
    </div>
  );
}

export default function CheckInReflectionPage() {
  useSEO({
    title: 'Your check-in | Open Ear',
    description: 'A private reflection on your check-in, and a free grounding tool for right now.',
    keywords: 'grounding exercise, 5-4-3-2-1, journaling prompt',
    canonical: '/check-in/reflection',
  });

  const [summary] = useState(() => reflection(loadCheckIn()));

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        <section className="grid overflow-hidden rounded-3xl border border-oe-line bg-white md:grid-cols-2">
          <div className="relative min-h-[260px]">
            <img
              src="/images/lakeside-dock.jpg"
              alt="A person sitting at the end of a wooden dock over a misty lake at sunrise"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-oe-ink">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-oe-primary" /> Private check-in summary
            </span>
          </div>
          <div className="p-8 md:p-12">
            <p className="flex items-center gap-1.5 text-xs font-medium text-oe-primary">
              <i className="ri-shield-check-line" aria-hidden="true" /> Just for you · stays on this device
            </p>
            <h1 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl">{summary}</h1>
            <p className="mt-5 text-sm leading-relaxed text-oe-muted">
              We hear you. Taking even two minutes to name what you&rsquo;re carrying is real progress.
            </p>
          </div>
        </section>

        <section aria-labelledby="free-tools" className="mt-14">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-oe-primary">Free · No sign-up</p>
              <h2 id="free-tools" className="mt-1 text-2xl font-semibold">
                A free tool for right now
              </h2>
            </div>
            <p className="max-w-sm text-sm text-oe-muted">Before deciding anything, take a moment to let your body catch its breath.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <GroundingCard />
            <JournalCard />
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-2xl rounded-3xl border border-oe-line bg-oe-surface p-10 text-center">
          <span aria-hidden="true" className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
            <i className="ri-chat-smile-2-line" />
          </span>
          <h2 className="mt-4 text-3xl font-semibold">Ready for a calm, human conversation?</h2>
          <p className="mt-3 text-oe-muted">Trained Listeners who get it. No diagnoses, no lectures. Just space to unburden.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/check-in/options"
              className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-7 py-3.5 font-semibold text-white hover:bg-oe-primary-hover"
            >
              See what fits best <i className="ri-arrow-right-line" aria-hidden="true" />
            </Link>
            <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-medium text-oe-ink">
              <i className="ri-bookmark-line" aria-hidden="true" /> Come back later
            </Link>
          </div>
          <p className="mt-6 text-xs text-oe-muted">
            In a dark place right now?{' '}
            <Link to={siteConfig.crisisPath} className="font-medium text-oe-accent underline">
              Get urgent help
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
