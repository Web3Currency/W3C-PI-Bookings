import { Booking } from '../types';
import { piAuthService } from './piAuthService';
import { bookingService } from './bookingService';

async function request(bookingId: string, action: 'review' | 'dismiss', payload: Record<string, any> = {}): Promise<Booking[]> {
  const user = piAuthService.getStoredUser();
  if (!user?.accessToken) throw new Error('Please sign in with Pi before reviewing a booking.');
  const response = await fetch(`/api/pi/bookings/${encodeURIComponent(bookingId)}${action === 'review' ? '/review' : '/review-dismiss'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: user.accessToken, ...payload }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Failed to update booking review.');
  return bookingService.getBookingsAsync();
}

export const reviewService = {
  submit: (bookingId: string, rating?: number, comment?: string) => request(bookingId, 'review', { rating, comment }),
  dismiss: (bookingId: string) => request(bookingId, 'dismiss'),
};
