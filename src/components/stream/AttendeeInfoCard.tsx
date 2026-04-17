import { Mail, MapPin, Tag, User } from 'lucide-react';

import { formatFamilyName } from '@/lib/attendance';
import type { ViewerSession } from '@/lib/session';

type Props = { session: ViewerSession };

const Field = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white break-all">{value}</p>
    </div>
  </div>
);

export default function AttendeeInfoCard({ session }: Props) {
  const displayName = session.attendance_type === 'Family'
    ? formatFamilyName(session.family_surname) || 'Family'
    : session.name || 'Viewer';

  const familyTotal = session.attendance_type === 'Family'
    ? (session.family_adult_count || 0)
      + (session.family_young_adult_count || 0)
      + (session.family_youth_count || 0)
      + (session.family_children_count || 0)
    : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attendee Info</p>
      <div className="space-y-2">
        <Field icon={User} label="Name" value={displayName} />
        <Field icon={Mail} label="Email" value={session.email} />
        <Field icon={MapPin} label="Branch" value={session.branch} />
        <Field icon={Tag} label="Type" value={familyTotal !== null ? `Family · ${familyTotal} members` : `Single · ${session.age_category || 'Unspecified'}`} />
      </div>
    </div>
  );
}
