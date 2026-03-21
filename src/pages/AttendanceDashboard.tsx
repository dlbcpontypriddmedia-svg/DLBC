import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCcw, Search } from 'lucide-react';
import { toast } from 'sonner';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import PDFExportButton from '@/components/PDFExportButton';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { formatFamilyName } from '@/lib/attendance';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';

interface AttendanceRecord {
  id: string;
  name: string | null;
  email: string;
  branch: string;
  stream_title: string;
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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const AttendanceDashboard = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [filterTitle, setFilterTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const branchInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('dlbc_staff_branch') || '{}');
    } catch {
      return {};
    }
  }, []);

  const realtimeSubscriptions = useMemo(() => (
    branchInfo.id
      ? [
          { topic: `branch:${branchInfo.id}`, events: ['viewer_joined', 'viewer_left'] },
          { topic: 'stream:global', events: ['stream_updated'] },
        ]
      : [{ topic: 'stream:global', events: ['stream_updated'] }]
  ), [branchInfo.id]);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const params: Record<string, string> = {};
      if (filterTitle) params.stream_title = filterTitle;
      if (searchQuery) params.q = searchQuery;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.getAttendanceData(params);
      setRecords(res.records || []);
      setTitles(res.titles || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Unauthorized')) {
        navigate('/attendance/login');
        return;
      }

      toast.error(getErrorMessage(err, 'Unable to load attendance records.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, filterTitle, navigate, searchQuery]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh({
    subscriptions: realtimeSubscriptions,
    onRefresh: () => {
      void fetchData();
    },
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
      localStorage.removeItem('dlbc_staff_branch');
      navigate('/attendance/login');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to log out right now.'));
      setLoggingOut(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const summary = {
    total: records.reduce((sum, record) => {
      if (record.attendance_type === 'Family') {
        return sum
          + (record.family_adult_count || 0)
          + (record.family_young_adult_count || 0)
          + (record.family_youth_count || 0)
          + (record.family_children_count || 0);
      }
      return sum + 1;
    }, 0),
    adult: records.reduce((sum, record) => {
      if (record.attendance_type === 'Family') return sum + (record.family_adult_count || 0);
      return sum + (record.age_category === 'Adult' ? 1 : 0);
    }, 0),
    youngAdult: records.reduce((sum, record) => {
      if (record.attendance_type === 'Family') return sum + (record.family_young_adult_count || 0);
      return sum + (record.age_category === 'Young Adult' ? 1 : 0);
    }, 0),
    youth: records.reduce((sum, record) => {
      if (record.attendance_type === 'Family') return sum + (record.family_youth_count || 0);
      return sum + (record.age_category === 'Youth' ? 1 : 0);
    }, 0),
    children: records.reduce((sum, record) => {
      if (record.attendance_type === 'Family') return sum + (record.family_children_count || 0);
      return sum + (record.age_category === 'Children' ? 1 : 0);
    }, 0),
  };

  if (loading) return <PageLoader label="Loading attendance dashboard..." />;

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <span className="rounded-full border border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-sm font-medium text-foreground">
              {branchInfo.name || 'Staff Dashboard'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ActiveViewersCount branchId={branchInfo.id} iconOnly />
            <Button variant="outline" size="icon" onClick={() => void fetchData(true)} disabled={refreshing} aria-label="Refresh attendance data">
              {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout} disabled={loggingOut} aria-label="Logout">
              {loggingOut ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="space-y-4">
          <section className="surface-panel p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/75">Branch Attendance</p>
                <h1 className="text-3xl font-semibold text-foreground">Attendance Dashboard</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review branch records, filter service sessions, and export reports for follow-up.
                </p>
              </div>

              <div className="grid w-full gap-3 md:w-auto md:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Service</label>
                  <select
                    value={filterTitle}
                    onChange={(e) => setFilterTitle(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-white/80 px-3 text-sm md:min-w-[11rem]"
                  >
                    <option value="">All services</option>
                    {titles.map((title) => <option key={title} value={title}>{title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Search</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name or email" className="h-10 w-full bg-white/80 pl-9 md:min-w-[12rem]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full bg-white/80 md:min-w-[9rem]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full bg-white/80 md:min-w-[9rem]" />
                </div>
                <Button variant="outline" size="sm" onClick={() => void fetchData(true)} disabled={refreshing}>
                  {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <PDFExportButton records={records} branchName={branchInfo.name} serviceTitle={filterTitle || undefined} />
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Total', value: summary.total },
              { label: 'Adult', value: summary.adult },
              { label: 'Young Adult', value: summary.youngAdult },
              { label: 'Youth', value: summary.youth },
              { label: 'Children', value: summary.children },
            ].map(({ label, value }) => (
              <Card key={label} className="surface-panel border-none shadow-none">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="surface-panel border-none shadow-none">
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
                  <p className="text-base font-semibold text-foreground">No attendance records found</p>
                  <p className="mt-1">Records will appear here when members join the stream.</p>
                </div>
              ) : (
                <Table className="min-w-[720px]">
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
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.attendance_type === 'Family'
                            ? formatFamilyName(record.family_surname) || 'Family'
                            : record.name || 'Viewer'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            record.attendance_type === 'Family'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {record.attendance_type}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{record.stream_title}</TableCell>
                        <TableCell className="tabular-nums">{formatDuration(record.duration_seconds)}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
