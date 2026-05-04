import { createClient } from '@supabase/supabase-js';
import { requiredEnv } from './env.js';

export function getServiceClient() {
  const url = requiredEnv('PROJECT_URL');
  const key = requiredEnv('SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sendRealtimeBroadcast(message: {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
}) {
  const url = requiredEnv('PROJECT_URL');
  const key = requiredEnv('SERVICE_ROLE_KEY');
  try {
    await fetch(`${url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{ topic: message.topic, event: message.event, payload: message.payload, private: false }],
      }),
    });
  } catch {
    // best-effort
  }
}
