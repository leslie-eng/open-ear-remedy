import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useSEO } from '../../utils/seo';

const OFFERS = [
  {
    icon: 'ri-voiceprint-line',
    title: 'Calls and text chats with Listeners',
    body: 'Talk to a trained Listener on a call in your browser, or type with them in real time. Now, or at a time you book.',
  },
  {
    icon: 'ri-sparkling-2-line',
    title: 'AI Companion',
    body: 'A gentle AI to talk things through any time of day or night. It is not a person, and it points you to help if you are in danger.',
  },
  {
    icon: 'ri-book-open-line',
    title: 'Ebooks',
    body: 'A small library of self-help books you can read at your own pace.',
  },
  {
    icon: 'ri-emotion-line',
    title: 'Mood tracker',
    body: 'Note how you feel from day to day and notice patterns over time.',
  },
];

export default function AboutPage() {
  useSEO({
    title: 'About Open Ear',
    description: 'Open Ear is a place for anyone who feels low to talk and be heard by a real person, by call or text.',
    keywords: 'about Open Ear, someone to talk to, someone to listen, be heard',
    canonical: '/about',
  });

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-fire-line" aria-hidden="true" /> About us
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">About Open Ear</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          A place for anyone who feels low, worn out or alone to talk and be heard.
        </p>

        <section aria-labelledby="mission-heading" className="mt-10 rounded-3xl border border-oe-line bg-white p-6 md:p-8">
          <h2 id="mission-heading" className="text-2xl font-semibold">
            Why we exist
          </h2>
          <p className="mt-3 leading-relaxed text-oe-muted">
            Sometimes you don&rsquo;t need advice. You need someone to listen. Open Ear connects you with trained Listeners who
            hear you out with patience and without judgment. It isn&rsquo;t medical care and nobody diagnoses you; it&rsquo;s a
            place to say what&rsquo;s on your mind, out loud or in writing.
          </p>
        </section>

        <section aria-labelledby="offers-heading" className="mt-8">
          <h2 id="offers-heading" className="text-2xl font-semibold">
            What you&rsquo;ll find here
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {OFFERS.map((offer) => (
              <div key={offer.title} className="rounded-3xl border border-oe-line bg-white p-6">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                  <i className={offer.icon} />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{offer.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oe-muted">{offer.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="commitment-heading" className="mt-8 rounded-3xl border border-oe-line bg-oe-surface p-6 md:p-8">
          <h2 id="commitment-heading" className="text-2xl font-semibold">
            Our promise
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed">
            <li className="flex gap-3">
              <i className="ri-lock-line mt-0.5 text-oe-primary" aria-hidden="true" />
              <span>Calls are never recorded, and text chats and AI messages are never saved.</span>
            </li>
            <li className="flex gap-3">
              <i className="ri-user-smile-line mt-0.5 text-oe-primary" aria-hidden="true" />
              <span>Listeners only see the name you choose to show them.</span>
            </li>
            <li className="flex gap-3">
              <i className="ri-coins-line mt-0.5 text-oe-primary" aria-hidden="true" />
              <span>Fair prices in Kenyan shillings. You pay only for the time you use.</span>
            </li>
          </ul>
        </section>

        <figure className="mt-8 rounded-2xl bg-oe-surface-low p-6">
          <blockquote className="font-heading text-lg italic text-oe-ink">
            &ldquo;Mental health is not a destination, but a process. It&rsquo;s about how you drive, not where you&rsquo;re
            going.&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-sm font-medium text-oe-primary">Noam Shpancer</figcaption>
        </figure>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/check-in"
            className="oe-btn inline-flex items-center justify-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
          >
            Start the check-in <i className="ri-arrow-right-line" aria-hidden="true" />
          </Link>
          <Link
            to="/how-it-works"
            className="oe-btn inline-flex items-center justify-center rounded-full border border-oe-line bg-white px-6 py-3 font-semibold text-oe-ink"
          >
            How it works
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
