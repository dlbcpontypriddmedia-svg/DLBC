import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.adminAuth(password);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="surface-panel w-full max-w-xl border-none shadow-none">
        <CardContent className="p-8 md:p-10">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Logo />
            <h1 className="text-4xl font-semibold leading-tight text-foreground">Admin Login</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
                className="h-11 bg-white/80"
              />
            </div>
            {error && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={!password || loading}>
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
  );
};

export default AdminLogin;
