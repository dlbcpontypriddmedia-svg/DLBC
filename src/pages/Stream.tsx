import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioTower, Volume2, MonitorPlay, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import { Button } from '@/components/ui/button';
import { getViewerSession, clearViewerSession } from '@/lib/session';
import { api } from '@/lib/api';

const Stream = () => {
  const navigate = useNavigate();
  const session = getViewerSession();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const startTime = useRef(Date.now());
  const hasShownError = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioOnly, setAudioOnly] = useState(false);
  const [streamTitle, setStreamTitle] = useState('Live Service');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [streamActive, setStreamActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [navigate, session]);

  const sendHeartbeat = useCallback(async (initial = false) => {
    if (!session) return;

    try {
      const response = await api.heartbeat({
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

      if (response?.stream) {
        setYoutubeUrl(response.stream.youtube_url || '');
        setStreamTitle(response.stream.stream_title || 'Live Service');
        setStreamActive(Boolean(response.stream.is_attendance_active));
      }
    } catch {
      if (!hasShownError.current) {
        toast.error('Unable to sync stream status right now.');
        hasShownError.current = true;
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, [session, streamTitle]);

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
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') void sendHeartbeat();
    };
    const handleBeforeUnload = () => {
      void sendHeartbeat();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendHeartbeat]);

  const handleLeave = async () => {
    setLeaving(true);
    await sendHeartbeat();
    clearViewerSession();
    navigate('/');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };

  if (!session) return null;
  if (loading) return <PageLoader label="Preparing the live stream..." />;

  const videoId = youtubeUrl ? getVideoId(youtubeUrl) : null;
  const attendeeLabel = session.family_surname || session.name || 'Family';

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-sm font-medium text-foreground">
              {session.branch} Branch
            </div>
            <ActiveViewersCount branchId={session.branch_id} />
            <Button variant="outline" size="sm" onClick={handleLeave} disabled={leaving}>
              {leaving ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
              {leaving ? 'Leaving...' : 'Leave'}
            </Button>
          </div>
        </header>

        <main className="grid flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="surface-panel overflow-hidden p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                    streamActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {streamActive ? 'Attendance Active' : 'Waiting for service'}
                  </span>
                </div>
                <h1 className="text-3xl font-semibold leading-tight text-foreground">{streamTitle}</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-primary/10 bg-white/75 px-4 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Session Time</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{formatTime(elapsed)}</p>
                </div>
                <Button variant="outline" onClick={() => setAudioOnly((value) => !value)}>
                  {audioOnly ? <Volume2 className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
                  {audioOnly ? 'Audio focus' : 'Video mode'}
                </Button>
              </div>
            </div>

            <div className={`relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-slate-950 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] ${audioOnly ? 'h-28' : 'aspect-video'}`}>
              {videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={audioOnly ? { height: '280%', marginTop: '-90%' } : undefined}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-white">
                  <div className="space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
                      <RadioTower className="h-6 w-6 text-sky-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">Waiting for stream to begin</p>
                      <p className="text-sm text-slate-300">
                        Once the service goes live, the YouTube player will appear here automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="surface-panel p-5">
              <h2 className="text-xl font-semibold text-foreground">Session Details</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  Logged in as <span className="font-semibold text-foreground">{attendeeLabel}</span>
                </p>
                <p>{session.email}</p>
                <p>Attendance type: <span className="font-semibold text-foreground">{session.attendance_type}</span></p>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default Stream;
