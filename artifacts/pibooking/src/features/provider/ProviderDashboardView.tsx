import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, Eye, Globe, Image as ImageIcon, Mail, MapPin, Phone, Plus, Save, Search, Send, Trash2, X } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { Booking, PiUser, PortfolioItem, Provider, Service, SocialLink } from '../../types';
import { providerService } from '../../services/providerService';
import { serviceService } from '../../services/serviceService';
import { PublicProfileView } from '../../components/PublicProfileView';
import { ProfilePhotoUploader } from '../../components/media/ProfilePhotoUploader';
import { PortfolioUploader } from '../../components/media/PortfolioUploader';
import { ProviderBookingDetails } from './ProviderBookingDetails';

interface ProviderDashboardViewProps {
  piUser: PiUser | null;
  providerId: string;
  bookings: Booking[];
  onBack: () => void;
  onAcceptBooking: (bookingId: string) => Promise<void> | void;
  onRejectBooking: (bookingId: string, reason: string, payoutTxHash?: string) => Promise<void> | void;
  onProviderUpdated?: () => void;
}

type DashboardTab = 'bookings' | 'earnings' | 'release';
type BookingFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const ProviderDashboardView: React.FC<ProviderDashboardViewProps> = ({
  piUser,
  providerId,
  bookings,
  onBack,
  onAcceptBooking,
  onRejectBooking,
  onProviderUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('bookings');
  const [profileMode, setProfileMode] = useState<'edit' | 'preview' | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerServices, setProviderServices] = useState<Service[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [acceptingBookingId, setAcceptingBookingId] = useState<string | null>(null);
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [actionMessage, setActionMessage] = useState('');

  const [formFullName, setFormFullName] = useState('');
  const [formRoleTitle, setFormRoleTitle] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formPortfolioItems, setFormPortfolioItems] = useState<PortfolioItem[]>([]);
  const [formLocation, setFormLocation] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formAvailability, setFormAvailability] = useState('available');
  const [formResponseTime, setFormResponseTime] = useState('Within 1 hour');
  const [formYearsExp, setFormYearsExp] = useState('');
  const [formSpecialties, setFormSpecialties] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formLanguages, setFormLanguages] = useState('');
  const [formServiceMode, setFormServiceMode] = useState('Remote & On-site');
  const [formSocialLinks, setFormSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadProviderData = async () => {
      let foundProvider: Provider | null = null;
      if (providerId) {
        const providers = await providerService.getProvidersAsync();
        foundProvider = providers.find((item) => item.id === providerId) || null;
      }
      if (!foundProvider && piUser?.uid) {
        foundProvider = await providerService.getProviderByPiUid(piUser.uid);
      }
      if (!mounted || !foundProvider) return;

      setProvider(foundProvider);
      setFormFullName(foundProvider.fullName || '');
      setFormRoleTitle(foundProvider.roleTitle || '');
      setFormHeadline(foundProvider.headline || '');
      setFormBio(foundProvider.bio || '');
      setFormPhotoUrl(foundProvider.photoUrl || '');
      const portfolio = Array.isArray(foundProvider.portfolioItems) && foundProvider.portfolioItems.length > 0
        ? foundProvider.portfolioItems
        : (foundProvider.portfolioImages || []).map((imageUrl, index) => ({ id: `port_${index}`, imageUrl, caption: '' }));
      setFormPortfolioItems(portfolio);
      setFormLocation(foundProvider.location || '');
      setFormWebsite(foundProvider.website || '');
      setFormContactEmail(foundProvider.contactEmail || '');
      setFormContactPhone(foundProvider.contactPhone || '');
      setFormAvailability(foundProvider.availabilityStatus || 'available');
      setFormResponseTime(foundProvider.responseTime || 'Within 1 hour');
      setFormYearsExp(foundProvider.yearsExperience ? String(foundProvider.yearsExperience) : '');
      setFormSpecialties(Array.isArray(foundProvider.specialties) ? foundProvider.specialties.join(', ') : '');
      setFormSkills(Array.isArray(foundProvider.skills) ? foundProvider.skills.join(', ') : '');
      setFormLanguages(Array.isArray(foundProvider.languages) ? foundProvider.languages.join(', ') : '');
      setFormServiceMode(foundProvider.serviceMode || 'Remote & On-site');
      setFormSocialLinks(Array.isArray(foundProvider.socialLinks) ? foundProvider.socialLinks : []);

      const services = await serviceService.getServicesAsync();
      setProviderServices(services.filter((service) => service.providerId === foundProvider?.id));
    };

    void loadProviderData();
    return () => { mounted = false; };
  }, [providerId, piUser]);

  const providerBookings = useMemo(
    () => bookings.filter((booking) => booking.providerId === (provider?.id || providerId)),
    [bookings, providerId, provider],
  );

  const sections = useMemo(() => ({
    pending: providerBookings.filter((booking) => booking.status === 'Confirmed' && booking.escrow_status === 'paid_escrowed'),
    active: providerBookings.filter((booking) => booking.status === 'In Progress'),
    completed: providerBookings.filter((booking) => booking.status === 'Completed' || booking.escrow_status === 'released'),
    cancelled: providerBookings.filter((booking) => booking.status === 'Cancelled'),
    awaitingClient: providerBookings.filter((booking) => booking.status === 'Completed' && booking.escrow_status === 'completion_confirmed'),
    paid: providerBookings.filter((booking) => booking.escrow_status === 'released'),
  }), [providerBookings]);

  const earnings = useMemo(() => {
    const pendingAmount = sections.awaitingClient.reduce((sum, booking) => sum + Number(booking.provider_payout_pi || 0), 0);
    const releasedAmount = sections.paid.reduce((sum, booking) => sum + Number(booking.provider_payout_pi || 0), 0);
    return {
      totalEarnings: pendingAmount + releasedAmount,
      pendingPayouts: pendingAmount,
      releasedPayouts: releasedAmount,
    };
  }, [sections]);

  const getBookingLabel = (booking: Booking) => {
    if (booking.status === 'Cancelled') return 'Cancelled';
    if (booking.status === 'In Progress') return 'In Progress';
    if (booking.status === 'Completed' || booking.escrow_status === 'released') return 'Completed';
    if (booking.status === 'Confirmed' && booking.escrow_status === 'paid_escrowed') return 'Pending';
    return booking.status || 'Pending';
  };

  const filteredBookings = useMemo(() => {
    const query = bookingSearch.trim().toLowerCase();
    return providerBookings.filter((booking) => {
      const label = getBookingLabel(booking);
      const matchesFilter = bookingFilter === 'all'
        || (bookingFilter === 'pending' && label === 'Pending')
        || (bookingFilter === 'in_progress' && label === 'In Progress')
        || (bookingFilter === 'completed' && label === 'Completed')
        || (bookingFilter === 'cancelled' && label === 'Cancelled');
      if (!matchesFilter) return false;
      if (!query) return true;
      return [booking.id, booking.serviceName, booking.clientName, booking.clientPiUsername, booking.clientPhone, booking.clientEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [providerBookings, bookingFilter, bookingSearch]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetProviderId = provider?.id || providerId;
    if (!targetProviderId) {
      toast({ title: 'Error', description: 'Provider ID not found.', variant: 'destructive' });
      return;
    }
    setIsSavingProfile(true);
    try {
      const updates: Partial<Provider> = {
        fullName: formFullName.trim(),
        roleTitle: formRoleTitle.trim(),
        headline: formHeadline.trim() || undefined,
        bio: formBio.trim() || undefined,
        photoUrl: formPhotoUrl.trim() || undefined,
        portfolioItems: formPortfolioItems,
        portfolioImages: formPortfolioItems.map((item) => item.imageUrl || item.path || '').filter(Boolean),
        location: formLocation.trim() || undefined,
        website: formWebsite.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        contactPhone: formContactPhone.trim() || undefined,
        availabilityStatus: formAvailability,
        responseTime: formResponseTime.trim() || undefined,
        yearsExperience: formYearsExp ? Number(formYearsExp) : undefined,
        specialties: formSpecialties ? formSpecialties.split(',').map((item) => item.trim()).filter(Boolean) : [],
        skills: formSkills ? formSkills.split(',').map((item) => item.trim()).filter(Boolean) : [],
        languages: formLanguages ? formLanguages.split(',').map((item) => item.trim()).filter(Boolean) : [],
        serviceMode: formServiceMode.trim() || undefined,
        socialLinks: formSocialLinks.filter((item) => item.url.trim()),
      };
      await providerService.updateProvider(targetProviderId, updates, piUser?.accessToken);
      const refreshed = await providerService.getProvidersAsync();
      const updatedProvider = refreshed.find((item) => item.id === targetProviderId) || null;
      if (updatedProvider) setProvider(updatedProvider);
      toast({ title: 'Public Profile Updated', description: 'Your profile changes have been saved successfully.' });
      setActionMessage('Public profile updated successfully.');
      onProviderUpdated?.();
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error?.message || 'Could not save profile changes.', variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const previewMerchant: Provider = {
    ...(provider || {}),
    id: provider?.id || providerId || 'preview',
    fullName: formFullName || provider?.fullName || 'Your Name',
    roleTitle: formRoleTitle || provider?.roleTitle || 'Service Provider',
    headline: formHeadline,
    bio: formBio,
    photoUrl: formPhotoUrl,
    portfolioItems: formPortfolioItems,
    portfolioImages: formPortfolioItems.map((item) => item.imageUrl || item.path || '').filter(Boolean),
    location: formLocation,
    website: formWebsite,
    contactEmail: formContactEmail,
    contactPhone: formContactPhone,
    availabilityStatus: formAvailability,
    responseTime: formResponseTime,
    yearsExperience: formYearsExp ? Number(formYearsExp) : undefined,
    specialties: formSpecialties ? formSpecialties.split(',').map((item) => item.trim()).filter(Boolean) : [],
    skills: formSkills ? formSkills.split(',').map((item) => item.trim()).filter(Boolean) : [],
    languages: formLanguages ? formLanguages.split(',').map((item) => item.trim()).filter(Boolean) : [],
    serviceMode: formServiceMode,
    socialLinks: formSocialLinks,
    status: provider?.status || 'Approved',
  };

  if (profileMode === 'preview') {
    return (
      <div className="space-y-5 pb-24 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h2 className="text-lg font-black text-zinc-950">Profile Preview</h2>
            <p className="text-xs text-zinc-500">Preview your public profile as clients see it.</p>
          </div>
          <button type="button" onClick={() => setProfileMode('edit')} className="text-xs font-bold text-amber-700 hover:text-amber-800">Back to Edit</button>
        </div>
        <PublicProfileView merchant={previewMerchant} services={providerServices} onBack={() => setProfileMode('edit')} />
      </div>
    );
  }

  if (profileMode === 'edit') {
    return (
      <div className="space-y-5 pb-24 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h2 className="text-lg font-black text-zinc-950">Edit Profile</h2>
            <p className="text-xs text-zinc-500">Update the profile clients see.</p>
          </div>
          <button type="button" onClick={() => setProfileMode('preview')} className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800"><Eye className="w-3.5 h-3.5" />Preview</button>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2"><label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-amber-600" />Profile Photo</label><ProfilePhotoUploader value={formPhotoUrl} onChange={setFormPhotoUrl} providerIdentifier={provider?.id || providerId || piUser?.uid || 'provider'} piAccessToken={piUser?.accessToken} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-zinc-700">Full Name<input required value={formFullName} onChange={(e) => setFormFullName(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:outline-none focus:border-amber-500" /></label>
            <label className="text-xs font-semibold text-zinc-700">Role / Title<input required value={formRoleTitle} onChange={(e) => setFormRoleTitle(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:outline-none focus:border-amber-500" /></label>
          </div>
          <label className="text-xs font-semibold text-zinc-700 block">Headline<input value={formHeadline} onChange={(e) => setFormHeadline(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          <label className="text-xs font-semibold text-zinc-700 block">Biography<textarea rows={4} value={formBio} onChange={(e) => setFormBio(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-zinc-700"><MapPin className="inline w-3.5 h-3.5 mr-1" />Location<input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
            <label className="text-xs font-semibold text-zinc-700"><Globe className="inline w-3.5 h-3.5 mr-1" />Website<input value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
            <label className="text-xs font-semibold text-zinc-700"><Mail className="inline w-3.5 h-3.5 mr-1" />Contact Email<input type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
            <label className="text-xs font-semibold text-zinc-700"><Phone className="inline w-3.5 h-3.5 mr-1" />Contact Phone<input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-zinc-700">Availability<select value={formAvailability} onChange={(e) => setFormAvailability(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"><option value="available">Available Now</option><option value="busy">Busy / Limited</option><option value="away">Away</option></select></label>
            <label className="text-xs font-semibold text-zinc-700">Response Time<input value={formResponseTime} onChange={(e) => setFormResponseTime(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
            <label className="text-xs font-semibold text-zinc-700">Years Experience<input type="number" value={formYearsExp} onChange={(e) => setFormYearsExp(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
            <label className="text-xs font-semibold text-zinc-700">Service Mode<input value={formServiceMode} onChange={(e) => setFormServiceMode(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          </div>
          <label className="text-xs font-semibold text-zinc-700 block">Specialties<input value={formSpecialties} onChange={(e) => setFormSpecialties(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          <label className="text-xs font-semibold text-zinc-700 block">Skills<input value={formSkills} onChange={(e) => setFormSkills(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          <label className="text-xs font-semibold text-zinc-700 block">Languages<input value={formLanguages} onChange={(e) => setFormLanguages(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /></label>
          <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-zinc-700">Social & Profile Links</span><button type="button" onClick={() => setFormSocialLinks([...formSocialLinks, { platform: 'Telegram', url: '' }])} className="text-xs font-bold text-amber-700 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add Link</button></div>{formSocialLinks.map((link, index) => <div key={`${link.platform}-${index}`} className="flex gap-2"><input value={link.platform} onChange={(e) => { const next = [...formSocialLinks]; next[index] = { ...next[index], platform: e.target.value }; setFormSocialLinks(next); }} className="w-1/3 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /><input value={link.url} onChange={(e) => { const next = [...formSocialLinks]; next[index] = { ...next[index], url: e.target.value }; setFormSocialLinks(next); }} className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs" /><button type="button" onClick={() => setFormSocialLinks(formSocialLinks.filter((_, i) => i !== index))} className="p-2 text-zinc-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div>)}</div>
          <div><label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-amber-600" />Portfolio</label><PortfolioUploader items={formPortfolioItems} onChange={setFormPortfolioItems} providerIdentifier={provider?.id || providerId || piUser?.uid || 'provider'} piAccessToken={piUser?.accessToken} /></div>
          <button type="submit" disabled={isSavingProfile} className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{isSavingProfile ? 'Saving...' : 'Save Public Profile'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 hover:text-zinc-950"><ArrowLeft className="w-4 h-4" />Back to Marketplace</button>
        <button type="button" onClick={() => setProfileMode('edit')} className="text-sm font-bold text-zinc-800 hover:text-amber-700">Edit Profile</button>
      </div>

      {actionMessage && <div className="text-xs font-semibold text-emerald-800 py-1">{actionMessage}</div>}

      <div className="flex items-center border-b border-zinc-200 overflow-x-auto">
        {(['bookings', 'earnings', 'release'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition ${activeTab === tab ? 'border-amber-600 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}>
            {tab === 'bookings' ? 'Bookings' : tab === 'earnings' ? 'Earnings' : 'Release'}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Search bookings..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent border-b border-zinc-300 focus:outline-none focus:border-amber-600" />
            </div>
            <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value as BookingFilter)} className="px-3 py-2.5 text-sm bg-transparent border-b border-zinc-300 focus:outline-none focus:border-amber-600">
              <option value="all">Filter</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="border-t border-zinc-200">
            {filteredBookings.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500">No bookings found.</div>
            ) : filteredBookings.map((booking) => {
              const label = getBookingLabel(booking);
              return (
                <div key={booking.id} className="py-4 border-b border-zinc-200">
                  <div className="flex items-start justify-between gap-4">
                    <button type="button" onClick={() => setDetailsBooking(booking)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-bold text-zinc-950 truncate">{booking.serviceName}</h3><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span></div>
                      <p className="text-xs text-zinc-600 mt-1">{booking.clientName || booking.clientPiUsername || 'Client'} · {booking.date || 'Date not set'} · {booking.timeSlot || 'Time not set'} · {Number(booking.pricePi || 0)} π</p>
                      <span className="text-[10px] text-amber-700 font-bold mt-1 inline-block">View Details</span>
                    </button>
                    {label === 'Pending' && <div className="flex items-center gap-2 shrink-0"><button type="button" disabled={acceptingBookingId === booking.id} onClick={async () => { setAcceptingBookingId(booking.id); try { await onAcceptBooking(booking.id); setActionMessage('Booking accepted.'); } catch (error: any) { setActionMessage(error?.message || 'Could not accept booking.'); } finally { setAcceptingBookingId(null); } }} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">{acceptingBookingId === booking.id ? 'Accepting...' : 'Accept'}</button><button type="button" onClick={() => { setRejectModalBooking(booking); setRejectionReasonInput(''); }} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Reject</button></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'earnings' && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2">
            <div><span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Total Earnings</span><span className="text-2xl font-black text-zinc-950">{earnings.totalEarnings.toFixed(2)} π</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Pending Payouts</span><span className="text-2xl font-black text-zinc-950">{earnings.pendingPayouts.toFixed(2)} π</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Released</span><span className="text-2xl font-black text-zinc-950">{earnings.releasedPayouts.toFixed(2)} π</span></div>
          </div>
          <div className="border-t border-zinc-200 pt-4 text-xs text-zinc-500">Earnings are calculated from the persisted booking and payout state.</div>
        </section>
      )}

      {activeTab === 'release' && (
        <section className="border-t border-zinc-200">
          {sections.awaitingClient.length === 0 ? <div className="py-10 text-center text-sm text-zinc-500">No bookings currently awaiting release.</div> : sections.awaitingClient.map((booking) => (
            <div key={booking.id} className="py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
              <button type="button" onClick={() => setDetailsBooking(booking)} className="text-left min-w-0"><h3 className="text-sm font-bold text-zinc-950 truncate">{booking.serviceName}</h3><p className="text-xs text-zinc-600 mt-1">{booking.clientName || booking.clientPiUsername || 'Client'} · {Number(booking.provider_payout_pi || 0)} π pending</p></button>
              <span className="text-xs font-bold text-amber-700">Awaiting release</span>
            </div>
          ))}
        </section>
      )}

      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4"><div><h3 className="text-sm font-bold text-zinc-950">Reject Booking</h3><p className="text-xs text-zinc-500 mt-1">{rejectModalBooking.serviceName} · {rejectModalBooking.clientPiUsername}</p></div><button type="button" onClick={() => setRejectModalBooking(null)} className="p-1 text-zinc-400"><X className="w-4 h-4" /></button></div>
            <label className="block text-xs font-semibold text-zinc-700">Reason for Rejection<span className="text-red-500"> *</span><textarea value={rejectionReasonInput} onChange={(event) => setRejectionReasonInput(event.target.value)} rows={4} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:outline-none focus:border-amber-500" placeholder="Please explain why you are rejecting this booking..." /></label>
            <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setRejectModalBooking(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100">Cancel</button><button type="button" disabled={isRejecting || !rejectionReasonInput.trim()} onClick={async () => { setIsRejecting(true); try { await onRejectBooking(rejectModalBooking.id, rejectionReasonInput.trim()); setRejectModalBooking(null); setRejectionReasonInput(''); setActionMessage('Booking rejected and cancelled.'); } catch (error: any) { setActionMessage(error?.message || 'Could not reject booking.'); } finally { setIsRejecting(false); } }} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50">{isRejecting ? 'Rejecting...' : 'Reject Booking'}</button></div>
          </div>
        </div>
      )}

      {detailsBooking && <ProviderBookingDetails booking={detailsBooking} onClose={() => setDetailsBooking(null)} />}
    </div>
  );
};
