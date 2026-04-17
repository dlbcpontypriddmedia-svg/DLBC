import { RadioTower, Volume2 } from 'lucide-react';
import type { Ref, RefObject } from 'react';

import { AUDIO_STREAM_URL } from '@/lib/stream';

type Props = {
  audioOnly: boolean;
  streamActive: boolean;
  videoId: string | null;
  playerHostRef: Ref<HTMLDivElement>;
  videoShellRef: RefObject<HTMLDivElement>;
};

export default function StreamMediaPanel({
  audioOnly,
  streamActive: _streamActive,
  videoId,
  playerHostRef,
  videoShellRef,
}: Props) {
  return (
    <div
      ref={videoShellRef}
      className={`relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-slate-950 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] ${audioOnly ? 'min-h-[14rem]' : 'aspect-video'}`}
    >
      {audioOnly ? (
        <div className="flex h-full min-h-[14rem] items-center justify-center px-6 py-10 text-center text-white">
          <div className="w-full max-w-xl space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
              <Volume2 className="h-6 w-6 text-sky-200" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Audio Stream</p>
              <p className="text-sm text-slate-300">
                Live audio is playing directly from the church stream.
              </p>
            </div>
            <audio controls autoPlay src={AUDIO_STREAM_URL} className="w-full">
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      ) : videoId ? (
        <div ref={playerHostRef} className="absolute inset-0 h-full w-full" />
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
  );
}
