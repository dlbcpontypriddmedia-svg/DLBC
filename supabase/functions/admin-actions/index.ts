import { corsResponse, getCorsHeaders } from '../_shared/cors.ts';
import { verifyJwt, getSessionToken } from '../_shared/auth.ts';
import { getServiceClient, SETTINGS_ID } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const sessionSecret = Deno.env.get('SESSION_SECRET')!;
  const token = getSessionToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  const payload = await verifyJwt(token, sessionSecret);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  const sb = getServiceClient();
  const { action, ...params } = await req.json();

  try {
    switch (action) {
      case 'get_settings': {
        const { data } = await sb.from('stream_settings').select('*').eq('id', SETTINGS_ID).single();
        return json({ settings: data }, 200, req);
      }
      case 'update_settings': {
        const { data } = await sb.from('stream_settings')
          .update({ ...params.settings, updated_at: new Date().toISOString() })
          .eq('id', SETTINGS_ID).select().single();
        return json({ settings: data }, 200, req);
      }
      case 'start_attendance': {
        const { data } = await sb.from('stream_settings')
          .update({
            is_attendance_active: true,
            attendance_auto_stop_at: params.auto_stop_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', SETTINGS_ID).select().single();
        return json({ settings: data }, 200, req);
      }
      case 'stop_attendance': {
        const { data } = await sb.from('stream_settings')
          .update({
            is_attendance_active: false,
            attendance_auto_stop_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', SETTINGS_ID).select().single();
        return json({ settings: data }, 200, req);
      }
      case 'get_branches': {
        const { data } = await sb.from('branches').select('*').order('name');
        return json({ branches: data }, 200, req);
      }
      case 'create_branch': {
        const { data, error } = await sb.from('branches').insert({ name: params.name }).select().single();
        if (error) return json({ error: error.message }, 400, req);
        return json({ branch: data }, 200, req);
      }
      case 'delete_branch': {
        const { count: recordCount, error: recordError } = await sb
          .from('attendance_records')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', params.id);

        if (recordError) return json({ error: recordError.message }, 400, req);
        if ((recordCount || 0) > 0) {
          return json({
            error: 'This branch cannot be deleted because it already has attendance records. Delete the history first or keep the branch for reporting.',
          }, 400, req);
        }

        const { error } = await sb.from('branches').delete().eq('id', params.id);
        if (error) return json({ error: error.message }, 400, req);
        return json({ success: true }, 200, req);
      }
      case 'create_staff': {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(params.password));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const { data, error } = await sb.from('attendance_staff')
          .insert({ branch_id: params.branch_id, password_hash: hashHex })
          .select('id, branch_id, created_at')
          .single();
        if (error) return json({ error: error.message }, 400, req);
        return json({ staff: data }, 200, req);
      }
      case 'delete_staff': {
        const { error } = await sb.from('attendance_staff').delete().eq('id', params.id);
        if (error) return json({ error: error.message }, 400, req);
        return json({ success: true }, 200, req);
      }
      case 'get_staff': {
        const { data } = await sb.from('attendance_staff').select('id, branch_id, created_at');
        return json({ staff: data }, 200, req);
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
        return json(result, 200, req);
      }
      default:
        return json({ error: 'Unknown action' }, 400, req);
    }
  } catch (e) {
    return json({ error: e.message }, 500, req);
  }
});

function json(data: unknown, status = 200, req: Request) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
