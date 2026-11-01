import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { siteConfig } from '../../config/site';
import { CHECK_IN_QUESTIONS, loadCheckIn, saveCheckIn, type CheckInAnswers } from '../../lib/checkIn';
import { useSEO } from '../../utils/seo';

const BREATH_SECONDS = 4;

function BreathingCircle() {
  const [inhale, setInhale] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => setInhale((v) => !v), BREATH_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto flex h-64 w-64 items-center justify-center" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-oe-primary/15" />
      <div className="absolute inset-6 rounded-full bg-oe-primary/25" />
      <div
        className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-b from-oe-primary-soft to-forest-400 text-oe-deep transition-transform ease-in-out"
        style={{ transform: `scale(${inhale ? 1.08 : 0.86})`, transitionDuration: `${BREATH_SECONDS}s` }}
      >
        <i className="ri-leaf-line mb-1 text-2xl" />
        <span className="font-heading text-2xl font-semibold">{inhale ? 'Breathe in' : 'Breathe out'}</span>
      </div>
    </div>
  );
}

function Intro({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8">
      <div className="rounded-[2rem] bg-oe-deep px-6 py-12 text-center text-white shadow-oe-md md:px-16">
        <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-oe-primary-soft" />
          Check-in · 5 short questions
        </p>
        <BreathingCircle />
        <p className="mt-6 text-sm text-white/70">Draw a slow breath into your chest and belly…</p>
        <h1 className="mt-4 text-3xl font-bold md:text-5xl">A quiet space to unpack today.</h1>
        <p className="mx-auto mt-4 max-w-xl text-white/80">
          A few quick questions so we can point you to the right kind of support. Answer as much or as little as you like.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onBegin}
            className="oe-btn inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-8 py-4 text-lg font-semibold text-white hover:bg-oe-primary-hover"
          >
            Begin check-in (2 min)
            <i className="ri-arrow-right-line" aria-hidden="true" />
          </button>
          <Link to="/check-in/options" className="px-4 py-3 font-medium text-white/90 hover:text-white">
            Skip straight to talking
          </Link>
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-white/70">
          <li className="flex items-center gap-2">
            <i className="ri-lock-line" aria-hidden="true" /> Answers stay on this device
          </li>
          <li className="flex items-center gap-2">
            <i className="ri-user-unfollow-line" aria-hidden="true" /> No account needed to check in
          </li>
          <li className="flex items-center gap-2">
            <i className="ri-logout-box-r-line" aria-hidden="true" /> Leave anytime
          </li>
        </ul>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { icon: 'ri-chat-smile-2-line', title: 'Trained Listeners', body: 'Real people who know what heavy seasons feel like.' },
          { icon: 'ri-capsule-line', title: 'No prescriptions', body: 'No diagnoses or unasked-for advice. Just room to talk.' },
          { icon: 'ri-phone-line', title: 'Voice or text', body: 'Speak out loud, or simply type at your own speed.' },
        ].map((c) => (
          <div key={c.title} className="flex gap-3 rounded-2xl border border-oe-line bg-oe-surface-low p-5">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
              <i className={c.icon} />
            </span>
            <div>
              <h2 className="font-sans text-sm font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-oe-muted">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CheckInPage() {
  useSEO({
    title: 'Check-in | Open Ear',
    description: 'A 2-minute check-in to find the kind of support that fits today. No sign-up needed.',
    keywords: 'check-in, how are you feeling, someone to talk to',
    canonical: '/check-in',
  });

  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState<number | null>(null); // null = intro
  const [answers, setAnswers] = useState<CheckInAnswers>(() => loadCheckIn());

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stepIndex]);

  const question = stepIndex === null ? null : CHECK_IN_QUESTIONS[stepIndex];
  const selected = question ? (answers[question.step] ?? []) : [];
  const isLast = stepIndex === CHECK_IN_QUESTIONS.length - 1;

  const update = (change: (prev: CheckInAnswers) => CheckInAnswers) => {
    setAnswers((prev) => {
      const next = change(prev);
      saveCheckIn(next);
      return next;
    });
  };

  const toggle = (id: string) => {
    if (!question) return;
    update((prev) => {
      const current = prev[question.step] ?? [];
      const value = question.multiple
        ? current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id]
        : [id];
      return { ...prev, [question.step]: value };
    });
  };

  const next = () => {
    if (stepIndex === null) return;
    if (isLast) navigate('/check-in/reflection');
    else setStepIndex(stepIndex + 1);
  };

  const skip = () => {
    if (!question) return;
    update((prev) => ({ ...prev, [question.step]: [] }));
    next();
  };

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route pb-20 pt-28">
        {question === null || stepIndex === null ? (
          <Intro onBegin={() => setStepIndex(0)} />
        ) : (
          <section className="mx-auto max-w-5xl px-5 md:px-8">
            <div className="flex items-center justify-between rounded-full border border-oe-line bg-white px-5 py-3">
              <button
                onClick={() => setStepIndex(stepIndex === 0 ? null : stepIndex - 1)}
                className="flex cursor-pointer items-center gap-2 text-sm text-oe-muted hover:text-oe-ink"
              >
                <i className="ri-arrow-left-line" aria-hidden="true" /> Back
              </button>
              <ol className="flex items-center gap-2" aria-label={`Step ${stepIndex + 1} of ${CHECK_IN_QUESTIONS.length}`}>
                {CHECK_IN_QUESTIONS.map((q, i) => (
                  <li
                    key={q.step}
                    className={`h-2.5 rounded-full transition-all ${
                      i === stepIndex ? 'w-7 bg-oe-primary' : i < stepIndex ? 'w-2.5 bg-oe-primary' : 'w-2.5 bg-oe-line'
                    }`}
                  />
                ))}
              </ol>
              <button onClick={skip} className="cursor-pointer text-sm text-oe-muted hover:text-oe-ink">
                I&rsquo;d rather not say
              </button>
            </div>

            <div className="mt-10 text-center">
              <p className="inline-flex items-center gap-2 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-oe-accent" />
                Check-in · Step {stepIndex + 1} of {CHECK_IN_QUESTIONS.length}
              </p>
              <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-bold md:text-5xl">{question.title}</h1>
              <p className="mx-auto mt-3 max-w-xl text-oe-muted">{question.intro}</p>
            </div>

            <div
              role={question.multiple ? 'group' : 'radiogroup'}
              aria-label={question.title}
              className={`mt-10 grid gap-4 ${question.options.length > 4 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}
            >
              {question.options.map((option) => {
                const on = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    role={question.multiple ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    onClick={() => toggle(option.id)}
                    className={`relative cursor-pointer rounded-2xl border-2 p-6 text-left transition-colors ${
                      on ? 'border-oe-primary bg-oe-primary-tint' : 'border-transparent bg-white hover:border-oe-line'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full ${
                        on ? 'bg-oe-primary text-white' : 'bg-oe-surface'
                      }`}
                    >
                      {on && <i className="ri-check-line text-sm" />}
                    </span>
                    <span aria-hidden="true" className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-xl text-oe-primary">
                      <i className={option.icon} />
                    </span>
                    <span className="block font-heading text-xl font-semibold">{option.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-oe-muted">{option.body}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
              <Link to="/" className="flex items-center gap-2 text-sm text-oe-muted hover:text-oe-ink">
                <i className="ri-pause-circle-line" aria-hidden="true" /> Save &amp; pause check-in
              </Link>
              <button
                onClick={next}
                className="oe-btn inline-flex cursor-pointer items-center gap-2 rounded-full bg-oe-primary px-8 py-4 text-lg font-semibold text-white hover:bg-oe-primary-hover"
              >
                {isLast ? 'Finish check-in' : 'Continue'}
                <i className="ri-arrow-right-line" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-2 rounded-full bg-oe-surface-low px-6 py-3 text-xs text-oe-muted sm:flex-row">
              <span className="flex items-center gap-2">
                <i className="ri-lock-line" aria-hidden="true" /> Your answers stay on this device
              </span>
              <Link to={siteConfig.crisisPath} className="font-medium text-oe-accent underline">
                Need urgent help? Crisis options available 24/7
              </Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
