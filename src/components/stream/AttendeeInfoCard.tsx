import { Baby, User, UserRound, Users } from 'lucide-react';

import { formatFamilyName } from '@/lib/attendance';
import type { ViewerSession } from '@/lib/session';

type Props = {
  session: ViewerSession;
};

export default function AttendeeInfoCard({ session }: Props) {
  const attendeeLabel = session.attendance_type === 'Family'
    ? formatFamilyName(session.family_surname) || 'Family'
    : session.name || 'Viewer';

  const familyStats = [
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
  );
}
