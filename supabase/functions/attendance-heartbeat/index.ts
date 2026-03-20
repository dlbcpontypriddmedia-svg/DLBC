import { corsResponse, getCorsHeaders } from '../_shared/cors.ts';
import { sendRealtimeBroadcast } from '../_shared/realtime.ts';
import { getServiceClient, SETTINGS_ID } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  try {
    const body = await req.json();
    const { name, email, branch, branch_id, stream_session_id, stream_title,
      attendance_type, age_category, family_surname,
      family_adult_count, family_young_adult_count, family_youth_count, family_children_count, presence_event } = body;
    const normalizedEmail = email?.trim().toLowerCase();
    const isLeaving = presence_event === 'leave';
    const displayName = family_surname || name?.trim() || (attendance_type === 'Family' ? 'Family' : 'Viewer');
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // Validate required fields
    if (name && (typeof name !== 'string' || name.length > 200)) return err('Invalid name', req);
    if (!email || typeof email !== 'string' || email.length > 200) return err('Invalid email', req);
    if (!branch || typeof branch !== 'string') return err('Invalid branch', req);
    if (!branch_id || typeof branch_id !== 'string') return err('Invalid branch_id', req);
    if (!stream_session_id || typeof stream_session_id !== 'string') return err('Invalid stream_session_id', req);
    if (!stream_title || typeof stream_title !== 'string') return err('Invalid stream_title', req);
    if (attendance_type === 'Single' && !name) return err('Invalid name', req);
    if (attendance_type === 'Family' && (!family_surname || typeof family_surname !== 'string' || family_surname.length > 100)) {
      return err('Invalid family_surname', req);
    }

    const sb = getServiceClient();
    const now = new Date().toISOString();
    const { data: settings } = await sb.from('stream_settings')
      .select('youtube_url, stream_title, is_attendance_active, auto_attendance_duration_hours')
      .eq('id', SETTINGS_ID)
      .single();
    const activeStreamTitle = settings?.stream_title || stream_title;
    const resumeCutoff = new Date(
      Date.now() - Math.max((settings?.auto_attendance_duration_hours ?? 4) + 1, 2) * 60 * 60 * 1000,
    ).toISOString();

    // Check if record exists for this exact client session first.
    const { data: existing } = await sb.from('attendance_records')
      .select('id, start_time, duration_seconds, stream_session_id, last_seen_at')
      .eq('email', normalizedEmail)
      .eq('stream_session_id', stream_session_id)
      .eq('branch', branch)
      .eq('is_archived', false)
      .maybeSingle();

    // If not, resume the current active stream attendance for this attendee across devices.
    const { data: resumable } = existing
      ? { data: existing }
      : await sb.from('attendance_records')
        .select('id, start_time, duration_seconds, stream_session_id, last_seen_at')
        .eq('email', normalizedEmail)
        .eq('branch', branch)
        .eq('stream_title', activeStreamTitle)
        .eq('is_archived', false)
        .gte('last_seen_at', resumeCutoff)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (resumable) {
      const wasActive = Boolean(resumable.last_seen_at && resumable.last_seen_at >= activeCutoff);
      const startTime = new Date(resumable.start_time).getTime();
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      const inactiveSeenAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await sb.from('attendance_records')
        .update({
          name: name?.trim() || null,
          email: normalizedEmail,
          branch,
          branch_id,
          stream_title: activeStreamTitle,
          last_seen_at: isLeaving ? inactiveSeenAt : now,
          end_time: isLeaving ? now : null,
          duration_seconds: durationSeconds,
          attendance_type: attendance_type || 'Single',
          age_category: age_category || null,
          family_surname: family_surname || null,
          family_adult_count: family_adult_count || null,
          family_young_adult_count: family_young_adult_count || null,
          family_youth_count: family_youth_count || null,
          family_children_count: family_children_count || null,
        })
        .eq('id', resumable.id);

      if (isLeaving && wasActive) {
        await Promise.all([
          sendRealtimeBroadcast({
            topic: `branch:${branch_id}`,
            event: 'viewer_left',
            payload: {
              branch_id,
              stream_session_id: resumable.stream_session_id,
              display_name: displayName,
            },
          }),
          sendRealtimeBroadcast({
            topic: 'admin:attendance',
            event: 'attendance_changed',
            payload: { branch_id, stream_session_id: resumable.stream_session_id },
          }),
        ]);
      } else if (!isLeaving && !wasActive) {
        await Promise.all([
          sendRealtimeBroadcast({
            topic: `branch:${branch_id}`,
            event: 'viewer_joined',
            payload: {
              branch_id,
              stream_session_id: resumable.stream_session_id,
              display_name: displayName,
            },
          }),
          sendRealtimeBroadcast({
            topic: 'admin:attendance',
            event: 'attendance_changed',
            payload: { branch_id, stream_session_id: resumable.stream_session_id },
          }),
        ]);
      }

      return json({
        status: existing ? 'updated' : 'resumed',
        id: resumable.id,
        attendance: {
          stream_session_id: resumable.stream_session_id,
          start_time: resumable.start_time,
          duration_seconds: durationSeconds,
          resumed_from_another_device: !existing && resumable.stream_session_id !== stream_session_id,
        },
        stream: {
          youtube_url: settings?.youtube_url || '',
          stream_title: activeStreamTitle,
          is_attendance_active: settings?.is_attendance_active ?? false,
        },
      }, 200, req);
    } else {
      if (isLeaving) {
        return json({
          status: 'ignored',
          attendance: {
            stream_session_id,
            resumed_from_another_device: false,
          },
          stream: {
            youtube_url: settings?.youtube_url || '',
            stream_title: activeStreamTitle,
            is_attendance_active: settings?.is_attendance_active ?? false,
          },
        }, 200, req);
      }

      const payload = {
        name: name?.trim() || null,
        email: normalizedEmail,
        branch,
        branch_id,
        stream_session_id,
        stream_title: activeStreamTitle,
        start_time: now,
        last_seen_at: now,
        end_time: null,
        duration_seconds: 0,
        attendance_type: attendance_type || 'Single',
        age_category: age_category || null,
        family_surname: family_surname || null,
        family_adult_count: family_adult_count || null,
        family_young_adult_count: family_young_adult_count || null,
        family_youth_count: family_youth_count || null,
        family_children_count: family_children_count || null,
      };
      const { data, error } = await sb.from('attendance_records').insert(payload).select('id').single();

      if (error?.code === '23505') {
        const { data: conflicted } = await sb.from('attendance_records')
          .select('id, start_time, stream_session_id, last_seen_at')
          .eq('email', normalizedEmail)
          .eq('branch_id', branch_id)
          .eq('stream_title', activeStreamTitle)
          .eq('is_archived', false)
          .maybeSingle();

        if (conflicted) {
          const wasActive = Boolean(conflicted.last_seen_at && conflicted.last_seen_at >= activeCutoff);
          const durationSeconds = Math.floor((Date.now() - new Date(conflicted.start_time).getTime()) / 1000);
          await sb.from('attendance_records')
            .update({
              ...payload,
              stream_session_id: conflicted.stream_session_id,
              last_seen_at: now,
              end_time: null,
              duration_seconds: durationSeconds,
              stream_title: activeStreamTitle,
            })
            .eq('id', conflicted.id);

          if (!wasActive) {
            await Promise.all([
              sendRealtimeBroadcast({
                topic: `branch:${branch_id}`,
                event: 'viewer_joined',
                payload: {
                  branch_id,
                  stream_session_id: conflicted.stream_session_id,
                  display_name: displayName,
                },
              }),
              sendRealtimeBroadcast({
                topic: 'admin:attendance',
                event: 'attendance_changed',
                payload: { branch_id, stream_session_id: conflicted.stream_session_id },
              }),
            ]);
          }

          return json({
            status: 'resumed',
            id: conflicted.id,
            attendance: {
              stream_session_id: conflicted.stream_session_id,
              start_time: conflicted.start_time,
              duration_seconds: durationSeconds,
              resumed_from_another_device: true,
            },
            stream: {
              youtube_url: settings?.youtube_url || '',
              stream_title: activeStreamTitle,
              is_attendance_active: settings?.is_attendance_active ?? false,
            },
          }, 200, req);
        }
      }

      if (error) return json({ error: error.message }, 500, req);
      await Promise.all([
        sendRealtimeBroadcast({
          topic: `branch:${branch_id}`,
          event: 'viewer_joined',
          payload: {
            branch_id,
            stream_session_id,
            display_name: displayName,
          },
        }),
        sendRealtimeBroadcast({
          topic: 'admin:attendance',
          event: 'attendance_changed',
          payload: { branch_id, stream_session_id },
        }),
      ]);
      return json({
        status: 'created',
        id: data.id,
        attendance: {
          stream_session_id,
          start_time: now,
          duration_seconds: 0,
          resumed_from_another_device: false,
        },
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
