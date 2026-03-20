import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import BranchSelector from '@/components/BranchSelector';
import Logo from '@/components/Logo';
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
    if (!name || !email || !branchId) return;

    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const session: ViewerSession = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      branch: branchName,
      branch_id: branchId,
      stream_session_id: sessionId,
      attendance_type: type,
      ...(type === 'Single' ? { age_category: ageCategory } : {
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ lineHeight: '1.1' }}>
              Join Live Service
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Fill in your details to join the live stream and mark your attendance.
            </p>
          </div>
        </div>

        <Card className="shadow-md shadow-primary/5">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg border border-input p-1 gap-1">
                {(['Single', 'Family'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      type === t
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">{type === 'Family' ? 'Contact Name' : 'Full Name'}</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required maxLength={200} placeholder="Enter your name" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={200} placeholder="your@email.com" />
              </div>

              <div className="space-y-1.5">
                <Label>Branch</Label>
                <BranchSelector value={branchId} onChange={(id, name) => { setBranchId(id); setBranchName(name); }} />
              </div>

              {type === 'Single' && (
                <div className="space-y-1.5">
                  <Label>Age Category</Label>
                  <select
                    value={ageCategory}
                    onChange={e => setAgeCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <div className="space-y-4 rounded-lg border border-input p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="surname">Family Surname</Label>
                    <Input id="surname" value={familySurname} onChange={e => setFamilySurname(e.target.value)} placeholder="Family surname" maxLength={100} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Adults', val: adultCount, set: setAdultCount },
                      { label: 'Young Adults', val: youngAdultCount, set: setYoungAdultCount },
                      { label: 'Youth', val: youthCount, set: setYouthCount },
                      { label: 'Children', val: childrenCount, set: setChildrenCount },
                    ].map(({ label, val, set }) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input type="number" min={0} max={50} value={val} onChange={e => set(Number(e.target.value))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={!name || !email || !branchId || submitting}>
                Join Stream
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/attendance/login" className="hover:text-foreground transition-colors">Staff Login</a>
          {' · '}
          <a href="/admin/login" className="hover:text-foreground transition-colors">Admin</a>
        </p>
      </div>
    </div>
  );
};

export default Index;
