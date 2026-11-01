import { Link } from 'react-router-dom';

interface MobileActionBarProps {
  /** Shown once the hero's own CTAs have scrolled out of view. */
  visible: boolean;
}

/** Sticky Chat + Call bar for small screens. Pages using it should reserve bottom padding (MOBILE_BAR_PADDING). */
export default function MobileActionBar({ visible }: MobileActionBarProps) {
  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-oe-line bg-white/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(42,42,42,0.06)] transition-[opacity,transform,visibility] duration-oe-base ease-oe-out ${
        visible ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-3 invisible'
      }`}
    >
      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3">
        <Link
          to="/chat"
          className="oe-btn inline-flex items-center justify-center gap-2 rounded-oe-sm bg-oe-primary hover:bg-oe-primary-hover py-3 text-body font-semibold text-white"
        >
          <i className="ri-message-3-line" aria-hidden="true" />
          Chat
        </Link>
        <Link
          to="/call"
          className="oe-btn inline-flex items-center justify-center gap-2 rounded-oe-sm bg-oe-primary hover:bg-oe-primary-hover py-3 text-body font-semibold text-white"
        >
          <i className="ri-phone-line" aria-hidden="true" />
          Call
        </Link>
      </nav>
    </div>
  );
}

export const MOBILE_BAR_PADDING = 'pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0';
