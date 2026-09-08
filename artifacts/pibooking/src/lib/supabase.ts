import { createClient } from '@supabase/supabase-js';
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export function isSupabaseConfigured(): boolean { return Boolean(supabaseUrl && supabaseAnonKey); }
export async function safeSupabaseInsert(table: string, payload: any) { try { return await supabase.from(table).insert(payload).select(); } catch (error) { return { data: null, error: error as any }; } }
export async function safeSupabaseUpdate(table: string, payload: any, key: string, value: string) { try { return await supabase.from(table).update(payload).eq(key, value).select(); } catch (error) { return { data: null, error: error as any }; } }
