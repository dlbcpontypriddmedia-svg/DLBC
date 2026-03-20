import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import ActiveViewersCount from '@/components/ActiveViewersCount';
import { getViewerSession, clearViewerSession } from '@/lib/session';
import { api } from '@/lib/api';

const Stream = () => {
  const navigate = useNavigate();
  const session = getViewerSession();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const [elapsed, setElapsed] = useState(0);
  const [audioOnly, setAudioOnly] = useState(false);
  const startTime = useRef(Date.now());
  const [streamTitle, setStreamTitle] = useState('Live Service');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
  }, []);

  // Fetch stream settings once
  useEffect(() => {
    if (!session) return;
    // We can use the heartbeat to get info, or fetch settings via a public call
    // For now, send first heartbeat immediately
    sendHeartbeat();
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!session) return;
    try {
      await api.heartbeat({
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
      });
    } catch {}
  }, [session, streamTitle]);

  // Heartbeat interval
  useEffect(() => {
    if (!session) return;
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeatRef.current);
  }, [sendHeartbeat]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Final heartbeat on leave
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') sendHeartbeat();
    };
    const handleBeforeUnload = () => sendHeartbeat();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendHeartbeat]);

  const handleLeave = () => {
    sendHeartbeat();
    clearViewerSession();
    navigate('/');
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Extract YouTube video ID
  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };

  if (!session) return null;

  const videoId = youtubeUrl ? getVideoId(youtubeUrl) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <Logo />
        <div className="flex items-center gap-4">
          <ActiveViewersCount branchId={session.branch_id} />
          <Button variant="outline" size="sm" onClick={handleLeave}>
            Leave
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center px-4 py-6 md:py-8">
        <div className="w-full max-w-4xl space-y-4">
          {/* Stream info */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground" style={{ lineHeight: '1.2' }}>{streamTitle}</h1>
              <p className="text-sm text-muted-foreground">{session.branch} Branch</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="tabular-nums text-muted-foreground">{formatTime(elapsed)}</span>
              <button
                onClick={() => setAudioOnly(!audioOnly)}
                className="rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted active:scale-[0.97]"
              >
                {audioOnly ? '🎵 Audio Only' : '📺 Video'}
              </button>
            </div>
          </div>

          {/* Video embed */}
          <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg ${audioOnly ? 'h-20' : 'aspect-video'}`}>
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={audioOnly ? { height: '300%', marginTop: '-100%' } : undefined}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <div className="text-4xl">📡</div>
                  <p className="text-sm">Waiting for stream to begin...</p>
                  <p className="text-xs text-muted-foreground/70">The stream will appear here when it goes live</p>
                </div>
              </div>
            )}
          </div>

          {/* Session info */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>Logged in as <span className="font-medium text-foreground">{session.name}</span> · {session.email}</p>
            <p className="text-xs mt-1">Your attendance is being recorded automatically.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Stream;
