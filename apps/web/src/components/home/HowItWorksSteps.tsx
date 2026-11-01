import { Link } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';
import { FREE_TRIAL_CREDITS } from '@openear/shared/pricing';

const STEPS = [
  {
    icon: 'ri-chat-smile-2-line',
    title: 'Choose call or chat',
    text: 'Talk on the phone, or type at your own pace with our AI chat companion.',
  },
  {
    icon: 'ri-wallet-3-line',
    title: 'Top up',
    text: `Pay as you go with credits that never expire. New here? Start with ${FREE_TRIAL_CREDITS} free credits.`,
  },
  {
    icon: 'ri-hand-heart-line',
    title: 'Connect',
    text: 'We ring your phone, or your chat opens straight away. No appointment needed.',
  },
];

export default function HowItWorksSteps() {
  const headingRef = useReveal<HTMLDivElement>();
  const listRef = useReveal<HTMLOListElement>();

  return (
    <section aria-labelledby="how-heading" className="bg-oe-bg px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} data-reveal className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 id="how-heading" className="font-heading text-3xl md:text-4xl font-bold text-oe-ink mb-3">
            How it works
          </h2>
          <p className="text-body-lg text-oe-muted">Three gentle steps, whenever you&rsquo;re ready.</p>
        </div>

        <ol ref={listRef} data-reveal-group className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="oe-card bg-white rounded-oe-md p-7 shadow-oe-sm border border-oe-line">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-12 h-12 rounded-full bg-oe-primary-tint text-oe-primary flex items-center justify-center">
                  <i className={`${step.icon} text-2xl`} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wider text-oe-primary">Step {i + 1}</span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-oe-ink mb-2">{step.title}</h3>
              <p className="text-body text-oe-muted">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="text-center mt-10">
          <Link to="/how-it-works" className="oe-link font-semibold text-oe-primary">
            Learn more about how Open Ear works
          </Link>
        </p>
      </div>
    </section>
  );
}
