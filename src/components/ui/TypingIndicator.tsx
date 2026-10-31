interface TypingIndicatorProps {
  label?: string;
  className?: string;
}

/** Three-dot soft wave. Colour follows `currentColor`. */
export default function TypingIndicator({ label = 'Typing', className = '' }: TypingIndicatorProps) {
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="oe-typing-dot" aria-hidden="true" />
      <span className="oe-typing-dot" aria-hidden="true" />
      <span className="oe-typing-dot" aria-hidden="true" />
    </span>
  );
}
