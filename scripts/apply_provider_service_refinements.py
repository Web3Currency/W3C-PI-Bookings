from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def write(path, content):
    p = ROOT / path
    p.write_text(content, encoding='utf-8')

def replace(path, old, new, count=1):
    p = ROOT / path
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Missing expected text in {path}: {old[:120]!r}')
    s2 = s.replace(old, new, count)
    p.write_text(s2, encoding='utf-8')

# 1. Side-menu Pioneer/verification label must sit beneath username.
replace(
    'artifacts/pibooking/src/components/Navbar.tsx',
    '<span className="font-extrabold text-sm text-zinc-900 truncate">{piUser.username?.startsWith(\'@\') ? piUser.username : `@${piUser.username}`}</span>',
    '<span className="font-extrabold text-sm text-zinc-900 truncate block">{piUser.username?.startsWith(\'@\') ? piUser.username : `@${piUser.username}`}</span>'
)

# 2. Provider service editor: description only + real cover upload + no full_description.
provider_services = r'''import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Edit3, Eye, Loader2, Plus, Save, X } from 'lucide-react';
import { Service } from '../../types';
import { providerServiceService, ProviderServiceInput } from '../../services/providerServiceService';
import { providerMediaService, getMediaUrl } from '../../services/providerMediaService';
import { piAuthService } from '../../services/piAuthService';

interface ProviderServicesViewProps { onBack: () => void; }
type ServiceDraft = ProviderServiceInput;

const DEFAULT_DRAFT: ServiceDraft = {
  title: '', shortDescription: '', coverImage: '', deliverables: [], duration: 60,
  basePriceNgn: 0, category: 'web_dev', locationType: 'Online / Remote', status: 'Draft',
};

const categoryOptions = [
  ['web_dev', 'Web Development'], ['landing_page', 'Landing Pages'], ['ux_design', 'UX / UI Design'],
  ['pi_sdk', 'Pi SDK'], ['consulting', 'Consulting'],
];
const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition';
const labelClass = 'block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5';

export const ProviderServicesView: React.FC<ProviderServicesViewProps> = ({ onBack }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<ServiceDraft>(DEFAULT_DRAFT);
  const [deliverablesText, setDeliverablesText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [preview, setPreview] = useState<Service | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setServices(await providerServiceService.list()); }
    catch (e: any) { setError(e?.message || 'Unable to load your services.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const editingService = useMemo(() => services.find((service) => service.id === editingId) || null, [services, editingId]);

  const startCreate = () => { setEditingId(null); setDraft(DEFAULT_DRAFT); setDeliverablesText(''); setError(''); setNotice(''); setIsCreating(true); };
  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setDraft({ title: service.name, shortDescription: service.description, coverImage: service.coverImageUrl || '', deliverables: service.included || [], duration: service.durationMinutes, basePriceNgn: service.priceNGN, category: service.category, locationType: service.locationType, status: service.status });
    setDeliverablesText((service.included || []).join('\n')); setError(''); setNotice(''); setIsCreating(false);
  };
  const closeEditor = () => { setEditingId(null); setIsCreating(false); setError(''); setNotice(''); };
  const update = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const handleCoverUpload = async (file?: File) => {
    if (!file) return;
    setError(''); setNotice(''); setUploadingCover(true);
    try {
      const user = piAuthService.getStoredUser();
      if (!user?.uid || !user.accessToken) throw new Error('Please sign in with Pi Network before uploading a cover image.');
      const result = await providerMediaService.uploadServiceCover(file, { providerIdentifier: user.uid, piAccessToken: user.accessToken });
      update('coverImage', result.path || result.publicUrl);
    } catch (e: any) { setError(e?.message || 'Unable to upload cover image.'); }
    finally { setUploadingCover(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    const payload: ServiceDraft = { ...draft, title: draft.title.trim(), shortDescription: draft.shortDescription.trim(), coverImage: draft.coverImage.trim(), deliverables: deliverablesText.split('\n').map((item) => item.trim()).filter(Boolean) };
    try {
      if (!payload.title || !payload.shortDescription || !payload.basePriceNgn || payload.basePriceNgn <= 0) throw new Error('Title, description and a valid base price are required.');
      if (editingService) {
        const saved = await providerServiceService.update(editingService.id, payload);
        setServices((current) => current.map((item) => item.id === saved.id ? saved : item)); setNotice('Service updated successfully.');
      } else {
        const saved = await providerServiceService.create(payload);
        setServices((current) => [saved, ...current]); setNotice('Service created successfully.');
      }
      setEditingId(null); setIsCreating(false);
    } catch (e: any) { setError(e?.message || 'Unable to save service.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="px-3.5 py-2 rounded-full bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"><ArrowLeft className="inline w-4 h-4 mr-1" />Back</button>
        <button onClick={startCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition cursor-pointer"><Plus className="w-4 h-4" />Create Service</button>
      </div>
      <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">Provider Services</p><h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 mt-1">Create and manage your services</h1><p className="text-sm text-zinc-500 mt-2 max-w-2xl">Publish the services you offer on W3C Pi Bookings. Your provider profile is automatically attached to every service.</p></div>
      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-700">{error}</div>}
      {notice && <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-xs font-semibold text-green-700">{notice}</div>}

      {(isCreating || editingId) && <section className="border-y border-zinc-200 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-zinc-950">{editingService ? 'Edit Service' : 'Create Service'}</h2><p className="text-xs text-zinc-500 mt-1">Keep the information clear and accurate for clients.</p></div><button onClick={closeEditor} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 cursor-pointer" aria-label="Close editor"><X className="w-5 h-5" /></button></div>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Cover Image</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingCover} className="relative w-full sm:w-64 h-36 rounded-2xl overflow-hidden bg-zinc-50 border-2 border-dashed border-zinc-300 hover:border-orange-500 transition cursor-pointer disabled:opacity-60">
                {draft.coverImage ? <img src={getMediaUrl(draft.coverImage)} alt="Service cover preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500"><Camera className="w-6 h-6 text-orange-600" /><span className="text-xs font-bold">Choose Cover Image</span><span className="text-[10px]">PNG, JPG, WebP · Max 2 MB</span></div>}
                {uploadingCover && <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white"><Loader2 className="w-6 h-6 animate-spin" /></div>}
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => void handleCoverUpload(e.target.files?.[0])} />
              <div className="text-xs text-zinc-500 max-w-sm"><p className="font-semibold text-zinc-700">Upload from your device.</p><p className="mt-1">The image is stored through the same secured provider media upload flow used by your provider profile.</p>{draft.coverImage && <button type="button" onClick={() => update('coverImage', '')} className="mt-2 text-xs font-bold text-red-600 hover:text-red-700">Remove cover image</button>}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div><label className={labelClass}>Service Title</label><input className={inputClass} value={draft.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Business Website Development" /></div>
            <div><label className={labelClass}>Category</label><select className={inputClass} value={draft.category} onChange={(e) => update('category', e.target.value)}>{categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="lg:col-span-2"><label className={labelClass}>Description</label><textarea className={`${inputClass} min-h-32 resize-y whitespace-pre-wrap`} value={draft.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} placeholder="Explain what the client receives, what is included, and any important expectations. Use new lines for paragraphs." /></div>
            <div className="lg:col-span-2"><label className={labelClass}>Deliverables / Inclusions</label><textarea className={`${inputClass} min-h-32 resize-y`} value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} placeholder="One deliverable per line" /></div>
            <div><label className={labelClass}>Duration (minutes)</label><input type="number" min={1} className={inputClass} value={draft.duration} onChange={(e) => update('duration', Number(e.target.value))} /></div>
            <div><label className={labelClass}>Base Price (NGN)</label><input type="number" min={1} className={inputClass} value={draft.basePriceNgn || ''} onChange={(e) => update('basePriceNgn', Number(e.target.value))} placeholder="50000" /></div>
            <div><label className={labelClass}>Service Mode</label><select className={inputClass} value={draft.locationType} onChange={(e) => update('locationType', e.target.value)}><option>Online / Remote</option><option>On-site</option><option>Hybrid</option></select></div>
            <div><label className={labelClass}>Status</label><select className={inputClass} value={draft.status} onChange={(e) => update('status', e.target.value as ServiceDraft['status'])}><option value="Draft">Draft</option><option value="Published">Published</option><option value="Archived">Archived</option></select></div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-zinc-100"><button onClick={closeEditor} className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer">Cancel</button><button onClick={save} disabled={saving || uploadingCover} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer"><Save className="w-4 h-4" />{saving ? 'Saving…' : editingService ? 'Save Changes' : 'Create Service'}</button></div>
      </section>}

      <section><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-black text-zinc-900">Your Services</h2><span className="text-[11px] font-bold text-zinc-400">{services.length} {services.length === 1 ? 'service' : 'services'}</span></div>
        {loading ? <div className="py-12 text-center text-xs font-semibold text-zinc-400">Loading your services…</div> : services.length === 0 ? <div className="py-12 border-y border-zinc-200 text-center"><p className="text-sm font-bold text-zinc-700">No services yet.</p><p className="text-xs text-zinc-400 mt-1">Create your first service to start offering it to clients.</p></div> : <div className="divide-y divide-zinc-200 border-y border-zinc-200">{services.map((service) => <div key={service.id} className="py-5 flex flex-col sm:flex-row gap-4 sm:items-center"><div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 shrink-0">{service.coverImageUrl ? <img src={getMediaUrl(service.coverImageUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">No image</div>}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-sm text-zinc-900 truncate">{service.name}</h3><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${service.status === 'Published' ? 'bg-green-50 text-green-700' : service.status === 'Archived' ? 'bg-zinc-100 text-zinc-500' : 'bg-amber-50 text-amber-700'}`}>{service.status}</span></div><p className="text-xs text-zinc-500 mt-1 line-clamp-2 whitespace-pre-line">{service.description}</p><div className="text-[11px] text-zinc-400 font-semibold mt-1">₦{service.priceNGN.toLocaleString()} · {service.durationMinutes} min · {service.pricePi || 0} π</div></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => setPreview(service)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-[11px] font-bold hover:bg-zinc-200 cursor-pointer"><Eye className="w-3.5 h-3.5" />Preview</button><button onClick={() => startEdit(service)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-[11px] font-bold hover:bg-orange-100 cursor-pointer"><Edit3 className="w-3.5 h-3.5" />Edit</button></div></div>)}</div>}
      </section>
      {preview && <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5" onClick={() => setPreview(null)}><div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between p-4 border-b border-zinc-100"><div><p className="text-[10px] font-black uppercase tracking-wider text-orange-600">Client Preview</p><h2 className="font-black text-zinc-950">{preview.name}</h2></div><button onClick={() => setPreview(null)} className="p-2 rounded-full hover:bg-zinc-100 cursor-pointer"><X className="w-5 h-5" /></button></div>{preview.coverImageUrl && <img src={getMediaUrl(preview.coverImageUrl)} alt={preview.name} className="w-full h-52 object-cover" />}<div className="p-5 space-y-5"><div><span className="text-[10px] font-black uppercase tracking-wider text-orange-600">{preview.category.replace('_', ' ')}</span><h3 className="text-xl font-black mt-1">{preview.name}</h3><p className="text-sm text-zinc-600 mt-2 whitespace-pre-line">{preview.description}</p></div><div className="grid grid-cols-2 gap-3 text-xs"><div className="p-3 bg-zinc-50 rounded-xl"><span className="block text-zinc-400 font-bold">Price</span><span className="font-black">{preview.pricePi} π</span></div><div className="p-3 bg-zinc-50 rounded-xl"><span className="block text-zinc-400 font-bold">Duration</span><span className="font-black">{preview.durationMinutes} minutes</span></div></div><div><h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">Deliverables</h4><ul className="space-y-2">{preview.included.map((item, index) => <li key={index} className="flex gap-2 text-xs text-zinc-700"><Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />{item}</li>)}</ul></div></div></div></div>}
    </div>
  );
};
'''
write('artifacts/pibooking/src/features/provider/ProviderServicesView.tsx', provider_services)

