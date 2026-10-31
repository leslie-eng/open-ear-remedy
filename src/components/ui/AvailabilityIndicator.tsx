import { siteConfig } from '../../config/site';

interface AvailabilityIndicatorProps {
  /** Overrides siteConfig.listenerAvailability (null = unknown). */
  available?: boolean | null;
  className?: string;
}

export default function AvailabilityIndicator({
  available = siteConfig.listenerAvailability,
  className = '',
}: AvailabilityIndicatorProps) {
  const label =
    available === true
      ? 'Listeners available now'
      : available === false
        ? 'Listeners are busy right now. AI chat is still open'
        : 'AI chat is open 24/7';

  return (
    <p
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 rounded-full bg-white/80 border border-oe-line px-4 py-2 text-[0.95rem] font-medium text-oe-ink shadow-oe-sm ${className}`}
    >
      {available === false ? (
        <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
      ) : (
        <span aria-hidden="true" className="oe-breathe" />
      )}
      {label}
    </p>
  );
}
