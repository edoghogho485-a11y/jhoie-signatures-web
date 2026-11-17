import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

export const SUPABASE_STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  CUSTOM_REFERENCES: 'custom-references',
} as const;

export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

function readSupabaseUrl(): string {
  try {
    return typeof import.meta.env.VITE_SUPABASE_URL === 'string'
      ? import.meta.env.VITE_SUPABASE_URL.trim()
      : '';
  } catch {
    // Ignore when executed in pure Node test runner without Vite import.meta.env
    return '';
  }
}

function readSupabaseAnonKey(): string {
  try {
    return typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
      ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
      : '';
  } catch {
    // Ignore when executed in pure Node test runner without Vite import.meta.env
    return '';
  }
}

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return (
    trimmed.includes('YOUR_PROJECT_REF') ||
    trimmed.includes('YOUR_SUPABASE_') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  );
}

export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();

  const validUrl =
    !isPlaceholderValue(url) &&
    (url.startsWith('https://') || url.startsWith('http://'));
  const validKey = !isPlaceholderValue(anonKey) && anonKey.length >= 20;

  return {
    url,
    anonKey,
    isConfigured: validUrl && validKey,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvConfig().isConfigured;
}

let cachedClient: SupabaseClient<Database> | null = null;
let cachedSignature = '';

/**
 * Returns a reusable, typed Supabase client when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are configured. Never embeds service_role secrets.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const config = getSupabaseEnvConfig();
  if (!config.isConfigured) {
    return null;
  }

  const signature = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedSignature === signature) {
    return cachedClient;
  }

  cachedClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedSignature = signature;
  return cachedClient;
}

export function requireSupabaseClient(): SupabaseClient<Database> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  return client;
}

export const supabase = getSupabaseClient();
