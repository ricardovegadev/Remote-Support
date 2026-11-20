import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function normalizeEnvValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  const prefixMatch = trimmed.match(/^[A-Z0-9_]+=(.+)$/);
  return (prefixMatch ? prefixMatch[1] : trimmed).trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
const supabaseAnonKey = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
);

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('YOUR_PROJECT_ID') &&
      !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );
}

let cachedClient: SupabaseClient | null = null;

/**
 * Singleton browser client for Supabase Auth, PostgREST, and Realtime.
 * Returns null when env vars are not yet configured so local state fallback stays active.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient && supabaseUrl && supabaseAnonKey) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedClient;
}

/**
 * Creates a room-scoped Supabase client passing `x-ticket-code` and `x-ticket-token`
 * headers so anonymous clients pass RLS strictly for their own ticket & messages.
 */
export function getRoomScopedSupabaseClient(
  ticketCode: string,
  sessionToken: string
): SupabaseClient | null {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-ticket-code': ticketCode,
        'x-ticket-token': sessionToken,
      },
    },
  });
}
