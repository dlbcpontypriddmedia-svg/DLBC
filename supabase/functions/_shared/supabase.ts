import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getProjectUrl(): string | undefined {
  return Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL');
}

function getServiceRoleKey(): string | undefined {
  return Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

export function getServiceClient() {
  const projectUrl = getProjectUrl();
  const serviceRoleKey = getServiceRoleKey();
  return createClient(
    projectUrl!,
    serviceRoleKey!
  );
}

export const SETTINGS_ID = '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b';
