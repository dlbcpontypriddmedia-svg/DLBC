import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, LogOut, RefreshCcw, Search } from 'lucide-react';
import { toast } from 'sonner';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import PDFExportButton from '@/components/PDFExportButton';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { formatFamilyName } from '@/lib/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';

interface AttendanceRecord {
  id: string; name: string | null; email: string; branch: string;
  stream_title: string; duration_seconds: number; timestamp: string;
  attendance_type: string; age_category: string | null; family_surname: string | null;
  family_adult_count: number | null; family_young_adult_count: number | null;
  family_youth_count: number | null; family_children_count: number | null;
}

const getErrorMessage = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const branchInfo = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('dlbc_staff_branch') || '{}'); } catch { return {}; }
  }, []);

  const realtimeSubscriptions = useMemo(() => (
    branchInfo.id
      ? [{ topic: `branch:${branchInfo.id}`, events: ['viewer_joined', 'viewer_left'] }, { topic: 'stream:global', events: ['stream_updated'] }]
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
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unauthorized')) { navigate('/attendance/login'); return; }
      toast.error(getErrorMessage(err, 'Unable to load attendance records.'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [dateFrom, dateTo, filterTitle, navigate, searchQuery]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useRealtimeRefresh({ subscriptions: realtimeSubscriptions, onRefresh: () => { void fetchData(); } });

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await api.logout(); localStorage.removeItem('dlbc_staff_branch'); navigate('/attendance/login'); }
    catch (err) { toast.error(getErrorMessage(err, 'Unable to log out.')); setLoggingOut(false); }
  };

  const fmt = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const summary = {
    total: records.reduce((sum, r) => sum + (r.attendance_type === 'Family' ? (r.family_adult_count || 0) + (r.family_young_adult_count || 0) + (r.family_youth_count || 0) + (r.family_children_count || 0) : 1), 0),
    adult: records.reduce((sum, r) => sum + (r.attendance_type === 'Family' ? (r.family_adult_count || 0) : (r.age_category === 'Adult' ? 1 : 0)), 0),
    youngAdult: records.reduce((sum, r) => sum + (r.attendance_type === 'Family' ? (r.family_young_adult_count || 0) : (r.age_category === 'Young Adult' ? 1 : 0)), 0),
    youth: records.reduce((sum, r) => sum + (r.attendance_type === 'Family' ? (r.family_youth_count || 0) : (r.age_category === 'Youth' ? 1 : 0)), 0),
    children: records.reduce((sum, r) => sum + (r.attendance_type === 'Family' ? (r.family_children_count || 0) : (r.age_category === 'Children' ? 1 : 0)), 0),
  };

  if (loading) return <PageLoader label="Loading attendance dashboard..." />;

  return (
    <div className="dash-shell">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <Logo />
            <div className="hidden sm:block h-5 w-px bg-border" />
            <span className="hidden sm:block truncate text-sm font-medium text-muted-foreground">{branchInfo.name || 'Staff Dashboard'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ActiveViewersCount branchId={branchInfo.id} iconOnly />
            <Button variant="ghost" size="icon" onClick={() => void fetchData(true)} disabled={refreshing} className="h-9 w-9 rounded-xl">
              {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={loggingOut} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              {loggingOut ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 md:py-8 space-y-5 md:space-y-6">
        {/* ── Page title ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Branch Attendance</p>
            <h1 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl md:text-3xl">Attendance Dashboard</h1>
          </div>
          <PDFExportButton records={records} branchName={branchInfo.name} serviceTitle={filterTitle || undefined} />
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Total', value: summary.total, accent: true },
            { label: 'Adults', value: summary.adult, accent: false },
            { label: 'Young Adults', value: summary.youngAdult, accent: false },
            { label: 'Youth', value: summary.youth, accent: false },
            { label: 'Children', value: summary.children, accent: false },
          ].map(({ label, value, accent }) => (
            <div key={label} className={`rounded-2xl border p-4 md:p-5 ${accent ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-white'}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
              <p className={`mt-2 text-2xl font-bold tabular-nums md:text-3xl ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters (collapsible on mobile) ── */}
        <div className="rounded-2xl border border-border/60 bg-white">
          {/* Filter toggle row */}
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3.5 md:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="text-sm font-semibold text-foreground">Filters</span>
            {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          <div className={`${filtersOpen ? 'block' : 'hidden'} border-t border-border/60 p-4 md:block md:border-0`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-end md:gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Service</p>
                <select value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} className="h-9 w-full rounded-xl border border-input bg-muted/40 px-3 text-sm md:w-auto md:min-w-[10rem]">
                  <option value="">All services</option>
                  {titles.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Search</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name or email" className="h-9 w-full pl-8 bg-muted/40 md:w-44" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">From</p>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-full bg-muted/40 md:w-36" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">To</p>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-full bg-muted/40 md:w-36" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="rounded-2xl border border-border/60 bg-white overflow-hidden">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">No records found</p>
              <p className="mt-1 text-sm text-muted-foreground">Records appear here when members join the stream.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold whitespace-nowrap">Name</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Email</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Type</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Service</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Duration</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.attendance_type === 'Family' ? formatFamilyName(r.family_surname) || 'Family' : r.name || 'Viewer'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${r.attendance_type === 'Family' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.attendance_type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{r.stream_title}</TableCell>
                      <TableCell className="tabular-nums text-sm whitespace-nowrap">{fmt(r.duration_seconds)}</TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground whitespace-nowrap">{new Date(r.timestamp).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
