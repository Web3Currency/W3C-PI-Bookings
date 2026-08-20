import React, { useMemo, useState, useEffect } from 'react';
import { Booking, PiUser, Provider, Service, SocialLink, PortfolioItem } from '../../types';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Briefcase, User, Eye, Save, Plus, Trash2, Camera, Globe, Mail, Phone, MapPin, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { providerService } from '../../services/providerService';
import { serviceService } from '../../services/serviceService';
import { PublicProfileView } from '../../components/PublicProfileView';
import { ProfilePhotoUploader } from '../../components/media/ProfilePhotoUploader';
import { PortfolioUploader } from '../../components/media/PortfolioUploader';

interface ProviderDashboardViewProps {
  piUser: PiUser | null;
  providerId: string;
  bookings: Booking[];
  onBack: () => void;
  onAcceptBooking: (bookingId: string) => Promise<void> | void;
  onRejectBooking: (bookingId: string, reason: string, payoutTxHash?: string) => Promise<void> | void;
  onProviderUpdated?: () => void;
}

export const ProviderDashboardView: React.FC<ProviderDashboardViewProps> = ({ piUser, providerId, bookings, onBack, onAcceptBooking, onRejectBooking, onProviderUpdated }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'edit_profile' | 'preview_profile'>('bookings');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerServices, setProviderServices] = useState<Service[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [formFullName, setFormFullName] = useState<string>('');
  const [formRoleTitle, setFormRoleTitle] = useState<string>('');
  const [formHeadline, setFormHeadline] = useState<string>('');
  const [formBio, setFormBio] = useState<string>('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');
  const [formPortfolioItems, setFormPortfolioItems] = useState<PortfolioItem[]>([]);
  const [formLocation, setFormLocation] = useState<string>('');
  const [formWebsite, setFormWebsite] = useState<string>('');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formContactPhone, setFormContactPhone] = useState<string>('');
  const [formAvailability, setFormAvailability] = useState<string>('available');
  const [formResponseTime, setFormResponseTime] = useState<string>('Within 1 hour');
  const [formYearsExp, setFormYearsExp] = useState<string>('');
  const [formSpecialties, setFormSpecialties] = useState<string>('');
  const [formSkills, setFormSkills] = useState<string>('');
  const [formLanguages, setFormLanguages] = useState<string>('');
  const [formServiceMode, setFormServiceMode] = useState<string>('Remote & On-site');
  const [formSocialLinks, setFormSocialLinks] = useState<SocialLink[]>([]);
  const [acceptingBookingId, setAcceptingBookingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function loadProviderData() {
      let p: Provider | null = null;
      if (providerId) {
        const all = await providerService.getProvidersAsync();
        p = all.find((item) => item.id === providerId) || null;
      }
      if (!p && piUser?.uid) p = await providerService.getProviderByPiUid(piUser.uid);
      if (p && mounted) {
        setProvider(p);
        setFormFullName(p.fullName || ''); setFormRoleTitle(p.roleTitle || ''); setFormHeadline(p.headline || ''); setFormBio(p.bio || ''); setFormPhotoUrl(p.photoUrl || '');
        const initialPortfolio: PortfolioItem[] = Array.isArray(p.portfolioItems) && p.portfolioItems.length > 0 ? p.portfolioItems : Array.isArray(p.portfolioImages) ? p.portfolioImages.map((img, idx) => ({ id: `port_${idx}`, imageUrl: img, caption: '' })) : [];
        setFormPortfolioItems(initialPortfolio); setFormLocation(p.location || ''); setFormWebsite(p.website || ''); setFormContactEmail(p.contactEmail || ''); setFormContactPhone(p.contactPhone || ''); setFormAvailability(p.availabilityStatus || 'available'); setFormResponseTime(p.responseTime || 'Within 1 hour'); setFormYearsExp(p.yearsExperience ? String(p.yearsExperience) : ''); setFormSpecialties(Array.isArray(p.specialties) ? p.specialties.join(', ') : ''); setFormSkills(Array.isArray(p.skills) ? p.skills.join(', ') : ''); setFormLanguages(Array.isArray(p.languages) ? p.languages.join(', ') : ''); setFormServiceMode(p.serviceMode || 'Remote & On-site'); setFormSocialLinks(Array.isArray(p.socialLinks) ? p.socialLinks : []);
        const services = await serviceService.getServicesAsync(); setProviderServices(services.filter((s) => s.providerId === p?.id));
      }
    }
    loadProviderData();
    return () => { mounted = false; };
  }, [providerId, piUser]);

  const providerBookings = useMemo(() => bookings.filter((b) => b.providerId === (provider?.id || providerId)), [bookings, providerId, provider]);
  const sections = useMemo(() => ({
    pending: providerBookings.filter((b) => b.status === 'Confirmed' && b.escrow_status === 'paid_escrowed'),
    active: providerBookings.filter((b) => b.status === 'In Progress'),
    awaitingClient: providerBookings.filter((b) => b.status === 'Completed' && b.escrow_status === 'completion_confirmed'),
    paid: providerBookings.filter((b) => b.escrow_status === 'released'),
  }), [providerBookings]);
  const earnings = useMemo(() => {
    const pendingAmount = sections.awaitingClient.reduce((sum, b) => sum + (b.provider_payout_pi || 0), 0);
    const releasedAmount = sections.paid.reduce((sum, b) => sum + (b.provider_payout_pi || 0), 0);
    return { totalEarnings: pendingAmount + releasedAmount, pendingPayouts: pendingAmount, releasedPayouts: releasedAmount, activeJobs: sections.active.length };
  }, [sections]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); const pId = provider?.id || providerId;
    if (!pId) { toast({ title: 'Error', description: 'Provider ID not found.', variant: 'destructive' }); return; }
    setIsSavingProfile(true);
    try {
      const updates: Partial<Provider> = { fullName: formFullName.trim(), roleTitle: formRoleTitle.trim(), headline: formHeadline.trim() || undefined, bio: formBio.trim() || undefined, photoUrl: formPhotoUrl.trim() || undefined, portfolioItems: formPortfolioItems, portfolioImages: formPortfolioItems.map((item) => item.imageUrl || item.path || '').filter(Boolean), location: formLocation.trim() || undefined, website: formWebsite.trim() || undefined, contactEmail: formContactEmail.trim() || undefined, contactPhone: formContactPhone.trim() || undefined, availabilityStatus: formAvailability, responseTime: formResponseTime.trim() || undefined, yearsExperience: formYearsExp ? Number(formYearsExp) : undefined, specialties: formSpecialties ? formSpecialties.split(',').map((s) => s.trim()).filter(Boolean) : [], skills: formSkills ? formSkills.split(',').map((s) => s.trim()).filter(Boolean) : [], languages: formLanguages ? formLanguages.split(',').map((s) => s.trim()).filter(Boolean) : [], serviceMode: formServiceMode.trim() || undefined, socialLinks: formSocialLinks.filter((s) => s.url.trim()) };
      await providerService.updateProvider(pId, updates, piUser?.accessToken);
      const refreshed = await providerService.getProvidersAsync(); const updatedProvider = refreshed.find((p) => p.id === pId) || null; if (updatedProvider) setProvider(updatedProvider);
      toast({ title: 'Public Profile Updated', description: 'Your profile changes have been saved successfully.' }); setActionMessage('Public profile updated successfully!'); if (onProviderUpdated) onProviderUpdated();
    } catch (err: any) { toast({ title: 'Save Failed', description: err?.message || 'Could not save profile changes.', variant: 'destructive' }); }
    finally { setIsSavingProfile(false); }
  };
  const addSocialLink = () => setFormSocialLinks([...formSocialLinks, { platform: 'Twitter / X', url: '' }]);
  const removeSocialLink = (index: number) => setFormSocialLinks(formSocialLinks.filter((_, i) => i !== index));
  const updateSocialLink = (index: number, key: 'platform' | 'url', value: string) => { const updated = [...formSocialLinks]; updated[index] = { ...updated[index], [key]: value }; setFormSocialLinks(updated); };

  if (activeTab === 'preview_profile') {
    const previewMerchant: Provider = { ...(provider || {}), id: provider?.id || providerId || 'preview', fullName: formFullName || provider?.fullName || 'Your Name', roleTitle: formRoleTitle || provider?.roleTitle || 'Service Provider', headline: formHeadline, bio: formBio, photoUrl: formPhotoUrl, portfolioItems: formPortfolioItems, portfolioImages: formPortfolioItems.map((item) => item.imageUrl || item.path || '').filter(Boolean), location: formLocation, website: formWebsite, contactEmail: formContactEmail, contactPhone: formContactPhone, availabilityStatus: formAvailability, responseTime: formResponseTime, yearsExperience: formYearsExp ? Number(formYearsExp) : undefined, specialties: formSpecialties ? formSpecialties.split(',').map((s) => s.trim()).filter(Boolean) : [], skills: formSkills ? formSkills.split(',').map((s) => s.trim()).filter(Boolean) : [], languages: formLanguages ? formLanguages.split(',').map((s) => s.trim()).filter(Boolean) : [], serviceMode: formServiceMode, socialLinks: formSocialLinks, status: provider?.status || 'Approved' };
    return (<div className="space-y-4 pb-24 animate-in fade-in duration-200"><div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-2xl"><span className="text-xs font-bold text-amber-900">Previewing your public profile as seen by clients.</span><button type="button" onClick={() => setActiveTab('edit_profile')} className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition">Back to Edit</button></div><PublicProfileView merchant={previewMerchant} services={providerServices} onBack={() => setActiveTab('edit_profile')} /></div>);
  }

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold hover:bg-zinc-200 transition"><ArrowLeft className="w-4 h-4" /><span>Back</span></button>
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-full text-xs font-bold border border-zinc-200">
          <button type="button" onClick={() => setActiveTab('bookings')} className={`px-3 py-1.5 rounded-full transition ${activeTab === 'bookings' ? 'bg-amber-500 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}>Console</button>
          <button type="button" onClick={() => setActiveTab('edit_profile')} className={`px-3 py-1.5 rounded-full transition flex items-center gap-1 ${activeTab === 'edit_profile' ? 'bg-amber-500 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}><User className="w-3.5 h-3.5" /><span>Edit Profile</span></button>
          <button type="button" onClick={() => setActiveTab('preview_profile')} className={`px-3 py-1.5 rounded-full transition flex items-center gap-1 ${activeTab === 'preview_profile' ? 'bg-amber-500 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}><Eye className="w-3.5 h-3.5" /><span>Preview</span></button>
        </div>
      </div>
      {actionMessage && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">{actionMessage}</div>}

      {activeTab === 'edit_profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2"><label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-amber-600" /><span>Profile Photo</span></label><ProfilePhotoUploader value={formPhotoUrl} onChange={(newPhoto) => setFormPhotoUrl(newPhoto)} providerIdentifier={provider?.id || providerId || piUser?.uid || 'provider'} piAccessToken={piUser?.accessToken} /></div>
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3"><h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Identity & Bio</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Full Name *</label><input type="text" required value={formFullName} onChange={(e) => setFormFullName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Role / Title *</label><input type="text" required value={formRoleTitle} onChange={(e) => setFormRoleTitle(e.target.value)} placeholder="e.g. Senior Web Developer" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Catchy Headline</label><input type="text" value={formHeadline} onChange={(e) => setFormHeadline(e.target.value)} placeholder="e.g. Building high-performance Pi Apps & Web3 platforms" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Biography / About You</label><textarea rows={4} value={formBio} onChange={(e) => setFormBio(e.target.value)} placeholder="Describe your background, expertise, and service commitments..." className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500" /></div></div>
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3"><h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Professional Specs</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Availability</label><select value={formAvailability} onChange={(e) => setFormAvailability(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500"><option value="available">Available Now</option><option value="busy">Busy / Limited</option><option value="away">Away</option></select></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Response Time</label><input type="text" value={formResponseTime} onChange={(e) => setFormResponseTime(e.target.value)} placeholder="e.g. Within 1 hour" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Years Experience</label><input type="number" value={formYearsExp} onChange={(e) => setFormYearsExp(e.target.value)} placeholder="e.g. 5" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Service Mode</label><input type="text" value={formServiceMode} onChange={(e) => setFormServiceMode(e.target.value)} placeholder="e.g. Remote, On-site, Hybrid" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Specialties (Comma separated)</label><input type="text" value={formSpecialties} onChange={(e) => setFormSpecialties(e.target.value)} placeholder="e.g. React, Node.js, Pi SDK Integration" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Skills (Comma separated)</label><input type="text" value={formSkills} onChange={(e) => setFormSkills(e.target.value)} placeholder="e.g. TypeScript, Tailwind CSS, PostgreSQL" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Languages Spoken (Comma separated)</label><input type="text" value={formLanguages} onChange={(e) => setFormLanguages(e.target.value)} placeholder="e.g. English, French, Spanish" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div></div>
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3"><h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Contact & Online Presence</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Location</label><input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. Lagos, Nigeria" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Contact Email</label><input type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="e.g. provider@example.com" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Contact Phone</label><input type="tel" value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="e.g. +234..." className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div></div><div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Official Website URL</label><input type="url" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} placeholder="https://yourwebsite.com" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /></div><div className="space-y-2 pt-2 border-t border-zinc-200"><div className="flex items-center justify-between"><label className="text-xs font-semibold text-zinc-700">Social & Profile Links</label><button type="button" onClick={addSocialLink} className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /><span>Add Link</span></button></div>{formSocialLinks.map((s, idx) => <div key={idx} className="flex items-center gap-2"><input type="text" value={s.platform} onChange={(e) => updateSocialLink(idx, 'platform', e.target.value)} placeholder="Platform (e.g. Twitter, Telegram, Pi Chat)" className="w-1/3 px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /><input type="text" value={s.url} onChange={(e) => updateSocialLink(idx, 'url', e.target.value)} placeholder="URL or handle link" className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-amber-500" /><button type="button" onClick={() => removeSocialLink(idx)} className="p-1.5 text-zinc-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button></div>)}</div></div>
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3"><div className="space-y-1"><label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-amber-600" /><span>Portfolio Showcase Images</span></label><p className="text-[11px] text-zinc-500 font-normal">Showcase your past projects and creative work. Add captions to describe each piece to prospective clients.</p></div><PortfolioUploader items={formPortfolioItems} onChange={(newItems) => setFormPortfolioItems(newItems)} providerIdentifier={provider?.id || providerId || piUser?.uid || 'provider'} piAccessToken={piUser?.accessToken} /></div>
          <button type="submit" disabled={isSavingProfile} className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50">{isSavingProfile ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving Profile...</span></> : <><Save className="w-4 h-4" /><span>Save Public Profile</span></>}</button>
        </form>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-xs"><span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">Provider Console</span><h2 className="text-sm font-black text-zinc-900">Manage Your Bookings & Earnings</h2></div>
          <div className="grid grid-cols-3 gap-3"><div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1"><span className="text-[10px] font-bold uppercase text-amber-700">Total Bookings</span><span className="text-lg font-black text-zinc-900 block">{providerBookings.length}</span></div><div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1"><span className="text-[10px] font-bold uppercase text-amber-700">Total Earnings</span><span className="text-lg font-black text-zinc-900 block">{earnings.totalEarnings.toFixed(2)} π</span></div><div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1"><span className="text-[10px] font-bold uppercase text-emerald-700">Released</span><span className="text-lg font-black text-emerald-700 block">{earnings.releasedPayouts.toFixed(2)} π</span></div></div>
          {sections.pending.length > 0 && (<div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3"><h3 className="text-xs font-bold text-amber-700 uppercase">Pending Action ({sections.pending.length})</h3><div className="space-y-2">{sections.pending.map((b) => (<div key={b.id} className="p-3 rounded-xl bg-white border border-amber-300 space-y-2 shadow-xs"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-900">{b.serviceName}</p><p className="text-[11px] text-zinc-500">@{b.clientPiUsername}</p></div><span className="font-mono font-bold text-amber-700">{b.pricePi} π</span></div><div className="grid grid-cols-2 gap-2"><button type="button" disabled={acceptingBookingId === b.id} onClick={async () => { setAcceptingBookingId(b.id); setActionMessage(''); try { await onAcceptBooking(b.id); setActionMessage('Booking accepted. The service is now In Progress.'); } catch (e: any) { setActionMessage(`Failed to accept booking: ${e?.message || 'Please try again.'}`); } finally { setAcceptingBookingId(null); } }} className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-xs">{acceptingBookingId === b.id ? 'Accepting...' : 'Accept'}</button><button type="button" onClick={() => { setRejectModalBooking(b); setRejectionReasonInput(''); }} className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-xs">Reject</button></div></div>))}</div></div>)}
          {sections.active.length > 0 && (<div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3"><h3 className="text-xs font-bold text-orange-700 uppercase">Active ({sections.active.length})</h3>{sections.active.map((b) => (<div key={b.id} className="p-3 rounded-xl bg-white border border-zinc-200 flex justify-between"><div><p className="text-xs font-bold text-zinc-900">{b.serviceName}</p><p className="text-[11px] text-zinc-500">{b.date}</p></div><span className="font-mono font-bold text-amber-700">{b.pricePi} π</span></div>))}</div>)}
          {providerBookings.length === 0 && <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-zinc-200/80"><Briefcase className="w-12 h-12 mx-auto text-zinc-400 mb-3" /><h3 className="text-sm font-bold text-zinc-700">No Bookings Yet</h3></div>}
        </div>
      )}

      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200"><div><h3 className="text-sm font-bold text-zinc-900">Reject Booking</h3><p className="text-xs text-zinc-500 mt-0.5">{rejectModalBooking.serviceName} • @{rejectModalBooking.clientPiUsername}</p></div><button type="button" onClick={() => { if (!isRejecting) { setRejectModalBooking(null); setRejectionReasonInput(''); } }} disabled={isRejecting} className="text-zinc-400 hover:text-zinc-800 text-xs p-1 disabled:opacity-50">✕</button></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-700 block">Reason for Rejection <span className="text-amber-600">*</span></label><textarea value={rejectionReasonInput} onChange={(e) => setRejectionReasonInput(e.target.value)} placeholder="Please explain why you are rejecting this booking request..." rows={3} disabled={isRejecting} className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 disabled:opacity-50" /></div>
            <div className="flex items-center justify-end gap-2.5 pt-2"><button type="button" disabled={isRejecting} onClick={() => { setRejectModalBooking(null); setRejectionReasonInput(''); }} className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition disabled:opacity-50">Cancel</button><button type="button" disabled={isRejecting || !rejectionReasonInput.trim()} onClick={async () => { if (!rejectModalBooking || !rejectionReasonInput.trim()) return; setIsRejecting(true); try { await onRejectBooking(rejectModalBooking.id, rejectionReasonInput.trim()); toast({ title: 'Booking Rejected', description: 'The booking was cancelled and the rejection reason was saved.' }); setActionMessage('Booking rejected successfully.'); setRejectModalBooking(null); setRejectionReasonInput(''); } catch (err: any) { toast({ title: 'Rejection Failed', description: err?.message || 'Could not reject booking. The booking remains unchanged.', variant: 'destructive' }); setActionMessage(`Failed to reject booking: ${err?.message || 'Error occurred'}`); } finally { setIsRejecting(false); } }} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs">{isRejecting ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Rejecting...</span></> : <span>Reject Booking</span>}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