# Provider service API/client input no longer carries full_description.
replace('artifacts/pibooking/src/services/providerServiceService.ts', "    fullDescription: row.full_description || '',\n", '')
replace('artifacts/pibooking/src/services/providerServiceService.ts', '  fullDescription: string;\n', '')

api_path = ROOT / 'artifacts/api-server/src/routes/pi-services.ts'
api = api_path.read_text(encoding='utf-8')
api = api.replace('  const fullDescription = String(body.fullDescription || "").trim();\n', '')
api = api.replace('    fullDescription,\n', '')
api = api.replace('        full_description: service.fullDescription,\n', '')
api_path.write_text(api, encoding='utf-8')

# Real service-cover upload through the existing provider media security flow.
media_path = ROOT / 'artifacts/pibooking/src/services/providerMediaService.ts'
media = media_path.read_text(encoding='utf-8')
media = media.replace("    return this.uploadMedia(file, 'portfolio', options);\n  },", "    return this.uploadMedia(file, 'portfolio', options);\n  },\n\n  async uploadServiceCover(\n    file: File,\n    options: UploadMediaOptions\n  ): Promise<UploadMediaResult> {\n    return this.uploadMedia(file, 'service_cover', options);\n  },")
media = media.replace("type: 'profile' | 'portfolio',", "type: 'profile' | 'portfolio' | 'service_cover',")
media = media.replace("    const expectedStoragePath = `providers/${cleanProvider}/${type}/${timestamp}_${sanitizedFilename}`;", "    const expectedStoragePath = `providers/${cleanProvider}/${type}/${timestamp}_${sanitizedFilename}`;")
media_path.write_text(media, encoding='utf-8')

