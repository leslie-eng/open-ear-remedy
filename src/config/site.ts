export const siteConfig = {
  /**
   * Whether human listeners are available right now.
   * - true  → "Listeners available now" (breathing green dot)
   * - false → "Listeners are busy right now"
   * - null  → availability unknown; shows the existing "AI chat open 24/7" note instead.
   * TODO(availability): there is no availability API yet. Wire this to real data
   * (e.g. a /api/public/availability endpoint) — never hardcode `true`.
   */
  listenerAvailability: null as boolean | null,

  /** Emergency resources page, linked from the header, hero and footer. */
  crisisPath: '/crisis-help',
};
