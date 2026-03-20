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
        const [{ data: branches, error: branchError }, { data: records, error: recordError }, { data: staff, error: staffError }] = await Promise.all([
          sb.from('branches').select('*').order('name'),
          sb.from('attendance_records').select('branch_id'),
          sb.from('attendance_staff').select('branch_id'),
        ]);
        if (branchError || recordError || staffError) {
          return json({ error: branchError?.message || recordError?.message || staffError?.message || 'Unable to load branches' }, 400, req);
        }

        const attendanceByBranch = new Map<string, number>();
        for (const record of records || []) {
          attendanceByBranch.set(record.branch_id, (attendanceByBranch.get(record.branch_id) || 0) + 1);
        }

        const staffByBranch = new Map<string, number>();
        for (const member of staff || []) {
          staffByBranch.set(member.branch_id, (staffByBranch.get(member.branch_id) || 0) + 1);
        }

        return json({
          branches: (branches || []).map((branch) => ({
            ...branch,
            attendance_count: attendanceByBranch.get(branch.id) || 0,
            staff_count: staffByBranch.get(branch.id) || 0,
          })),
        }, 200, req);
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
        const { count: staffCount, error: staffError } = await sb
          .from('attendance_staff')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', params.id);

        if (recordError) return json({ error: recordError.message }, 400, req);
        if (staffError) return json({ error: staffError.message }, 400, req);
        if ((recordCount || 0) > 0) {
          return json({
            error: 'This branch cannot be deleted because it already has attendance records. Delete the history first or keep the branch for reporting.',
          }, 400, req);
        }
        if ((staffCount || 0) > 0) {
          return json({
            error: 'This branch cannot be deleted because staff accounts are still assigned to it. Reassign or merge the branch first.',
          }, 400, req);
        }

        const { error } = await sb.from('branches').delete().eq('id', params.id);
        if (error) return json({ error: error.message }, 400, req);
        return json({ success: true }, 200, req);
      }
      case 'merge_branch': {
        if (!params.source_branch_id || !params.target_branch_id) {
          return json({ error: 'Source and target branches are required.' }, 400, req);
        }
        if (params.source_branch_id === params.target_branch_id) {
          return json({ error: 'Source and target branches must be different.' }, 400, req);
        }

        const { data: sourceBranch } = await sb.from('branches').select('id, name').eq('id', params.source_branch_id).single();
        const { data: targetBranch } = await sb.from('branches').select('id, name').eq('id', params.target_branch_id).single();

        if (!sourceBranch || !targetBranch) {
          return json({ error: 'One or both branches could not be found.' }, 404, req);
        }

        const { data: sourceActiveRecords, error: sourceActiveError } = await sb
          .from('attendance_records')
          .select('id, email, stream_title, last_seen_at')
          .eq('branch_id', sourceBranch.id)
          .eq('is_archived', false);
        if (sourceActiveError) return json({ error: sourceActiveError.message }, 400, req);

        const { data: targetActiveRecords, error: targetActiveError } = await sb
          .from('attendance_records')
          .select('id, email, stream_title')
          .eq('branch_id', targetBranch.id)
          .eq('is_archived', false);
        if (targetActiveError) return json({ error: targetActiveError.message }, 400, req);

        const targetActiveKeys = new Set(
          (targetActiveRecords || []).map((record) => `${record.email}::${record.stream_title}`),
        );
        const conflictingSourceIds = (sourceActiveRecords || [])
          .filter((record) => targetActiveKeys.has(`${record.email}::${record.stream_title}`))
          .map((record) => record.id);

        if (conflictingSourceIds.length > 0) {
          const { error: archiveConflictError } = await sb
            .from('attendance_records')
            .update({ is_archived: true, end_time: new Date().toISOString() })
            .in('id', conflictingSourceIds);
          if (archiveConflictError) return json({ error: archiveConflictError.message }, 400, req);
        }

        const { error: updateRecordsError } = await sb
          .from('attendance_records')
          .update({ branch_id: targetBranch.id, branch: targetBranch.name })
          .eq('branch_id', sourceBranch.id);
        if (updateRecordsError) return json({ error: updateRecordsError.message }, 400, req);

        const { error: updateStaffError } = await sb
          .from('attendance_staff')
          .update({ branch_id: targetBranch.id })
          .eq('branch_id', sourceBranch.id);
        if (updateStaffError) return json({ error: updateStaffError.message }, 400, req);

        const { error: deleteError } = await sb.from('branches').delete().eq('id', sourceBranch.id);
        if (deleteError) return json({ error: deleteError.message }, 400, req);

        return json({
          success: true,
          merged_from: sourceBranch.name,
          merged_into: targetBranch.name,
        }, 200, req);
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
