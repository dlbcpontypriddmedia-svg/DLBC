import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Maximize2, MonitorPlay, Pause, Play, Volume2, VolumeX } from 'lucide-react';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
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
  const { session, elapsed, streamTitle, youtubeUrl, streamActive, loading, duplicateSessionNotice, sendLeaveHeartbeat } = useStreamAttendance();
  const [leaving, setLeaving] = useState(false);
  const { audioOnly, modeSelected, selectMode, toggleMode } = useStreamMode(session?.stream_session_id);
  const videoId = youtubeUrl ? getVideoId(youtubeUrl) : null;
  const { playerHostRef, videoShellRef, isPlaying, isMuted, togglePlay, toggleMute, toggleFullscreen } = useYouTubePlayer({ audioOnly, videoId });

  useEffect(() => { if (!session) navigate('/'); }, [navigate, session]);

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
    <div className="stream-shell">
      {/* ── Header ── */}
      <header className="stream-header">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between md:h-16">
          {/* Left: logo + branch */}
          <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <img
              src="/church-logo.jpg"
              alt="DLBC"
              className="h-8 w-8 shrink-0 rounded-full border border-white/20 object-cover md:h-9 md:w-9"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white leading-none">Deeper Life Bible Church</p>
              <p className="truncate text-[11px] text-slate-400 mt-0.5">{session.branch}</p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {/* Timer — hidden on xs */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="tabular-nums text-sm font-semibold text-white">{formatStreamTime(elapsed)}</span>
            </div>

            {/* Live badge — hidden on xs */}
            {streamActive && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400">Live</span>
              </div>
            )}

            {/* Viewer count */}
            <ActiveViewersCount branchId={session.branch_id} iconOnly />

            {/* Leave */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              disabled={leaving}
              className="h-8 rounded-xl px-2.5 text-slate-400 hover:text-white hover:bg-white/10 md:px-3"
            >
              {leaving ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden md:inline ml-1.5">Leave</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="mx-auto max-w-screen-xl px-3 py-4 md:px-6 md:py-6">
        {duplicateSessionNotice && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <span>Session already active on another device — connected to the same attendance record.</span>
          </div>
        )}

        <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
          {/* Video — full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-2">
            <StreamMediaPanel
              audioOnly={audioOnly}
              streamActive={streamActive}
              videoId={videoId}
              playerHostRef={playerHostRef}
              videoShellRef={videoShellRef}
            />
          </div>

          {/* Sidebar — stacks below video on mobile */}
          <aside className="space-y-3 md:space-y-4">
            {/* Now playing card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  streamActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}>
                  {streamActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {streamActive ? 'Live · Attendance On' : 'Waiting for stream'}
                </span>
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  {audioOnly ? 'Audio' : 'Video'}
                </span>
              </div>

              <h1 className="text-base font-semibold text-white leading-snug md:text-lg">
                {streamTitle || 'Deeper Life Bible Church Live'}
              </h1>

              {/* Controls grid */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {[
                  { icon: isPlaying ? Pause : Play, label: isPlaying ? 'Pause' : 'Play', action: togglePlay, disabled: !videoId || audioOnly },
                  { icon: isMuted ? VolumeX : Volume2, label: isMuted ? 'Unmute' : 'Mute', action: toggleMute, disabled: !videoId || audioOnly },
                  { icon: Maximize2, label: 'Fullscreen', action: toggleFullscreen, disabled: !videoId || audioOnly },
                  { icon: MonitorPlay, label: 'Switch Mode', action: toggleMode, disabled: false },
                ].map(({ icon: Icon, label, action, disabled }) => (
                  <button
                    key={label}
                    onClick={action}
                    disabled={disabled}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed md:text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <AttendeeInfoCard session={session} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Stream;
