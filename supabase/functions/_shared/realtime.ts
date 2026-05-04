export async function sendRealtimeBroadcast(message: {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
}) {
  const supabaseUrl = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: message.topic,
            event: message.event,
            payload: message.payload,
            private: false,
          },
        ],
      }),
    });
  } catch {
    // Realtime broadcast failures should not break the primary function flow.
  }
}
