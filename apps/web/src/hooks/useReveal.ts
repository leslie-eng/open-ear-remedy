import { useEffect, useRef } from 'react';

/**
 * Reveal-on-scroll, once, at 15% visibility. Pair with `data-reveal` (single element)
 * or `data-reveal-group` (direct children reveal in sequence, 80ms apart).
 * Styles live in src/styles/motion.css.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (el.hasAttribute('data-reveal-group')) {
      Array.from(el.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty('--reveal-index', String(i));
      });
    }

    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
