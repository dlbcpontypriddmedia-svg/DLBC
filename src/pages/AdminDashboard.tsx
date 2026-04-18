import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CalendarDays, ChevronDown, ChevronUp, LogOut, Plus, RadioTower, RefreshCcw, Save, Search, ShieldCheck, TimerReset, Trash2, Users2, Video } from 'lucide-react';
import { toast } from 'sonner';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import ConfirmDialog from '@/components/ConfirmDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import PDFExportButton from '@/components/PDFExportButton';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { formatFamilyName } from '@/lib/attendance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';

interface Branch { id: string; name: string; attendance_count?: number; staff_count?: number; }
interface AdminSettings {
  youtube_channel_id?: string | null; youtube_url?: string | null; check_day?: string | null;
  check_start_time?: string | null; check_end_time?: string | null;
  auto_attendance_duration_hours?: number | null; check_interval_minutes?: number | null;
  is_attendance_active?: boolean | null; stream_title?: string | null; last_api_check_time?: string | null;
}
interface AttendanceRecord {
  id: string; name: string | null; email: string; branch: string; stream_title: string;
  duration_seconds: number; timestamp: string; attendance_type: string; family_surname?: string | null;
}
interface StaffAccount { id: string; branch_id: string; created_at: string; }
type TabId = 'stream' | 'attendance' | 'branches' | 'staff';
type PendingConfirm =
  | { type: 'delete-branch'; id: string; title: string; description: string }
  | { type: 'delete-staff'; id: string; title: string; description: string }
  | { type: 'merge-branch'; id: string; title: string; description: string }
  | null;

