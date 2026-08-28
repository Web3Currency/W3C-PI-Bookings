export type ServiceCategory = 'landing_page' | 'web_dev' | 'ux_design' | 'pi_sdk' | 'consulting';
export type CategoryId = ServiceCategory | string;

export type ServiceStatus = 'Draft' | 'Published' | 'Archived';
export type ProviderProfileStatus = 'Draft' | 'Published' | 'Archived';

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed'
  | 'Refunded';

export type PaymentStatus = 'Unpaid' | 'Paid' | 'Refunded' | 'Released';

export type EscrowStatus =
  | 'pending_payment'
  | 'paid_escrowed'
  | 'completion_confirmed'
  | 'released'
  | 'refund_processing'
  | 'refunded'
  | 'refund_failed'
  | 'disputed';

export interface BookingAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Provider {
  id: string;
  fullName: string;
  piUsername?: string;
  piUid?: string;
  photoUrl?: string;
  piWalletAddress?: string;
  bio?: string;
  skills?: string[];
  status?: ProviderProfileStatus;
  [key: string]: any;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category?: ServiceCategory | string;
  providerId?: string;
  providerName?: string;
  provider?: Provider;
  durationMinutes: number;
  basePrice?: number;
  priceNGN: number;
  pricePi: number;
  currency?: string;
  status?: ServiceStatus;
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
  /** Legacy client-selected schedule fields — no longer used in the booking flow. */
  date?: string;
  timeSlot?: string;
  clientName: string;
  clientPiUsername: string;
  clientPiUid?: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  attachments?: BookingAttachment[];
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  escrow_status?: EscrowStatus | string;
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
  /** Authoritative server/database booking creation timestamp. */
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
