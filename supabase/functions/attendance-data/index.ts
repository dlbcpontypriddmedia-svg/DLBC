import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { verifyJwt, getCookie } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const sessionSecret = Deno.env.get('SESSION_SECRET')!;
  const token = getCookie(req, 'dlbc_session');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const payload = await verifyJwt(token, sessionSecret);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  const sb = getServiceClient();
  const url = new URL(req.url);
  const stream_title = url.searchParams.get('stream_title');
  const date_from = url.searchParams.get('date_from');
  const date_to = url.searchParams.get('date_to');
  const archived = url.searchParams.get('archived') === 'true';

  let query = sb.from('attendance_records').select('*').eq('is_archived', archived);

  if (payload.role === 'staff' && payload.branch_id) {
    query = query.eq('branch_id', payload.branch_id as string);
  }
  if (stream_title) query = query.eq('stream_title', stream_title);
  if (date_from) query = query.gte('timestamp', date_from);
  if (date_to) query = query.lte('timestamp', date_to);

  query = query.order('timestamp', { ascending: false }).limit(1000);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  // Also get settings for context
  const { data: settings } = await sb.from('stream_settings')
    .select('is_attendance_active, stream_title, youtube_url')
    .eq('id', '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b')
    .single();

  // Get distinct stream titles for filter dropdown
  const titles = [...new Set((data || []).map(r => r.stream_title))];

  return json({ records: data, settings, titles, role: payload.role, branch_id: payload.branch_id });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
