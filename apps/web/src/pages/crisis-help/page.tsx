import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useSEO } from '../../utils/seo';

/*
 * TODO(crisis-resources): PLACEHOLDER CONTENT. Before launch, have someone qualified
 * verify every number below and add resources for the countries Open Ear actually
 * serves (e.g. Finland, Ghana). Keep this page short, plain and fast to load.
 */
const EMERGENCY_NUMBERS = [
  { region: 'Kenya (or call 112)', number: '999' },
  { region: 'EU and many other countries', number: '112' },
  { region: 'United States and Canada', number: '911' },
  { region: 'United Kingdom', number: '999' },
];

const HELPLINES = [
  { region: 'United States', name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988' },
  { region: 'UK and Ireland', name: 'Samaritans', contact: 'Call 116 123' },
];

export default function CrisisHelpPage() {
  useSEO({
    title: 'Get Urgent Help | Open Ear',
    description: 'If you are in crisis or in danger, contact emergency services or a crisis helpline right away.',
    keywords: 'crisis help, emergency help, crisis helpline, urgent support',
    canonical: '/crisis-help',
  });

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-crisis-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-crisis">
          <i className="ri-alarm-warning-line" aria-hidden="true" /> Crisis help
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">If you&rsquo;re in crisis, you deserve help right now</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Open Ear is a place to talk and be heard. It isn&rsquo;t an emergency or crisis service. If you are in danger, or
          thinking about harming yourself or someone else, please contact one of these now.
        </p>

        <section aria-labelledby="emergency-heading" className="mt-10 rounded-3xl border-2 border-oe-crisis bg-white p-6 md:p-8">
          <h2 id="emergency-heading" className="flex items-center gap-3 text-2xl font-semibold">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-crisis-tint text-oe-crisis">
              <i className="ri-alarm-warning-line" />
            </span>
            In immediate danger? Call your local emergency number
          </h2>
          <ul className="mt-6 space-y-3">
            {EMERGENCY_NUMBERS.map((item) => (
              <li key={item.region} className="flex items-center justify-between gap-4 rounded-2xl bg-oe-crisis-tint px-4 py-3 text-body">
                <span>{item.region}</span>
                <a href={`tel:${item.number}`} className="oe-btn rounded-full bg-oe-crisis px-6 py-2.5 font-bold text-white">
                  {item.number}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="helplines-heading" className="mt-6 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          <h2 id="helplines-heading" className="flex items-center gap-3 text-2xl font-semibold">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
              <i className="ri-phone-line" />
            </span>
            Talk to a crisis helpline
          </h2>
          <ul className="mt-6 space-y-3">
            {HELPLINES.map((line) => (
              <li key={line.name} className="rounded-2xl bg-oe-surface-low px-4 py-3 text-body">
                <span className="block font-semibold">{line.name}</span>
                <span className="text-oe-muted">
                  {line.region} &middot; {line.contact}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-body text-oe-muted">
            Somewhere else? Find a free, confidential helpline in your country at{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="oe-link font-semibold text-oe-primary">
              findahelpline.com
            </a>
            .
          </p>
        </section>

        <p className="mt-6 rounded-3xl border border-oe-line bg-oe-surface p-6 text-body text-oe-muted">
          When you&rsquo;re safe and would like someone to talk to,{' '}
          <Link to="/" className="oe-link font-semibold text-oe-primary">
            Open Ear is here
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