const errMsg = (e: unknown, fb: string) => e instanceof Error ? e.message : fb;

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'stream', label: 'Stream', icon: Video },
  { id: 'attendance', label: 'Attendance', icon: Users2 },
  { id: 'branches', label: 'Branches', icon: CalendarDays },
  { id: 'staff', label: 'Staff', icon: ShieldCheck },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [checkingLive, setCheckingLive] = useState(false);
  const [togglingAttendance, setTogglingAttendance] = useState(false);
  const [addingBranch, setAddingBranch] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [filterTitle, setFilterTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [mergeSourceBranch, setMergeSourceBranch] = useState('');
  const [mergeTargetBranch, setMergeTargetBranch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('stream');
  const [channelId, setChannelId] = useState('');
  const [checkDay, setCheckDay] = useState('Sunday');
  const [checkStart, setCheckStart] = useState('09:00');
  const [checkEnd, setCheckEnd] = useState('18:00');
  const [autoDuration, setAutoDuration] = useState(4);
  const [checkInterval, setCheckInterval] = useState(5);
  const [manualUrl, setManualUrl] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [mergingBranch, setMergingBranch] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const realtimeSubscriptions = useMemo(() => [
    { topic: 'admin:attendance', events: ['attendance_changed'] },
    { topic: 'admin:workspace', events: ['workspace_updated'] },
    { topic: 'stream:global', events: ['stream_updated'] },
  ], []);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [settingsRes, branchesRes, dataRes, staffRes] = await Promise.all([
        api.adminAction('get_settings'), api.adminAction('get_branches'),
        api.getAttendanceData({ ...(filterTitle ? { stream_title: filterTitle } : {}), ...(searchQuery ? { q: searchQuery } : {}), ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }),
        api.adminAction('get_staff'),
      ]);
      const s = settingsRes.settings;
      setSettings(s); setChannelId(s?.youtube_channel_id || ''); setCheckDay(s?.check_day || 'Sunday');
      setCheckStart(s?.check_start_time || '09:00'); setCheckEnd(s?.check_end_time || '18:00');
      setAutoDuration(s?.auto_attendance_duration_hours || 4); setCheckInterval(s?.check_interval_minutes || 5);
      setManualUrl(s?.youtube_url || ''); setBranches(branchesRes.branches || []);
      setRecords(dataRes.records || []); setTitles(dataRes.titles || []); setStaffList(staffRes.staff || []);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unauthorized')) { navigate('/admin/login'); return; }
      toast.error(errMsg(err, 'Unable to load the admin dashboard.'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [dateFrom, dateTo, filterTitle, navigate, searchQuery]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);
  useRealtimeRefresh({ subscriptions: realtimeSubscriptions, onRefresh: () => { void fetchAll(); } });

  const handleLogout = async () => { setLoggingOut(true); try { await api.logout(); navigate('/admin/login'); } catch (err) { toast.error(errMsg(err, 'Unable to log out.')); setLoggingOut(false); } };
  const saveSettings = async () => { setSavingSettings(true); try { await api.adminAction('update_settings', { settings: { youtube_channel_id: channelId, youtube_url: manualUrl, check_day: checkDay, check_start_time: checkStart, check_end_time: checkEnd, auto_attendance_duration_hours: autoDuration, check_interval_minutes: checkInterval } }); toast.success('Settings saved.'); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to save settings.')); } finally { setSavingSettings(false); } };
  const toggleAttendance = async () => { setTogglingAttendance(true); try { if (settings?.is_attendance_active) { await api.adminAction('stop_attendance'); toast.success('Attendance stopped.'); } else { await api.adminAction('start_attendance', { auto_stop_at: new Date(Date.now() + autoDuration * 3600000).toISOString() }); toast.success('Attendance started.'); } await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to update attendance.')); } finally { setTogglingAttendance(false); } };
  const checkLiveNow = async () => { setCheckingLive(true); try { const r = await api.adminAction('check_live_now'); const a = r?.action; if (a === 'live_detected') toast.success(`Live: ${r.title}`); else if (a === 'already_tracking') toast.success('Already tracking a live stream.'); else if (a === 'no_live_stream') toast.message('No live stream detected.'); else if (a === 'skipped') toast.message(`Skipped: ${String(r.reason || '').replaceAll('_', ' ')}`); else if (a === 'auto_stopped') toast.success('Auto-stop applied.'); else toast.message('Live check complete.'); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to check live status.')); } finally { setCheckingLive(false); } };
  const addBranch = async () => { if (!newBranch.trim()) return; setAddingBranch(true); try { await api.adminAction('create_branch', { name: newBranch.trim() }); setNewBranch(''); toast.success('Branch created.'); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to create branch.')); } finally { setAddingBranch(false); } };
  const deleteBranch = async (id: string) => { setDeletingBranchId(id); try { await api.adminAction('delete_branch', { id }); toast.success('Branch deleted.'); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to delete branch.')); } finally { setDeletingBranchId(null); } };
  const addStaff = async () => { if (!newStaffBranch || !newStaffPassword) return; setAddingStaff(true); try { await api.adminAction('create_staff', { branch_id: newStaffBranch, password: newStaffPassword }); setNewStaffPassword(''); toast.success('Staff account created.'); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to create staff.')); } finally { setAddingStaff(false); } };
  const mergeBranch = async () => { if (!mergeSourceBranch || !mergeTargetBranch || mergeSourceBranch === mergeTargetBranch) return; setMergingBranch(true); try { const r = await api.adminAction('merge_branch', { source_branch_id: mergeSourceBranch, target_branch_id: mergeTargetBranch }); toast.success(`Merged ${r.merged_from} into ${r.merged_into}.`); setMergeSourceBranch(''); setMergeTargetBranch(''); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to merge branches.')); } finally { setMergingBranch(false); } };
  const deleteStaff = async (id: string) => { setDeletingStaffId(id); try { await api.adminAction('delete_staff', { id }); toast.success('Staff deleted.'); await fetchAll(); } catch (err) { toast.error(errMsg(err, 'Unable to delete staff.')); } finally { setDeletingStaffId(null); } };

  const fmt = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const totalWatch = records.reduce((s, r) => s + (r.duration_seconds || 0), 0);
  const confirmLoading = pendingConfirm?.type === 'delete-branch' ? Boolean(deletingBranchId === pendingConfirm.id) : pendingConfirm?.type === 'delete-staff' ? Boolean(deletingStaffId === pendingConfirm.id) : pendingConfirm?.type === 'merge-branch' ? mergingBranch : false;

  const sel = "flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  if (loading) return <PageLoader label="Loading admin workspace..." />;

  return (
    <div className="dash-shell">
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(open) => { if (!open && !confirmLoading) setPendingConfirm(null); }}
        title={pendingConfirm?.title || 'Confirm action'}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.type === 'delete-staff' ? 'Delete Staff' : pendingConfirm?.type === 'merge-branch' ? 'Merge Branches' : 'Delete Branch'}
        destructive loading={confirmLoading}
        onConfirm={() => {
          if (!pendingConfirm) return;
          if (pendingConfirm.type === 'delete-branch') { void deleteBranch(pendingConfirm.id).finally(() => setPendingConfirm(null)); return; }
          if (pendingConfirm.type === 'merge-branch') { void mergeBranch().finally(() => setPendingConfirm(null)); return; }
          void deleteStaff(pendingConfirm.id).finally(() => setPendingConfirm(null));
        }}
      />

      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <Logo />
            <div className="hidden sm:block h-5 w-px bg-border" />
            <span className="hidden sm:inline-flex shrink-0 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">Administrator</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ActiveViewersCount iconOnly />
            <Button variant="ghost" size="icon" onClick={() => void fetchAll(true)} disabled={refreshing} className="h-9 w-9 rounded-xl">
              {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={loggingOut} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              {loggingOut ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 md:py-8 space-y-5 md:space-y-6">
        {/* ── Metrics ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Control Center</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl md:text-3xl">Admin Dashboard</h1>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Users2, label: 'Total Records', value: records.length, color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: TimerReset, label: 'Watch Time', value: fmt(totalWatch), color: 'text-violet-600', bg: 'bg-violet-50' },
              { icon: CalendarDays, label: 'Branches', value: branches.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { icon: ShieldCheck, label: 'Staff', value: staffList.length, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="card-metric">
                <div className={`card-metric__icon ${bg} mb-3`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground md:text-2xl">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tab-bar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`tab-btn flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-1.5 ${activeTab === id ? 'active' : ''}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Stream tab ── */}
        {activeTab === 'stream' && (
          <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-white p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current Broadcast</p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-foreground md:text-xl">Stream Operations</h2>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${settings?.is_attendance_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {settings?.is_attendance_active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {settings?.is_attendance_active ? 'Attendance Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Stream Title', value: settings?.stream_title || 'No title yet' },
                    { label: 'Last API Check', value: settings?.last_api_check_time ? new Date(settings.last_api_check_time).toLocaleString() : 'Not checked' },
                    { label: 'Manual URL', value: settings?.youtube_url || 'Not set' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                      <p className="mt-1 text-sm font-medium text-foreground truncate" title={value}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button size="sm" variant={settings?.is_attendance_active ? 'destructive' : 'default'} onClick={toggleAttendance} disabled={togglingAttendance}>
                    {togglingAttendance && <LoadingSpinner size="sm" className="text-current" />}
                    {togglingAttendance ? 'Updating...' : settings?.is_attendance_active ? 'Stop Attendance' : 'Start Attendance'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={checkLiveNow} disabled={checkingLive}>
                    {checkingLive ? <LoadingSpinner size="sm" className="text-current" /> : <RadioTower className="h-4 w-4" />}
                    {checkingLive ? 'Checking...' : 'Check Live Now'}
                  </Button>
                </div>
              </div>
            </div>

            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Automation</p>
                <CardTitle className="font-display text-lg md:text-xl">Auto-Detection Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { label: 'YouTube Channel ID', value: channelId, set: setChannelId, placeholder: 'UCxxxxxxx', type: 'text', span: 1 },
                    { label: 'Manual YouTube URL', value: manualUrl, set: setManualUrl, placeholder: 'https://youtube.com/...', type: 'text', span: 1 },
                  ].map(({ label, value, set, placeholder, type }) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-sm">{label}</Label>
                      <Input type={type} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="h-10 bg-white" />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Check Day</Label>
                    <select value={checkDay} onChange={(e) => setCheckDay(e.target.value)} className={sel}>
                      {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Check Interval (mins)</Label>
                    <Input type="number" value={checkInterval} onChange={(e) => setCheckInterval(Number(e.target.value))} min={1} max={60} className="h-10 bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Start Time</Label>
                    <Input type="time" value={checkStart} onChange={(e) => setCheckStart(e.target.value)} className="h-10 bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">End Time</Label>
                    <Input type="time" value={checkEnd} onChange={(e) => setCheckEnd(e.target.value)} className="h-10 bg-white" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm">Auto Duration (hours)</Label>
                    <Input type="number" value={autoDuration} onChange={(e) => setAutoDuration(Number(e.target.value))} min={1} max={12} className="h-10 bg-white" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
                  <Button onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? <LoadingSpinner size="sm" className="text-current" /> : <Save className="h-4 w-4" />}
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button variant="outline" onClick={checkLiveNow} disabled={checkingLive}>
                    {checkingLive ? <LoadingSpinner size="sm" className="text-current" /> : <RadioTower className="h-4 w-4" />}
                    {checkingLive ? 'Checking...' : 'Run Live Check'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Attendance tab ── */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 md:space-y-5">
            {/* Filters — collapsible on mobile */}
            <div className="rounded-2xl border border-border/60 bg-white">
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void fetchAll(true)} disabled={refreshing}>
                      {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
                    </Button>
                    <PDFExportButton records={records} serviceTitle={filterTitle || undefined} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Filtered Records', v: records.length }, { label: 'Services', v: titles.length }, { label: 'Watch Time', v: fmt(totalWatch) }].map(({ label, v }) => (
                <div key={label} className="card-metric">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground md:text-2xl">{v}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/60 bg-white overflow-hidden">
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="font-semibold text-foreground">No records found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Records appear after viewers join the stream.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        {['Name','Email','Branch','Type','Service','Duration','Date'].map((h) => <TableHead key={h} className="font-semibold whitespace-nowrap">{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium whitespace-nowrap">{r.attendance_type === 'Family' ? formatFamilyName(r.family_surname) || 'Family' : r.name || 'Viewer'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.branch}</TableCell>
                          <TableCell><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${r.attendance_type === 'Family' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{r.attendance_type}</span></TableCell>
                          <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">{r.stream_title}</TableCell>
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
        )}

        {/* ── Branches tab ── */}
        {activeTab === 'branches' && (
          <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg md:text-xl">Add Branch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Branch Name</Label>
                  <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Enter branch name" className="h-10 bg-white" />
                </div>
                <Button onClick={addBranch} disabled={!newBranch.trim() || addingBranch}>
                  {addingBranch ? <LoadingSpinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />}
                  {addingBranch ? 'Adding...' : 'Add Branch'}
                </Button>

                <div className="border-t border-border/60 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Merge Branches</p>
                  </div>
                  <select value={mergeSourceBranch} onChange={(e) => setMergeSourceBranch(e.target.value)} className={sel}>
                    <option value="">Merge from...</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select value={mergeTargetBranch} onChange={(e) => setMergeTargetBranch(e.target.value)} className={sel}>
                    <option value="">Merge into...</option>
                    {branches.filter((b) => b.id !== mergeSourceBranch).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <Button variant="outline" className="w-full sm:w-auto" disabled={!mergeSourceBranch || !mergeTargetBranch || mergeSourceBranch === mergeTargetBranch || mergingBranch}
                    onClick={() => {
                      const sn = branches.find((b) => b.id === mergeSourceBranch)?.name || 'source';
                      const tn = branches.find((b) => b.id === mergeTargetBranch)?.name || 'target';
                      setPendingConfirm({ type: 'merge-branch', id: mergeSourceBranch, title: 'Merge branches?', description: `Records and staff from ${sn} will move to ${tn}. The source branch will be removed.` });
                    }}>
                    {mergingBranch ? <LoadingSpinner size="sm" className="text-current" /> : <ArrowRightLeft className="h-4 w-4" />}
                    Merge Branch
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader className="pb-2"><CardTitle className="font-display text-lg md:text-xl">All Branches</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold w-28">Records</TableHead>
                        <TableHead className="font-semibold w-28">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground">No branches yet.</TableCell></TableRow>
                      ) : branches.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{b.attendance_count || 0}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingBranchId === b.id || (b.attendance_count || 0) > 0 || (b.staff_count || 0) > 0}
                              onClick={() => setPendingConfirm({ type: 'delete-branch', id: b.id, title: 'Delete branch?', description: `This will remove ${b.name} from the branch list.` })}>
                              {deletingBranchId === b.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                              {(b.attendance_count || 0) > 0 ? 'Has History' : (b.staff_count || 0) > 0 ? 'Has Staff' : deletingBranchId === b.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Staff tab ── */}
        {activeTab === 'staff' && (
          <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader className="pb-2"><CardTitle className="font-display text-lg md:text-xl">Add Staff Account</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <select value={newStaffBranch} onChange={(e) => setNewStaffBranch(e.target.value)} className={sel}>
                    <option value="">Select branch...</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Staff Password</Label>
                  <Input type="password" value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} placeholder="Enter password" className="h-10 bg-white" autoComplete="new-password" />
                </div>
                <Button onClick={addStaff} disabled={!newStaffBranch || !newStaffPassword || addingStaff}>
                  {addingStaff ? <LoadingSpinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />}
                  {addingStaff ? 'Creating...' : 'Add Staff'}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader className="pb-2"><CardTitle className="font-display text-lg md:text-xl">Staff Accounts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold">Branch</TableHead>
                        <TableHead className="font-semibold whitespace-nowrap">Created</TableHead>
                        <TableHead className="font-semibold w-28">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground">No staff accounts yet.</TableCell></TableRow>
                      ) : staffList.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{branches.find((b) => b.id === s.branch_id)?.name || s.branch_id}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingStaffId === s.id}
                              onClick={() => setPendingConfirm({ type: 'delete-staff', id: s.id, title: 'Delete staff account?', description: 'This will remove the selected staff account.' })}>
                              {deletingStaffId === s.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                              {deletingStaffId === s.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
