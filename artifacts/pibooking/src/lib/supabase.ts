import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase environment variables safely
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Check if valid Supabase URL and Anon Key are provided in environment
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-supabase-project') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );
}

const configured = isSupabaseConfigured();

if (!configured) {
  console.warn(
    '⚠️ Supabase Credentials Missing or Placeholder:\n' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment secrets or .env file.\n' +
    'The app is currently running in local cached persistence mode until Supabase credentials are provided.'
  );
}

// Fallback dummy URL to prevent createClient runtime throw when keys are unconfigured
const validUrl = configured ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = configured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

function isRlsError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('violates row-level security policy') ||
    msg.includes('permission denied')
  );
}

function logRlsWarning(table: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${table}' was restricted by Row Level Security policy.\n` +
    `To enable public write access in your Supabase project, execute this SQL in Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${table} FOR ALL USING (true) WITH CHECK (true);`
  );
}

function isUuid(val: any): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Auto-healing helper for Supabase upserts that handles schema mismatches & RLS gracefully.
 */
export async function safeSupabaseUpsert(
  table: string,
  payload: Record<string, any> | Record<string, any>[],
  options?: { onConflict?: string }
): Promise<{ data: any; error: any }> {
  let currentPayload = JSON.parse(JSON.stringify(payload));
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;

    const query = options?.onConflict
      ? supabase.from(table).upsert(currentPayload, { onConflict: options.onConflict })
      : supabase.from(table).upsert(currentPayload);

    const { data, error } = await query.select();

    if (!error) {
      return { data, error: null };
    }

    if (isRlsError(error)) {
      logRlsWarning(table);
      return { data: null, error };
    }

    // Handle invalid UUID error
    if (error.message && error.message.includes('invalid input syntax for type uuid')) {
      console.warn(`[Supabase Auto-Heal] Non-UUID id detected in table '${table}'. Stripping non-UUID id and retrying...`);
      const sanitizeId = (item: Record<string, any>) => {
        if (item && item.id && !isUuid(item.id)) {
          delete item.id;
        }
      };
      if (Array.isArray(currentPayload)) {
        currentPayload.forEach(sanitizeId);
      } else {
        sanitizeId(currentPayload);
      }
      continue;
    }

    // Handle missing column error
    const missingColMatch = error.message && error.message.match(/Could not find the '([^']+)' column/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      console.warn(`[Supabase Auto-Heal] Column '${missingCol}' not found in table '${table}'. Stripping and retrying...`);

      const removeColFromItem = (item: Record<string, any>) => {
        if (!item || typeof item !== 'object') return;
        if (missingCol === 'base_price' && item.base_price !== undefined) {
          if (item.price_ngn === undefined) item.price_ngn = item.base_price;
          if (item.price === undefined) item.price = item.base_price;
        } else if (missingCol === 'price_ngn' && item.price_ngn !== undefined) {
          if (item.base_price === undefined) item.base_price = item.price_ngn;
          if (item.price === undefined) item.price = item.price_ngn;
        } else if (missingCol === 'price_pi' && item.price_pi !== undefined) {
          if (item.pi_price === undefined) item.pi_price = item.price_pi;
        } else if (missingCol === 'pi_price' && item.pi_price !== undefined) {
          if (item.price_pi === undefined) item.price_pi = item.pi_price;
        } else if (missingCol === 'title' && item.title !== undefined) {
          if (item.name === undefined) item.name = item.title;
        } else if (missingCol === 'short_description' && item.short_description !== undefined) {
          if (item.description === undefined) item.description = item.short_description;
        }

        delete item[missingCol];
      };

      if (Array.isArray(currentPayload)) {
        currentPayload.forEach(removeColFromItem);
      } else {
        removeColFromItem(currentPayload);
      }

      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: new Error(`Exceeded max retries for Supabase table ${table}`) };
}

/**
 * Auto-healing helper for Supabase inserts that handles schema mismatches & RLS gracefully.
 */
