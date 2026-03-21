import { corsResponse, getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  try {
    const sb = getServiceClient();
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const url = new URL(req.url);
    const branch_id = url.searchParams.get('branch_id');
    const includeMembers = url.searchParams.get('include_members') === 'true';

    if (includeMembers) {
      let query = sb.from('attendance_records')
        .select('id, stream_session_id, name, family_surname, attendance_type, branch_id')
        .gte('last_seen_at', twoMinAgo)
        .eq('is_archived', false)
        .order('last_seen_at', { ascending: false });

      if (branch_id) {
        query = query.eq('branch_id', branch_id);
      }

      const { data, error } = await query;

      if (error) {
        return json({ error: error.message }, 500, req);
      }

      const branchIds = [...new Set((data || []).map((record) => record.branch_id).filter(Boolean))];
      const branchMap = new Map<string, string>();

      if (branchIds.length > 0) {
        const { data: branches, error: branchError } = await sb.from('branches')
          .select('id, name')
          .in('id', branchIds);

        if (branchError) {
          return json({ error: branchError.message }, 500, req);
        }

        for (const branch of branches || []) {
          branchMap.set(branch.id, branch.name);
        }
      }

      const members = (data || []).map((record) => ({
        id: record.id,
        stream_session_id: record.stream_session_id,
        display_name: record.family_surname || record.name || (record.attendance_type === 'Family' ? 'Family' : 'Viewer'),
        branch_id: record.branch_id,
        branch_name: branchMap.get(record.branch_id) || null,
      }));

      return json({ count: members.length, members }, 200, req);
    }

    let query = sb.from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .gte('last_seen_at', twoMinAgo)
      .eq('is_archived', false);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { count, error } = await query;

    if (error) {
      return json({ error: error.message }, 500, req);
    }

    return json({ count: count || 0 }, 200, req);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Server error',
    }, 500, req);
  }
});

function json(data: unknown, status = 200, req: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
