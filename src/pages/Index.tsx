import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import BranchSelector from '@/components/BranchSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      attendance_type: type,
      ...(type === 'Single'
        ? { age_category: ageCategory }
        : {
            family_surname: familySurname,
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
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10 md:px-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="surface-panel flex flex-col justify-center p-8 md:p-10 lg:min-h-[760px]">
          <div className="space-y-6">
            <Logo className="justify-center md:justify-start" />

            <div className="space-y-4 text-center md:text-left">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-foreground md:text-5xl">
                Join Live Service
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Fill in your details to continue.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-panel flex flex-col p-6 md:p-8 lg:min-h-[760px]">
          <div className="mb-6 space-y-2 text-center">
            <h2 className="text-3xl font-semibold text-foreground">Join Live Service</h2>
          </div>

          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-2 rounded-2xl border border-primary/10 bg-muted/40 p-1 sm:grid-cols-2">
                {(['Single', 'Family'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all ${
                      type === option
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-white hover:text-foreground'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {type === 'Single' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Enter your name"
                    className="h-11 bg-white/80"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="your@email.com"
                  className="h-11 bg-white/80"
                />
              </div>

              <div className="space-y-2">
                <Label>Branch</Label>
                <BranchSelector value={branchId} onChange={(id, nameValue) => { setBranchId(id); setBranchName(nameValue); }} />
              </div>

              {type === 'Single' && (
                <div className="space-y-2">
                  <Label>Age Category</Label>
                  <select
                    value={ageCategory}
                    onChange={(e) => setAgeCategory(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white/80 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select age category...</option>
                    <option value="Adult">Adult</option>
                    <option value="Young Adult">Young Adult</option>
                    <option value="Youth">Youth</option>
                    <option value="Children">Children</option>
                  </select>
                </div>
              )}

              {type === 'Family' && (
                <div className="space-y-4 rounded-2xl border border-primary/10 bg-muted/35 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="surname">Family Surname</Label>
                    <Input
                      id="surname"
                      value={familySurname}
                      onChange={(e) => setFamilySurname(e.target.value)}
                      placeholder="Family surname"
                      maxLength={100}
                      className="h-11 bg-white/80"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Adults', val: adultCount, set: setAdultCount },
                      { label: 'Young Adults', val: youngAdultCount, set: setYoungAdultCount },
                      { label: 'Youth', val: youthCount, set: setYouthCount },
                      { label: 'Children', val: childrenCount, set: setChildrenCount },
                    ].map(({ label, val, set }) => (
                      <div key={label} className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={val}
                          onChange={(e) => set(Number(e.target.value))}
                          className="h-11 bg-white/80"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-xl text-base"
                size="lg"
                disabled={(!name && type === 'Single') || (!familySurname.trim() && type === 'Family') || !email || !branchId || submitting}
              >
                {submitting ? <LoadingSpinner size="sm" className="text-current" /> : <ArrowRight className="h-4 w-4" />}
                {submitting ? 'Joining stream...' : 'Join Stream'}
              </Button>
            </form>
          </div>

          <p className="mt-6 shrink-0 text-center text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <a href="/attendance/login" className="transition-colors hover:text-foreground">Staff Login</a>
            {' · '}
            <a href="/admin/login" className="transition-colors hover:text-foreground">Admin Portal</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Index;
