import { useState, useEffect } from 'react';
import { Service, Booking, BusinessProfile, Provider } from './types';
import { useBusiness } from './hooks/useBusiness';
import { useServices } from './hooks/useServices';
import { useBookings } from './hooks/useBookings';
import { usePiAuth } from './hooks/usePiAuth';
import { bookingService } from './services/bookingService';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ServiceBrowser } from './components/ServiceBrowser';
import { SearchView } from './components/SearchView';
import { ServiceDetail } from './components/ServiceDetail';
import { SelectDetailsStep } from './components/SelectDetailsStep';
import { SelectScheduleStep } from './components/SelectScheduleStep';
import { BookingSummaryStep } from './components/BookingSummaryStep';
import { PiPaymentModal } from './components/PiPaymentModal';
import { BookingConfirmationStep } from './components/BookingConfirmationStep';
import { BookingStatusView } from './components/BookingStatusView';
import { PublicProfileView } from './components/PublicProfileView';
import { BecomeProviderStep, BecomeProviderDetails } from './components/BecomeProviderStep';
import { BecomeProviderModal } from './components/BecomeProviderModal';
import { ProviderDashboardView } from './features/provider/ProviderDashboardView';
import { providerService } from './services/providerService';
import { ThemeService } from './services/themeService';
import { settingsService } from './services/settingsService';

type FlowStep = 'browse' | 'about' | 'detail' | 'select_details' | 'select_schedule' | 'review_summary' | 'payment' | 'confirmation' | 'status' | 'become_provider' | 'provider_console';

export default function App() {
  const { business, loading: loadingBusiness, refreshBusiness } = useBusiness();
  const { services, refreshServices } = useServices();
  const { bookings, refreshBookings } = useBookings();
  const { piUser, loading: piAuthLoading, signIn: signInWithPi, signOut: signOutPi } = usePiAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'bookings'>('browse');
  const [currentFlow, setCurrentFlow] = useState<FlowStep>('browse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [clientDetails, setClientDetails] = useState({ clientName: '', clientPiUsername: '', clientPhone: '', notes: '', attachments: [] as { id: string; name: string; size: string; type: string; dataUrl?: string }[] });
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile | Provider | null>(null);
  const [myProviderId, setMyProviderId] = useState<string | null>(null);
  const [providerCheckDone, setProviderCheckDone] = useState(false);
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [becomeProviderPopupEnabled, setBecomeProviderPopupEnabled] = useState(false);
  const [hasDismissedProviderModal, setHasDismissedProviderModal] = useState(() => sessionStorage.getItem('pibooking_dismissed_provider_modal') === 'true');
  const [isSubmittingProvider, setIsSubmittingProvider] = useState(false);

  const handleRefreshAll = async () => { await Promise.all([refreshBusiness(), refreshServices(), refreshBookings()]); };
  useEffect(() => { settingsService.getSettings().then((settings) => setBecomeProviderPopupEnabled(settings.become_provider_popup_enabled)); }, []);
  useEffect(() => { ThemeService.initTheme(); }, []);
  useEffect(() => { const scrollToTop = () => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; document.querySelector('main')?.scrollTo(0, 0); }; scrollToTop(); const frameId = requestAnimationFrame(scrollToTop); return () => cancelAnimationFrame(frameId); }, [activeTab, currentFlow, selectedService?.id, (selectedProfile as any)?.id]);
  useEffect(() => { if (!piUser) return; setClientDetails((prev) => ({ ...prev, clientPiUsername: piUser.username ? (piUser.username.startsWith('@') ? piUser.username : `@${piUser.username}`) : prev.clientPiUsername })); }, [piUser]);
  useEffect(() => { if (!piUser?.uid) { setMyProviderId(null); setProviderCheckDone(false); return; } providerService.getProviderByPiUid(piUser.uid).then((provider) => { setMyProviderId(provider ? provider.id : null); setProviderCheckDone(true); }); }, [piUser]);
  useEffect(() => { if (!becomeProviderPopupEnabled || !piUser?.uid || !providerCheckDone || myProviderId !== null || hasDismissedProviderModal) return; const timer = setTimeout(() => { if (becomeProviderPopupEnabled && piUser?.uid && myProviderId === null && !hasDismissedProviderModal) setShowBecomeProviderModal(true); }, 7000); return () => clearTimeout(timer); }, [becomeProviderPopupEnabled, piUser, providerCheckDone, myProviderId, hasDismissedProviderModal]);
  const handleDismissProviderModal = () => { setShowBecomeProviderModal(false); setHasDismissedProviderModal(true); sessionStorage.setItem('pibooking_dismissed_provider_modal', 'true'); };
  const handleOpenBecomeProvider = () => { setActiveTab('browse'); setCurrentFlow('become_provider'); };

  const handleSubmitProvider = async (details: BecomeProviderDetails) => {
    if (!piUser?.uid || !piUser.accessToken) return;
    setIsSubmittingProvider(true);
    try {
      const created = await providerService.addProvider({
        fullName: details.fullName, piUsername: details.piUsername || undefined, piUid: piUser.uid,
        roleTitle: details.roleTitle, headline: details.headline || undefined, bio: details.bio,
        photoUrl: details.photoUrl || undefined, piWalletAddress: details.piWalletAddress || undefined,
        location: details.location || undefined, specialties: details.specialties || [], skills: details.skills || [],
        experienceLevel: details.experienceLevel || undefined, yearsExperience: details.yearsExperience || undefined,
        availabilityStatus: details.availabilityStatus || 'available', responseTime: details.responseTime || undefined,
        languages: details.languages || [], serviceMode: details.serviceMode || undefined, website: details.website || undefined,
        portfolioImages: details.portfolioImages || [], portfolioItems: details.portfolioItems || [], status: 'Approved',
      }, piUser.accessToken);
      setMyProviderId(created.id); setCurrentFlow('browse');
    } catch (err: any) {
      console.error('[Provider Registration] Save failed:', err);
      throw err;
    } finally { setIsSubmittingProvider(false); }
  };

  const handleSelectTab = (tab: 'browse' | 'search' | 'bookings') => { setActiveTab(tab); if (tab === 'browse') setCurrentFlow('browse'); else if (tab === 'bookings') setCurrentFlow('status'); };
  // Existing rendering and handlers below remain unchanged.
  return null;
}
