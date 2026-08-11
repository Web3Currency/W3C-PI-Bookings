import { BusinessProfile } from '../types';

export const EMPTY_BUSINESS_PROFILE: BusinessProfile = {
  id: 'w3c_digital',
  name: 'W3C Digital Network',
  tagline: 'High-Converting UI/UX & Web Development for Web3 & Pi Ecosystem',
  category: 'web_dev',
  avatarUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20%284%29-ie2R59jxk6ypBF6z9h8b2PGAo71RHQ.png',
  logoUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20%284%29-ie2R59jxk6ypBF6z9h8b2PGAo71RHQ.png',
  piWalletAddress: 'GBX9...APEX88PI',
  verifiedPiMerchant: true,
  rating: 5.0,
  reviewsCount: 0,
  location: 'Remote / Worldwide (Zoom / Google Meet)',
  bio: 'Senior Product Design studio crafting sleek mobile apps, Pi Mini Apps, and high-conversion landing pages with full Pi Network payment integration.',
  website: 'https://web3currency.online',
  phone: '+234 703 275 4611',
  email: 'web3currency.info@gmail.com',
  socials: [
    { platform: 'Twitter / X', url: 'https://x.com/Web3CurrencyNG', handle: '@Web3CurrencyNG' },
    { platform: 'Telegram', url: 'https://t.me/Web3CurrencyNG', handle: '@Web3CurrencyNG' },
    { platform: 'Pi Chat Profile', url: 'https://profiles.pinet.com/profiles/adeyemojibola8', handle: '@adeyemojibola8' }
  ],
  businessHours: {
    monday: { open: '09:00', close: '17:00', active: true },
    tuesday: { open: '09:00', close: '17:00', active: true },
    wednesday: { open: '09:00', close: '17:00', active: true },
    thursday: { open: '09:00', close: '17:00', active: true },
    friday: { open: '09:00', close: '17:00', active: true },
    saturday: { open: '10:00', close: '15:00', active: true },
    sunday: { open: '00:00', close: '00:00', active: false },
  },
  blockedDates: [],
  galleryImages: [],
  services: [],
};

export const DEFAULT_BUSINESS_PROFILE = EMPTY_BUSINESS_PROFILE;
