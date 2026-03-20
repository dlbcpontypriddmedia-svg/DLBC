import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';

import BranchSelector from '@/components/BranchSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const AttendanceLogin = () => {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.staffAuth(branchId, password);
      localStorage.setItem('dlbc_staff_branch', JSON.stringify({ id: branchId, name: branchName }));
      navigate('/attendance/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="surface-panel flex flex-col justify-between p-8 text-center lg:text-left">
          <div className="space-y-6">
            <Logo className="justify-center lg:justify-start" />
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/75">Branch Attendance Desk</p>
              <h1 className="text-4xl font-semibold leading-tight text-foreground">Review branch records and export attendance reports securely.</h1>
              <p className="text-base text-muted-foreground">
                Staff access is limited to the assigned branch and uses the same server-mediated security model as the admin portal.
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-4 text-sm text-muted-foreground lg:justify-start">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Use your branch password to open the attendance dashboard and PDF export tools.
          </div>
        </section>

        <Card className="surface-panel border-none shadow-none">
          <CardContent className="p-8">
            <div className="mb-6 space-y-2 text-center">
              <h2 className="text-3xl font-semibold text-foreground">Staff Login</h2>
              <p className="text-sm text-muted-foreground">Access your branch attendance dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Branch</Label>
                <BranchSelector value={branchId} onChange={(id, nameValue) => { setBranchId(id); setBranchName(nameValue); }} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter staff password"
                  className="h-11 bg-white/80"
                />
              </div>
              {error && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-11 w-full rounded-xl" disabled={!branchId || !password || loading}>
                {loading ? <LoadingSpinner size="sm" className="text-current" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <a href="/" className="transition-colors hover:text-foreground">← Back to Join</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceLogin;
