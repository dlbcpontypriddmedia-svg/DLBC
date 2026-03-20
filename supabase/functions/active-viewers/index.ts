import { corsResponse, getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const sb = getServiceClient();
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const url = new URL(req.url);
  const branch_id = url.searchParams.get('branch_id');
  const includeMembers = url.searchParams.get('include_members') === 'true';

  if (includeMembers && !branch_id) {
    return new Response(JSON.stringify({ error: 'branch_id is required when include_members is true' }), {
      status: 400,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  const baseQuery = sb.from('attendance_records')
    .gte('last_seen_at', twoMinAgo)
    .eq('is_archived', false);

  if (includeMembers) {
    const { data, error } = await baseQuery
      .select('id, stream_session_id, name, family_surname, attendance_type, branch_id')
      .eq('branch_id', branch_id)
      .order('last_seen_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const members = (data || []).map((record) => ({
      id: record.id,
      stream_session_id: record.stream_session_id,
      display_name: record.family_surname || record.name || (record.attendance_type === 'Family' ? 'Family' : 'Viewer'),
      branch_id: record.branch_id,
    }));

    return new Response(JSON.stringify({ count: members.length, members }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  let query = baseQuery.select('id', { count: 'exact', head: true });

  if (branch_id) query = query.eq('branch_id', branch_id);

  const { count, error } = await query;

  return new Response(JSON.stringify({ count: count || 0, error: error?.message }), {
    status: 200,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
});
