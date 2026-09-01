import { BusinessProfile } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseUpsert } from '../lib/supabase';
import { EMPTY_BUSINESS_PROFILE } from '../config/business';
import { appBrandingService } from './appBrandingService';

const LOCAL_BUSINESS_KEY = 'w3c_business_profile';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

export const businessService = {
  getBusinessProfileLocal(): BusinessProfile {
    const cached = localStorage.getItem(LOCAL_BUSINESS_KEY);
    if (!cached) return EMPTY_BUSINESS_PROFILE;
    try {
      return { ...EMPTY_BUSINESS_PROFILE, ...JSON.parse(cached) };
    } catch {
      return EMPTY_BUSINESS_PROFILE;
    }
  },

  async getBusinessProfileAsync(): Promise<BusinessProfile> {
    const localProfile = this.getBusinessProfileLocal();

    if (!isSupabaseConfigured()) {
      return localProfile;
    }

    console.log('[Supabase Request] Fetching business profile from "business_profile"...');

    try {
      const [{ data, error }, dynamicLogoUrl] = await Promise.all([
        supabase
          .from('business_profile')
          .select('id, name, pi_wallet_address, website, phone, email, socials, updated_at')
          .eq('id', 'w3c_digital')
          .maybeSingle(),
        appBrandingService.getLogoUrl(),
      ]);

      if (error) {
        console.warn('[Supabase Note] Business profile fetch response:', error.message);
        if (error.code === '42501') logRLSHint('business_profile');
        return localProfile;
      }

      if (!data) {
        return dynamicLogoUrl
          ? { ...localProfile, avatarUrl: dynamicLogoUrl, logoUrl: dynamicLogoUrl }
          : localProfile;
      }

      console.log('[Supabase Success] Business profile loaded from database:', data.name);

      const remoteProfile: BusinessProfile = {
        ...localProfile,
        id: data.id || 'w3c_digital',
        name: data.name || localProfile.name || '',
        piWalletAddress: data.pi_wallet_address || localProfile.piWalletAddress || '',
        website: data.website || localProfile.website || '',
        phone: data.phone || localProfile.phone || '',
        email: data.email || localProfile.email || '',
        socials: Array.isArray(data.socials) ? data.socials : (localProfile.socials || []),
        updatedAt: data.updated_at,
        ...(dynamicLogoUrl ? { avatarUrl: dynamicLogoUrl, logoUrl: dynamicLogoUrl } : {}),
      };

      localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(remoteProfile));
      return remoteProfile;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching business profile:', e?.message || e);
      return localProfile;
    }
  },

  async updateBusinessProfileAsync(updatedFields: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = this.getBusinessProfileLocal();
    const updated: BusinessProfile = {
      ...current,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      console.log('[Supabase Request] Updating business profile in Supabase...', updatedFields);
      try {
        const payload: Record<string, any> = {
          id: current.id || 'w3c_digital',
          updated_at: updated.updatedAt,
        };

        if (updated.name !== undefined) payload.name = updated.name;
        if (updated.piWalletAddress !== undefined) payload.pi_wallet_address = updated.piWalletAddress;
        if (updated.website !== undefined) payload.website = updated.website;
        if (updated.phone !== undefined) payload.phone = updated.phone;
        if (updated.email !== undefined) payload.email = updated.email;
        if (updated.socials !== undefined) payload.socials = updated.socials;

        const { data, error } = await safeSupabaseUpsert('business_profile', payload);

        if (error) {
          console.warn('[Supabase Note] Failed to update business profile in database:', error.message);
          if (error.code === '42501') logRLSHint('business_profile');
        } else {
          console.log('[Supabase Success] Business profile updated in database:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Business profile update failed:', e?.message || e);
      }

      return await this.getBusinessProfileAsync();
    }

    return updated;
  }
};
