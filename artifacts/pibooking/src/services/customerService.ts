import { Customer } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseUpsert } from '../lib/supabase';

const LOCAL_CUSTOMERS_KEY = 'w3c_customers';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

export const customerService = {
  getCustomersLocal(): Customer[] {
    const cached = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  },

  async getCustomersAsync(): Promise<Customer[]> {
    const localCustomers = this.getCustomersLocal();

    if (!isSupabaseConfigured()) {
      return localCustomers;
    }

    console.log('[Supabase Request] Fetching customers from "customers"...');

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('last_active_at', { ascending: false });

      if (error) {
        console.warn('[Supabase Note] Failed to fetch customers from database:', error.message);
        if (error.code === '42501') logRLSHint('customers');
        return localCustomers;
      }

      if (!data) return localCustomers;

      console.log(`[Supabase Success] Received ${data.length} customers from database.`);

      const remoteCustomers: Customer[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        piUsername: row.pi_username,
        phone: row.phone || '',
        email: row.email,
        totalBookings: Number(row.total_bookings) || 1,
        totalSpendBase: Number(row.total_spend_base) || 0,
        totalSpendPi: Number(row.total_spend_pi) || 0,
        currency: row.currency || 'NGN',
        lastActiveAt: row.last_active_at || row.created_at,
        createdAt: row.created_at,
      }));

      localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(remoteCustomers));
      return remoteCustomers;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching customers:', e?.message || e);
      return localCustomers;
    }
  },

  async trackCustomerActivityAsync(info: {
    name: string;
    piUsername: string;
    phone: string;
    email?: string;
    spendBase: number;
    spendPi: number;
    currency?: string;
  }): Promise<Customer[]> {
    const current = this.getCustomersLocal();
    const existingIndex = current.findIndex(
      (c) => c.piUsername.toLowerCase() === info.piUsername.toLowerCase()
    );

    const now = new Date().toISOString();
    let updatedList: Customer[] = [];

    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      const updatedCustomer: Customer = {
        ...existing,
        name: info.name || existing.name,
        phone: info.phone || existing.phone,
        email: info.email || existing.email,
        totalBookings: existing.totalBookings + 1,
        totalSpendBase: existing.totalSpendBase + info.spendBase,
        totalSpendPi: existing.totalSpendPi + info.spendPi,
        currency: info.currency || existing.currency,
        lastActiveAt: now,
      };
      updatedList = [...current];
      updatedList[existingIndex] = updatedCustomer;
    } else {
      const newCustomer: Customer = {
        id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: info.name,
        piUsername: info.piUsername,
        phone: info.phone,
        email: info.email,
        totalBookings: 1,
        totalSpendBase: info.spendBase,
        totalSpendPi: info.spendPi,
        currency: info.currency || 'NGN',
        lastActiveAt: now,
        createdAt: now,
      };
      updatedList = [newCustomer, ...current];
    }

    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(updatedList));

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Syncing customer activity for @${info.piUsername}...`);
      try {
        const { data, error } = await safeSupabaseUpsert(
          'customers',
          {
            name: info.name,
            pi_username: info.piUsername,
            phone: info.phone,
            email: info.email,
            total_spend_base: updatedList.find(c => c.piUsername === info.piUsername)?.totalSpendBase || info.spendBase,
            total_spend_pi: updatedList.find(c => c.piUsername === info.piUsername)?.totalSpendPi || info.spendPi,
            currency: info.currency || 'NGN',
            last_active_at: now,
          },
          { onConflict: 'pi_username' }
        );

        if (error) {
          console.warn('[Supabase Note] Failed to sync customer record in database:', error.message);
          if (error.code === '42501') logRLSHint('customers');
        } else {
          console.log('[Supabase Success] Customer activity synced in database:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Customer sync failed:', e?.message || e);
      }

      return await this.getCustomersAsync();
    }

    return updatedList;
  }
};
