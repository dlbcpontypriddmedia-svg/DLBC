import { MonitorPlay, Volume2 } from 'lucide-react';

import Logo from '@/components/Logo';
import type { ViewerSession } from '@/lib/session';
import type { StreamMode } from '@/lib/stream';

type Props = {
  session: ViewerSession;
  onSelectMode: (mode: StreamMode) => void;
};

export default function StreamModeSelection({ session, onSelectMode }: Props) {
  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <div className="rounded-full border border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-sm font-medium text-foreground">
            {session.branch} Branch
          </div>
        </header>

        <main className="surface-panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/75">Choose Mode</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">How do you want to join?</h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Select your preferred mode now. You can still change it later from the stream controls.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelectMode('video')}
              className="rounded-[1.5rem] border border-primary/10 bg-white/80 p-6 text-left shadow-sm transition hover:border-primary/20 hover:bg-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10">
                <MonitorPlay className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-foreground">Video Mode</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Watch the live service with the current YouTube player experience.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('audio')}
              className="rounded-[1.5rem] border border-primary/10 bg-white/80 p-6 text-left shadow-sm transition hover:border-primary/20 hover:bg-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10">
                <Volume2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-foreground">Audio Mode</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Listen through the direct church audio stream without the YouTube player.
              </p>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
