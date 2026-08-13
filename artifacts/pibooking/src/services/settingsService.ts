import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface MarketplaceSettings {
  become_provider_popup_enabled: boolean;
}

const DEFAULT_SETTINGS: MarketplaceSettings = {
  become_provider_popup_enabled: false,
};

let cachedSettings: MarketplaceSettings | null = null;

export const settingsService = {
  /**
   * Fetches marketplace settings from Supabase or returns cached/default settings.
   * Default state is always OFF (false) if database is unconfigured or fetch fails.
   */
  async getSettings(): Promise<MarketplaceSettings> {
    if (cachedSettings !== null) {
      return cachedSettings;
    }

    if (!isSupabaseConfigured()) {
      cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }

    try {
      const { data, error } = await supabase
        .from('marketplace_settings')
        .select('become_provider_popup_enabled')
        .eq('id', 'global')
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Settings] Could not fetch marketplace_settings:', error.message);
        cachedSettings = DEFAULT_SETTINGS;
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        cachedSettings = DEFAULT_SETTINGS;
        return DEFAULT_SETTINGS;
      }

      cachedSettings = {
        become_provider_popup_enabled: Boolean(data.become_provider_popup_enabled),
      };

      return cachedSettings;
    } catch (err) {
      console.warn('[Supabase Settings] Error fetching marketplace_settings, defaulting to OFF:', err);
      cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Clears the in-memory settings cache.
   */
  clearCache(): void {
    cachedSettings = null;
  },
};
