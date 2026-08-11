/**
 * Global Constants for Pi Business Operating System
 */

export const APP_NAME = "Pi Business OS";
export const APP_DESCRIPTION = "Turnkey Business Operating System for Pi Network Service Merchants";

export const DEFAULT_CURRENCY = "NGN";
export const DEFAULT_EXCHANGE_RATE_NGN = 3500; // 1 Pi = 3,500 NGN
export const DEFAULT_TIMEZONE = "Africa/Lagos";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KES: "KSh",
  GHS: "GH₵",
};

export const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

export const STORAGE_BUCKETS = {
  SERVICE_IMAGES: "service-images",
  BUSINESS_LOGO: "business-logo",
  GALLERY: "gallery",
  RECEIPTS: "receipts",
  providerPhotos: "provider-photos",
} as const;
