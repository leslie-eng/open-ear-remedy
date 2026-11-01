import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

const LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: siteConfig.crisisPath, label: 'Crisis help' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
];

/** Terra footer, shared by every public page. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-oe-surface bg-oe-surface-low">
      <div className="mx-auto max-w-[1120px] px-5 py-12 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-oe-primary-tint text-oe-primary">
                <i className="ri-fire-line" />
              </span>
              <span className="font-heading text-lg font-semibold text-oe-ink">Open Ear</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-oe-muted">
              A judgment-free place to talk and be heard when things feel heavy. Real people who listen, by call or
              text.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="text-oe-ink transition-colors hover:text-oe-primary">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-oe-line pt-6 text-xs text-oe-muted md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Open Ear. You are not alone.</p>
          <p>
            Not a counselling or medical service. If you are in danger, call 999 or 112, or see{' '}
            <Link to={siteConfig.crisisPath} className="underline hover:text-oe-ink">
              crisis help
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
