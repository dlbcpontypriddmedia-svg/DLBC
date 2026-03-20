import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, RadioTower, RefreshCcw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import ActiveViewersCount from '@/components/ActiveViewersCount';
import LoadingSpinner from '@/components/LoadingSpinner';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import PDFExportButton from '@/components/PDFExportButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newBranch, setNewBranch] = useState('');
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

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [settingsRes, branchesRes, dataRes, staffRes] = await Promise.all([
        api.adminAction('get_settings'),
        api.adminAction('get_branches'),
        api.getAttendanceData({
          ...(filterTitle ? { stream_title: filterTitle } : {}),
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
  }, [dateFrom, dateTo, filterTitle, navigate]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

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
    if (!confirm('Delete this branch?')) return;
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

  const deleteStaff = async (id: string) => {
    if (!confirm('Delete this staff account?')) return;
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

  if (loading) return <PageLoader label="Loading admin workspace..." />;

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4">
        <header className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <div className="rounded-full border border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-sm font-medium text-foreground">
              Administrator
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ActiveViewersCount />
            <Button variant="outline" size="sm" onClick={() => void fetchAll(true)} disabled={refreshing}>
              {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <LoadingSpinner size="sm" className="text-current" /> : <LogOut className="h-4 w-4" />}
              {loggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </header>

        <main className="space-y-4">
          <section className="surface-panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/75">Control Center</p>
                <h1 className="text-3xl font-semibold text-foreground">Admin Dashboard</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Manage stream automation, run live checks, review attendance data, maintain branches, and provision staff accounts from one secured workspace.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-3 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Every action runs through protected Supabase edge functions.
              </div>
            </div>
          </section>

          <div className="surface-panel flex gap-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-[1rem] px-3 py-3 text-sm font-semibold transition-all ${
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
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="surface-panel border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Stream Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                      settings?.is_attendance_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {settings?.is_attendance_active ? 'Attendance Active' : 'Attendance Inactive'}
                    </span>
                    <Button
                      size="sm"
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
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Current URL: <span className="font-medium text-foreground">{settings?.youtube_url || 'Not set'}</span></p>
                    <p>Current Title: <span className="font-medium text-foreground">{settings?.stream_title || 'Not set'}</span></p>
                    {settings?.last_api_check_time && (
                      <p>Last API Check: <span className="font-medium text-foreground">{new Date(settings.last_api_check_time).toLocaleString()}</span></p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="surface-panel border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Auto-Detection Settings</CardTitle>
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

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={saveSettings} disabled={savingSettings}>
                      {savingSettings ? <LoadingSpinner size="sm" className="text-current" /> : <Save className="h-4 w-4" />}
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <Button variant="outline" onClick={checkLiveNow} disabled={checkingLive}>
                      {checkingLive ? <LoadingSpinner size="sm" className="text-current" /> : <RadioTower className="h-4 w-4" />}
                      {checkingLive ? 'Checking...' : 'Check Live Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <section className="surface-panel flex flex-wrap items-end gap-3 p-5">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Service</label>
                  <select value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} className="flex h-10 rounded-xl border border-input bg-white/80 px-3 text-sm">
                    <option value="">All services</option>
                    {titles.map((title) => <option key={title} value={title}>{title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-36 bg-white/80" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-36 bg-white/80" />
                </div>
                <Button variant="outline" size="sm" onClick={() => void fetchAll(true)} disabled={refreshing}>
                  {refreshing ? <LoadingSpinner size="sm" className="text-current" /> : <RefreshCcw className="h-4 w-4" />}
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <PDFExportButton records={records} serviceTitle={filterTitle || undefined} />
              </section>

              <Card className="surface-panel border-none shadow-none">
                <CardContent className="p-0">
                  {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
                      <p className="text-base font-semibold text-foreground">No records found</p>
                      <p className="mt-1">Attendance records will appear here after viewers join the stream.</p>
                    </div>
                  ) : (
                    <Table>
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
                            <TableCell className="font-medium">{record.family_surname || record.name || 'Family'}</TableCell>
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
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'branches' && (
            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <Card className="surface-panel border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Add Branch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Enter branch name" className="h-11 bg-white/80" />
                  </div>
                  <Button onClick={addBranch} disabled={!newBranch.trim() || addingBranch}>
                    {addingBranch ? <LoadingSpinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />}
                    {addingBranch ? 'Adding...' : 'Add Branch'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="surface-panel border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Branches</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell className="font-medium">{branch.name}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void deleteBranch(branch.id)} disabled={deletingBranchId === branch.id}>
                              {deletingBranchId === branch.id ? <LoadingSpinner size="sm" className="text-current" /> : <Trash2 className="h-4 w-4" />}
                              {deletingBranchId === branch.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {branches.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">No branches yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="surface-panel border-none shadow-none">
                <CardHeader>
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
                  <Button onClick={addStaff} disabled={!newStaffBranch || !newStaffPassword || addingStaff}>
                    {addingStaff ? <LoadingSpinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />}
                    {addingStaff ? 'Creating...' : 'Add Staff'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="surface-panel border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-xl">Staff Accounts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
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
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void deleteStaff(staff.id)} disabled={deletingStaffId === staff.id}>
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
