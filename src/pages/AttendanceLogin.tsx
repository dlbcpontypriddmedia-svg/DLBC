import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import BranchSelector from '@/components/BranchSelector';
import Logo from '@/components/Logo';
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
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground" style={{ lineHeight: '1.1' }}>
              Staff Login
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Access your branch attendance dashboard.
            </p>
          </div>
        </div>

        <Card className="shadow-md shadow-primary/5">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <BranchSelector value={branchId} onChange={(id, name) => { setBranchId(id); setBranchName(name); }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter staff password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={!branchId || !password || loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">← Back to Join</a>
        </p>
      </div>
    </div>
  );
};

export default AttendanceLogin;
