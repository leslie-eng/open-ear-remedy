import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

interface CrisisLinkProps {
  className?: string;
  /** Short label for tight spaces like the header. */
  compact?: boolean;
}

export default function CrisisLink({ className = '', compact = false }: CrisisLinkProps) {
  return (
    <Link
      to={siteConfig.crisisPath}
      className={`inline-flex items-center gap-1.5 font-medium text-oe-crisis ${className}`}
    >
      <i className="ri-first-aid-kit-line" aria-hidden="true" />
      <span className="oe-link">{compact ? 'In crisis?' : 'In crisis? Get urgent help'}</span>
    </Link>
  );
}