# Client service detail gets a small real-provider profile action.
service_detail = ROOT / 'artifacts/pibooking/src/components/ServiceDetail.tsx'
sd = service_detail.read_text(encoding='utf-8')
sd = sd.replace('  onProceedToBooking: () => void;\n', '  onProceedToBooking: () => void;\n  onViewProviderProfile: (provider: Provider) => void;\n')
sd = sd.replace('export const ServiceDetail: React.FC<ServiceDetailProps> = ({ service, business, onBack, onProceedToBooking }) => {', 'export const ServiceDetail: React.FC<ServiceDetailProps> = ({ service, business, onBack, onProceedToBooking, onViewProviderProfile }) => {')
old_provider = '<div className="p-5 rounded-3xl bg-white shadow-sm flex items-center gap-4">\n        <img src={providerAvatar} alt={providerName} className="w-12 h-12 rounded-full object-cover shrink-0 bg-orange-100" />\n        <div className="min-w-0 flex-1 text-xs">\n          <div className="font-extrabold text-zinc-900 text-sm">{providerName}</div>\n          <p className="text-orange-600 font-bold mt-0.5">{providerRole}</p>\n          {resolvedProvider?.piUsername && <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">@{resolvedProvider.piUsername.replace(/^@+/, '')}</p>}\n        </div>\n      </div>'
new_provider = '<div className="p-5 rounded-3xl bg-white shadow-sm flex items-center gap-4">\n        <img src={providerAvatar} alt={providerName} className="w-12 h-12 rounded-full object-cover shrink-0 bg-orange-100" />\n        <div className="min-w-0 flex-1 text-xs">\n          <div className="font-extrabold text-zinc-900 text-sm">{providerName}</div>\n          <p className="text-orange-600 font-bold mt-0.5">{providerRole}</p>\n          {resolvedProvider?.piUsername && <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">@{resolvedProvider.piUsername.replace(/^@+/, '')}</p>}\n        </div>\n        {resolvedProvider && <button type="button" onClick={() => onViewProviderProfile(resolvedProvider)} className="shrink-0 text-[11px] font-black text-orange-700 hover:text-orange-800 whitespace-nowrap">View Provider Profile</button>}\n      </div>'
if old_provider not in sd: raise SystemExit('ServiceDetail provider block not found')
sd = sd.replace(old_provider, new_provider)
service_detail.write_text(sd, encoding='utf-8')

