import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useListenerAvailability } from '../../hooks/useListenerAvailability';
import { useSEO, generateOrganizationSchema, generateServiceSchema } from '../../utils/seo';

const PROMISES = [
  {
    icon: 'ri-team-line',
    tone: 'bg-oe-primary-soft text-oe-primary-deep',
    title: 'No clinical jargon',
    body: 'Not therapy or diagnosis. Just real, trained people who listen with patience and dignity.',
  },
  {
    icon: 'ri-lock-line',
    tone: 'bg-oe-accent-tint text-oe-accent',
    title: 'Private by design',
    body: 'Calls are never recorded and chats are never saved. Use any name you like.',
  },
  {
    icon: 'ri-hourglass-line',
    tone: 'bg-oe-surface text-oe-ink',
    title: 'No pressure',
    body: 'Say two sentences or unpack an entire week. You set the pace, every single step.',
  },
];

const TOPICS = [
  { icon: 'ri-flashlight-line', title: 'Burnout & overwhelm', body: 'Work, money, and never catching up' },
  { icon: 'ri-home-heart-line', title: 'Loneliness & isolation', body: 'Surrounded by people, yet alone' },
  { icon: 'ri-heart-2-line', title: 'Relationships & drift', body: 'Breakups, distance, silence' },
  { icon: 'ri-compass-3-line', title: 'Feeling stuck', body: 'Lost direction or purpose' },
];

export default function HomePage() {
  useSEO({
    title: 'Open Ear | Someone to Listen, by Call or Text',
    description:
      'You don’t have to carry it alone. Open Ear is a judgment-free place to talk and be heard by a real person, by call or text.',
    keywords: 'Open Ear, someone to talk to, someone to listen, feeling low, feeling depressed, emotional support, be heard',
    canonical: '/',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'Open Ear', alternateName: 'OpenEar', url: 'https://openearemedy.com' },
        {
          '@type': 'WebPage',
          name: 'Open Ear Home',
          url: 'https://openearemedy.com/',
          description: 'A judgment-free place to talk and be heard by a real person, by call or text.',
          isPartOf: { '@type': 'WebSite', name: 'Open Ear', url: 'https://openearemedy.com' },
        },
        generateOrganizationSchema(),
        generateServiceSchema(),
      ],
    },
  });

  const available = useListenerAvailability();

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="pt-20">
        {/* Hero */}
        <section className="mx-auto max-w-[1120px] px-5 pb-16 pt-12 text-center md:px-8 md:pt-16">
          <p className="oe-enter mb-6 inline-flex items-center gap-2 rounded-full border border-oe-line bg-oe-surface-low px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-oe-primary" />
            Private · Non-clinical · Real people
          </p>
          <h1 className="oe-enter mx-auto max-w-3xl text-4xl font-bold leading-tight text-oe-ink md:text-6xl md:leading-[1.1]">
            You don&rsquo;t have to carry it alone.
          </h1>
          <p className="oe-enter mx-auto mt-5 max-w-xl text-lg leading-relaxed text-oe-muted">
            Take a 2-minute check-in. No sign-up, no judgment. Pull up a chair and let out what&rsquo;s on your chest.
          </p>
          <Link
            to="/call"
            className="oe-enter mt-6 inline-flex items-center gap-2 text-sm font-semibold text-oe-primary hover:text-oe-primary-hover"
          >
            <i className="ri-voiceprint-line" aria-hidden="true" />
            I just want to talk now
            <i className="ri-arrow-right-line" aria-hidden="true" />
          </Link>

          <div className="oe-enter relative mt-10 overflow-hidden rounded-3xl shadow-oe-md">
            <img
              src="/images/campfire.jpg"
              alt="Friends sitting quietly around a campfire by a lake at dusk"
              className="h-[320px] w-full object-cover md:h-[440px]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-16 flex flex-col items-center gap-2 md:bottom-20">
              <Link
                to="/check-in"
                className="oe-btn inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-heading text-lg font-semibold text-oe-ink shadow-oe-md"
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-oe-primary" />
                Pull up a seat. Start the check-in
                <i className="ri-arrow-right-line" aria-hidden="true" />
              </Link>
              <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white">Takes 2 minutes · Completely free</span>
            </div>
            {available === true && (
              <p className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white">
                <span aria-hidden="true" className="oe-breathe" />
                Listeners available right now
              </p>
            )}
          </div>
        </section>

        {/* Promises */}
        <section aria-label="What to expect" className="mx-auto grid max-w-[1120px] gap-4 px-5 pb-20 md:grid-cols-3 md:px-8">
          {PROMISES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-oe-line bg-white p-6">
              <span aria-hidden="true" className={`mb-5 flex h-10 w-10 items-center justify-center rounded-full ${p.tone}`}>
                <i className={p.icon} />
              </span>
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-oe-muted">{p.body}</p>
            </div>
          ))}
        </section>

        {/* Topics */}
        <section aria-labelledby="topics-heading" className="mx-auto max-w-[1120px] px-5 pb-20 md:px-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-oe-muted">Common headwinds</p>
              <h2 id="topics-heading" className="mt-1 text-3xl font-semibold">
                What people talk about around this fire
              </h2>
            </div>
            <p className="max-w-xs text-sm text-oe-muted">Nothing is too small, trivial or tangled. If it weighs on you, it matters here.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.map((t) => (
              <Link
                key={t.title}
                to="/check-in"
                className="flex items-center gap-3 rounded-2xl border border-oe-line bg-oe-surface-low p-4 transition-colors hover:bg-oe-surface"
              >
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-oe-primary">
                  <i className={t.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-oe-ink">{t.title}</span>
                  <span className="block truncate text-xs text-oe-muted">{t.body}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Ready */}
        <section className="mx-auto max-w-[1120px] px-5 pb-20 md:px-8">
          <div className="flex flex-col gap-8 rounded-3xl border border-oe-line bg-oe-surface p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-md">
              <p className="text-xs font-medium uppercase tracking-wide text-oe-primary">Ready when you are</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight">Someone is ready to listen.</h2>
              <p className="mt-3 text-sm leading-relaxed text-oe-muted">
                Talk out loud or type quietly. You choose, and you can leave whenever you want.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/call"
                className="oe-btn inline-flex items-center justify-center gap-2 rounded-xl bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
              >
                <i className="ri-phone-line" aria-hidden="true" />
                Talk now
              </Link>
              <Link
                to="/listener-chat"
                className="oe-btn inline-flex items-center justify-center gap-2 rounded-xl border border-oe-line bg-white px-6 py-3 font-semibold text-oe-ink"
              >
                <i className="ri-chat-3-line" aria-hidden="true" />
                Text a Listener
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
