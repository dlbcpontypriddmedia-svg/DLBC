import { optionalEnv } from './env';
import { getServiceClient, sendRealtimeBroadcast } from './supabase';

const SETTINGS_ID = '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b';

export async function runYoutubeLiveCheck(force: boolean) {
  const sb = getServiceClient();
  const youtubeApiKey = optionalEnv('YOUTUBE_API_KEY');

  const { data: settings } = await sb.from('stream_settings').select('*').eq('id', SETTINGS_ID).single();
  if (!settings) return { status: 500, data: { error: 'No settings found' } };

  const now = new Date();

  if (settings.is_attendance_active && settings.attendance_auto_stop_at) {
    const stopAt = new Date(settings.attendance_auto_stop_at);
    if (now >= stopAt) {
      await sb.from('stream_settings').update({
        is_attendance_active: false,
        attendance_auto_stop_at: null,
        updated_at: now.toISOString(),
      }).eq('id', SETTINGS_ID);

      await Promise.all([
        sendRealtimeBroadcast({ topic: 'admin:attendance', event: 'attendance_changed', payload: { action: 'auto_stopped' } }),
        sendRealtimeBroadcast({ topic: 'stream:global', event: 'stream_updated', payload: { action: 'auto_stopped' } }),
      ]);

      return { status: 200, data: { action: 'auto_stopped' } };
    }
  }

  if (
    !force &&
    settings.is_attendance_active &&
    settings.youtube_url &&
    settings.attendance_auto_stop_at &&
    now < new Date(settings.attendance_auto_stop_at)
  ) {
    return {
      status: 200,
      data: {
        action: 'already_tracking',
        reason: 'active_attendance_window',
        url: settings.youtube_url,
        title: settings.stream_title,
        attendance_auto_stop_at: settings.attendance_auto_stop_at,
      },
    };
  }

  if (!force) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    if (settings.check_day && settings.check_day !== currentDay) return { status: 200, data: { action: 'skipped', reason: 'wrong_day' } };

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (settings.check_start_time && currentTime < settings.check_start_time) return { status: 200, data: { action: 'skipped', reason: 'before_start_time' } };
    if (settings.check_end_time && currentTime > settings.check_end_time) return { status: 200, data: { action: 'skipped', reason: 'after_end_time' } };

    if (settings.last_api_check_time) {
      const lastCheck = new Date(settings.last_api_check_time);
      const minutesSince = (now.getTime() - lastCheck.getTime()) / 60000;
      if (minutesSince < (settings.check_interval_minutes || 5)) {
        return { status: 200, data: { action: 'skipped', reason: 'interval_not_reached' } };
      }
    }
  }

  if (!youtubeApiKey || !settings.youtube_channel_id) {
    return { status: 200, data: { action: 'skipped', reason: 'no_api_key_or_channel' } };
  }

  await sb.from('stream_settings').update({ last_api_check_time: now.toISOString() }).eq('id', SETTINGS_ID);

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

      if (settings.last_live_check_date !== today || settings.auto_detected_url !== liveUrl) {
        await sb.from('attendance_records').update({ is_archived: true, end_time: now.toISOString() }).eq('is_archived', false);

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

        await Promise.all([
          sendRealtimeBroadcast({ topic: 'admin:attendance', event: 'attendance_changed', payload: { action: 'live_detected', url: liveUrl } }),
          sendRealtimeBroadcast({ topic: 'stream:global', event: 'stream_updated', payload: { action: 'live_detected', url: liveUrl } }),
        ]);

        return { status: 200, data: { action: 'live_detected', videoId, title, url: liveUrl } };
      }

      return { status: 200, data: { action: 'already_tracking', videoId } };
    }

    return { status: 200, data: { action: 'no_live_stream' } };
  } catch (e: any) {
    return { status: 500, data: { error: e?.message || 'YouTube API error', action: 'youtube_api_error' } };
  }
}

