# Credits plus a capped Monthly Pass, not an unlimited subscription

Everything is paid in Credits (10 per Call minute, billed per second of Connected Time; 1 per AI message), bought as Credit Packs in KES with M-Pesa (see ADR 0006). The Monthly Pass (KSh 500 for 30 days) was first proposed as unlimited calls and chat, but it is capped at 180 Call minutes per pass and 100 AI messages per Nairobi day, because every Call minute costs Listener time and every AI message costs a paid model call: an unlimited pass would let one person cost far more than they paid.

## Consequences

- The Monthly Pass is spent before Credits, so pass holders keep their Credits as a fallback once the allowance runs out.
- It is bought by hand each time (M-Pesa has no saved payment method to renew from). If one is already running, at most one more can be queued behind it.
- All prices live in `packages/shared/src/pricing.ts`, so the site and the API cannot disagree.
