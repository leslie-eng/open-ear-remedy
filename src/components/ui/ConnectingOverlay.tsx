interface ConnectingOverlayProps {
  open: boolean;
  title?: string;
  detail?: string;
}

/** Calm full-screen "connecting" state with slowly expanding rings instead of a spinner. */
export default function ConnectingOverlay({
  open,
  title = 'Connecting you…',
  detail = 'Take a slow breath. This usually only takes a moment.',
}: ConnectingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="oe-route fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(251,248,243,0.96)] backdrop-blur-sm p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center max-w-sm">
        <div className="relative w-36 h-36 mx-auto mb-8" aria-hidden="true">
          <span className="oe-ring" />
          <span className="oe-ring" />
          <span className="oe-ring" />
          <span className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-oe-blue flex items-center justify-center shadow-oe-md">
            <i className="ri-heart-3-fill text-2xl text-white" />
          </span>
        </div>
        <p className="font-heading text-xl md:text-2xl font-semibold text-oe-ink mb-2">{title}</p>
        <p className="text-body text-oe-muted">{detail}</p>
      </div>
    </div>
  );
}
