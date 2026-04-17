function env(name: string): string | undefined {
  const value = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const SUPABASE_URL = env('VITE_SUPABASE_URL');
export const SUPABASE_PROJECT_ID = env('VITE_SUPABASE_PROJECT_ID');

export function getSupabaseFunctionsBaseUrl(): string {
  const base = SUPABASE_URL
    ? `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`
    : SUPABASE_PROJECT_ID
      ? `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`
      : undefined;

  if (!base) {
    throw new Error(
      'Missing Supabase config. Set VITE_SUPABASE_URL (preferred) or VITE_SUPABASE_PROJECT_ID in your env.',
    );
  }

  return base;
}

