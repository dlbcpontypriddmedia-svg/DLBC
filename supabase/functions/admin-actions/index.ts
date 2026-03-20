import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { verifyJwt, getCookie } from '../_shared/auth.ts';
import { getServiceClient, SETTINGS_ID } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const sessionSecret = Deno.env.get('SESSION_SECRET')!;
  const token = getCookie(req, 'dlbc_session');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payload = await verifyJwt(token, sessionSecret);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sb = getServiceClient();
  const { action, ...params } = await req.json();

  try {
    switch (action) {
      case 'get_settings': {
        const { data } = await sb.from('stream_settings').select('*').eq('id', SETTINGS_ID).single();
        return json({ settings: data });
      }
      case 'update_settings': {
        const { data } = await sb.from('stream_settings')
          .update({ ...params.settings, updated_at: new Date().toISOString() })
          .eq('id', SETTINGS_ID).select().single();
        return json({ settings: data });
      }
      case 'start_attendance': {
        const { data } = await sb.from('stream_settings')
          .update({
            is_attendance_active: true,
            attendance_auto_stop_at: params.auto_stop_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', SETTINGS_ID).select().single();
        return json({ settings: data });
      }
      case 'stop_attendance': {
        const { data } = await sb.from('stream_settings')
          .update({
            is_attendance_active: false,
            attendance_auto_stop_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', SETTINGS_ID).select().single();
        return json({ settings: data });
      }
      case 'get_branches': {
        const { data } = await sb.from('branches').select('*').order('name');
        return json({ branches: data });
      }
      case 'create_branch': {
        const { data, error } = await sb.from('branches').insert({ name: params.name }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ branch: data });
      }
      case 'delete_branch': {
        const { error } = await sb.from('branches').delete().eq('id', params.id);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }
      case 'create_staff': {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(params.password));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const { data, error } = await sb.from('attendance_staff')
          .insert({ branch_id: params.branch_id, password_hash: hashHex }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ staff: data });
      }
      case 'delete_staff': {
        const { error } = await sb.from('attendance_staff').delete().eq('id', params.id);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }
      case 'get_staff': {
        const { data } = await sb.from('attendance_staff').select('id, branch_id, created_at');
        return json({ staff: data });
      }
      case 'check_live_now': {
        // Trigger the check-youtube-live function
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const res = await fetch(`${supabaseUrl}/functions/v1/check-youtube-live`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        });
        const result = await res.json();
        return json(result);
      }
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
