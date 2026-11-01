import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import {
  CREDIT_PACKS,
  CREDITS_PER_CALL_MINUTE,
  CREDITS_PER_CHAT_MESSAGE,
  creditsForCall,
  formatPrice,
  type CreditPack,
} from '@openear/shared/pricing';

const MIN_MINUTES = 5;
const MAX_MINUTES = 60;
const STEP_MINUTES = 5;

const starterPack = CREDIT_PACKS[0];
const bestValuePack = CREDIT_PACKS[CREDIT_PACKS.length - 1];

/** Pro-rata cost of a call's credits at a pack's per-credit price. */
function estimateCallCost(minutes: number, pack: CreditPack): number {
  return (creditsForCall(minutes * 60) * pack.price) / pack.credits;
}

export default function PricingEstimator() {
  const [minutes, setMinutes] = useState(15);
  const sliderId = useId();
  const introRef = useReveal<HTMLDivElement>();
  const cardRef = useReveal<HTMLDivElement>();

  const credits = creditsForCall(minutes * 60);
  const cost = estimateCallCost(minutes, starterPack);
  const bestCost = estimateCallCost(minutes, bestValuePack);
  const animatedCost = useAnimatedNumber(cost);
  const animatedCredits = useAnimatedNumber(credits);

  return (
    <section aria-labelledby="pricing-heading" className="bg-white px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div ref={introRef} data-reveal>
          <h2 id="pricing-heading" className="font-heading text-3xl md:text-4xl font-bold text-oe-ink mb-4">
            Pay only for the time you use
          </h2>
          <p className="text-body-lg text-oe-muted mb-6">
            No subscription and no commitment. Buy a pack of credits, use them for calls or chat, and keep whatever
            you don&rsquo;t use. Credits never expire.
          </p>
          <ul className="space-y-3 text-body text-oe-ink">
            <li className="flex items-start gap-3">
              <i className="ri-phone-line text-oe-primary text-xl mt-0.5" aria-hidden="true" />
              Calls use {CREDITS_PER_CALL_MINUTE} credits per minute
            </li>
            <li className="flex items-start gap-3">
              <i className="ri-message-3-line text-oe-primary text-xl mt-0.5" aria-hidden="true" />
              AI chat uses {CREDITS_PER_CHAT_MESSAGE} credits per message
            </li>
            <li className="flex items-start gap-3">
              <i className="ri-price-tag-3-line text-oe-primary text-xl mt-0.5" aria-hidden="true" />
              Packs from {formatPrice(starterPack.price)} for {starterPack.credits} credits
            </li>
          </ul>
        </div>

        <div ref={cardRef} data-reveal className="bg-oe-bg rounded-oe-md border border-oe-line p-7 md:p-9 shadow-oe-sm">
          <label htmlFor={sliderId} className="flex items-baseline justify-between font-semibold text-oe-ink mb-4">
            <span>How long would you like to talk?</span>
            <span className="text-oe-primary tabular-nums">{minutes} min</span>
          </label>
          <input
            id={sliderId}
            type="range"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={STEP_MINUTES}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            aria-valuetext={`${minutes} minutes`}
            className="w-full h-2 cursor-pointer accent-oe-primary"
          />
          <div className="flex justify-between text-sm text-oe-muted mt-2" aria-hidden="true">
            <span>{MIN_MINUTES} min</span>
            <span>{MAX_MINUTES} min</span>
          </div>

          <div className="mt-8 pt-6 border-t border-oe-line">
            <p className="text-sm font-medium uppercase tracking-wider text-oe-muted mb-1">Estimated cost</p>
            <p className="font-heading text-4xl md:text-5xl font-bold text-oe-ink tabular-nums" aria-hidden="true">
              {formatPrice(animatedCost)}
            </p>
            <p className="text-body text-oe-muted mt-1" aria-hidden="true">
              {Math.round(animatedCredits)} credits at the {starterPack.name} rate &middot; as low as{' '}
              {formatPrice(bestCost)} with the {bestValuePack.name} pack
            </p>
            {/* Screen readers get the settled value once, not every animation frame. */}
            <p className="sr-only" aria-live="polite">
              {minutes} minutes is about {formatPrice(cost)}, or {credits} credits, at the {starterPack.name} rate.
              As low as {formatPrice(bestCost)} with the {bestValuePack.name} pack.
            </p>
          </div>

          <Link
            to="/pricing"
            className="oe-btn mt-7 inline-flex w-full items-center justify-center gap-2 rounded-oe-sm bg-oe-primary hover:bg-oe-primary-hover px-6 py-3.5 text-body font-semibold text-white"
          >
            See credit packs
            <i className="ri-arrow-right-line" aria-hidden="true" />
          </Link>
          <p className="text-sm text-oe-muted mt-3 text-center">
            Estimate only. Credits are bought in packs and charged per minute used.
          </p>
        </div>
      </div>
    </section>
  );
}
