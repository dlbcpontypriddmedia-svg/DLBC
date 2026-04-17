import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users2 } from 'lucide-react';

import BranchSelector from '@/components/BranchSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import MobileAuthHeader from '@/components/MobileAuthHeader';
import { Button } from '@/components/ui/button';
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
    <div className="auth-shell">
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
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Users2 className="h-5 w-5 text-sky-300" />
              <span className="text-sm font-semibold">Staff Access</span>
            </div>
            <p className="mt-1 text-xs text-white/40">For branch staff and coordinators</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="w-full max-w-md">
          <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors md:mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Join
          </a>

          <div className="mb-6 md:mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 md:h-14 md:w-14">
              <Users2 className="h-6 w-6 text-primary md:h-7 md:w-7" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">Staff Login</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to view your branch attendance records.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Branch</Label>
              <BranchSelector value={branchId} onChange={(id, n) => { setBranchId(id); setBranchName(n); }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Staff Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter staff password"
                className="h-11"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="h-12 w-full rounded-xl text-[15px] font-semibold" disabled={!branchId || !password || loading}>
              {loading && <LoadingSpinner size="sm" className="text-current" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLogin;
