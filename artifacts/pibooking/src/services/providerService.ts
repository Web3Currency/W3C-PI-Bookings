import { Provider } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseInsert, safeSupabaseUpdate } from '../lib/supabase';
import { storageService } from './storageService';

const LOCAL_PROVIDERS_KEY = 'w3c_providers';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

export const providerService = {
  getProvidersLocal(): Provider[] {
    const cached = localStorage.getItem(LOCAL_PROVIDERS_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  },

  async getProvidersAsync(): Promise<Provider[]> {
    const localProviders = this.getProvidersLocal();

    if (!isSupabaseConfigured()) {
      return localProviders;
    }

    console.log('[Supabase Request] Fetching providers from table "providers"...');

    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[Supabase Note] Failed to fetch providers from database:', error.message);
        if (error.code === '42501') logRLSHint('providers');
        return localProviders;
      }

      if (!data || data.length === 0) {
        localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify([]));
        return [];
      }

      console.log(`[Supabase Success] Received ${data.length} providers from database.`);

      const remoteProviders: Provider[] = data.map((row: any) => ({
        id: row.id,
        fullName: row.full_name || '',
        piUsername: row.pi_username || undefined,
        piUid: row.pi_uid || undefined,
        piWalletAddress: row.pi_wallet_address || undefined,
        roleTitle: row.role_title || '',
        bio: row.bio || undefined,
        photoUrl: row.photo_url || undefined,
        portfolioImages: Array.isArray(row.portfolio_images) ? row.portfolio_images : [],
        rating: row.rating !== undefined && row.rating !== null ? Number(row.rating) : undefined,
        reviewsCount: row.reviews_count !== undefined && row.reviews_count !== null ? Number(row.reviews_count) : undefined,
        contactEmail: row.contact_email || undefined,
        contactPhone: row.contact_phone || undefined,
        status: row.status || 'Approved',
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Public Profile Fields
        usernameSlug: row.username_slug || undefined,
        headline: row.headline || undefined,
        specialties: Array.isArray(row.specialties) ? row.specialties : [],
        skills: Array.isArray(row.skills) ? row.skills : [],
        experienceLevel: row.experience_level || undefined,
        yearsExperience: row.years_experience !== undefined && row.years_experience !== null ? Number(row.years_experience) : undefined,
        availabilityStatus: row.availability_status || undefined,
        responseTime: row.response_time || undefined,
        languages: Array.isArray(row.languages) ? row.languages : [],
        serviceMode: row.service_mode || undefined,
        profileVerified: row.profile_verified ?? undefined,
        piVerified: row.pi_verified ?? undefined,
        location: row.location || undefined,
        website: row.website || undefined,
        socialLinks: Array.isArray(row.social_links) ? row.social_links : [],
        profileVisibility: row.profile_visibility || 'public',
      }));

      localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(remoteProviders));
      return remoteProviders;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching providers from database:', e?.message || e);
      return localProviders;
    }
  },

  async getProviderByPiUid(piUid: string): Promise<Provider | null> {
    const all = await this.getProvidersAsync();
    return all.find((p) => p.piUid === piUid) || null;
  },

  async addProvider(provider: Omit<Provider, 'id'>): Promise<Provider> {
    const generatedUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `prv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newId = (provider as any).id && (provider as any).id.length > 10 ? (provider as any).id : generatedUuid;
    const computedSlug = provider.usernameSlug || (provider.piUsername ? provider.piUsername.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '') : null) || (provider.fullName ? provider.fullName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') : null);

    const newProvider: Provider = {
      ...provider,
      id: newId,
      status: provider.status || 'Approved',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Inserting provider "${newProvider.fullName}" into Supabase...`);
      try {
        const { data, error } = await safeSupabaseInsert('providers', {
          id: newProvider.id,
          full_name: newProvider.fullName,
          pi_username: newProvider.piUsername || null,
          pi_uid: newProvider.piUid || null,
          pi_wallet_address: newProvider.piWalletAddress || null,
          role_title: newProvider.roleTitle,
          bio: newProvider.bio || null,
          photo_url: newProvider.photoUrl || null,
          portfolio_images: newProvider.portfolioImages || [],
          contact_email: newProvider.contactEmail || null,
          contact_phone: newProvider.contactPhone || null,
          status: newProvider.status || 'Approved',
          username_slug: computedSlug,
          headline: newProvider.headline || null,
          specialties: newProvider.specialties || [],
          skills: newProvider.skills || [],
          experience_level: newProvider.experienceLevel || null,
          years_experience: typeof newProvider.yearsExperience === 'number' && !isNaN(newProvider.yearsExperience) ? newProvider.yearsExperience : null,
          availability_status: newProvider.availabilityStatus || 'available',
          response_time: newProvider.responseTime || null,
          languages: newProvider.languages || [],
          service_mode: newProvider.serviceMode || null,
          location: newProvider.location || null,
          website: newProvider.website || null,
          social_links: newProvider.socialLinks || [],
          profile_visibility: newProvider.profileVisibility || 'public',
        });

        if (error) {
          console.warn('[Supabase Note] Failed to insert provider:', error.message);
          if (error.code === '42501') logRLSHint('providers');
        } else if (data && data[0]) {
          console.log('[Supabase Success] Provider saved to database:', data[0]);
          if (data[0].id) {
            newProvider.id = data[0].id;
          }
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Provider insertion failed:', e?.message || e);
      }
    }

    const currentProviders = this.getProvidersLocal();
    const updatedProviders = [...currentProviders, newProvider];
    localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(updatedProviders));

    return newProvider;
  },

  async updateProvider(providerId: string, updates: Partial<Provider>): Promise<void> {
    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Updating provider id="${providerId}" in Supabase...`);
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (updates.fullName !== undefined) payload.full_name = updates.fullName;
        if (updates.piUsername !== undefined) payload.pi_username = updates.piUsername;
        if (updates.piWalletAddress !== undefined) payload.pi_wallet_address = updates.piWalletAddress;
        if (updates.roleTitle !== undefined) payload.role_title = updates.roleTitle;
        if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
        if (updates.bio !== undefined) payload.bio = updates.bio;
        if (updates.portfolioImages !== undefined) payload.portfolio_images = updates.portfolioImages;
        if (updates.contactEmail !== undefined) payload.contact_email = updates.contactEmail;
        if (updates.contactPhone !== undefined) payload.contact_phone = updates.contactPhone;
        if (updates.status !== undefined) payload.status = updates.status;

        if (updates.usernameSlug !== undefined) payload.username_slug = updates.usernameSlug;
        if (updates.headline !== undefined) payload.headline = updates.headline;
        if (updates.specialties !== undefined) payload.specialties = updates.specialties;
        if (updates.skills !== undefined) payload.skills = updates.skills;
        if (updates.experienceLevel !== undefined) payload.experience_level = updates.experienceLevel;
        if (updates.yearsExperience !== undefined) payload.years_experience = updates.yearsExperience;
        if (updates.availabilityStatus !== undefined) payload.availability_status = updates.availabilityStatus;
        if (updates.responseTime !== undefined) payload.response_time = updates.responseTime;
        if (updates.languages !== undefined) payload.languages = updates.languages;
        if (updates.serviceMode !== undefined) payload.service_mode = updates.serviceMode;
        if (updates.profileVerified !== undefined) payload.profile_verified = updates.profileVerified;
        if (updates.piVerified !== undefined) payload.pi_verified = updates.piVerified;
        if (updates.location !== undefined) payload.location = updates.location;
        if (updates.website !== undefined) payload.website = updates.website;
        if (updates.socialLinks !== undefined) payload.social_links = updates.socialLinks;
        if (updates.profileVisibility !== undefined) payload.profile_visibility = updates.profileVisibility;

        const { data, error } = await safeSupabaseUpdate('providers', payload, 'id', providerId);

        if (error) {
          console.warn('[Supabase Note] Failed to update provider in database:', error.message);
          if (error.code === '42501') logRLSHint('providers');
        } else {
          console.log('[Supabase Success] Provider updated in database:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Provider update failed:', e?.message || e);
      }
    }

    const currentProviders = this.getProvidersLocal();
    const updatedProviders = currentProviders.map((p) => {
      if (p.id === providerId) {
        return {
          ...p,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(updatedProviders));
  },

  async uploadProviderPhoto(providerId: string, file: File): Promise<string | null> {
    const customPath = `${providerId}/${Date.now()}_${file.name}`;
    return await storageService.uploadFile('providerPhotos', customPath, file);
  }
};