# App: provider profile navigation + remove attachment state from the booking flow.
app_path = ROOT / 'artifacts/pibooking/src/App.tsx'
app = app_path.read_text(encoding='utf-8')
app = app.replace("type ClientDetails = { clientName:string; clientPiUsername:string; clientPhone:string; clientEmail?:string; notes:string; attachments?:{id:string;name:string;size:string;type:string;dataUrl?:string}[] };", "type ClientDetails = { clientName:string; clientPiUsername:string; clientPhone:string; clientEmail?:string; notes:string; };")
app = app.replace("useState<ClientDetails>({clientName:'',clientPiUsername:'',clientPhone:'',clientEmail:'',notes:'',attachments:[]})", "useState<ClientDetails>({clientName:'',clientPiUsername:'',clientPhone:'',clientEmail:'',notes:''})")
app = app.replace("  const handleStartBooking=()=>{setActiveTab('browse');setCurrentFlow('select_details');};", "  const handleStartBooking=()=>{setActiveTab('browse');setCurrentFlow('select_details');};\n  const handleViewProviderProfile=(provider:Provider)=>{setActiveTab('browse');setSelectedProfile(provider);setCurrentFlow('about');};")
app = app.replace('<ServiceDetail service={selectedService} business={businessWithServices} onBack={()=>setCurrentFlow(\'browse\')} onProceedToBooking={handleStartBooking}/>', '<ServiceDetail service={selectedService} business={businessWithServices} onBack={()=>setCurrentFlow(\'browse\')} onProceedToBooking={handleStartBooking} onViewProviderProfile={handleViewProviderProfile}/>')
app_path.write_text(app, encoding='utf-8')

