import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioTower, Volume2, VolumeX, Pause, Play, MonitorPlay, LogOut, Clock3, UserRound, BadgeCheck, Users, Baby, User, Maximize } from 'lucide-react';
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoShellRef = useRef<HTMLDivElement | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioOnly, setAudioOnly] = useState(false);
  const [streamTitle, setStreamTitle] = useState('Live Service');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [streamActive, setStreamActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

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

  const postPlayerCommand = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func,
        args,
      }),
      '*',
    );
  };

  const handleTogglePlay = () => {
    postPlayerCommand(isPlaying ? 'pauseVideo' : 'playVideo');
    setIsPlaying((value) => !value);
  };

  const handleToggleMute = () => {
    postPlayerCommand(isMuted ? 'unMute' : 'mute');
    setIsMuted((value) => !value);
  };

  const handleFullscreen = async () => {
    if (!videoShellRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await videoShellRef.current.requestFullscreen();
  };

  if (!session) return null;
  if (loading) return <PageLoader label="Preparing the live stream..." />;

  const videoId = youtubeUrl ? getVideoId(youtubeUrl) : null;
  const attendeeLabel = session.family_surname || session.name || 'Family';

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-sm font-medium text-foreground">
              {session.branch} Branch
            </div>
            <ActiveViewersCount branchId={session.branch_id} iconOnly />
            <Button variant="outline" size="icon" onClick={handleLeave} disabled={leaving} aria-label="Leave stream">
              {leaving ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="rounded-[1.5rem] border border-white/70 bg-transparent p-4 md:p-6">
          <div ref={videoShellRef} className={`relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-slate-950 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] ${audioOnly ? 'h-28' : 'aspect-video'}`}>
            {videoId ? (
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1&controls=1`}
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
                      The player will appear here once the stream is live.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                streamActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
              }`}>
                {streamActive ? 'Attendance Active' : 'Waiting for service'}
              </span>
              <h1 className="text-2xl font-semibold leading-snug text-foreground md:text-3xl">{streamTitle}</h1>
            </div>

            <div className="flex justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleTogglePlay} disabled={!videoId}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleToggleMute} disabled={!videoId}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleFullscreen} disabled={!videoId}>
                  <Maximize className="h-4 w-4" />
                  Fullscreen
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAudioOnly((value) => !value)}>
                  <MonitorPlay className="h-4 w-4" />
                  {audioOnly ? 'Audio' : 'Video'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <span className="tabular-nums font-semibold text-foreground">{formatTime(elapsed)}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                <UserRound className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{attendeeLabel}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                <span className="font-medium text-foreground">{session.email}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <span>{session.attendance_type}</span>
              </div>

              {session.attendance_type === 'Family' && (
                <>
                  {!!session.family_adult_count && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                      <User className="h-4 w-4 text-primary" />
                      <span>{session.family_adult_count} adult{session.family_adult_count > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {!!session.family_young_adult_count && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{session.family_young_adult_count} young adult{session.family_young_adult_count > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {!!session.family_youth_count && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{session.family_youth_count} youth</span>
                    </div>
                  )}
                  {!!session.family_children_count && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2">
                      <Baby className="h-4 w-4 text-primary" />
                      <span>{session.family_children_count} child{session.family_children_count > 1 ? 'ren' : ''}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Stream;
