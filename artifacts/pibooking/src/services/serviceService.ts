import { Service } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseInsert, safeSupabaseUpdate } from '../lib/supabase';
import { pricingService } from './pricingService';
const LOCAL_SERVICES_KEY = 'w3c_services';
function logRLSHint(tableName: string) { console.warn(`[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.`); }
export const serviceService = {
  getServicesLocal(): Service[] { const cached = localStorage.getItem(LOCAL_SERVICES_KEY); if (!cached) return []; try { return JSON.parse(cached); } catch { return []; } },
  async getServicesAsync(): Promise<Service[]> {
    const localServices = this.getServicesLocal(); if (!isSupabaseConfigured()) return localServices;
    try {
      const { data, error } = await supabase.from('services').select('*, providers(*)').order('created_at', { ascending: true });
      if (error) { console.warn('[Supabase Note] Failed to fetch services:', error.message); if (error.code === '42501') logRLSHint('services'); return localServices; }
      if (!data || data.length === 0) { localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify([])); return []; }
      const remoteServices: Service[] = data.map((row: any) => ({
        id: row.id, name: row.title || row.name || 'Untitled Service', category: row.category || 'web_dev', description: row.short_description || row.description || '', coverImageUrl: row.cover_image || row.cover_image_url || '', included: Array.isArray(row.deliverables) ? row.deliverables : (Array.isArray(row.included) ? row.included : []), durationMinutes: Number(row.duration || row.duration_minutes) || 60, basePrice: Number(row.base_price_ngn) || Number(row.base_price) || Number(row.price_ngn) || Number(row.price) || 0, currency: row.currency || 'NGN', priceNGN: Number(row.base_price_ngn) || Number(row.base_price) || Number(row.price_ngn) || Number(row.price) || 0, pricePi: Number(row.calculated_pi_price) || Number(row.pi_price) || Number(row.price_pi) || 0, featured: row.featured ?? false, providerName: row.provider_name || '', providerRole: row.provider_role || '', providerId: row.provider_id || undefined, provider: row.providers ? { id: row.providers.id, fullName: row.providers.full_name, piUsername: row.providers.pi_username, piWalletAddress: row.providers.pi_wallet_address, roleTitle: row.providers.role_title, photoUrl: row.providers.photo_url, contactEmail: row.providers.contact_email, contactPhone: row.providers.contact_phone, status: row.providers.status } : undefined, locationType: row.location_type || 'Online / Remote', status: row.status || 'Published', createdAt: row.created_at, updatedAt: row.updated_at,
      }));
      localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify(remoteServices)); return remoteServices;
    } catch (e: any) { console.error('[Supabase Exception] Error fetching services:', e?.message || e); return localServices; }
  },
  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const newId = `srv_${Date.now()}_${Math.floor(Math.random() * 1000)}`; const exchangeRate = await pricingService.getExchangeRateNGNAsync(); const calculatedPiPrice = pricingService.calculatePiPrice(service.basePrice || service.priceNGN, exchangeRate);
    const newService: Service = { ...service, id: newId, basePrice: service.basePrice || service.priceNGN, priceNGN: service.basePrice || service.priceNGN, pricePi: calculatedPiPrice, status: service.status || 'Published', createdAt: new Date().toISOString() };
    if (isSupabaseConfigured()) {
      try {
        const insertPayload: Record<string, any> = { id: newService.id, title: newService.name, short_description: newService.description, cover_image: newService.coverImageUrl, deliverables: newService.included, duration: newService.durationMinutes, base_price_ngn: newService.basePrice, currency: newService.currency || 'NGN', featured: newService.featured ?? false, location_type: newService.locationType || 'Online / Remote', status: newService.status, category: newService.category, provider_name: newService.providerName || '', provider_role: newService.providerRole || '' };
        if (newService.providerId) insertPayload.provider_id = newService.providerId;
        const { data, error } = await safeSupabaseInsert('services', insertPayload); if (error) { console.warn('[Supabase Note] Failed to insert service:', error.message); if (error.code === '42501') logRLSHint('services'); } else if (data?.[0]?.id) newService.id = data[0].id;
      } catch (e: any) { console.error('[Supabase Exception] Service insertion failed:', e?.message || e); }
    }
    const currentServices = this.getServicesLocal(); localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify([...currentServices, newService])); return newService;
  },
  async updateService(serviceId: string, updates: Partial<Service>): Promise<Service[]> {
    const exchangeRate = await pricingService.getExchangeRateNGNAsync();
    if (isSupabaseConfigured()) {
      try {
        const basePrice = updates.basePrice ?? updates.priceNGN; const payload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) payload.title = updates.name; if (updates.description !== undefined) payload.short_description = updates.description; if (updates.coverImageUrl !== undefined) payload.cover_image = updates.coverImageUrl; if (updates.included !== undefined) payload.deliverables = updates.included; if (updates.durationMinutes !== undefined) payload.duration = updates.durationMinutes; if (basePrice !== undefined) payload.base_price_ngn = basePrice; if (updates.currency !== undefined) payload.currency = updates.currency; if (updates.featured !== undefined) payload.featured = updates.featured; if (updates.locationType !== undefined) payload.location_type = updates.locationType; if (updates.status !== undefined) payload.status = updates.status; if (updates.category !== undefined) payload.category = updates.category; if (updates.providerId !== undefined) payload.provider_id = updates.providerId;
        const { data, error } = await safeSupabaseUpdate('services', payload, 'id', serviceId); if (error) { console.warn('[Supabase Note] Failed to update service:', error.message); if (error.code === '42501') logRLSHint('services'); } else console.log('[Supabase Success] Service updated:', data);
      } catch (e: any) { console.error('[Supabase Exception] Service update failed:', e?.message || e); }
    }
    const currentServices = this.getServicesLocal(); const updatedServices = currentServices.map((s) => s.id === serviceId ? { ...s, ...updates, basePrice: updates.basePrice ?? updates.priceNGN ?? s.basePrice, priceNGN: updates.basePrice ?? updates.priceNGN ?? s.basePrice, pricePi: pricingService.calculatePiPrice(updates.basePrice ?? updates.priceNGN ?? s.basePrice, exchangeRate), updatedAt: new Date().toISOString() } : s); localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify(updatedServices)); return isSupabaseConfigured() ? await this.getServicesAsync() : updatedServices;
  },
  async deleteService(serviceId: string): Promise<Service[]> {
    if (isSupabaseConfigured()) { try { const { data, error } = await supabase.from('services').delete().eq('id', serviceId).select(); if (error) { console.warn('[Supabase Note] Failed to delete service:', error.message); if (error.code === '42501') logRLSHint('services'); } else console.log('[Supabase Success] Service deleted:', data); } catch (e: any) { console.error('[Supabase Exception] Service deletion failed:', e?.message || e); } }
    const updatedServices = this.getServicesLocal().filter((s) => s.id !== serviceId); localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify(updatedServices)); return isSupabaseConfigured() ? await this.getServicesAsync() : updatedServices;
  },
};