# Booking Step 1: remove all client asset upload UI/state and keep only Project Brief.
select_details = r'''import React, { useState } from 'react';
import { Service } from '../types';
import { ArrowLeft, User, ArrowRight, ShieldCheck, AtSign, Send, Mail } from 'lucide-react';
import { BookingProgressBar } from './BookingProgressBar';

interface SelectDetailsStepProps {
  service: Service;
  initialDetails: { clientName: string; clientPiUsername: string; clientPhone: string; clientEmail?: string; notes: string };
  onBack: () => void;
  onProceedToSchedule: (details: { clientName: string; clientPiUsername: string; clientPhone: string; clientEmail: string; notes: string }) => void;
}

export const SelectDetailsStep: React.FC<SelectDetailsStepProps> = ({ service, initialDetails, onBack, onProceedToSchedule }) => {
  const [clientName, setClientName] = useState(initialDetails.clientName || '');
  const [rawUsername, setRawUsername] = useState(() => initialDetails.clientPiUsername ? initialDetails.clientPiUsername.replace(/^@+/, '') : '');
  const [clientPhone, setClientPhone] = useState(initialDetails.clientPhone || '');
  const [clientEmail, setClientEmail] = useState(initialDetails.clientEmail || '');
  const [notes, setNotes] = useState(initialDetails.notes || '');
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const finalHandle = rawUsername ? `@${rawUsername.replace(/^@+/, '')}` : (initialDetails.clientPiUsername || ''); onProceedToSchedule({ clientName: clientName.trim(), clientPiUsername: finalHandle, clientPhone: clientPhone.trim(), clientEmail: clientEmail.trim(), notes }); };
  return (
    <div className="max-w-md mx-auto space-y-4 pb-28 animate-in fade-in duration-200">
      <BookingProgressBar currentStep={1} />
      <div className="flex items-center justify-between"><button type="button" onClick={onBack} id="btn-back-to-service-detail" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /><span>Service Details</span></button><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">Step 1: Contact & Brief</span></div>
      <div className="p-4 rounded-3xl bg-amber-500/10 shadow-md flex items-center justify-between gap-3"><div className="min-w-0"><span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">Selected Service</span><h2 className="text-sm font-black text-zinc-900 truncate">{service.name}</h2><span className="text-xs text-zinc-600 font-medium">{service.durationMinutes} mins duration</span></div><div className="text-right shrink-0"><span className="text-lg font-black text-amber-600">{service.pricePi} π</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-5 rounded-3xl bg-white shadow-md space-y-4"><h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">1. Client Contact Details</h3><div className="space-y-3">
          <div><label className="block text-[11px] font-bold text-zinc-700 mb-1">Full Name</label><div className="relative"><User className="w-4 h-4 text-[#e17100] absolute left-3.5 top-3" /><input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Adeyemo Jibola" className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-50 focus:bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs" /></div></div>
          <div><label className="block text-[11px] font-bold text-zinc-700 mb-1">Pi Network Username</label><div className="relative flex items-center"><div className="absolute left-3.5 text-amber-600 font-bold text-xs pointer-events-none"><AtSign className="w-3.5 h-3.5" /></div><input type="text" required value={rawUsername} onChange={(e) => setRawUsername(e.target.value.replace(/^@+/, ''))} onBlur={() => setRawUsername(rawUsername.replace(/^@+/, ''))} placeholder="pi_pioneer_2749" className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-50 focus:bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs" /></div><p className="text-[10px] text-zinc-500 mt-1">Your verified Pi handle for order tracking: <span className="text-amber-700 font-mono font-bold">@{rawUsername.replace(/^@+/, '') || 'pi_user'}</span></p></div>
          <div><label className="block text-[11px] font-bold text-zinc-700 mb-1">Telegram Username <span className="font-normal text-zinc-400">(optional)</span></label><div className="relative flex items-center"><div className="absolute left-3.5 text-amber-600 font-bold text-xs pointer-events-none"><Send className="w-3.5 h-3.5" /></div><input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="@telegram_handle" className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-50 focus:bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs" /></div><p className="text-[10px] text-zinc-500 mt-1">Used for booking communication when available.</p></div>
          <div><label className="block text-[11px] font-bold text-zinc-700 mb-1">Email Address</label><div className="relative flex items-center"><div className="absolute left-3.5 text-amber-600 font-bold text-xs pointer-events-none"><Mail className="w-3.5 h-3.5" /></div><input type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-50 focus:bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs" /></div><p className="text-[10px] text-zinc-500 mt-1">A reliable contact method for your provider and booking updates.</p></div>
        </div></div>
        <div className="p-5 rounded-3xl bg-white shadow-md space-y-4"><h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">2. Project Brief</h3><div><label className="block text-[11px] font-bold text-zinc-700 mb-1">Description / Requirements Brief</label><textarea rows={7} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe your goals, reference links, specific requirements or questions..." className="w-full p-3 rounded-2xl bg-zinc-50 focus:bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs resize-y whitespace-pre-wrap" /></div></div>
        <div className="p-3.5 rounded-2xl bg-emerald-50 shadow-2xs flex items-center gap-2.5 text-xs text-emerald-900 font-medium"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /><span>Your booking & brief are protected by Pi Network Merchant Security.</span></div>
        <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-50 shadow-lg"><div className="max-w-md mx-auto flex items-center justify-between gap-3"><div className="text-xs"><span className="block text-zinc-400 font-bold text-[10px]">STEP 1 OF 4</span><span className="font-bold text-zinc-900">Details & Brief</span></div><button type="submit" id="btn-proceed-to-schedule" className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-600/20 cursor-pointer"><span>Next: Select Date</span><ArrowRight className="w-4 h-4 stroke-[2.5]" /></button></div></div>
      </form>
    </div>
  );
};
'''
write('artifacts/pibooking/src/components/SelectDetailsStep.tsx', select_details)

