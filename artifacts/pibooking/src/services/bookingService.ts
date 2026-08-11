import { Booking, BookingStatus, PaymentStatus } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseInsert, safeSupabaseUpdate } from '../lib/supabase';
import { customerService } from './customerService';

const LOCAL_BOOKINGS_KEY = 'w3c_bookings';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

export const bookingService = {
  getBookingsLocal(): Booking[] {
    const cached = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  },

  async getBookingsAsync(): Promise<Booking[]> {
    const localBookings = this.getBookingsLocal();

    if (!isSupabaseConfigured()) {
      return localBookings;
    }

    console.log('[Supabase Request] Fetching bookings from table "bookings"...');

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase Note] Failed to fetch bookings from database:', error.message);
        if (error.code === '42501') logRLSHint('bookings');
        return localBookings;
      }

      if (!data) return localBookings;

      console.log(`[Supabase Success] Received ${data.length} bookings from database.`);

      const remoteBookings: Booking[] = data.map((row: any) => ({
        id: row.id,
        serviceId: row.service_id || '',
        serviceName: row.service_title || row.service_name || 'Service',
        durationMinutes: row.duration_minutes || 60,
        basePrice: Number(row.base_price) || Number(row.price_ngn) || 0,
        currency: row.currency || 'NGN',
        priceNGN: Number(row.base_price) || Number(row.price_ngn) || 0,
        pricePi: Number(row.price_pi) || 0,
        date: row.booking_date || row.date,
        timeSlot: row.booking_time || row.time_slot,
        clientName: row.customer_name || row.client_name,
        clientPiUsername: row.customer_pi_username || row.client_pi_username,
        clientPhone: row.customer_phone || row.client_phone || '',
        clientEmail: row.customer_email || row.client_email,
        notes: row.notes,
        attachments: Array.isArray(row.attachments) ? row.attachments : [],
        status: (row.status || 'Confirmed') as BookingStatus,
        paymentStatus: (row.payment_status || 'Paid') as PaymentStatus,
        escrow_status: row.escrow_status || 'pending_payment',
        paid_at: row.paid_at,
        confirmed_at: row.confirmed_at,
        released_at: row.released_at,
        refunded_at: row.refunded_at,
        platform_fee_pi: row.platform_fee_pi,
        provider_payout_pi: row.provider_payout_pi,
        rejection_reason: row.rejection_reason,
        providerId: row.provider_id,
        providerName: row.provider_name,
        providerPiUsername: row.provider_pi_username,
        providerWalletAddress: row.provider_wallet_address,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        piTxHash: row.pi_tx_hash,
        rating: row.rating,
        reviewComment: row.review_comment,
        reviewDate: row.review_date,
      }));

      localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(remoteBookings));
      return remoteBookings;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching bookings:', e?.message || e);
      return localBookings;
    }
  },

  async saveBookingAsync(newBooking: Omit<Booking, 'id'> & { id?: string }): Promise<Booking> {
    const id = newBooking.id || `bk_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const fullBooking: Booking = {
      ...newBooking,
      id,
      basePrice: newBooking.basePrice || newBooking.priceNGN,
      priceNGN: newBooking.basePrice || newBooking.priceNGN,
      currency: newBooking.currency || 'NGN',
      paymentStatus: newBooking.paymentStatus || 'Paid',
      status: newBooking.status || 'Confirmed',
      createdAt: newBooking.createdAt || new Date().toISOString(),
    };

    // Register / update customer CRM record
    await customerService.trackCustomerActivityAsync({
      name: fullBooking.clientName,
      piUsername: fullBooking.clientPiUsername,
      phone: fullBooking.clientPhone,
      email: fullBooking.clientEmail,
      spendBase: fullBooking.basePrice,
      spendPi: fullBooking.pricePi,
      currency: fullBooking.currency,
    });

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Saving booking id="${fullBooking.id}" into Supabase...`);
      try {
        const payload: Record<string, any> = {
          status: fullBooking.status,
          customer_name: fullBooking.clientName,
          customer_pi_username: fullBooking.clientPiUsername,
          customer_phone: fullBooking.clientPhone,
          customer_email: fullBooking.clientEmail,
          service_title: fullBooking.serviceName,
          booking_date: fullBooking.date,
          booking_time: fullBooking.timeSlot,
          notes: fullBooking.notes || '',
          attachments: fullBooking.attachments || [],
          base_price: fullBooking.basePrice,
          currency: fullBooking.currency || 'NGN',
          price_pi: fullBooking.pricePi,
          payment_status: fullBooking.paymentStatus,
          escrow_status: fullBooking.escrow_status || 'pending_payment',
          paid_at: fullBooking.paid_at || null,
          platform_fee_pi: fullBooking.platform_fee_pi || null,
          provider_payout_pi: fullBooking.provider_payout_pi || null,
          provider_id: fullBooking.providerId || null,
          created_at: fullBooking.createdAt,
        };

        // If ID matches UUID format, pass it explicitly, otherwise omit so Supabase generates UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fullBooking.id);
        if (isUuid) {
          payload.id = fullBooking.id;
        }

        const { data, error } = await safeSupabaseInsert('bookings', payload);

        if (error) {
          console.warn('[Supabase Note] Failed to insert booking in database:', error.message);
          if (error.code === '42501') logRLSHint('bookings');
        } else if (data && data[0]) {
          console.log('[Supabase Success] Booking saved to database:', data[0]);
          if (data[0].id) {
            fullBooking.id = data[0].id;
          }
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Booking insertion failed:', e?.message || e);
      }
    }

    const currentBookings = this.getBookingsLocal();
    const updatedBookings = [fullBooking, ...currentBookings.filter(b => b.id !== fullBooking.id)];
    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(updatedBookings));

    return fullBooking;
  },


  async updateBookingEscrowStatusAsync(bookingId: string, escrow_status: string, payoutTxHash?: string): Promise<Booking[]> {
    const timestamp = new Date().toISOString();

    const sourceBookings = isSupabaseConfigured()
      ? await this.getBookingsAsync()
      : this.getBookingsLocal();

    const currentBooking = sourceBookings.find((b) => b.id === bookingId);

    const updatePayload: Record<string, any> = {
      escrow_status,
      updated_at: timestamp,
    };

    if (payoutTxHash) {
      updatePayload.payout_tx_hash = payoutTxHash;
    }

    if (escrow_status === 'completion_confirmed') {
      updatePayload.confirmed_at = timestamp;
    } else if (escrow_status === 'released') {
      updatePayload.status = 'Completed';
      updatePayload.released_at = timestamp;

      if (currentBooking) {
        const pricePi = Number(currentBooking.pricePi || 0);
        const platformFeePi = Number((pricePi * 0.10).toFixed(7));
        const providerPayoutPi = Number((pricePi * 0.90).toFixed(7));

        updatePayload.platform_fee_pi = platformFeePi;
        updatePayload.provider_payout_pi = providerPayoutPi;
      }
    } else if (escrow_status === 'refunded') {
      updatePayload.refunded_at = timestamp;
    }

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Updating booking escrow_status id="${bookingId}" to "${escrow_status}"...`);

      try {
        const { data, error } = await safeSupabaseUpdate(
          'bookings',
          updatePayload,
          'id',
          bookingId
        );

        if (error) {
          console.warn('[Supabase Note] Failed to update booking escrow status in database:', error.message);
          if (error.code === '42501') logRLSHint('bookings');
        } else {
          console.log('[Supabase Success] Booking escrow status updated in database:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Booking escrow status update failed:', e?.message || e);
      }

      return await this.getBookingsAsync();
    }

    const updatedBookings = sourceBookings.map((b) => {
      if (b.id !== bookingId) return b;

      const pricePi = Number(b.pricePi || 0);
      const platformFeePi = Number((pricePi * 0.10).toFixed(7));
      const providerPayoutPi = Number((pricePi * 0.90).toFixed(7));

      return {
        ...b,
        escrow_status,
        status: escrow_status === 'released' ? 'Completed' : b.status,
        payoutTxHash: payoutTxHash || b.payoutTxHash,
        platform_fee_pi: escrow_status === 'released'
          ? platformFeePi
          : b.platform_fee_pi,
        provider_payout_pi: escrow_status === 'released'
          ? providerPayoutPi
          : b.provider_payout_pi,
        confirmed_at: escrow_status === 'completion_confirmed'
          ? timestamp
          : b.confirmed_at,
        released_at: escrow_status === 'released'
          ? timestamp
          : b.released_at,
        refunded_at: escrow_status === 'refunded'
          ? timestamp
          : b.refunded_at,
        updatedAt: timestamp,
      };
    });

    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(updatedBookings));
    return updatedBookings;
  },

  async updateBookingStatusAsync(bookingId: string, newStatus: BookingStatus, rejectionReason?: string, payoutTxHash?: string): Promise<Booking[]> {
    const timestamp = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: timestamp,
    };

    if (payoutTxHash) {
      updatePayload.payout_tx_hash = payoutTxHash;
    }

    if (newStatus === 'Cancelled') {
      updatePayload.escrow_status = 'refunded';
      updatePayload.rejection_reason = rejectionReason || '';
      updatePayload.refunded_at = timestamp;
    }

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Updating booking status id="${bookingId}" to "${newStatus}"...`);
      try {
        const { data, error } = await safeSupabaseUpdate('bookings', updatePayload, 'id', bookingId);

        if (error) {
          console.warn('[Supabase Note] Failed to update booking status:', error.message);
          if (error.code === '42501') logRLSHint('bookings');
        } else {
          console.log('[Supabase Success] Booking status updated:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Booking status update failed:', e?.message || e);
      }

      return await this.getBookingsAsync();
    }

    const currentBookings = this.getBookingsLocal();
    const updatedBookings = currentBookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: newStatus as BookingStatus,
          payoutTxHash: payoutTxHash || b.payoutTxHash,
          ...(newStatus === 'Cancelled' ? {
            escrow_status: 'refunded',
            rejection_reason: rejectionReason || '',
            refunded_at: timestamp,
          } : {}),
          updatedAt: timestamp,
        };
      }
      return b;
    });

    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(updatedBookings));
    return updatedBookings;
  },

  async submitBookingReviewAsync(bookingId: string, rating: number, comment: string): Promise<Booking[]> {
    const reviewDate = new Date().toISOString();

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Saving review for booking id="${bookingId}"...`);
      try {
        const { data, error } = await safeSupabaseUpdate('bookings', {
          rating,
          review_comment: comment,
          review_date: reviewDate,
          updated_at: reviewDate,
        }, 'id', bookingId);

        if (error) {
          console.warn('[Supabase Note] Failed to save booking review in database:', error.message);
          if (error.code === '42501') logRLSHint('bookings');
        } else {
          console.log('[Supabase Success] Booking review saved in database:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Booking review submission failed:', e?.message || e);
      }

      return await this.getBookingsAsync();
    }

    const currentBookings = this.getBookingsLocal();
    const updatedBookings = currentBookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          rating,
          reviewComment: comment,
          reviewDate,
          updatedAt: reviewDate,
        };
      }
      return b;
    });

    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(updatedBookings));
    return updatedBookings;
  }
};
