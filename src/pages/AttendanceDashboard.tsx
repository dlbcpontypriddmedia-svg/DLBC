import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import Logo from '@/components/Logo';
import PDFExportButton from '@/components/PDFExportButton';
import ActiveViewersCount from '@/components/ActiveViewersCount';
import { api } from '@/lib/api';

interface AttendanceRecord {
  id: string;
  name: string;
  email: string;
  branch: string;
  stream_title: string;
  start_time: string;
  last_seen_at: string;
  duration_seconds: number;
  timestamp: string;
  attendance_type: string;
  age_category: string | null;
  family_surname: string | null;
  family_adult_count: number | null;
  family_young_adult_count: number | null;
  family_youth_count: number | null;
  family_children_count: number | null;
}

const AttendanceDashboard = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const branchInfo = (() => {
    try { return JSON.parse(localStorage.getItem('dlbc_staff_branch') || '{}'); } catch { return {}; }
  })();

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterTitle) params.stream_title = filterTitle;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.getAttendanceData(params);
      setRecords(res.records || []);
      setTitles(res.titles || []);
      setSettings(res.settings);
    } catch (err: any) {
      if (err.message?.includes('Unauthorized')) {
        navigate('/attendance/login');
      }
    } finally {
      setLoading(false);
    }
  }, [filterTitle, dateFrom, dateTo, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await api.logout();
    localStorage.removeItem('dlbc_staff_branch');
    navigate('/attendance/login');
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Summary counts
  const summary = {
    total: records.length,
    adults: records.filter(r => r.age_category === 'Adult' || r.attendance_type === 'Family').length,
    youngAdults: records.filter(r => r.age_category === 'Young Adult').length,
    youth: records.filter(r => r.age_category === 'Youth').length,
    children: records.filter(r => r.age_category === 'Children').length,
    families: records.filter(r => r.attendance_type === 'Family').length,
    totalFamilyMembers: records.filter(r => r.attendance_type === 'Family').reduce((sum, r) =>
      sum + (r.family_adult_count || 0) + (r.family_young_adult_count || 0) + (r.family_youth_count || 0) + (r.family_children_count || 0), 0),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-sm font-medium text-muted-foreground">{branchInfo.name || 'Staff'}</span>
        </div>
        <div className="flex items-center gap-3">
          <ActiveViewersCount branchId={branchInfo.id} />
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <h1 className="text-xl font-bold text-foreground" style={{ lineHeight: '1.1' }}>Attendance Dashboard</h1>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Total Records', value: summary.total },
              { label: 'Families', value: summary.families },
              { label: 'Youth', value: summary.youth },
              { label: 'Family Members', value: summary.totalFamilyMembers },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Service</label>
              <select
                value={filterTitle}
                onChange={e => setFilterTitle(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All services</option>
                {titles.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                  <p>No attendance records found</p>
                  <p className="text-xs mt-1">Records will appear here when members join the stream.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.attendance_type === 'Family' ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {r.attendance_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.stream_title}</TableCell>
                        <TableCell className="tabular-nums">{formatDuration(r.duration_seconds)}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{new Date(r.timestamp).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AttendanceDashboard;
