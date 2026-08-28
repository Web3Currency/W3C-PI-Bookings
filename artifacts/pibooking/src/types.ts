export type BookingStatus = 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rejected';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Refunded' | 'Partial';

export interface BookingAttachment {
  id?: string;
  name: string;
  url?: string;
  type?: string;
}

export interface Provider {
  id: string;
  fullName: string;
  piUsername?: string;
  photoUrl?: string;
  piWalletAddress?: string;
  [key: string]: any;
}

export interface Service {
  id: string;
  name: string;
  providerId?: string;
  providerName?: string;
  provider?: Provider;
  durationMinutes: number;
  basePrice?: number;
  priceNGN: number;
  pricePi: number;
  currency?: string;
  [key: string]: any;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  priceNGN: number;
  pricePi: number;
  date: string;
  timeSlot: string;
  clientName: string;
  clientPiUsername: string;
  clientPiUid?: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  attachments?: BookingAttachment[];
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  escrow_status?: string;
  paid_at?: string;
  confirmed_at?: string;
  released_at?: string;
  refunded_at?: string;
  cancelled_at?: string;
  acceptance_deadline?: string;
  platform_fee_pi?: number;
  provider_payout_pi?: number;
  rejection_reason?: string;
  providerId?: string;
  providerName?: string;
  providerPiUsername?: string;
  providerPhotoUrl?: string;
  providerWalletAddress?: string;
  payoutTxHash?: string;
  createdAt: string;
  updatedAt?: string;
  piTxHash?: string;
  piPaymentId?: string;
  qrCodeUrl?: string;
  rating?: number;
  reviewComment?: string;
  reviewDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  piUsername: string;
  phone: string;
  email?: string;
  totalBookings: number;
  totalSpendBase: number;
  totalSpendPi: number;
  currency: string;
  lastActiveAt: string;
  createdAt: string;
}

export interface PiUser {
  uid: string;
  username: string;
  accessToken?: string;
}

export interface PiPaymentResult {
  identifier: string;
  txHash: string;
  amount: number;
  memo: string;
  /** Server-created booking id when /complete finalized the booking. */
  bookingId?: string;
}

export interface ClientDetails {
  clientName: string;
  clientPiUsername: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  attachments?: BookingAttachment[];
}

export interface BecomeProviderDetails {
  fullName: string;
  [key: string]: any;
}
