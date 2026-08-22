import React, { useEffect, useState } from 'react';
import { Provider, SocialLink } from '../types';
import { providerService } from '../services/providerService';
import { piAuthService } from '../services/piAuthService';
import { ProfilePhotoUploader } from './media/ProfilePhotoUploader';
import { PortfolioUploader } from './media/PortfolioUploader';
import { Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface ProviderProfileEditorProps {
  provider: Provider;
  onSaved?: (provider: Provider) => void;
}

export const ProviderProfileEditor: React.FC<ProviderProfileEditorProps> = ({ provider, onSaved }) => {
  const [form, setForm] = useState<Provider>(provider);
  const [saving, setSaving] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(provider.socialLinks || []);
  const token = piAuthService.getStoredUser()?.accessToken;

  useEffect(() => {
    setForm(provider);
    setSocialLinks(provider.socialLinks || []);
  }, [provider]);

  const set = <K extends keyof Provider>(key: K, value: Provider[K]) => setForm((p) => ({ ...p, [key]: value }));
  const csv = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = { ...form, socialLinks: socialLinks.filter((s) => s.url.trim()) };
      await providerService.updateProvider(form.id, updates, token);
      const refreshed = await providerService.getProviderByPiUid(form.piUid || '');
      const saved = refreshed || { ...form, ...updates };
      setForm(saved);
      setSocialLinks(saved.socialLinks || []);
      onSaved?.(saved);
      toast({ title: 'Public Profile Updated', description: 'Your provider profile has been saved.' });
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error?.message || 'Could not save your provider profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isPublic = form.profileVisibility !== 'private';

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Profile Photo</h3>
        <ProfilePhotoUploader value={form.photoUrl || ''} onChange={(value) => set('photoUrl', value)} providerIdentifier={form.id} piAccessToken={token} />
      </section>

      <section className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Portfolio</h3>
        <PortfolioUploader items={form.portfolioItems || []} onChange={(items) => set('portfolioItems', items)} providerIdentifier={form.id} piAccessToken={token} />
      </section>

      <section className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Identity & Bio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required value={form.fullName || ''} onChange={(e) => set('fullName', e.target.value)} placeholder="Full Name" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input required value={form.roleTitle || ''} onChange={(e) => set('roleTitle', e.target.value)} placeholder="Role / Title" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
        </div>
        <input value={form.headline || ''} onChange={(e) => set('headline', e.target.value)} placeholder="Catchy Headline" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
        <textarea rows={4} value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} placeholder="Biography / About You" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
      </section>

      <section className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Professional Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.specialties?.join(', ') || ''} onChange={(e) => set('specialties', csv(e.target.value))} placeholder="Specialties" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input value={form.skills?.join(', ') || ''} onChange={(e) => set('skills', csv(e.target.value))} placeholder="Skills" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input value={form.languages?.join(', ') || ''} onChange={(e) => set('languages', csv(e.target.value))} placeholder="Languages" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input type="number" value={form.yearsExperience ?? ''} onChange={(e) => set('yearsExperience', e.target.value ? Number(e.target.value) : undefined)} placeholder="Years Experience" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input value={form.serviceMode || ''} onChange={(e) => set('serviceMode', e.target.value)} placeholder="Service Mode" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input value={form.responseTime || ''} onChange={(e) => set('responseTime', e.target.value)} placeholder="Response Time" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
        </div>
        <select value={form.availabilityStatus || 'available'} onChange={(e) => set('availabilityStatus', e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl"><option value="available">Available Now</option><option value="busy">Busy / Limited</option><option value="away">Away</option></select>
      </section>

      <section className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Contact & Online Presence</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Location" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input type="email" value={form.contactEmail || ''} onChange={(e) => set('contactEmail', e.target.value)} placeholder="Contact Email" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input value={form.contactPhone || ''} onChange={(e) => set('contactPhone', e.target.value)} placeholder="Contact Phone" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
          <input type="url" value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="Website URL" className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl" />
        </div>
        <div className="space-y-2 pt-2 border-t border-zinc-200">
          <div className="flex justify-between items-center"><span className="text-xs font-semibold">Social & Profile Links</span><button type="button" onClick={() => setSocialLinks([...socialLinks, { platform: 'Twitter / X', url: '' }])} className="text-xs font-bold text-amber-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add Link</button></div>
          {socialLinks.map((s, i) => <div key={i} className="flex gap-2"><input value={s.platform} onChange={(e) => { const n=[...socialLinks]; n[i]={...n[i],platform:e.target.value}; setSocialLinks(n); }} className="w-1/3 px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl" /><input value={s.url} onChange={(e) => { const n=[...socialLinks]; n[i]={...n[i],url:e.target.value}; setSocialLinks(n); }} className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl" /><button type="button" onClick={() => setSocialLinks(socialLinks.filter((_,j)=>j!==i))} className="p-1.5 text-zinc-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div>)}
        </div>
      </section>

      <section className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Profile Visibility</h3>
            <p className="text-xs text-zinc-500 mt-1">Choose whether your provider profile is visible to the public marketplace.</p>
          </div>
          <button
            type="button"
            onClick={() => set('profileVisibility', isPublic ? 'private' : 'public')}
            aria-pressed={isPublic}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${isPublic ? 'bg-orange-600' : 'bg-zinc-300'}`}
            aria-label={isPublic ? 'Hide provider profile' : 'Show provider profile'}
          >
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`}>
              {isPublic ? <Eye className="h-3 w-3 text-orange-600" /> : <EyeOff className="h-3 w-3 text-zinc-500" />}
            </span>
          </button>
        </div>
        <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${isPublic ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
          {isPublic ? 'Public — clients can discover and view your provider profile.' : 'Hidden — your provider profile is removed from public discovery.'}
        </div>
      </section>

      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">{saving ? 'Saving Profile...' : <><Save className="w-4 h-4" />Save Public Profile</>}</button>
    </form>
  );
};