import { Link } from 'react-router-dom';
import Navbar from '../components/feature/Navbar';
import SiteFooter from '../components/feature/SiteFooter';
import { siteConfig } from '../config/site';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />
      <main className="oe-route mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8">
        <section className="rounded-3xl border border-oe-line bg-white p-8 text-center md:p-12">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-accent-tint text-2xl text-oe-accent">
            <i className="ri-compass-3-line" />
          </span>
          <p className="mt-4 text-sm font-medium uppercase tracking-wide text-oe-muted">Page not found</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">This path doesn&rsquo;t lead anywhere.</h1>
          <p className="mx-auto mt-3 max-w-lg text-lg text-oe-muted">
            The page may have moved, or the link may be wrong. Let&rsquo;s get you somewhere useful.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/" className="oe-btn rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover">
              Go to the home page
            </Link>
            <Link to="/check-in" className="rounded-full bg-oe-surface px-6 py-3 font-medium text-oe-ink">
              Take a quiet check-in
            </Link>
          </div>
        </section>
        <p className="mt-6 text-center text-sm text-oe-muted">
          Need someone right now? See{' '}
          <Link to={siteConfig.crisisPath} className="font-semibold text-oe-crisis underline">
            Crisis Help
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
