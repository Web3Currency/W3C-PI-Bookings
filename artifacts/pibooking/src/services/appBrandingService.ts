import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BRANDING_BUCKET = 'w3c-assets';
const DEFAULT_LOGO_URL = '';
const DEFAULT_PI_WATERMARK_URL = '/pi-watermark.svg';

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

  async getPiWatermarkUrl(): Promise<string> {
    if (!isSupabaseConfigured()) return DEFAULT_PI_WATERMARK_URL;

    try {
      const { data, error } = await supabase
        .from('app_branding')
        .select('pi_watermark_path')
        .eq('id', 'global')
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Note] Failed to fetch Pi watermark branding:', error.message);
        return DEFAULT_PI_WATERMARK_URL;
      }

      const watermarkPath = data?.pi_watermark_path;
      if (!watermarkPath) return DEFAULT_PI_WATERMARK_URL;

      const { data: publicUrlData } = supabase.storage
        .from(BRANDING_BUCKET)
        .getPublicUrl(watermarkPath);

      return publicUrlData?.publicUrl || DEFAULT_PI_WATERMARK_URL;
    } catch (error: any) {
      console.warn('[Supabase Exception] Pi watermark fetch failed:', error?.message || error);
      return DEFAULT_PI_WATERMARK_URL;
    }
  },
};
