function env(name: string): string | undefined {
  const value = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const SUPABASE_URL = env('VITE_SUPABASE_URL');
export const SUPABASE_PROJECT_ID = env('VITE_SUPABASE_PROJECT_ID');
export const API_BASE_URL = env('VITE_API_BASE_URL');

export function getSupabaseFunctionsBaseUrl(): string {
  // Standard deployment: privileged API runs on the same origin as the frontend (Vercel serverless routes).
  // You can override for local/multi-origin setups with VITE_API_BASE_URL.
  const base = `${(API_BASE_URL || '').replace(/\/+$/, '')}/api`.replace(/^\/api/, '/api');
  return base;
}
