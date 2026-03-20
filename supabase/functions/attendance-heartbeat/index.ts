import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const body = await req.json();
    const { name, email, branch, branch_id, stream_session_id, stream_title,
      attendance_type, age_category, family_surname,
      family_adult_count, family_young_adult_count, family_youth_count, family_children_count } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.length > 200) return err('Invalid name');
    if (!email || typeof email !== 'string' || email.length > 200) return err('Invalid email');
    if (!branch || typeof branch !== 'string') return err('Invalid branch');
    if (!branch_id || typeof branch_id !== 'string') return err('Invalid branch_id');
    if (!stream_session_id || typeof stream_session_id !== 'string') return err('Invalid stream_session_id');
    if (!stream_title || typeof stream_title !== 'string') return err('Invalid stream_title');

    const sb = getServiceClient();
    const now = new Date().toISOString();

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
        .update({ last_seen_at: now, duration_seconds: durationSeconds })
        .eq('id', existing.id);
      return json({ status: 'updated', id: existing.id });
    } else {
      const { data, error } = await sb.from('attendance_records').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        branch,
        branch_id,
        stream_session_id,
        stream_title,
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
      if (error) return json({ error: error.message }, 500);
      return json({ status: 'created', id: data.id });
    }
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
});

function err(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
