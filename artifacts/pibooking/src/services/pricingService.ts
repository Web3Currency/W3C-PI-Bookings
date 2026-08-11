import { supabase, isSupabaseConfigured, safeSupabaseUpsert } from '../lib/supabase';
import { DEFAULT_EXCHANGE_RATE_NGN, DEFAULT_CURRENCY } from '../config/constants';

const LOCAL_RATE_KEY = 'w3c_pi_exchange_rate_ngn';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

export const pricingService = {
  async getExchangeRateNGNAsync(): Promise<number> {
    const cachedRate = localStorage.getItem(LOCAL_RATE_KEY);
    const initialRate = cachedRate ? parseFloat(cachedRate) : DEFAULT_EXCHANGE_RATE_NGN;

    if (!isSupabaseConfigured()) {
      return initialRate;
    }

    console.log('[Supabase Request] Fetching global exchange rate from "settings"...');

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('exchange_rate_ngn')
        .eq('id', 'global_settings')
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Note] Exchange rate query response:', error.message);
        if (error.code === '42501') logRLSHint('settings');
        return initialRate;
      }

      if (!data) {
        return initialRate;
      }

      console.log('[Supabase Success] Loaded exchange rate from database:', data.exchange_rate_ngn);
      const rate = Number(data.exchange_rate_ngn) || DEFAULT_EXCHANGE_RATE_NGN;
      localStorage.setItem(LOCAL_RATE_KEY, rate.toString());
      return rate;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching exchange rate:', e?.message || e);
      return initialRate;
    }
  },

  async setExchangeRateNGNAsync(rate: number): Promise<number> {
    const safeRate = Math.max(1, rate);
    localStorage.setItem(LOCAL_RATE_KEY, safeRate.toString());

    if (!isSupabaseConfigured()) {
      return safeRate;
    }

    console.log(`[Supabase Request] Updating global exchange rate to ₦${safeRate} in settings...`);

    try {
      const { data, error } = await safeSupabaseUpsert('settings', {
        id: 'global_settings',
        exchange_rate_ngn: safeRate,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn('[Supabase Note] Failed to update exchange rate in database:', error.message);
        if (error.code === '42501') logRLSHint('settings');
      } else {
        console.log('[Supabase Success] Exchange rate updated in database:', data);
      }
    } catch (e: any) {
      console.error('[Supabase Exception] Exchange rate update failed:', e?.message || e);
    }

    return safeRate;
  },

  calculatePiPrice(basePrice: number, exchangeRate: number): number {
    if (!exchangeRate || exchangeRate <= 0) return 0;
    return parseFloat((basePrice / exchangeRate).toFixed(2));
  },

  formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
    if (currency === 'NGN') {
      return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};
