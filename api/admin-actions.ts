import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { applyCors, handleOptions } from './_shared/cors';
import { requireSession } from './_shared/authz';
import { getServiceClient, sendRealtimeBroadcast } from './_shared/supabase';
import { runYoutubeLiveCheck } from './_shared/youtube';
import { hashPassword, verifyPassword } from './_shared/password';

const SETTINGS_ID = '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b';
const DEFAULT_MANUAL_STREAM_TITLE = 'Deeper Life Bible Church';

async function fetchYouTubeTitle(url: string) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.title === 'string' ? data.title : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let session;
  try {
    session = requireSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (session.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });

  const sb = getServiceClient();
  const { action, ...params } = (req.body || {}) as Record<string, any>;

  try {
    switch (action) {
      case 'get_settings': {
        const { data, error } = await sb.from('stream_settings').select('*').eq('id', SETTINGS_ID).single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ settings: data });
      }
      case 'update_settings': {
        const nextSettings = { ...(params.settings || {}) } as Record<string, unknown>;
        const manualUrl = typeof nextSettings.youtube_url === 'string' ? nextSettings.youtube_url.trim() : '';

        if (manualUrl) {
          const title = await fetchYouTubeTitle(manualUrl);
          nextSettings.stream_title = title || DEFAULT_MANUAL_STREAM_TITLE;
        } else if (nextSettings.youtube_url === '') {
          nextSettings.stream_title = null;
        }

        const { data, error } = await sb.from('stream_settings')
          .update({ ...nextSettings, updated_at: new Date().toISOString() })
          .eq('id', SETTINGS_ID).select().single();
        if (error) return res.status(400).json({ error: error.message });

        await Promise.all([
          sendRealtimeBroadcast({ topic: 'admin:workspace', event: 'workspace_updated', payload: { action: 'update_settings' } }),
          sendRealtimeBroadcast({ topic: 'stream:global', event: 'stream_updated', payload: { action: 'update_settings' } }),
        ]);
        return res.status(200).json({ settings: data });
      }
      case 'update_admin_password': {
        const nextPassword = typeof params.new_password === 'string' ? params.new_password : '';
        if (!nextPassword || nextPassword.length < 10) {
          return res.status(400).json({ error: 'Password must be at least 10 characters.' });
        }

        const { data: settings, error: settingsError } = await sb
          .from('stream_settings')
          .select('admin_password_salt, admin_password_hash')
          .eq('id', SETTINGS_ID)
          .single();
        if (settingsError) return res.status(400).json({ error: settingsError.message });

        const currentSalt = (settings as any)?.admin_password_salt as string | null | undefined;
        const currentHash = (settings as any)?.admin_password_hash as string | null | undefined;

        // If a password already exists, require current_password to rotate it.
        if (currentSalt && currentHash) {
          const currentPassword = typeof params.current_password === 'string' ? params.current_password : '';
          if (!currentPassword) return res.status(400).json({ error: 'Current password is required.' });
          const ok = verifyPassword(currentPassword, { salt: currentSalt, hash: currentHash });
          if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const record = hashPassword(nextPassword);
        const { error: updateError } = await sb.from('stream_settings').update({
          admin_password_salt: record.salt,
          admin_password_hash: record.hash,
          updated_at: new Date().toISOString(),
        }).eq('id', SETTINGS_ID);
        if (updateError) return res.status(400).json({ error: updateError.message });

        return res.status(200).json({ success: true });
      }
      case 'start_attendance': {
        const { data, error } = await sb.from('stream_settings')
          .update({ is_attendance_active: true, attendance_auto_stop_at: params.auto_stop_at || null, updated_at: new Date().toISOString() })
          .eq('id', SETTINGS_ID).select().single();
        if (error) return res.status(400).json({ error: error.message });
        await Promise.all([
          sendRealtimeBroadcast({ topic: 'admin:attendance', event: 'attendance_changed', payload: { action: 'start_attendance' } }),
          sendRealtimeBroadcast({ topic: 'stream:global', event: 'stream_updated', payload: { action: 'start_attendance' } }),
        ]);
        return res.status(200).json({ settings: data });
      }
      case 'stop_attendance': {
        const { data, error } = await sb.from('stream_settings')
          .update({ is_attendance_active: false, attendance_auto_stop_at: null, updated_at: new Date().toISOString() })
          .eq('id', SETTINGS_ID).select().single();
        if (error) return res.status(400).json({ error: error.message });
        await Promise.all([
          sendRealtimeBroadcast({ topic: 'admin:attendance', event: 'attendance_changed', payload: { action: 'stop_attendance' } }),
          sendRealtimeBroadcast({ topic: 'stream:global', event: 'stream_updated', payload: { action: 'stop_attendance' } }),
        ]);
        return res.status(200).json({ settings: data });
      }
      case 'get_branches': {
        const [{ data: branches, error: branchError }, { data: records, error: recordError }, { data: staff, error: staffError }] = await Promise.all([
          sb.from('branches').select('*').order('name'),
          sb.from('attendance_records').select('branch_id'),
          sb.from('attendance_staff').select('branch_id'),
        ]);
        if (branchError || recordError || staffError) {
          return res.status(400).json({ error: branchError?.message || recordError?.message || staffError?.message || 'Unable to load branches' });
        }

        const attendanceByBranch = new Map<string, number>();
        for (const record of (records || []) as Array<{ branch_id: string }>) {
          attendanceByBranch.set(record.branch_id, (attendanceByBranch.get(record.branch_id) || 0) + 1);
        }
        const staffByBranch = new Map<string, number>();
        for (const member of (staff || []) as Array<{ branch_id: string }>) {
          staffByBranch.set(member.branch_id, (staffByBranch.get(member.branch_id) || 0) + 1);
        }

        return res.status(200).json({
          branches: (branches || []).map((branch: any) => ({
            ...branch,
            attendance_count: attendanceByBranch.get(branch.id) || 0,
            staff_count: staffByBranch.get(branch.id) || 0,
          })),
        });
      }
      case 'create_branch': {
        const { data, error } = await sb.from('branches').insert({ name: params.name }).select().single();
        if (error) return res.status(400).json({ error: error.message });
        await sendRealtimeBroadcast({ topic: 'admin:workspace', event: 'workspace_updated', payload: { action: 'create_branch', branch_id: data.id } });
        return res.status(200).json({ branch: data });
      }
      case 'delete_branch': {
        const { count: recordCount, error: recordError } = await sb.from('attendance_records').select('id', { count: 'exact', head: true }).eq('branch_id', params.id);
        const { count: staffCount, error: staffError } = await sb.from('attendance_staff').select('id', { count: 'exact', head: true }).eq('branch_id', params.id);
        if (recordError) return res.status(400).json({ error: recordError.message });
        if (staffError) return res.status(400).json({ error: staffError.message });
        if ((recordCount || 0) > 0) return res.status(400).json({ error: 'This branch cannot be deleted because it already has attendance records. Delete the history first or keep the branch for reporting.' });
        if ((staffCount || 0) > 0) return res.status(400).json({ error: 'This branch cannot be deleted because staff accounts are still assigned to it. Reassign or merge the branch first.' });

        const { error } = await sb.from('branches').delete().eq('id', params.id);
        if (error) return res.status(400).json({ error: error.message });
        await sendRealtimeBroadcast({ topic: 'admin:workspace', event: 'workspace_updated', payload: { action: 'delete_branch', branch_id: params.id } });
        return res.status(200).json({ success: true });
      }
      case 'merge_branch': {
        if (!params.source_branch_id || !params.target_branch_id) return res.status(400).json({ error: 'Source and target branches are required.' });
        if (params.source_branch_id === params.target_branch_id) return res.status(400).json({ error: 'Source and target branches must be different.' });

        const { data: sourceBranch } = await sb.from('branches').select('id, name').eq('id', params.source_branch_id).single();
        const { data: targetBranch } = await sb.from('branches').select('id, name').eq('id', params.target_branch_id).single();
        if (!sourceBranch || !targetBranch) return res.status(404).json({ error: 'One or both branches could not be found.' });

        const { data: sourceActiveRecords, error: sourceActiveError } = await sb
          .from('attendance_records')
          .select('id, email, stream_title, last_seen_at')
          .eq('branch_id', sourceBranch.id)
          .eq('is_archived', false);
        if (sourceActiveError) return res.status(400).json({ error: sourceActiveError.message });

        const { data: targetActiveRecords, error: targetActiveError } = await sb
          .from('attendance_records')
          .select('id, email, stream_title')
          .eq('branch_id', targetBranch.id)
          .eq('is_archived', false);
        if (targetActiveError) return res.status(400).json({ error: targetActiveError.message });

        const targetActiveKeys = new Set((targetActiveRecords || []).map((record: any) => `${record.email}::${record.stream_title}`));
        const conflictingSourceIds = (sourceActiveRecords || [])
          .filter((record: any) => targetActiveKeys.has(`${record.email}::${record.stream_title}`))
          .map((record: any) => record.id);

        if (conflictingSourceIds.length > 0) {
          const { error: archiveConflictError } = await sb.from('attendance_records')
            .update({ is_archived: true, end_time: new Date().toISOString() })
            .in('id', conflictingSourceIds);
          if (archiveConflictError) return res.status(400).json({ error: archiveConflictError.message });
        }

        const { error: updateRecordsError } = await sb.from('attendance_records')
          .update({ branch_id: targetBranch.id, branch: targetBranch.name })
          .eq('branch_id', sourceBranch.id);
        if (updateRecordsError) return res.status(400).json({ error: updateRecordsError.message });

        const { error: updateStaffError } = await sb.from('attendance_staff')
          .update({ branch_id: targetBranch.id })
          .eq('branch_id', sourceBranch.id);
        if (updateStaffError) return res.status(400).json({ error: updateStaffError.message });

        const { error: deleteError } = await sb.from('branches').delete().eq('id', sourceBranch.id);
        if (deleteError) return res.status(400).json({ error: deleteError.message });

        await Promise.all([
          sendRealtimeBroadcast({ topic: 'admin:workspace', event: 'workspace_updated', payload: { action: 'merge_branch', source_branch_id: sourceBranch.id, target_branch_id: targetBranch.id } }),
          sendRealtimeBroadcast({ topic: 'admin:attendance', event: 'attendance_changed', payload: { action: 'merge_branch', source_branch_id: sourceBranch.id, target_branch_id: targetBranch.id } }),
        ]);

        return res.status(200).json({ success: true, merged_from: sourceBranch.name, merged_into: targetBranch.name });
      }
      case 'create_staff': {
        const hashHex = crypto.createHash('sha256').update(String(params.password || ''), 'utf8').digest('hex');
        const { data, error } = await sb.from('attendance_staff')
          .insert({ branch_id: params.branch_id, password_hash: hashHex })
          .select('id, branch_id, created_at')
          .single();
        if (error) return res.status(400).json({ error: error.message });
        await sendRealtimeBroadcast({ topic: 'admin:workspace', event: 'workspace_updated', payload: { action: 'create_staff', branch_id: params.branch_id, staff_id: data.id } });
        return res.status(200).json({ staff: data });
      }
      case 'delete_staff': {
        const { error } = await sb.from('attendance_staff').delete().eq('id', params.id);
        if (error) return res.status(400).json({ error: error.message });
        await sendRealtimeBroadcast({ topic: 'admin:workspace', event: 'workspace_updated', payload: { action: 'delete_staff', staff_id: params.id } });
        return res.status(200).json({ success: true });
      }
      case 'get_staff': {
        const { data, error } = await sb.from('attendance_staff').select('id, branch_id, created_at');
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ staff: data });
      }
      case 'check_live_now': {
        const result = await runYoutubeLiveCheck(true);
        return res.status(result.status).json(result.data);
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
