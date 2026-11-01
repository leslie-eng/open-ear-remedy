import { useReveal } from '../../hooks/useReveal';

// Only claims already made elsewhere on the site.
// TODO: confirm claim: "Trained listeners". Add it here only once it is true:
//   { icon: 'ri-user-heart-line', title: 'Trained listeners', text: '…' },
const TRUST_POINTS = [
  {
    icon: 'ri-lock-line',
    title: 'Private and confidential',
    text: 'Your conversations and data are kept secure and confidential.',
  },
  {
    icon: 'ri-heart-3-line',
    title: 'Judgment-free',
    text: 'A safe space to talk. This isn’t therapy, just someone ready to listen.',
  },
  {
    icon: 'ri-secure-payment-line',
    title: 'Secure payments',
    text: 'Pay with M-Pesa. Credits never expire.',
  },
];

export default function TrustBlock() {
  const ref = useReveal<HTMLUListElement>();

  return (
    <section aria-label="Why people trust Open Ear" className="bg-white border-y border-oe-line px-5 md:px-8 py-10 md:py-12">
      <ul ref={ref} data-reveal-group className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {TRUST_POINTS.map((point) => (
          <li key={point.title} className="flex items-start gap-4">
            <span className="shrink-0 w-11 h-11 rounded-full bg-oe-primary-soft text-oe-primary flex items-center justify-center">
              <i className={`${point.icon} text-xl`} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-oe-ink">{point.title}</p>
              <p className="text-[0.95rem] text-oe-muted">{point.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
