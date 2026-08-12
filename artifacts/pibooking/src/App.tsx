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

type FlowStep =
  | 'browse'
  | 'about'
  | 'detail'
  | 'select_details'
  | 'select_schedule'
  | 'review_summary'
  | 'payment'
  | 'confirmation'
  | 'status'
  | 'become_provider'
  | 'provider_console';

export default function App() {
  const { business, loading: loadingBusiness, refreshBusiness } = useBusiness();
  const { services, refreshServices } = useServices();
  const { bookings, refreshBookings } = useBookings();
  console.log("Bookings:", bookings);
  const { piUser, loading: piAuthLoading, signIn: signInWithPi, signOut: signOutPi } = usePiAuth();

  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'bookings'>('browse');
  const [currentFlow, setCurrentFlow] = useState<FlowStep>('browse');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('all');

  const handleOpenSearch = (query?: string, category?: string) => {
    setSearchQuery(query || '');
    setSearchCategory(category || 'all');
    setActiveTab('search');
  };

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [clientDetails, setClientDetails] = useState<{
    clientName: string;
    clientPiUsername: string;
    clientPhone: string;
    notes: string;
    attachments?: { id: string; name: string; size: string; type: string; dataUrl?: string }[];
  }>({
    clientName: '',
    clientPiUsername: '',
    clientPhone: '',
    notes: '',
    attachments: [],
  });

  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile | Provider | null>(null);
  const [myProviderId, setMyProviderId] = useState<string | null>(null);
  const [providerCheckDone, setProviderCheckDone] = useState<boolean>(false);
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState<boolean>(false);
  const [hasDismissedProviderModal, setHasDismissedProviderModal] = useState<boolean>(() => {
    return sessionStorage.getItem('pibooking_dismissed_provider_modal') === 'true';
  });
  const [isSubmittingProvider, setIsSubmittingProvider] = useState(false);

  const handleRefreshAll = async () => {
    await Promise.all([refreshBusiness(), refreshServices(), refreshBookings()]);
  };

  // Initialize centralized database-driven color theme
  useEffect(() => {
    ThemeService.initTheme();
  }, []);

  // Pre-fill booking form handle with Pi identity when authenticated
  useEffect(() => {
    if (!piUser) return;
    setClientDetails((prev) => ({
      ...prev,
      clientPiUsername: piUser.username
        ? piUser.username.startsWith('@') ? piUser.username : `@${piUser.username}`
        : prev.clientPiUsername,
    }));
  }, [piUser]);

  // Check if the signed-in Pi user already has a provider profile
  useEffect(() => {
    if (!piUser?.uid) {
      setMyProviderId(null);
      setProviderCheckDone(false);
      return;
    }
    console.log("Pi UID:", piUser.uid);
    providerService.getProviderByPiUid(piUser.uid).then((provider) => {
      console.log("Matched provider:", provider);
      setMyProviderId(provider ? provider.id : null);
      setProviderCheckDone(true);
      console.log("myProviderId:", provider ? provider.id : null);
    });
  }, [piUser]);

  // Timed "Become a Provider" onboarding popup (7s after sign-in for non-providers)
  useEffect(() => {
    // Trigger ONLY if piUser is signed in AND provider check completed AND myProviderId is null AND not dismissed
    if (!piUser?.uid || !providerCheckDone || myProviderId !== null || hasDismissedProviderModal) {
      return;
    }

    const timer = setTimeout(() => {
      // Re-verify conditions before showing
      if (piUser?.uid && myProviderId === null && !hasDismissedProviderModal) {
        setShowBecomeProviderModal(true);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [piUser, providerCheckDone, myProviderId, hasDismissedProviderModal]);

  const handleDismissProviderModal = () => {
    setShowBecomeProviderModal(false);
    setHasDismissedProviderModal(true);
    sessionStorage.setItem('pibooking_dismissed_provider_modal', 'true');
  };

  const handleOpenBecomeProvider = () => {
    setActiveTab('browse');
    setCurrentFlow('become_provider');
  };

  const handleSubmitProvider = async (details: BecomeProviderDetails) => {
    if (!piUser) return;
    setIsSubmittingProvider(true);
    try {
      const created = await providerService.addProvider({
        fullName: details.fullName,
        piUsername: details.piUsername || undefined,
        piUid: piUser.uid,
        roleTitle: details.roleTitle,
        headline: details.headline || undefined,
        bio: details.bio,
        photoUrl: details.photoUrl || undefined,
        piWalletAddress: details.piWalletAddress || undefined,
        location: details.location || undefined,
        specialties: details.specialties || [],
        skills: details.skills || [],
        experienceLevel: details.experienceLevel || undefined,
        yearsExperience: details.yearsExperience || undefined,
        availabilityStatus: details.availabilityStatus || 'available',
        responseTime: details.responseTime || undefined,
        languages: details.languages || [],
        serviceMode: details.serviceMode || undefined,
        website: details.website || undefined,
        portfolioImages: details.portfolioImages || [],
        status: 'Approved',
      });
      setMyProviderId(created.id);
      setCurrentFlow('browse');
    } finally {
      setIsSubmittingProvider(false);
    }
  };

  const handleSelectTab = (tab: 'browse' | 'search' | 'bookings') => {
    setActiveTab(tab);
    if (tab === 'browse') {
      setCurrentFlow('browse');
    } else if (tab === 'bookings') {
      setCurrentFlow('status');
    }
  };

  const handleSelectService = (service: Service) => {
    setActiveTab('browse');
    setSelectedService(service);
    setCurrentFlow('detail');
  };

  const handleStartBooking = () => {
    setActiveTab('browse');
    setCurrentFlow('select_details');
  };

  const handleConfirmDetails = (details: {
    clientName: string;
    clientPiUsername: string;
    clientPhone: string;
    notes: string;
    attachments?: { id: string; name: string; size: string; type: string; dataUrl?: string }[];
  }) => {
    setActiveTab('browse');
    setClientDetails(details);
    setCurrentFlow('select_schedule');
  };

  const handleConfirmSchedule = (date: string, timeSlot: string) => {
    setActiveTab('browse');
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    setCurrentFlow('review_summary');
  };

  const handleProceedToPayment = () => {
    setActiveTab('browse');
    setCurrentFlow('payment');
  };

  const handlePaymentSuccess = async (newBooking: Booking) => {
    setActiveTab('browse');
    const created = await bookingService.saveBookingAsync({
      ...newBooking,
      escrow_status: 'paid_escrowed',
      paid_at: new Date().toISOString(),
    });
    setConfirmedBooking(created);
    await handleRefreshAll();
    setCurrentFlow('confirmation');
  };

  const handleGoToMyBookings = () => {
    setActiveTab('bookings');
    setCurrentFlow('status');
  };

  const handleCancelBooking = async (bookingId: string) => {
    await bookingService.updateBookingStatusAsync(bookingId, 'Cancelled');
    await refreshBookings();
  };

  const handleRescheduleBooking = (booking: Booking) => {
    setActiveTab('browse');
    if (business) {
      const srv = services.find((s) => s.id === booking.serviceId) || services[0];
      setSelectedService(srv);
      setCurrentFlow('select_details');
    }
  };

  const handleConfirmCompletion = async (bookingId: string) => {
    await bookingService.updateBookingEscrowStatusAsync(bookingId, 'completion_confirmed');
    await refreshBookings();
  };

  const handleAcceptBooking = async (bookingId: string) => {
    await bookingService.updateBookingStatusAsync(bookingId, 'In Progress');
    await refreshBookings();
  };

  const handleRejectBooking = async (bookingId: string, reason: string, payoutTxHash?: string) => {
    await bookingService.updateBookingStatusAsync(bookingId, 'Cancelled', reason, payoutTxHash);
    await refreshBookings();
  };

  const handleNavigateHome = () => {
    setActiveTab('browse');
    setCurrentFlow('browse');
  };

  const handleNavigateSearch = () => {
    setActiveTab('search');
  };

  const handleNavigateBookings = () => {
    setActiveTab('bookings');
    setCurrentFlow('status');
  };

  const handleOpenAboutBusiness = () => {
    setActiveTab('browse');
    setSelectedProfile(businessWithServices);
    setCurrentFlow('about');
  };

  const businessWithServices = {
    ...business,
    services,
  };

  if (loadingBusiness && !business) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
        <span className="text-xs font-bold text-zinc-600">Loading Pi Business OS...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-zinc-900 font-sans selection:bg-amber-500 selection:text-white transition-colors overflow-x-hidden">
      <Navbar
        currentBusiness={businessWithServices}
        piUser={piUser}
        piAuthLoading={piAuthLoading}
        onSignIn={signInWithPi}
        onSignOut={signOutPi}
        hasProvider={!!myProviderId}
        onOpenBecomeProvider={handleOpenBecomeProvider}
        onOpenProviderConsole={() => {
          setActiveTab('browse');
          setCurrentFlow('provider_console');
        }}
        activeTab={activeTab}
        currentFlow={currentFlow}
        bookingsCount={bookings.filter((b) => piUser && (b.clientPiUsername === `@${piUser.username}` || b.clientPiUsername === piUser.username) && (b.status === 'Confirmed' || b.status === 'In Progress')).length}
        onNavigateHome={handleNavigateHome}
        onNavigateSearch={handleNavigateSearch}
        onNavigateBookings={handleNavigateBookings}
        onOpenAboutBusiness={handleOpenAboutBusiness}
      />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'search' ? (
          <SearchView
            services={services}
            onSelectService={handleSelectService}
            initialQuery={searchQuery}
            initialCategory={searchCategory}
          />
        ) : activeTab === 'browse' ? (
          currentFlow === 'browse' ? (
            <ServiceBrowser
              business={businessWithServices}
              services={services}
              onSelectService={handleSelectService}
              onOpenAbout={(merchant) => {
                setSelectedProfile(merchant || null);
                setCurrentFlow('about');
              }}
              onOpenSearch={handleOpenSearch}
            />
          ) : currentFlow === 'about' ? (
            <PublicProfileView
              merchant={selectedProfile || businessWithServices}
              services={services}
              onBack={() => setCurrentFlow('browse')}
              onSelectService={handleSelectService}
            />
          ) : currentFlow === 'detail' && selectedService ? (
            <ServiceDetail
              service={selectedService}
              business={businessWithServices}
              onBack={() => setCurrentFlow('browse')}
              onProceedToBooking={handleStartBooking}
            />
          ) : currentFlow === 'select_details' && selectedService ? (
            <SelectDetailsStep
              service={selectedService}
              initialDetails={clientDetails}
              onBack={() => setCurrentFlow('detail')}
              onProceedToSchedule={handleConfirmDetails}
            />
          ) : currentFlow === 'select_schedule' && selectedService ? (
            <SelectScheduleStep
              service={selectedService}
              initialDate={selectedDate}
              initialTimeSlot={selectedTimeSlot}
              onBack={() => setCurrentFlow('select_details')}
              onConfirmSchedule={handleConfirmSchedule}
            />
          ) : currentFlow === 'review_summary' && selectedService ? (
            <BookingSummaryStep
              service={selectedService}
              business={businessWithServices}
              selectedDate={selectedDate}
              selectedTimeSlot={selectedTimeSlot}
              clientDetails={clientDetails}
              piUser={piUser}
              onBack={() => setCurrentFlow('select_schedule')}
              onProceedToPayment={handleProceedToPayment}
            />
          ) : currentFlow === 'payment' && selectedService ? (
            <PiPaymentModal
              service={selectedService}
              business={businessWithServices}
              date={selectedDate}
              timeSlot={selectedTimeSlot}
              clientDetails={clientDetails}
              piUser={piUser}
              onBack={() => setCurrentFlow('review_summary')}
              onPaymentComplete={handlePaymentSuccess}
            />
          ) : currentFlow === 'confirmation' && confirmedBooking ? (
            <BookingConfirmationStep
              booking={confirmedBooking}
              onGoToBookings={handleGoToMyBookings}
            />
          ) : currentFlow === 'become_provider' ? (
            <BecomeProviderStep
              piUser={piUser}
              onBack={() => setCurrentFlow('browse')}
              onSubmit={handleSubmitProvider}
              submitting={isSubmittingProvider}
            />
          ) : currentFlow === 'provider_console' ? (
            <ProviderDashboardView
              piUser={piUser}
              providerId={myProviderId || ''}
              bookings={bookings}
              onBack={() => setCurrentFlow('browse')}
              onAcceptBooking={handleAcceptBooking}
              onRejectBooking={handleRejectBooking}
              onProviderUpdated={handleRefreshAll}
            />
          ) : (
            <ServiceBrowser
              business={businessWithServices}
              services={services}
              onSelectService={handleSelectService}
              onOpenAbout={(merchant) => {
                setSelectedProfile(merchant || null);
                setCurrentFlow('about');
              }}
            />
          )
        ) : (
          <BookingStatusView
            bookings={bookings.filter((b) => piUser && (b.clientPiUsername === `@${piUser.username}` || b.clientPiUsername === piUser.username))}
            onBrowseServices={() => {
              setActiveTab('browse');
              setCurrentFlow('browse');
            }}
            onCancelBooking={handleCancelBooking}
            onRescheduleBooking={handleRescheduleBooking}
            onAddReview={bookingService.submitBookingReviewAsync}
            onConfirmCompletion={handleConfirmCompletion}
          />
        )}
      </main>

      {(currentFlow === 'browse' || currentFlow === 'home' || currentFlow === 'search') && activeTab === 'browse' && (
        <Footer currentBusiness={businessWithServices} />
      )}

      {/* Timed Onboarding Modal for Non-Providers */}
      <BecomeProviderModal
        isOpen={showBecomeProviderModal}
        onClose={handleDismissProviderModal}
        onBecomeProvider={handleOpenBecomeProvider}
      />
    </div>
  );
}
