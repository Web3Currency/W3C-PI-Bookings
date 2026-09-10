import React, { useEffect, useState } from 'react';
import { Edit3, Eye, Plus } from 'lucide-react';
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

export const ProviderServicesView: React.FC<ProviderServicesViewProps> = ({
  providerId,
  onBack,
  onCreateService,
  onEditService,
  onPreviewService,
  onProviderUpdated,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
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
      setError(e?.message || 'Unable to load your services.');
    } finally {
      setLoading(false);
    }
  };

  const loadProvider = async () => {
    setProfileLoading(true);
    try {
      const providers = await providerService.getProvidersAsync();
      setProvider(providers.find((item) => item.id === providerId) || null);
    } catch {
      setProvider(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadProvider(); }, [providerId]);

  const handleProviderSaved = (saved: Provider) => {
    setProvider(saved);
    setView('services');
    onProviderUpdated?.();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <BackButton onClick={onBack} label="Go back" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-zinc-950">Manage Profile and Services</h1>
        </div>
        <button type="button" onClick={onCreateService} aria-label="Create service" className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition cursor-pointer">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Services</span>
        </button>
      </div>

      <div className="w-full">
        <div className="flex w-full items-center rounded-xl bg-zinc-100 border border-zinc-200 p-1">
          <button type="button" onClick={() => setView('services')} className={`relative flex-1 rounded-lg px-4 py-2.5 text-xs font-black transition ${view === 'services' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>
            My Services
            {view === 'services' && <span className="absolute left-4 right-4 -bottom-1 h-0.5 rounded-full bg-orange-500" />}
          </button>
          <button type="button" onClick={() => setView('profile')} className={`relative flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition ${view === 'profile' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>
            Edit Profile
            {view === 'profile' && <span className="absolute left-4 right-4 -bottom-1 h-0.5 rounded-full bg-orange-500" />}
          </button>
        </div>
      </div>

      {view === 'profile' ? (
        <div className="pt-2">
          <div className="mb-5">
            <h2 className="text-sm font-black text-zinc-900">Edit Profile</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl">Update the public profile clients see when they visit your profile.</p>
          </div>
          {profileLoading ? (
            <div className="py-12 text-center text-xs font-semibold text-zinc-400">Loading profile...</div>
          ) : provider ? (
            <ProviderProfileEditor provider={provider} onBack={() => setView('services')} onSaved={handleProviderSaved} />
          ) : (
            <div className="py-12 text-center text-xs font-semibold text-zinc-400">Unable to load your provider profile.</div>
          )}
        </div>
      ) : (
        <section className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-zinc-900">My Published Services</h2>
            <span className="shrink-0 px-2 py-1 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">({services.length} service{services.length === 1 ? '' : 's'})</span>
          </div>
          {error && <div className="px-4 py-3 mb-3 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-700">{error}</div>}
          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-zinc-400">Loading your services...</div>
          ) : services.length === 0 ? (
            <div className="py-12 border-y border-zinc-200 text-center">
              <p className="text-sm font-bold text-zinc-700">No services yet.</p>
              <p className="text-xs text-zinc-400 mt-1">Create your first service to start offering it to clients.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {services.map((service) => (
                <div key={service.id} className="py-3 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                    {service.coverImageUrl ? <img src={service.coverImageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">No image</div>}
                  </div>
                  <div className="ml-auto min-w-0 flex flex-col items-end gap-2">
                    <div className="flex items-center justify-end gap-2 min-w-0">
                      <h3 className="font-black text-sm text-zinc-900 truncate">{service.name}</h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${service.status === 'Published' ? 'bg-green-50 text-green-700' : service.status === 'Archived' ? 'bg-zinc-100 text-zinc-500' : 'bg-amber-50 text-amber-700'}`}>{service.status}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => onPreviewService(service)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-[11px] font-bold hover:bg-zinc-200 cursor-pointer"><Eye className="w-3.5 h-3.5" />Preview</button>
                      <button type="button" onClick={() => onEditService(service)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-[11px] font-bold hover:bg-orange-100 cursor-pointer"><Edit3 className="w-3.5 h-3.5" />Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};