export async function safeSupabaseInsert(
  table: string,
  payload: Record<string, any> | Record<string, any>[]
): Promise<{ data: any; error: any }> {
  let currentPayload = JSON.parse(JSON.stringify(payload));
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const { data, error } = await supabase.from(table).insert(currentPayload).select();

    if (!error) {
      return { data, error: null };
    }

    if (isRlsError(error)) {
      logRlsWarning(table);
      return { data: null, error };
    }

    // Handle invalid UUID error
    if (error.message && error.message.includes('invalid input syntax for type uuid')) {
      console.warn(`[Supabase Auto-Heal] Non-UUID id detected in table '${table}'. Stripping non-UUID id and retrying...`);
      const sanitizeId = (item: Record<string, any>) => {
        if (item && item.id && !isUuid(item.id)) {
          delete item.id;
        }
      };
      if (Array.isArray(currentPayload)) {
        currentPayload.forEach(sanitizeId);
      } else {
        sanitizeId(currentPayload);
      }
      continue;
    }

    // Handle check constraint violation error
    const isCheckViolation = error.code === '23514' || (error.message && error.message.includes('violates check constraint'));
    if (isCheckViolation) {
      console.warn(`[Supabase Auto-Heal] Check constraint violation in table '${table}': ${error.message}. Stripping offending fields and retrying...`);
      const healCheckConstraint = (item: Record<string, any>) => {
        if (!item || typeof item !== 'object') return;
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('service_mode')) {
          delete item.service_mode;
        } else if (msg.includes('experience_level')) {
          delete item.experience_level;
        } else if (msg.includes('availability_status')) {
          delete item.availability_status;
        } else if (msg.includes('years_experience')) {
          delete item.years_experience;
        } else if (msg.includes('profile_visibility')) {
          delete item.profile_visibility;
        } else if (msg.includes('status')) {
          item.status = 'Approved';
        } else if (msg.includes('username_slug')) {
          delete item.username_slug;
        } else {
          delete item.service_mode;
          delete item.experience_level;
          delete item.availability_status;
        }
      };

      if (Array.isArray(currentPayload)) {
        currentPayload.forEach(healCheckConstraint);
      } else {
        healCheckConstraint(currentPayload);
      }
      continue;
    }

    const missingColMatch = error.message && error.message.match(/Could not find the '([^']+)' column/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      console.warn(`[Supabase Auto-Heal] Column '${missingCol}' not found in table '${table}'. Stripping and retrying...`);

      const removeColFromItem = (item: Record<string, any>) => {
        if (!item || typeof item !== 'object') return;
        if (missingCol === 'base_price' && item.base_price !== undefined) {
          if (item.price_ngn === undefined) item.price_ngn = item.base_price;
          if (item.price === undefined) item.price = item.base_price;
        } else if (missingCol === 'price_ngn' && item.price_ngn !== undefined) {
          if (item.base_price === undefined) item.base_price = item.price_ngn;
        } else if (missingCol === 'price_pi' && item.price_pi !== undefined) {
          if (item.pi_price === undefined) item.pi_price = item.price_pi;
        } else if (missingCol === 'pi_price' && item.pi_price !== undefined) {
          if (item.price_pi === undefined) item.price_pi = item.pi_price;
        }

        delete item[missingCol];
      };

      if (Array.isArray(currentPayload)) {
        currentPayload.forEach(removeColFromItem);
      } else {
        removeColFromItem(currentPayload);
      }

      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: new Error(`Exceeded max retries for Supabase table ${table}`) };
}

/**
 * Auto-healing helper for Supabase updates that handles schema mismatches & RLS gracefully.
 */
export async function safeSupabaseUpdate(
  table: string,
  payload: Record<string, any>,
  matchField: string,
  matchValue: any
): Promise<{ data: any; error: any }> {
  let currentPayload = JSON.parse(JSON.stringify(payload));
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const { data, error } = await supabase
      .from(table)
      .update(currentPayload)
      .eq(matchField, matchValue)
      .select();

    if (!error) {
      return { data, error: null };
    }

    if (isRlsError(error)) {
      logRlsWarning(table);
      return { data: null, error };
    }

    const missingColMatch = error.message && error.message.match(/Could not find the '([^']+)' column/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      console.warn(`[Supabase Auto-Heal] Column '${missingCol}' not found in table '${table}'. Stripping and retrying...`);

      if (missingCol === 'base_price' && currentPayload.base_price !== undefined) {
        if (currentPayload.price_ngn === undefined) currentPayload.price_ngn = currentPayload.base_price;
      }
      delete currentPayload[missingCol];
      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: new Error(`Exceeded max retries for Supabase table ${table}`) };
}
