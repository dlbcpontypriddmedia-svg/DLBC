function env(name: string): string | undefined {
  const value = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const SUPABASE_URL = env('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = env('VITE_SUPABASE_ANON_KEY') ?? env('VITE_SUPABASE_PUBLISHABLE_KEY');
export const SUPABASE_PROJECT_ID = env('VITE_SUPABASE_PROJECT_ID');
export const API_BASE_URL = env('VITE_API_BASE_URL');

export function getSupabaseFunctionsBaseUrl(): string {
  // In dev, call Supabase Edge Functions directly (no Vercel proxy needed).
  if (import.meta.env.DEV && SUPABASE_URL) {
    return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;
  }
  // In production (Vercel), API routes are on the same origin.
  const base = `${(API_BASE_URL || '').replace(/\/+$/, '')}/api`.replace(/^\/api/, '/api');
  return base;
}

export function isDevDirectMode(): boolean {
  return import.meta.env.DEV && Boolean(SUPABASE_URL);
}
