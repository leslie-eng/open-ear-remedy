import { useListenerAvailability } from '../../hooks/useListenerAvailability';

interface AvailabilityIndicatorProps {
  className?: string;
}

/** Live listener availability from the API; unknown (e.g. offline) falls back to the AI chat note. */
export default function AvailabilityIndicator({ className = '' }: AvailabilityIndicatorProps) {
  const available = useListenerAvailability();
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
