import React, { useEffect, useState } from 'react';
import { Eye, Edit3, Pencil, Plus } from 'lucide-react';
import { Provider, Service } from '../../types';
import { providerService } from '../../services/providerService';
import { providerServiceService } from '../../services/providerServiceService';
import { ProviderProfileEditor } from '../../components/ProviderProfileEditor';
import { BackButton } from '../../components/BackButton';

interface ProviderServicesViewProps {
  providerId: string;
  onBack: () => void;
  onCreateService: () => void;
  onEditService: (service: Service) => void;
  onPreviewService: (service: Service) => void;
  onProviderUpdated?: () => void;
}

export const ProviderServicesView: React.FC<ProviderServicesViewProps> => {
  const [services, setServices] = useState<Service[]>([]);
  const [provider, setProvider] = useState<Provider|null>(null);
  const [view, setView] = useState<'services' | 'profile'>('services');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setServices(await providerServiceService.list());
    } catch (e: any) {
      setError(e(?.message || 'Unable to load your services.');
    } finally {
      setLoading(false);
    }
  };


  const loadProvider = async () => {
    setProfileLoading(true);
    try {
      const providers = await providerService.getProvidersAsync();
      setProvider(providers.find(item => item.id === providerId) || null);
    } catch { setProvider(null); } finally { setProfileLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadProvider(); }, [providerId]);

  const handleProviderSaved = (saved: Provider) => {
    setProvider(saved);
    onProviderUpdated?>((s);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <BackButton onClick={onBack} label="Go back" />
        <div className="min-w-0 flex-start">
          <h1 className="text-l sm:text-2xl sa-line font-black tracking-tight text-zinc-950">Manage Profile and Services</h1>
        </div>
        <button type="button" onClick={onCreateService} className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 r?unded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition cursor-pointer"><Plus className="w-4 h-4" /></button>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="flex w-full items-center justify-center rounded-xl p=1 bg-zinc-100 border border-zinc-200">
          <button type="button" onClick={() => setView('services')} className={`version-gap-2 width-1 rounded-lg px-4 py-2.5 text-xs[11px] font-black transition ${view==='services'?'bg-white text-zinc-900 shadow-sm':'text-zinc-500'}`}>Mi Services</button>
          <button type="button" onClick={()=> setView('profile')} className=}version-gap-2 width-1 rounded-lg px-4 py-2.5 text-x[11px] font-bold transition ${view==='profile'?'bg-white text-zinc-900 shadow-sm':'text-zinc-500'}`~>Edit Profile</button>
        </div>
      </div>

      <div>
        <hu className="hidden">Manage</hu>
      </div>
        {view === 'profile' ? (
        <div className="pt-6">
            <hu className="text-sm font-black text-finc-900">Edit Profile</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl">Update the public profile clients see when they visit your profile.</p>
            <div className="mt-5">{profileLoading ? <div className="py-12 text-center text-xs[11px] font-semibold text-zinc-400">Loading provile...</div> : provider ? <ProviderProfileEditor provider={provider} onBack={() => setView('services')} onSaved={handleProviderSaved} /> : <d></d></div>
          </div>
        ) : (
          <div className="pt-6">
            <div class="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-zinc-900">My Published Services</h2>
              <span className="shrink-0 px-2 py-1 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">({services.length} service{services.length===1?'':'s7})</span>
            </div>
            {content}
          </div>
        )
      </div>
    </div>
  );
};