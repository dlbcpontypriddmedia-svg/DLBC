import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { getServiceClient, SETTINGS_ID } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const sb = getServiceClient();
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

  let force = false;
  try {
    const body = await req.json();
    force = body?.force === true;
  } catch {}

  // Get current settings
  const { data: settings } = await sb.from('stream_settings')
    .select('*').eq('id', SETTINGS_ID).single();

  if (!settings) return json({ error: 'No settings found' }, 500);

  const now = new Date();

  // Auto-stop check
  if (settings.is_attendance_active && settings.attendance_auto_stop_at) {
    const stopAt = new Date(settings.attendance_auto_stop_at);
    if (now >= stopAt) {
      await sb.from('stream_settings').update({
        is_attendance_active: false,
        attendance_auto_stop_at: null,
        updated_at: now.toISOString(),
      }).eq('id', SETTINGS_ID);
      return json({ action: 'auto_stopped' });
    }
  }

  if (!force) {
    // Check day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    if (settings.check_day && settings.check_day !== currentDay) {
      return json({ action: 'skipped', reason: 'wrong_day' });
    }

    // Check time window
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (settings.check_start_time && currentTime < settings.check_start_time) {
      return json({ action: 'skipped', reason: 'before_start_time' });
    }
    if (settings.check_end_time && currentTime > settings.check_end_time) {
      return json({ action: 'skipped', reason: 'after_end_time' });
    }

    // Check interval
    if (settings.last_api_check_time) {
      const lastCheck = new Date(settings.last_api_check_time);
      const minutesSince = (now.getTime() - lastCheck.getTime()) / 60000;
      if (minutesSince < (settings.check_interval_minutes || 5)) {
        return json({ action: 'skipped', reason: 'interval_not_reached' });
      }
    }
  }

  if (!youtubeApiKey || !settings.youtube_channel_id) {
    return json({ action: 'skipped', reason: 'no_api_key_or_channel' });
  }

  // Update last check time
  await sb.from('stream_settings').update({
    last_api_check_time: now.toISOString(),
  }).eq('id', SETTINGS_ID);

  // Check YouTube for live streams
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${settings.youtube_channel_id}&type=video&eventType=live&key=${youtubeApiKey}`;
    const ytRes = await fetch(searchUrl);
    const ytData = await ytRes.json();

    if (ytData.items && ytData.items.length > 0) {
      const liveVideo = ytData.items[0];
      const videoId = liveVideo.id.videoId;
      const title = liveVideo.snippet.title;
      const liveUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const today = now.toISOString().split('T')[0];

      // Check if this is a new stream (different from last detected)
      if (settings.last_live_check_date !== today || settings.auto_detected_url !== liveUrl) {
        // Archive old non-archived records
        await sb.from('attendance_records')
          .update({ is_archived: true, end_time: now.toISOString() })
          .eq('is_archived', false);

        const autoStopAt = new Date(now.getTime() + (settings.auto_attendance_duration_hours || 4) * 3600000);

        await sb.from('stream_settings').update({
          youtube_url: liveUrl,
          auto_detected_url: liveUrl,
          stream_title: title,
          is_attendance_active: true,
          last_live_check_date: today,
          attendance_auto_stop_at: autoStopAt.toISOString(),
          updated_at: now.toISOString(),
        }).eq('id', SETTINGS_ID);

        return json({ action: 'live_detected', videoId, title, url: liveUrl });
      }

      return json({ action: 'already_tracking', videoId });
    } else {
      return json({ action: 'no_live_stream' });
    }
  } catch (e) {
    return json({ error: e.message, action: 'youtube_api_error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