# Remove attachment-only fields from the booking model and persistence mapping.
types_path = ROOT / 'artifacts/pibooking/src/types.ts'
types = types_path.read_text(encoding='utf-8')
types = re.sub(r"\nexport interface BookingAttachment \{.*?\n\}\n", "\n", types, flags=re.S)
types = types.replace('  attachments?: BookingAttachment[];\n', '')
types = types.replace('  fullDescription?: string;\n', '')
types_path.write_text(types, encoding='utf-8')

booking_path = ROOT / 'artifacts/pibooking/src/services/bookingService.ts'
booking = booking_path.read_text(encoding='utf-8')
booking = booking.replace('        attachments: Array.isArray(row.attachments) ? row.attachments : [],\n', '')
booking = booking.replace(' attachments: fullBooking.attachments || [],', '')
booking = booking.replace(', notes: fullBooking.notes || \'\'', ', notes: fullBooking.notes || \'\'')
booking_path.write_text(booking, encoding='utf-8')

summary_path = ROOT / 'artifacts/pibooking/src/components/BookingSummaryStep.tsx'
summary = summary_path.read_text(encoding='utf-8')
summary = re.sub(r"import \{\n.*?Paperclip,\n", lambda m: m.group(0).replace('  Paperclip,\n',''), summary, count=1, flags=re.S)
summary = re.sub(r"\ninterface AttachedFile \{.*?\n\}\n", "\n", summary, count=1, flags=re.S)
summary = re.sub(r"\n    attachments\?: AttachedFile\[\];", "", summary, count=1)
summary = re.sub(r"\n            /\*\* Attached Files \*/.*?\n            \)\}", "", summary, count=1, flags=re.S)
summary_path.write_text(summary, encoding='utf-8')

