import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioTower, Volume2, VolumeX, Pause, Play, MonitorPlay, LogOut, Clock3, UserRound, Users, Baby, User, Maximize } from 'lucide-react';
import { toast } from 'sonner';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { useStreamPresenceNotifications } from '@/hooks/useStreamPresenceNotifications';
import { Button } from '@/components/ui/button';
import { getViewerSession, clearViewerSession, updateViewerSession } from '@/lib/session';
import { api } from '@/lib/api';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId: string;
          width?: string;
          height?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
};

const Stream = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getViewerSession());
  const persistedStartTime = session?.stream_started_at ?? Date.now();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const startTime = useRef(persistedStartTime);
  const hasShownError = useRef(false);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
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
  const [duplicateSessionNotice, setDuplicateSessionNotice] = useState(false);
  const videoId = youtubeUrl ? getVideoId(youtubeUrl) : null;
  const realtimeSubscriptions = useMemo(() => [{ topic: 'stream:global', events: ['stream_updated'] }], []);

  useStreamPresenceNotifications({
    branchId: session?.branch_id,
    currentSessionId: session?.stream_session_id,
  });

  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [navigate, session]);

  useEffect(() => {
    if (!session?.stream_started_at) {
      updateViewerSession({ stream_started_at: persistedStartTime });
      startTime.current = persistedStartTime;
    }
  }, [persistedStartTime, session?.stream_started_at]);

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

      if (response?.attendance?.start_time) {
        const nextStartTime = new Date(response.attendance.start_time).getTime();
        if (!Number.isNaN(nextStartTime)) {
          startTime.current = nextStartTime;
          setElapsed(Math.floor((Date.now() - nextStartTime) / 1000));
        }
      }

      if (response?.attendance?.resumed_from_another_device) {
        setDuplicateSessionNotice(true);
      }

      if (response?.attendance && session) {
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
    } catch {
      if (!hasShownError.current) {
        toast.error('Unable to sync stream status right now.');
        hasShownError.current = true;
      }
    } finally {
      if (initial) setLoading(false);
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
      if (!session) return;
      api.sendLeaveHeartbeat({
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
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendHeartbeat, session, streamTitle]);

  const handleLeave = async () => {
    setLeaving(true);
    if (session) {
      api.sendLeaveHeartbeat({
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
    }
    clearViewerSession();
    navigate('/');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  function getVideoId(url: string) {
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  }

  const syncPlayerState = useCallback((player: YouTubePlayer) => {
    setIsPlaying(player.getPlayerState() === window.YT?.PlayerState.PLAYING);
    setIsMuted(player.isMuted());
  }, []);

  const initializePlayer = useCallback((nextVideoId: string) => {
    if (!playerHostRef.current || !window.YT?.Player) return;

    playerRef.current?.destroy();
    playerHostRef.current.innerHTML = '';

    playerRef.current = new window.YT.Player(playerHostRef.current, {
      videoId: nextVideoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        rel: 0,
      },
      events: {
        onReady: ({ target }) => {
          syncPlayerState(target);
        },
        onStateChange: ({ data, target }) => {
          setIsPlaying(data === window.YT?.PlayerState.PLAYING);
          setIsMuted(target.isMuted());
        },
      },
    });
  }, [syncPlayerState]);

  useEffect(() => {
    if (!videoId) {
      playerRef.current?.destroy();
      playerRef.current = null;
      setIsPlaying(false);
      setIsMuted(false);
      return;
    }

    setIsPlaying(true);
    setIsMuted(false);

    if (window.YT?.Player) {
      initializePlayer(videoId);
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      initializePlayer(videoId);
    };

    return () => {
      window.onYouTubeIframeAPIReady = previousReady;
    };
  }, [initializePlayer, videoId]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      setIsPlaying(false);
      playerRef.current.pauseVideo();
    } else {
      setIsPlaying(true);
      playerRef.current.playVideo();
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      playerRef.current.unMute();
    } else {
      setIsMuted(true);
      playerRef.current.mute();
    }
    window.setTimeout(() => {
      if (playerRef.current) syncPlayerState(playerRef.current);
    }, 100);
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

  const attendeeLabel = session.family_surname || session.name || 'Family';
  const familyStats: Array<{ icon: JSX.Element; label: string }> = [
    session.family_adult_count
      ? {
          icon: <User className="h-4 w-4 text-primary" />,
          label: `${session.family_adult_count} adult${session.family_adult_count > 1 ? 's' : ''}`,
        }
      : null,
    session.family_young_adult_count
      ? {
          icon: <Users className="h-4 w-4 text-primary" />,
          label: `${session.family_young_adult_count} young adult${session.family_young_adult_count > 1 ? 's' : ''}`,
        }
      : null,
    session.family_youth_count
      ? {
          icon: <Users className="h-4 w-4 text-primary" />,
          label: `${session.family_youth_count} youth`,
        }
      : null,
    session.family_children_count
      ? {
          icon: <Baby className="h-4 w-4 text-primary" />,
          label: `${session.family_children_count} child${session.family_children_count > 1 ? 'ren' : ''}`,
        }
      : null,
  ].filter((item): item is { icon: JSX.Element; label: string } => Boolean(item));

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <Logo />
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              <span className="tabular-nums font-semibold text-foreground">{formatTime(elapsed)}</span>
            </div>
          </div>
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
          {duplicateSessionNotice && (
            <div className="mb-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This attendance session was already active on another device. You have been connected to the same live attendance record.
            </div>
          )}
          <div ref={videoShellRef} className={`relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-slate-950 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] ${audioOnly ? 'h-28' : 'aspect-video'}`}>
            <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur-sm ${
                streamActive
                  ? 'border-emerald-300/50 bg-emerald-400/15 text-emerald-50'
                  : 'border-white/15 bg-black/35 text-slate-100'
              }`}>
                {streamActive ? 'Attendance Active' : 'Waiting for service'}
              </span>
            </div>
            {videoId ? (
              <div
                ref={playerHostRef}
                className="absolute inset-0 h-full w-full"
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
            <section className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-snug text-foreground md:text-3xl">{streamTitle}</h1>
              </div>

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

              <section className="rounded-[1.25rem] border border-primary/10 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="mb-4 flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Attendee Information</h2>
                    <p className="text-sm text-muted-foreground">Current session details for this stream.</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-primary/10 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</p>
                    <p className="mt-1 font-semibold text-foreground">{attendeeLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Email</p>
                    <p className="mt-1 break-all font-semibold text-foreground">{session.email}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attendance Type</p>
                    <p className="mt-1 font-semibold text-foreground">{session.attendance_type}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Branch</p>
                    <p className="mt-1 font-semibold text-foreground">{session.branch}</p>
                  </div>
                </div>

                {session.attendance_type === 'Family' && familyStats.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {familyStats.map((item) => (
                      <div key={item.label} className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                        {item.icon}
                        <span className="font-medium text-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Stream;
