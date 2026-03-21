import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { api } from '@/lib/api';
import { getViewerSession, updateViewerSession, type ViewerSession } from '@/lib/session';

function buildHeartbeatPayload(session: ViewerSession, streamTitle: string) {
  return {
    name: session.name,
    email: session.email,
    branch: session.branch,
    branch_id: session.branch_id,
    stream_session_id: session.stream_session_id,
    stream_title: streamTitle,
    attendance_type: session.attendance_type,
    age_category: session.age_category,
    family_surname: session.family_surname,
    family_adult_count: session.family_adult_count,
    family_young_adult_count: session.family_young_adult_count,
    family_youth_count: session.family_youth_count,
    family_children_count: session.family_children_count,
  };
}

export function useStreamAttendance() {
  const [session, setSession] = useState(() => getViewerSession());
  const [elapsed, setElapsed] = useState(0);
  const [streamTitle, setStreamTitle] = useState('Live Service');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [streamActive, setStreamActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duplicateSessionNotice, setDuplicateSessionNotice] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const hasShownError = useRef(false);
  const startTime = useRef(session?.stream_started_at ?? Date.now());
  const realtimeSubscriptions = useMemo(() => [{ topic: 'stream:global', events: ['stream_updated'] }], []);

  useEffect(() => {
    if (!session?.stream_started_at) {
      const persistedStartTime = Date.now();
      updateViewerSession({ stream_started_at: persistedStartTime });
      startTime.current = persistedStartTime;
    }
  }, [session?.stream_started_at]);

  const sendHeartbeat = useCallback(async (initial = false) => {
    if (!session) return;

    try {
      const response = await api.heartbeat(buildHeartbeatPayload(session, streamTitle));

      if (response?.stream) {
        setYoutubeUrl(response.stream.youtube_url || '');
        setStreamTitle(response.stream.stream_title || 'Live Service');
        setStreamActive(Boolean(response.stream.is_attendance_active));
      }

      if (response?.attendance?.start_time) {
        const nextStartTime = new Date(response.attendance.start_time).getTime();
        if (!Number.isNaN(nextStartTime)) {
          startTime.current = nextStartTime;
          setElapsed(Math.floor((Date.now() - nextStartTime) / 1000));
        }
      }

      setDuplicateSessionNotice(Boolean(response?.attendance?.resumed_from_another_device));

      if (response?.attendance) {
        const nextSession = updateViewerSession({
          stream_session_id: response.attendance.stream_session_id || session.stream_session_id,
          stream_started_at: response.attendance.start_time
            ? new Date(response.attendance.start_time).getTime()
            : session.stream_started_at,
        });

        if (nextSession) {
          setSession(nextSession);
        }
      }

      window.dispatchEvent(new CustomEvent('active-viewers:refresh', {
        detail: { branchId: session.branch_id },
      }));
    } catch {
      if (!hasShownError.current) {
        toast.error('Unable to sync stream status right now.');
        hasShownError.current = true;
      }
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, [session, streamTitle]);

  useRealtimeRefresh({
    subscriptions: realtimeSubscriptions,
    onRefresh: () => {
      if (session) {
        void sendHeartbeat();
      }
    },
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (!session) return;
    void sendHeartbeat(true);
  }, [sendHeartbeat, session]);

  useEffect(() => {
    if (!session) return;
    heartbeatRef.current = setInterval(() => {
      void sendHeartbeat();
    }, 30000);
    return () => clearInterval(heartbeatRef.current);
  }, [sendHeartbeat, session]);

  useEffect(() => {
    if (!streamActive) {
      setElapsed(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [streamActive]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void sendHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      if (!session) return;
      api.sendLeaveHeartbeat(buildHeartbeatPayload(session, streamTitle));
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendHeartbeat, session, streamTitle]);

  const sendLeaveHeartbeat = useCallback(() => {
    if (!session) return;
    api.sendLeaveHeartbeat(buildHeartbeatPayload(session, streamTitle));
  }, [session, streamTitle]);

  return {
    session,
    elapsed,
    streamTitle,
    youtubeUrl,
    streamActive,
    loading,
    duplicateSessionNotice,
    sendLeaveHeartbeat,
  };
}
