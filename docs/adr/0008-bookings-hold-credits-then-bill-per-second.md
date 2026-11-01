# Bookings hold credits, then bill per second like any Conversation

A Booking is made with one Listener's Free Time. We take the credits for the full length aside when booking, rather than charging up front or charging nothing: a held amount guarantees the person can afford the time they reserved, but when the booked Conversation starts the hold is given back and the normal per-second billing takes over, so people pay only for Connected Time, exactly as with Talk now. Monthly Pass time counts first, so only the rest is held.

Joining a Booking rings nobody else: the person is connected straight to their booked Listener (even during the Listener's Cooldown), for at most the booked length.

## Considered options

- **Charge the full booking up front, refund the unused part**: simpler to reason about, but people would see charges for time they never used and would depend on refunds.
- **Hold nothing**: a person could book time they can't afford, and find out only when the Conversation is cut short.

## Consequences

- Reminders and No-shows are handled by an in-process sweep in the API every minute (`bookings.sweep`); it relies on the keep-awake ping that stops Render's free plan sleeping.
- A person is counted as a No-show only if their Listener was online near the start time; two in 30 days pause booking (not Talk now) for 7 days. A Listener No-show returns the credits and emails `ADMIN_EMAIL`.
- Calendar files and reminder emails say only "Open Ear conversation", so nothing sensitive shows in a shared calendar or inbox preview.
- The old appointment request form (`/api/appointments`) is retired; Admins can still see old requests.
