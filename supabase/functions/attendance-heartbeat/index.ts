import { corsResponse, getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient, SETTINGS_ID } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  try {
    const body = await req.json();
    const { name, email, branch, branch_id, stream_session_id, stream_title,
      attendance_type, age_category, family_surname,
      family_adult_count, family_young_adult_count, family_youth_count, family_children_count } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.length > 200) return err('Invalid name', req);
    if (!email || typeof email !== 'string' || email.length > 200) return err('Invalid email', req);
    if (!branch || typeof branch !== 'string') return err('Invalid branch', req);
    if (!branch_id || typeof branch_id !== 'string') return err('Invalid branch_id', req);
    if (!stream_session_id || typeof stream_session_id !== 'string') return err('Invalid stream_session_id', req);
    if (!stream_title || typeof stream_title !== 'string') return err('Invalid stream_title', req);

    const sb = getServiceClient();
    const now = new Date().toISOString();
    const { data: settings } = await sb.from('stream_settings')
      .select('youtube_url, stream_title, is_attendance_active')
      .eq('id', SETTINGS_ID)
      .single();
    const activeStreamTitle = settings?.stream_title || stream_title;

    // Check if record exists
    const { data: existing } = await sb.from('attendance_records')
      .select('id, start_time, duration_seconds')
      .eq('email', email)
      .eq('stream_session_id', stream_session_id)
      .eq('branch', branch)
      .eq('is_archived', false)
      .maybeSingle();

    if (existing) {
      const startTime = new Date(existing.start_time).getTime();
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      await sb.from('attendance_records')
        .update({ last_seen_at: now, duration_seconds: durationSeconds, stream_title: activeStreamTitle })
        .eq('id', existing.id);
      return json({
        status: 'updated',
        id: existing.id,
        stream: {
          youtube_url: settings?.youtube_url || '',
          stream_title: activeStreamTitle,
          is_attendance_active: settings?.is_attendance_active ?? false,
        },
      }, 200, req);
    } else {
      const { data, error } = await sb.from('attendance_records').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        branch,
        branch_id,
        stream_session_id,
        stream_title: activeStreamTitle,
        start_time: now,
        last_seen_at: now,
        duration_seconds: 0,
        attendance_type: attendance_type || 'Single',
        age_category: age_category || null,
        family_surname: family_surname || null,
        family_adult_count: family_adult_count || null,
        family_young_adult_count: family_young_adult_count || null,
        family_youth_count: family_youth_count || null,
        family_children_count: family_children_count || null,
      }).select('id').single();
      if (error) return json({ error: error.message }, 500, req);
      return json({
        status: 'created',
        id: data.id,
        stream: {
          youtube_url: settings?.youtube_url || '',
          stream_title: activeStreamTitle,
          is_attendance_active: settings?.is_attendance_active ?? false,
        },
      }, 200, req);
    }
  } catch (e) {
    return json({ error: 'Server error' }, 500, req);
  }
});

function err(msg: string, req: Request) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function json(data: unknown, status = 200, req: Request) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