# Provider Console booking row: details action is centered and pinned to the far right.
pd_path = ROOT / 'artifacts/pibooking/src/features/provider/ProviderDashboardView.tsx'
pd = pd_path.read_text(encoding='utf-8')
pd = pd.replace('<div className="flex items-start justify-between gap-4">\n                    <button type="button" onClick={() => setDetailsBooking(booking)} className="min-w-0 flex-1 text-left">\n                      <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-bold text-zinc-950 truncate">{booking.serviceName}</h3><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span></div>\n                      <p className="text-xs text-zinc-600 mt-1">{booking.clientName || booking.clientPiUsername || \'Client\'} · {booking.date || \'Date not set\'} · {booking.timeSlot || \'Time not set\'} · {Number(booking.pricePi || 0)} π</p>\n                      <span className="text-[10px] text-amber-700 font-bold mt-1 inline-block">View Details</span>\n                    </button>', '<div className="flex items-center justify-between gap-4">\n                    <button type="button" onClick={() => setDetailsBooking(booking)} className="min-w-0 flex-1 text-left">\n                      <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-bold text-zinc-950 truncate">{booking.serviceName}</h3><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span></div>\n                      <p className="text-xs text-zinc-600 mt-1">{booking.clientName || booking.clientPiUsername || \'Client\'} · {booking.date || \'Date not set\'} · {booking.timeSlot || \'Time not set\'} · {Number(booking.pricePi || 0)} π</p>\n                    </button>\n                    <button type="button" onClick={() => setDetailsBooking(booking)} className="shrink-0 self-center text-[10px] font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap">View Details</button>')
pd_path.write_text(pd, encoding='utf-8')

print('Provider service and booking UI refinements applied.')
'''
