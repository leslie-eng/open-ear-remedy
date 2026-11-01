import type { Booking } from '@openear/shared/booking';
import { apiUrl, getAccessToken } from './api';

/** Downloads a booking's calendar file (.ics). Needs the signed-in token, so it can't be a plain link. */
export async function downloadCalendarFile(bookingId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/bookings/${bookingId}/calendar.ics`), {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  });
  if (!res.ok) throw new Error('Could not get the calendar file.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'open-ear-conversation.ics';
  a.click();
  URL.revokeObjectURL(url);
}

/** "Tuesday 4 November, 15:00" in the viewer's own time zone. */
export function formatBookingTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Where to go to join a booking. */
export function joinPath(booking: Pick<Booking, 'id' | 'mode'>): string {
  return booking.mode === 'text' ? `/listener-chat?booking=${booking.id}` : `/call?booking=${booking.id}`;
}

export const STATUS_LABELS: Record<Booking['status'], string> = {
  booked: 'Booked',
  joined: 'In progress',
  completed: 'Done',
  cancelled: 'Cancelled',
  client_no_show: 'Missed',
  listener_no_show: 'Listener couldn’t make it, credits returned',
};
