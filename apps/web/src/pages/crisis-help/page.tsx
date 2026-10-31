import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useSEO } from '../../utils/seo';

/*
 * TODO(crisis-resources): PLACEHOLDER CONTENT. Before launch, have someone qualified
 * verify every number below and add resources for the countries Open Ear actually
 * serves (e.g. Finland, Ghana). Keep this page short, plain and fast to load.
 */
const EMERGENCY_NUMBERS = [
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
    <div className="min-h-screen bg-oe-cream text-oe-ink">
      <Navbar />

      <main className="oe-route max-w-3xl mx-auto px-5 md:px-8 pt-28 md:pt-36 pb-20">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">If you&rsquo;re in crisis, you deserve help right now</h1>
        <p className="text-body-lg text-oe-muted mb-10">
          Open Ear offers emotional support. It isn&rsquo;t an emergency or crisis service. If you are in danger, or
          thinking about harming yourself or someone else, please contact one of these now.
        </p>

        <section aria-labelledby="emergency-heading" className="bg-white rounded-oe-md border-2 border-oe-crisis p-6 md:p-8 mb-6">
          <h2 id="emergency-heading" className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <i className="ri-alarm-warning-line text-oe-crisis" aria-hidden="true" />
            In immediate danger? Call your local emergency number
          </h2>
          <ul className="space-y-3">
            {EMERGENCY_NUMBERS.map((item) => (
              <li key={item.number} className="flex items-center justify-between gap-4 text-body">
                <span className="text-oe-muted">{item.region}</span>
                <a href={`tel:${item.number}`} className="oe-btn rounded-oe-sm bg-oe-crisis px-5 py-2 font-bold text-white">
                  {item.number}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="helplines-heading" className="bg-white rounded-oe-md border border-oe-line p-6 md:p-8 mb-6">
          <h2 id="helplines-heading" className="font-heading text-xl font-semibold mb-4">Talk to a crisis helpline</h2>
          <ul className="space-y-4 mb-5">
            {HELPLINES.map((line) => (
              <li key={line.name} className="text-body">
                <span className="block font-semibold">{line.name}</span>
                <span className="text-oe-muted">
                  {line.region} &middot; {line.contact}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-body text-oe-muted">
            Somewhere else? Find a free, confidential helpline in your country at{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="oe-link font-semibold text-oe-blue">
              findahelpline.com
            </a>
            .
          </p>
        </section>

        <p className="text-body text-oe-muted">
          When you&rsquo;re safe and would like someone to talk to,{' '}
          <Link to="/" className="oe-link font-semibold text-oe-blue">
            Open Ear is here
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
