import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BRANDING_BUCKET = 'w3c-assets';
const DEFAULT_LOGO_URL = '';
const DEFAULT_PI_WATERMARK_URL = '/pi-watermark.svg';

function resolveBrandingAsset(path: string | null | undefined, fallback: string): string {
  const value = String(path || '').trim();
  if (!value) return fallback;

  // Allow the admin to use either a Supabase Storage path or a complete public URL.
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith('/')) return value;

  const { data: publicUrlData } = supabase.storage
    .from(BRANDING_BUCKET)
    .getPublicUrl(value);

  return publicUrlData?.publicUrl || fallback;
}

export const appBrandingService = {
  async getLogoUrl(): Promise<string> {
    if (!isSupabaseConfigured()) return DEFAULT_LOGO_URL;

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

      return resolveBrandingAsset(data?.logo_path, DEFAULT_LOGO_URL);
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

      return resolveBrandingAsset(data?.pi_watermark_path, DEFAULT_PI_WATERMARK_URL);
    } catch (error: any) {
      console.warn('[Supabase Exception] Pi watermark fetch failed:', error?.message || error);
      return DEFAULT_PI_WATERMARK_URL;
    }
  },
};
