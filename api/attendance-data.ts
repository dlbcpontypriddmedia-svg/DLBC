import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors.js';
import { requireSession } from './_shared/authz.js';
import { getServiceClient } from './_shared/supabase.js';

const SETTINGS_ID = '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let session;
  try {
    session = requireSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stream_title = typeof req.query.stream_title === 'string' ? req.query.stream_title : undefined;
  const date_from = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
  const date_to = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const archived = req.query.archived === 'true';

  const sb = getServiceClient();
  let query = sb.from('attendance_records').select('*').eq('is_archived', archived);

  if (session.role === 'staff') query = query.eq('branch_id', session.branch_id);
  if (stream_title) query = query.eq('stream_title', stream_title);
  if (date_from) query = query.gte('timestamp', date_from);
  if (date_to) query = query.lte('timestamp', date_to);
  if (q) {
    const term = `%${q}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term},family_surname.ilike.${term}`);
  }

  query = query.order('timestamp', { ascending: false }).limit(1000);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const { data: settings } = await sb.from('stream_settings')
    .select('is_attendance_active, stream_title, youtube_url')
    .eq('id', SETTINGS_ID)
    .single();

  const titles = [...new Set((data || []).map((r: any) => r.stream_title))];
  return res.status(200).json({ records: data, settings, titles, role: session.role, branch_id: session.role === 'staff' ? session.branch_id : undefined });
}
