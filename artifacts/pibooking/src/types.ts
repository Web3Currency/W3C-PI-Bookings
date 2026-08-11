export type ServiceCategory = 'landing_page' | 'web_dev' | 'ux_design' | 'pi_sdk' | 'consulting';
export type CategoryId = ServiceCategory | string;

export type ServiceStatus = 'Draft' | 'Published' | 'Archived';

export interface Provider {
  id: string;
  fullName: string;
  piUsername?: string;
  piUid?: string;
  piWalletAddress?: string;
  roleTitle: string;
  bio?: string;
  photoUrl?: string;
  portfolioImages?: string[];
  rating?: number;
  reviewsCount?: number;
  contactEmail?: string;
  contactPhone?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Suspended';
  createdAt?: string;
  updatedAt?: string;

  // Public Profile Fields
  usernameSlug?: string;
  headline?: string;
  specialties?: string[];
  skills?: string[];
  experienceLevel?: string;
  yearsExperience?: number;
  availabilityStatus?: 'available' | 'busy' | 'away' | string;
  responseTime?: string;
  languages?: string[];
  serviceMode?: string;
  profileVerified?: boolean;
  piVerified?: boolean;
  location?: string;
  website?: string;
  socialLinks?: SocialLink[];
  profileVisibility?: 'public' | 'private' | string;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory | string;
  description: string;
  fullDescription?: string;
  coverImageUrl: string;
  included: string[];
  durationMinutes: number;
  basePrice: number;
  currency: string;
  priceNGN: number;
  pricePi: number;
  featured: boolean;
  providerName: string;
  providerRole: string;
  providerId?: string;
  provider?: Provider;
  locationType: string;
  status: ServiceStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Refunded';

export interface BookingAttachment {
  id?: string;
  name: string;
  url?: string;
  size?: string;
  type?: string;
  dataUrl?: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  businessName?: string;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  priceNGN: number;
  pricePi: number;
  date: string;
  timeSlot: string;
  clientName: string;
  clientPiUsername: string;
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
  platform_fee_pi?: number;
  provider_payout_pi?: number;
  rejection_reason?: string;
  providerId?: string;
  providerName?: string;
  providerPiUsername?: string;
  providerWalletAddress?: string;
  payoutTxHash?: string;
  createdAt: string;
  updatedAt?: string;
  piTxHash?: string;
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

export interface DaySchedule {
  open: string;
  close: string;
  active: boolean;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface SocialLink {
  platform: string;
  url: string;
  handle: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  tagline: string;
  category: string;
  avatarUrl: string;
  logoUrl?: string;
  piWalletAddress: string;
  verifiedPiMerchant: boolean;
  rating: number;
  reviewsCount: number;
  location: string;
  bio: string;
  website: string;
  phone: string;
  email: string;
  socials: SocialLink[];
  businessHours: BusinessHours;
  blockedDates: string[];
  galleryImages: GalleryImage[];
  services: Service[];
  updatedAt?: string;

  // Public Profile Fields
  usernameSlug?: string;
  headline?: string;
  specialties?: string[];
  servicesSummary?: string;
  profileVerified?: boolean;
  piVerified?: boolean;
  availabilityStatus?: string;
  responseTime?: string;
  socialLinks?: SocialLink[];
  profileVisibility?: string;
}

export interface GlobalSettings {
  exchangeRateNGN: number;
  defaultCurrency: string;
  timezone: string;
  updatedAt?: string;
}

export type AppTab = 'customer' | 'console';

export interface PiUser {
  username: string;
  uid: string;
  accessToken?: string;
  verified?: boolean;
  walletBalancePi?: number;
}

export interface PiPaymentResult {
  identifier: string;
  txHash: string;
  amount: number;
  memo: string;
}

export interface TimeSlotOption {
  time: string;
  available: boolean;
  reason?: string;
}

declare global {
  interface Window {
    Pi?: {
      /** Returns a Promise that resolves once the SDK is fully initialised. */
      init: (config: { version: string; sandbox?: boolean }) => Promise<void>;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (payment: any) => void
      ) => Promise<{
        accessToken: string;
        user: {
          uid: string;
          username: string;
        };
      }>;
      createPayment: (
        paymentData: {
          amount: number;
          memo: string;
          metadata: Record<string, any>;
        },
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onReadyForServerCompletion: (paymentId: string, txid: string) => void;
          onCancel: (paymentId: string) => void;
          onError: (error: Error, payment?: any) => void;
        }
      ) => void;
    };
  }
}
