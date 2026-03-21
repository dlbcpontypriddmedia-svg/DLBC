import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CalendarDays, LogOut, Plus, RadioTower, RefreshCcw, Save, Search, ShieldCheck, TimerReset, Trash2, Users2, Video } from 'lucide-react';
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

interface Branch {
  id: string;
  name: string;
  attendance_count?: number;
  staff_count?: number;
}

interface AdminSettings {
  youtube_channel_id?: string | null;
  youtube_url?: string | null;
  check_day?: string | null;
  check_start_time?: string | null;
  check_end_time?: string | null;
  auto_attendance_duration_hours?: number | null;
  check_interval_minutes?: number | null;
  is_attendance_active?: boolean | null;
  stream_title?: string | null;
  last_api_check_time?: string | null;
}

interface AttendanceRecord {
  id: string;
  name: string | null;
  email: string;
  branch: string;
  stream_title: string;
  duration_seconds: number;
  timestamp: string;
  attendance_type: string;
  family_surname?: string | null;
}

interface StaffAccount {
  id: string;
  branch_id: string;
  created_at: string;
}

type TabId = 'stream' | 'attendance' | 'branches' | 'staff';
type PendingConfirm =
  | { type: 'delete-branch'; id: string; title: string; description: string }
  | { type: 'delete-staff'; id: string; title: string; description: string }
  | { type: 'merge-branch'; id: string; title: string; description: string }
  | null;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
  const realtimeSubscriptions = useMemo(() => [
    { topic: 'admin:attendance', events: ['attendance_changed'] },
    { topic: 'admin:workspace', events: ['workspace_updated'] },
    { topic: 'stream:global', events: ['stream_updated'] },
  ], []);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [settingsRes, branchesRes, dataRes, staffRes] = await Promise.all([
        api.adminAction('get_settings'),
        api.adminAction('get_branches'),
        api.getAttendanceData({
          ...(filterTitle ? { stream_title: filterTitle } : {}),
          ...(searchQuery ? { q: searchQuery } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
        }),
        api.adminAction('get_staff'),
      ]);

      const nextSettings = settingsRes.settings;
      setSettings(nextSettings);
      setChannelId(nextSettings?.youtube_channel_id || '');
      setCheckDay(nextSettings?.check_day || 'Sunday');
      setCheckStart(nextSettings?.check_start_time || '09:00');
      setCheckEnd(nextSettings?.check_end_time || '18:00');
      setAutoDuration(nextSettings?.auto_attendance_duration_hours || 4);
      setCheckInterval(nextSettings?.check_interval_minutes || 5);
      setManualUrl(nextSettings?.youtube_url || '');

      setBranches(branchesRes.branches || []);
      setRecords(dataRes.records || []);
      setTitles(dataRes.titles || []);
      setStaffList(staffRes.staff || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Unauthorized')) {
        navigate('/admin/login');
        return;
      }

      toast.error(getErrorMessage(err, 'Unable to load the admin dashboard.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, filterTitle, navigate, searchQuery]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useRealtimeRefresh({
    subscriptions: realtimeSubscriptions,
    onRefresh: () => {
      void fetchAll();
    },
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
      navigate('/admin/login');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to log out right now.'));
      setLoggingOut(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.adminAction('update_settings', {
        settings: {
          youtube_channel_id: channelId,
          youtube_url: manualUrl,
          check_day: checkDay,
          check_start_time: checkStart,
          check_end_time: checkEnd,
          auto_attendance_duration_hours: autoDuration,
          check_interval_minutes: checkInterval,
        },
      });
      toast.success('Auto-detection settings saved.');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to save settings.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleAttendance = async () => {
    setTogglingAttendance(true);
    try {
      if (settings?.is_attendance_active) {
        await api.adminAction('stop_attendance');
        toast.success('Attendance has been stopped.');
      } else {
        const stopAt = new Date(Date.now() + autoDuration * 3600000).toISOString();
        await api.adminAction('start_attendance', { auto_stop_at: stopAt });
        toast.success('Attendance has been started.');
      }
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to update attendance state.'));
    } finally {
      setTogglingAttendance(false);
    }
  };

  const checkLiveNow = async () => {
    setCheckingLive(true);
    try {
      const result = await api.adminAction('check_live_now');
      const action = result?.action;
      if (action === 'live_detected') {
        toast.success(`Live stream detected: ${result.title}`);
      } else if (action === 'already_tracking') {
        toast.success('A live stream is already being tracked.');
      } else if (action === 'no_live_stream') {
        toast.message('No live stream detected on the configured YouTube channel.');
      } else if (action === 'skipped') {
        toast.message(`Check skipped: ${String(result.reason || 'conditions not met').replaceAll('_', ' ')}`);
      } else if (action === 'auto_stopped') {
        toast.success('Attendance auto-stop was applied successfully.');
      } else {
        toast.message('Live check completed.');
      }
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to check YouTube live status.'));
    } finally {
      setCheckingLive(false);
    }
  };

  const addBranch = async () => {
    if (!newBranch.trim()) return;
    setAddingBranch(true);
    try {
      await api.adminAction('create_branch', { name: newBranch.trim() });
      setNewBranch('');
      toast.success('Branch created.');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to create branch.'));
    } finally {
      setAddingBranch(false);
    }
  };

  const deleteBranch = async (id: string) => {
    setDeletingBranchId(id);
    try {
      await api.adminAction('delete_branch', { id });
      toast.success('Branch deleted.');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to delete branch.'));
    } finally {
      setDeletingBranchId(null);
    }
  };

  const addStaff = async () => {
    if (!newStaffBranch || !newStaffPassword) return;
    setAddingStaff(true);
    try {
      await api.adminAction('create_staff', { branch_id: newStaffBranch, password: newStaffPassword });
      setNewStaffPassword('');
      toast.success('Staff account created.');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to create staff account.'));
    } finally {
      setAddingStaff(false);
    }
  };

  const mergeBranch = async () => {
    if (!mergeSourceBranch || !mergeTargetBranch || mergeSourceBranch === mergeTargetBranch) return;
    setMergingBranch(true);
    try {
      const result = await api.adminAction('merge_branch', {
        source_branch_id: mergeSourceBranch,
        target_branch_id: mergeTargetBranch,
      });
      toast.success(`Merged ${result.merged_from} into ${result.merged_into}.`);
      setMergeSourceBranch('');
      setMergeTargetBranch('');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to merge branches.'));
    } finally {
      setMergingBranch(false);
    }
  };

  const deleteStaff = async (id: string) => {
    setDeletingStaffId(id);
    try {
      await api.adminAction('delete_staff', { id });
      toast.success('Staff account deleted.');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Unable to delete staff account.'));
    } finally {
      setDeletingStaffId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const tabs = useMemo(() => [
    { id: 'stream' as const, label: 'Stream' },
    { id: 'attendance' as const, label: 'Attendance' },
    { id: 'branches' as const, label: 'Branches' },
    { id: 'staff' as const, label: 'Staff' },
  ], []);
  const totalDurationSeconds = records.reduce((sum, record) => sum + (record.duration_seconds || 0), 0);
  const latestRecordDate = records[0]?.timestamp ? new Date(records[0].timestamp).toLocaleString() : 'No records yet';
  const branchCount = branches.length;
  const staffCount = staffList.length;
  const confirmLoading = pendingConfirm?.type === 'delete-branch'
    ? Boolean(pendingConfirm.id && deletingBranchId === pendingConfirm.id)
    : pendingConfirm?.type === 'delete-staff'
      ? Boolean(pendingConfirm.id && deletingStaffId === pendingConfirm.id)
      : pendingConfirm?.type === 'merge-branch'
        ? mergingBranch
      : false;

  if (loading) return <PageLoader label="Loading admin workspace..." />;

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(open) => {
          if (!open && !confirmLoading) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title || 'Confirm action'}
        description={pendingConfirm?.description}
        confirmLabel={
          pendingConfirm?.type === 'delete-staff'
            ? 'Delete Staff'
            : pendingConfirm?.type === 'merge-branch'
              ? 'Merge Branches'
              : 'Delete Branch'
        }
        destructive
        loading={confirmLoading}
        onConfirm={() => {
          if (!pendingConfirm) return;
          if (pendingConfirm.type === 'delete-branch') {
            void deleteBranch(pendingConfirm.id).finally(() => setPendingConfirm(null));
            return;
          }
          if (pendingConfirm.type === 'merge-branch') {
            void mergeBranch().finally(() => setPendingConfirm(null));
            return;
          }
          void deleteStaff(pendingConfirm.id).finally(() => setPendingConfirm(null));
        }}
      />

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <div className="rounded-full border border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-sm font-medium text-foreground">
              Administrator
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ActiveViewersCount iconOnly />
            <Button variant="outline" size="icon" onClick={() => void fetchAll(true)} disabled={refreshing} aria-label="Refresh admin data">
              {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout} disabled={loggingOut} aria-label="Logout">
              {loggingOut ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="space-y-4">
          <section className="surface-panel p-4 sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/75">Control Center</p>
                  <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Admin Dashboard</h1>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users2 className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Attendance</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{records.length}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TimerReset className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Watch Time</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{formatDuration(totalDurationSeconds)}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Branches</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{branchCount}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Staff</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{staffCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[1.25rem] border border-primary/10 bg-primary/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Latest Activity</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{latestRecordDate}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="surface-panel grid grid-cols-2 gap-1 p-1 sm:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[1rem] px-3 py-3 text-xs font-semibold transition-all sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-white hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'stream' && (
            <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-4">
                <section className="surface-panel p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Video className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Stream Operations</span>
                      </div>
                      <h2 className="text-2xl font-semibold text-foreground">Current Broadcast</h2>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                      settings?.is_attendance_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {settings?.is_attendance_active ? 'Attendance Active' : 'Attendance Inactive'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live Title</p>
                      <p className="mt-2 line-clamp-2 font-semibold text-foreground">{settings?.stream_title || 'No stream title yet'}</p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Last API Check</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {settings?.last_api_check_time ? new Date(settings.last_api_check_time).toLocaleString() : 'Not checked yet'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Manual URL</p>
                      <p className="mt-2 truncate font-semibold text-foreground">{settings?.youtube_url || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      variant={settings?.is_attendance_active ? 'destructive' : 'default'}
                      onClick={toggleAttendance}
                      disabled={togglingAttendance}
                    >
                      {togglingAttendance ? <LoadingSpinner size="sm" className="text-current" /> : null}
                      {togglingAttendance
                        ? 'Updating...'
                        : settings?.is_attendance_active
                          ? 'Stop Attendance'
                          : 'Start Attendance'}
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto" onClick={checkLiveNow} disabled={checkingLive}>
                      {checkingLive ? <LoadingSpinner size="sm" className="text-current" /> : <RadioTower className="h-4 w-4" />}
                      {checkingLive ? 'Checking...' : 'Check Live Now'}
                    </Button>
                  </div>
                </section>

                <section className="surface-panel p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Tracked URL</p>
                  <p className="mt-2 break-all text-sm text-foreground">{settings?.youtube_url || 'No YouTube URL configured.'}</p>
                </section>
              </div>

              <Card className="surface-panel border-none shadow-none">
                <CardHeader className="pb-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Automation</p>
                    <CardTitle className="text-2xl">Auto-Detection Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>YouTube Channel ID</Label>
                      <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="UCxxxxxxx" className="h-11 bg-white/80" />
                    </div>
                    <div className="space-y-2">
                      <Label>Manual YouTube URL</Label>
                      <Input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="h-11 bg-white/80" />
                    </div>
                    <div className="space-y-2">
                      <Label>Check Day</Label>
                      <select value={checkDay} onChange={(e) => setCheckDay(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-white/80 px-3 text-sm">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => <option key={day}>{day}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Check Interval (mins)</Label>
                      <Input type="number" value={checkInterval} onChange={(e) => setCheckInterval(Number(e.target.value))} min={1} max={60} className="h-11 bg-white/80" />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" value={checkStart} onChange={(e) => setCheckStart(e.target.value)} className="h-11 bg-white/80" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" value={checkEnd} onChange={(e) => setCheckEnd(e.target.value)} className="h-11 bg-white/80" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Auto Duration (hours)</Label>
                      <Input type="number" value={autoDuration} onChange={(e) => setAutoDuration(Number(e.target.value))} min={1} max={12} className="h-11 bg-white/80" />
                    </div>
                  </div>

                  <div className="grid gap-3 border-t border-primary/10 pt-4 sm:flex sm:flex-wrap">
                    <Button className="w-full sm:w-auto" onClick={saveSettings} disabled={savingSettings}>
                      {savingSettings ? <LoadingSpinner size="sm" className="text-current" /> : <Save className="h-4 w-4" />}
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <Button className="w-full sm:w-auto" variant="outline" onClick={checkLiveNow} disabled={checkingLive}>
                      {checkingLive ? <LoadingSpinner size="sm" className="text-current" /> : <RadioTower className="h-4 w-4" />}
                      {checkingLive ? 'Checking...' : 'Run Live Check'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <section className="surface-panel grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Service</label>
                  <select value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} className="flex h-10 w-full rounded-xl border border-input bg-white/80 px-3 text-sm md:min-w-[11rem]">
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
                <Button variant="outline" size="sm" onClick={() => void fetchAll(true)} disabled={refreshing}>
                  {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <PDFExportButton records={records} serviceTitle={filterTitle || undefined} />
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="surface-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Filtered Records</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{records.length}</p>
                </div>
                <div className="surface-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Services Visible</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{titles.length}</p>
                </div>
                <div className="surface-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total Watch Time</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatDuration(totalDurationSeconds)}</p>
                </div>
              </section>

              <Card className="surface-panel border-none shadow-none">
                <CardContent className="p-0">
                  {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
                      <p className="text-base font-semibold text-foreground">No records found</p>
                      <p className="mt-1">Attendance records will appear here after viewers join the stream.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 p-4 md:hidden">
                        {records.map((record) => (
                          <div key={record.id} className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">
                                  {record.attendance_type === 'Family'
                                    ? formatFamilyName(record.family_surname) || 'Family'
                                    : record.name || 'Viewer'}
                                </p>
                                <p className="mt-1 break-all text-sm text-muted-foreground">{record.email}</p>
                              </div>
                              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                record.attendance_type === 'Family'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {record.attendance_type}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Branch</p>
                                <p className="mt-1 font-medium text-foreground">{record.branch}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Duration</p>
                                <p className="mt-1 font-medium text-foreground">{formatDuration(record.duration_seconds)}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Service</p>
                              <p className="mt-1 text-sm text-foreground">{record.stream_title}</p>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">{new Date(record.timestamp).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>

                      <div className="hidden md:block">
                        <Table className="min-w-[860px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Branch</TableHead>
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
                            <TableCell>{record.branch}</TableCell>
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
                            <TableCell className="tabular-nums text-muted-foreground">{new Date(record.timestamp).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'branches' && (
            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <Card className="surface-panel border-none shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Add Branch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Enter branch name" className="h-11 bg-white/80" />
                  </div>
                  <Button className="w-full sm:w-auto" onClick={addBranch} disabled={!newBranch.trim() || addingBranch}>
                    {addingBranch ? <LoadingSpinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />}
                    {addingBranch ? 'Adding...' : 'Add Branch'}
                  </Button>

                  <div className="border-t border-primary/10 pt-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Merge Branches</p>
                    </div>
                    <div className="grid gap-3">
                      <select value={mergeSourceBranch} onChange={(e) => setMergeSourceBranch(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-white/80 px-3 text-sm">
                        <option value="">Merge from...</option>
                        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                      <select value={mergeTargetBranch} onChange={(e) => setMergeTargetBranch(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-white/80 px-3 text-sm">
                        <option value="">Merge into...</option>
                        {branches.filter((branch) => branch.id !== mergeSourceBranch).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={!mergeSourceBranch || !mergeTargetBranch || mergeSourceBranch === mergeTargetBranch || mergingBranch}
                        onClick={() => {
                          const sourceName = branches.find((branch) => branch.id === mergeSourceBranch)?.name || 'source branch';
                          const targetName = branches.find((branch) => branch.id === mergeTargetBranch)?.name || 'target branch';
                          setPendingConfirm({
                            type: 'merge-branch',
                            id: mergeSourceBranch,
                            title: 'Merge branches?',
                            description: `Attendance records and staff from ${sourceName} will be moved to ${targetName}. The source branch will then be removed.`,
                          });
                        }}
                      >
                        {mergingBranch ? <LoadingSpinner size="sm" className="text-current" /> : <ArrowRightLeft className="h-4 w-4" />}
                        {mergingBranch ? 'Merging...' : 'Merge Branch'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="surface-panel border-none shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Branches</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <>
                    <div className="space-y-3 p-4 md:hidden">
                      {branches.map((branch) => (
                        <div key={branch.id} className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{branch.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{branch.attendance_count || 0} records</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPendingConfirm({
                                type: 'delete-branch',
                                id: branch.id,
                                title: 'Delete branch?',
                                description: `This will remove ${branch.name} from the branch list.`,
                              })}
                              disabled={deletingBranchId === branch.id || (branch.attendance_count || 0) > 0 || (branch.staff_count || 0) > 0}
                            >
                              {deletingBranchId === branch.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                              {(branch.attendance_count || 0) > 0
                                ? 'Has History'
                                : (branch.staff_count || 0) > 0
                                  ? 'Has Staff'
                                  : deletingBranchId === branch.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {branches.length === 0 && (
                        <div className="py-10 text-center text-muted-foreground">No branches yet.</div>
                      )}
                    </div>

                    <div className="hidden md:block">
                      <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-28">Records</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell className="font-medium">{branch.name}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{branch.attendance_count || 0}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPendingConfirm({
                                type: 'delete-branch',
                                id: branch.id,
                                title: 'Delete branch?',
                                description: `This will remove ${branch.name} from the branch list.`,
                              })}
                              disabled={deletingBranchId === branch.id || (branch.attendance_count || 0) > 0 || (branch.staff_count || 0) > 0}
                            >
                              {deletingBranchId === branch.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                              {(branch.attendance_count || 0) > 0
                                ? 'Has History'
                                : (branch.staff_count || 0) > 0
                                  ? 'Has Staff'
                                  : deletingBranchId === branch.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {branches.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No branches yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                      </Table>
                    </div>
                  </>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="surface-panel border-none shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Add Staff Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <select value={newStaffBranch} onChange={(e) => setNewStaffBranch(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-white/80 px-3 text-sm">
                      <option value="">Select branch...</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Staff Password</Label>
                    <Input type="password" value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} placeholder="Enter staff password" className="h-11 bg-white/80" />
                  </div>
                  <Button className="w-full sm:w-auto" onClick={addStaff} disabled={!newStaffBranch || !newStaffPassword || addingStaff}>
                    {addingStaff ? <LoadingSpinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />}
                    {addingStaff ? 'Creating...' : 'Add Staff'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="surface-panel border-none shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Staff Accounts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <>
                    <div className="space-y-3 p-4 md:hidden">
                      {staffList.map((staff) => (
                        <div key={staff.id} className="rounded-[1.25rem] border border-primary/10 bg-white/70 p-4">
                          <p className="font-semibold text-foreground">{branches.find((branch) => branch.id === staff.branch_id)?.name || staff.branch_id}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{new Date(staff.created_at).toLocaleDateString()}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 text-destructive hover:text-destructive"
                            onClick={() => setPendingConfirm({
                              type: 'delete-staff',
                              id: staff.id,
                              title: 'Delete staff account?',
                              description: 'This will remove the selected staff account from the admin workspace.',
                            })}
                            disabled={deletingStaffId === staff.id}
                          >
                            {deletingStaffId === staff.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                            {deletingStaffId === staff.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      ))}
                      {staffList.length === 0 && (
                        <div className="py-10 text-center text-muted-foreground">No staff accounts yet.</div>
                      )}
                    </div>

                    <div className="hidden md:block">
                      <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{branches.find((branch) => branch.id === staff.branch_id)?.name || staff.branch_id}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{new Date(staff.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPendingConfirm({
                                type: 'delete-staff',
                                id: staff.id,
                                title: 'Delete staff account?',
                                description: 'This will remove the selected staff account from the admin workspace.',
                              })}
                              disabled={deletingStaffId === staff.id}
                            >
                              {deletingStaffId === staff.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                              {deletingStaffId === staff.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {staffList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No staff accounts yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                      </Table>
                    </div>
                  </>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
