import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export const SETTINGS_ID = '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b';
