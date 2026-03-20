import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const sb = getServiceClient();
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const url = new URL(req.url);
  const branch_id = url.searchParams.get('branch_id');

  let query = sb.from('attendance_records')
    .select('id', { count: 'exact', head: true })
    .gte('last_seen_at', twoMinAgo)
    .eq('is_archived', false);

  if (branch_id) query = query.eq('branch_id', branch_id);

  const { count, error } = await query;

  return new Response(JSON.stringify({ count: count || 0 }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
