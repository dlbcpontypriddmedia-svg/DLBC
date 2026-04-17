import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, LogOut, Maximize, MonitorPlay, Pause, Play, Volume2, VolumeX } from 'lucide-react';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import AttendeeInfoCard from '@/components/stream/AttendeeInfoCard';
import StreamMediaPanel from '@/components/stream/StreamMediaPanel';
import StreamModeSelection from '@/components/stream/StreamModeSelection';
import { Button } from '@/components/ui/button';
import { useStreamAttendance } from '@/hooks/useStreamAttendance';
import { useStreamMode } from '@/hooks/useStreamMode';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { clearViewerSession } from '@/lib/session';
import { formatStreamTime, getVideoId } from '@/lib/stream';

const Stream = () => {
  const navigate = useNavigate();
  const {
    session,
    elapsed,
    streamTitle,
    youtubeUrl,
    streamActive,
    loading,
    duplicateSessionNotice,
    sendLeaveHeartbeat,
  } = useStreamAttendance();
  const [leaving, setLeaving] = useState(false);
  const { audioOnly, modeSelected, selectMode, toggleMode } = useStreamMode(session?.stream_session_id);
  const videoId = youtubeUrl ? getVideoId(youtubeUrl) : null;
  const {
    playerHostRef,
    videoShellRef,
    isPlaying,
    isMuted,
    togglePlay,
    toggleMute,
    toggleFullscreen,
  } = useYouTubePlayer({ audioOnly, videoId });

  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [navigate, session]);

  const handleLeave = async () => {
    setLeaving(true);
    sendLeaveHeartbeat();
    clearViewerSession();
    navigate('/');
  };

  if (!session) return null;
  if (loading) return <PageLoader label="Preparing the live stream..." />;
  if (!modeSelected) return <StreamModeSelection session={session} onSelectMode={selectMode} />;

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <Logo />
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              <span className="tabular-nums font-semibold text-foreground">{formatStreamTime(elapsed)}</span>
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

          <StreamMediaPanel
            audioOnly={audioOnly}
            streamActive={streamActive}
            videoId={videoId}
            playerHostRef={playerHostRef}
            videoShellRef={videoShellRef}
          />

          <div className="mt-5 space-y-4">
            <section className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-snug text-foreground md:text-3xl">{streamTitle}</h1>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={togglePlay} disabled={!videoId || audioOnly}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleMute} disabled={!videoId || audioOnly}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleFullscreen} disabled={!videoId || audioOnly}>
                  <Maximize className="h-4 w-4" />
                  Fullscreen
                </Button>
                <Button variant="outline" size="sm" onClick={toggleMode}>
                  <MonitorPlay className="h-4 w-4" />
                  {audioOnly ? 'Audio' : 'Video'}
                </Button>
              </div>

              <AttendeeInfoCard session={session} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Stream;
