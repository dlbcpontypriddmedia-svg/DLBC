import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors.js';
import { getServiceClient } from './_shared/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const branch_id = typeof req.query.branch_id === 'string' ? req.query.branch_id : undefined;
  const includeMembers = req.query.include_members === 'true';

  const sb = getServiceClient();
  let query = sb.from('attendance_records')
    .select(includeMembers ? 'id, display_name:name, branch_id, stream_session_id, last_seen_at' : 'branch_id, stream_session_id, last_seen_at')
    .eq('is_archived', false);

  if (branch_id) query = query.eq('branch_id', branch_id);

  // Active viewers are those seen in last 2 minutes
  const activeCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  query = query.gte('last_seen_at', activeCutoff);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const records = data || [];
  const viewersByBranch: Record<string, number> = {};
  for (const row of records as Array<{ branch_id: string }>) {
    viewersByBranch[row.branch_id] = (viewersByBranch[row.branch_id] || 0) + 1;
  }

  return res.status(200).json({
    active_viewers: viewersByBranch,
    members: includeMembers ? records : undefined,
  });
}
