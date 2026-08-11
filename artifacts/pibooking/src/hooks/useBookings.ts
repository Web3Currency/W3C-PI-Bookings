import { useState, useEffect, useCallback } from 'react';
import { Booking, BookingStatus } from '../types';
import { bookingService } from '../services/bookingService';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>(() => bookingService.getBookingsLocal());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const data = await bookingService.getBookingsAsync();
    setBookings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const addBooking = useCallback(async (newBooking: Omit<Booking, 'id'>) => {
    await bookingService.saveBookingAsync(newBooking);
    const fresh = await bookingService.getBookingsAsync();
    setBookings(fresh);
    return fresh;
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
    const updatedList = await bookingService.updateBookingStatusAsync(bookingId, status);
    setBookings(updatedList);
    return updatedList;
  }, []);

  const submitReview = useCallback(async (bookingId: string, rating: number, comment: string) => {
    const updatedList = await bookingService.submitBookingReviewAsync(bookingId, rating, comment);
    setBookings(updatedList);
    return updatedList;
  }, []);

  return {
    bookings,
    loading,
    addBooking,
    updateBookingStatus,
    submitReview,
    refreshBookings: fetchBookings,
  };
}
