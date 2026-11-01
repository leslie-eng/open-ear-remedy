/*
 * Booking a Conversation for later. One source of truth for the API and the website.
 */

export type BookingMinutes = 30 | 45;
export const BOOKING_MINUTES: readonly BookingMinutes[] = [30, 45];

/** A Listener's free start times must be at least this far apart (the longest booking). */
export const SLOT_SPACING_MINUTES = 45;

/** Bookings can be made from 1 hour to 14 days ahead. */
export const BOOKING_MIN_LEAD_MS = 60 * 60 * 1000;
export const BOOKING_MAX_AHEAD_MS = 14 * 24 * 60 * 60 * 1000;

/** The Join button appears this long before the start time. */
export const JOIN_EARLY_MS = 5 * 60 * 1000;
/** Nobody joined by this long after the start: it's a no-show. */
export const NO_SHOW_AFTER_MS = 15 * 60 * 1000;

/** Two no-shows within 30 days pause booking for 7 days. */
export const NO_SHOW_LIMIT = 2;
export const NO_SHOW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const BOOKING_PAUSE_MS = 7 * 24 * 60 * 60 * 1000;

export type BookingStatus = 'booked' | 'joined' | 'completed' | 'cancelled' | 'client_no_show' | 'listener_no_show';

export interface OpenSlot {
  slotId: string;
  startsAt: string;
}

export interface Booking {
  id: string;
  startsAt: string;
  minutes: BookingMinutes;
  mode: 'voice' | 'text';
  status: BookingStatus;
  /** Present for the Listener's own view only: the person's display name. */
  clientName?: string;
}

/** Whether a booking's Join button should show at `now` (ms). */
export function canJoin(booking: { startsAt: string; minutes: number; status: BookingStatus }, now: number): boolean {
  if (booking.status !== 'booked' && booking.status !== 'joined') return false;
  const start = Date.parse(booking.startsAt);
  return now >= start - JOIN_EARLY_MS && now < start + booking.minutes * 60 * 1000;
}
