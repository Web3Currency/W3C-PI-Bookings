import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BRANDING_BUCKET = 'w3c-assets';
const DEFAULT_LOGO_URL = '';

export const appBrandingService = {
  async getLogoUrl(): Promise<string> {
    if (!isSupabaseConfigured()) {
      return DEFAULT_LOGO_URL;
    }

    try {
      const { data, error } = await supabase
        .from('app_branding')
        .select('logo_path')
        .eq('id', 'global')
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Note] Failed to fetch application branding:', error.message);
        return DEFAULT_LOGO_URL;
      }

      const logoPath = data?.logo_path;
      if (!logoPath) {
        return DEFAULT_LOGO_URL;
      }

      const { data: publicUrlData } = supabase.storage
        .from(BRANDING_BUCKET)
        .getPublicUrl(logoPath);

      return publicUrlData?.publicUrl || DEFAULT_LOGO_URL;
    } catch (error: any) {
      console.warn('[Supabase Exception] Application branding fetch failed:', error?.message || error);
      return DEFAULT_LOGO_URL;
    }
  },
};
