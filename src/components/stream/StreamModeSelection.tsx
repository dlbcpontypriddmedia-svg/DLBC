import { MonitorPlay, Volume2 } from 'lucide-react';

import type { ViewerSession } from '@/lib/session';
import type { StreamMode } from '@/lib/stream';

type Props = {
  session: ViewerSession;
  onSelectMode: (mode: StreamMode) => void;
};

const MODES = [
  {
    key: 'video' as const,
    icon: MonitorPlay,
    label: 'Video Mode',
    desc: 'Watch the live service with full YouTube video and audio.',
    badge: 'Recommended',
    badgeCls: 'bg-primary/10 text-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    key: 'audio' as const,
    icon: Volume2,
    label: 'Audio Only',
    desc: 'Listen to the service without video. Saves data.',
    badge: 'Low bandwidth',
    badgeCls: 'bg-muted text-muted-foreground',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

export default function StreamModeSelection({ session, onSelectMode }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <img src="/church-logo.jpg" alt="DLBC" className="mx-auto h-16 w-16 rounded-full border-2 border-white/20 object-cover shadow-xl" />
          <p className="mt-4 text-sm font-medium text-slate-400">{session.branch} Branch</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Choose Your Mode</h1>
          <p className="mt-2 text-sm text-slate-400">Select how you want to join the service. You can switch anytime.</p>
        </div>

        {/* Mode cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {MODES.map(({ key, icon: Icon, label, desc, badge, badgeCls, iconBg, iconColor }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectMode(key)}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-xl"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-white">{label}</h2>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{desc}</p>
              <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeCls}`}>
                {badge}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
