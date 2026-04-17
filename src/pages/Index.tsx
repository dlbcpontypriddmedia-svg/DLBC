import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Radio } from 'lucide-react';

import BranchSelector from '@/components/BranchSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import MobileAuthHeader from '@/components/MobileAuthHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatFamilyName, parseCountInput } from '@/lib/attendance';
import { saveViewerSession, ViewerSession } from '@/lib/session';

const Index = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'Single' | 'Family'>('Single');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [ageCategory, setAgeCategory] = useState('');
  const [familySurname, setFamilySurname] = useState('');
  const [adultCount, setAdultCount] = useState(0);
  const [youngAdultCount, setYoungAdultCount] = useState(0);
  const [youthCount, setYouthCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!name && type === 'Single') || !email || !branchId || submitting) return;
    if (type === 'Family' && !familySurname.trim()) return;
    setSubmitting(true);

    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: ViewerSession = {
      ...(type === 'Single' ? { name: name.trim() } : {}),
      email: email.trim().toLowerCase(),
      branch: branchName,
      branch_id: branchId,
      stream_session_id: sessionId,
      stream_started_at: Date.now(),
      attendance_type: type,
      ...(type === 'Single'
        ? { age_category: ageCategory }
        : {
            family_surname: formatFamilyName(familySurname),
            family_adult_count: adultCount,
            family_young_adult_count: youngAdultCount,
            family_youth_count: youthCount,
            family_children_count: childrenCount,
          }),
    };
    saveViewerSession(session);
    navigate('/stream');
  };

  return (
    <div className="auth-shell">
      {/* ── Mobile branding header ── */}
      <MobileAuthHeader />

      {/* ── Left brand panel (desktop only) ── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-panel__grid" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="/church-logo.jpg"
            alt="DLBC"
            className="h-24 w-24 rounded-full border-4 border-white/20 object-cover shadow-2xl"
          />
          <h1 className="mt-6 font-display text-3xl font-semibold text-white leading-snug">
            Deeper Life<br />Bible Church
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-white/50">
            Attendance Portal
          </p>

          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-sm font-medium text-white/80">Live Stream Active</span>
          </div>

          <div className="mt-auto pt-16 text-center">
            <p className="text-xs text-white/30 italic">
              "Not forsaking the assembling of ourselves together"
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/20">Hebrews 10:25</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="w-full max-w-md">
          <div className="mb-6 md:mb-8">
            <div className="mb-2 flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Join Service</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">Register Attendance</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Fill in your details to join the live stream.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/40 p-1">
              {(['Single', 'Family'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setType(opt)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    type === opt
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {type === 'Single' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} placeholder="Enter your full name" className="h-11" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email Address</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} placeholder="your@email.com" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Branch</Label>
              <BranchSelector value={branchId} onChange={(id, n) => { setBranchId(id); setBranchName(n); }} />
            </div>

            {type === 'Single' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Age Category</Label>
                <select
                  value={ageCategory}
                  onChange={(e) => setAgeCategory(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select age category...</option>
                  <option>Adult</option>
                  <option>Young Adult</option>
                  <option>Youth</option>
                  <option>Children</option>
                </select>
              </div>
            )}

            {type === 'Family' && (
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Family Surname</Label>
                  <Input value={familySurname} onChange={(e) => setFamilySurname(e.target.value)} placeholder="e.g. Adeyemi" maxLength={100} className="h-11" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Adults', val: adultCount, set: setAdultCount },
                    { label: 'Young Adults', val: youngAdultCount, set: setYoungAdultCount },
                    { label: 'Youth', val: youthCount, set: setYouthCount },
                    { label: 'Children', val: childrenCount, set: setChildrenCount },
                  ].map(({ label, val, set }) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" value={String(val)} onChange={(e) => set(parseCountInput(e.target.value))} className="h-10" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-[15px] font-semibold"
              disabled={(!name && type === 'Single') || (!familySurname.trim() && type === 'Family') || !email || !branchId || submitting}
            >
              {submitting ? <LoadingSpinner size="sm" className="text-current" /> : <ArrowRight className="h-5 w-5" />}
              {submitting ? 'Joining...' : 'Join Live Stream'}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="flex gap-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <a href="/attendance/login" className="hover:text-primary transition-colors">Staff Login</a>
              <span className="text-border">·</span>
              <a href="/admin/login" className="hover:text-primary transition-colors">Admin</a>
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
