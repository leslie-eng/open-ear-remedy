import { forwardRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import AvailabilityIndicator from '../ui/AvailabilityIndicator';
import CrisisLink from '../ui/CrisisLink';

const enter = (index: number) => ({ '--enter-index': index }) as CSSProperties;

export const ctaBase =
  'oe-btn inline-flex items-center justify-center gap-2 rounded-oe-sm px-7 py-3.5 text-body font-semibold text-white whitespace-nowrap';

const Hero = forwardRef<HTMLElement>(function Hero(_props, ref) {
  return (
    <section
      ref={ref}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-oe-cream pt-32 md:pt-40 pb-20 md:pb-28 px-5 md:px-8"
    >
      <div aria-hidden="true" className="oe-drift" />

      <div className="relative max-w-3xl mx-auto text-center">
        <h1
          id="hero-heading"
          className="oe-enter font-display text-4xl md:text-5xl lg:text-6xl font-bold text-oe-ink leading-tight mb-5"
          style={enter(0)}
        >
          A safe place to share what&rsquo;s on your mind
        </h1>

        <p className="oe-enter text-body-lg md:text-xl text-oe-muted max-w-2xl mx-auto mb-9" style={enter(1)}>
          This isn&rsquo;t therapy. It&rsquo;s emotional support when you need it most. Connect through call or chat, anytime.
        </p>

        <div className="oe-enter flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-5" style={enter(2)}>
          <Link to="/chat" className={`${ctaBase} bg-oe-sage hover:bg-oe-sage-hover sm:min-w-[200px]`}>
            <i className="ri-message-3-line text-lg" aria-hidden="true" />
            Start a chat
          </Link>
          <Link to="/call" className={`${ctaBase} bg-oe-blue hover:bg-oe-blue-hover sm:min-w-[200px]`}>
            <i className="ri-phone-line text-lg" aria-hidden="true" />
            Call now
          </Link>
        </div>

        <p className="oe-enter text-[0.95rem] text-oe-muted mb-7" style={enter(2)}>
          No appointment needed &middot; Chat is with our AI companion &middot; Calls ring your phone
        </p>

        <div className="oe-enter flex flex-col items-center gap-4" style={enter(3)}>
          <AvailabilityIndicator />
          <CrisisLink className="text-[0.95rem]" />
        </div>
      </div>
    </section>
  );
});

export default Hero;
