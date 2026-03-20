import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Logo from '@/components/Logo';
import PDFExportButton from '@/components/PDFExportButton';
import ActiveViewersCount from '@/components/ActiveViewersCount';
import { api } from '@/lib/api';

interface Branch { id: string; name: string; }

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [activeTab, setActiveTab] = useState<'stream' | 'attendance' | 'branches' | 'staff'>('stream');

  // Stream settings form
  const [channelId, setChannelId] = useState('');
  const [checkDay, setCheckDay] = useState('Sunday');
  const [checkStart, setCheckStart] = useState('09:00');
  const [checkEnd, setCheckEnd] = useState('18:00');
  const [autoDuration, setAutoDuration] = useState(4);
  const [checkInterval, setCheckInterval] = useState(5);
  const [manualUrl, setManualUrl] = useState('');

  // Staff management
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaffBranch, setNewStaffBranch] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');

  const fetchAll = useCallback(async () => {
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

      const s = settingsRes.settings;
      setSettings(s);
      setChannelId(s?.youtube_channel_id || '');
      setCheckDay(s?.check_day || 'Sunday');
      setCheckStart(s?.check_start_time || '09:00');
      setCheckEnd(s?.check_end_time || '18:00');
      setAutoDuration(s?.auto_attendance_duration_hours || 4);
      setCheckInterval(s?.check_interval_minutes || 5);
      setManualUrl(s?.youtube_url || '');

      setBranches(branchesRes.branches || []);
      setRecords(dataRes.records || []);
      setTitles(dataRes.titles || []);
      setStaffList(staffRes.staff || []);
    } catch (err: any) {
      if (err.message?.includes('Unauthorized')) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [filterTitle, dateFrom, dateTo, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = async () => {
    await api.logout();
    navigate('/admin/login');
  };

  const saveSettings = async () => {
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
    fetchAll();
  };

  const toggleAttendance = async () => {
    if (settings?.is_attendance_active) {
      await api.adminAction('stop_attendance');
    } else {
      const stopAt = new Date(Date.now() + autoDuration * 3600000).toISOString();
      await api.adminAction('start_attendance', { auto_stop_at: stopAt });
    }
    fetchAll();
  };

  const checkLiveNow = async () => {
    const res = await api.adminAction('check_live_now');
    alert(JSON.stringify(res, null, 2));
    fetchAll();
  };

  const addBranch = async () => {
    if (!newBranch.trim()) return;
    await api.adminAction('create_branch', { name: newBranch.trim() });
    setNewBranch('');
    fetchAll();
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Delete this branch?')) return;
    await api.adminAction('delete_branch', { id });
    fetchAll();
  };

  const addStaff = async () => {
    if (!newStaffBranch || !newStaffPassword) return;
    await api.adminAction('create_staff', { branch_id: newStaffBranch, password: newStaffPassword });
    setNewStaffPassword('');
    fetchAll();
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Delete this staff account?')) return;
    await api.adminAction('delete_staff', { id });
    fetchAll();
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const tabs = [
    { id: 'stream' as const, label: 'Stream' },
    { id: 'attendance' as const, label: 'Attendance' },
    { id: 'branches' as const, label: 'Branches' },
    { id: 'staff' as const, label: 'Staff' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <ActiveViewersCount />
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <h1 className="text-xl font-bold text-foreground" style={{ lineHeight: '1.1' }}>Admin Dashboard</h1>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-input p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Stream tab */}
          {activeTab === 'stream' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Stream Status</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block h-3 w-3 rounded-full ${settings?.is_attendance_active ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground/30'}`} />
                    <span className="text-sm font-medium">{settings?.is_attendance_active ? 'Attendance Active' : 'Attendance Inactive'}</span>
                    <Button size="sm" variant={settings?.is_attendance_active ? 'destructive' : 'default'} onClick={toggleAttendance}>
                      {settings?.is_attendance_active ? 'Stop' : 'Start'}
                    </Button>
                  </div>
                  {settings?.youtube_url && (
                    <p className="text-sm text-muted-foreground">Current URL: <a href={settings.youtube_url} target="_blank" className="text-primary underline">{settings.youtube_url}</a></p>
                  )}
                  {settings?.stream_title && <p className="text-sm text-muted-foreground">Title: {settings.stream_title}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Auto-Detection Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>YouTube Channel ID</Label>
                      <Input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="UCxxxxxxx" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Manual YouTube URL</Label>
                      <Input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Check Day</Label>
                      <select value={checkDay} onChange={e => setCheckDay(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Check Interval (mins)</Label>
                      <Input type="number" value={checkInterval} onChange={e => setCheckInterval(Number(e.target.value))} min={1} max={60} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Start Time</Label>
                      <Input type="time" value={checkStart} onChange={e => setCheckStart(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Time</Label>
                      <Input type="time" value={checkEnd} onChange={e => setCheckEnd(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Auto Duration (hours)</Label>
                      <Input type="number" value={autoDuration} onChange={e => setAutoDuration(Number(e.target.value))} min={1} max={12} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveSettings}>Save Settings</Button>
                    <Button variant="outline" onClick={checkLiveNow}>Check Live Now</Button>
                  </div>
                  {settings?.last_api_check_time && (
                    <p className="text-xs text-muted-foreground">Last API check: {new Date(settings.last_api_check_time).toLocaleString()}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Service</label>
                  <select value={filterTitle} onChange={e => setFilterTitle(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm">
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
                <Button variant="outline" size="sm" onClick={fetchAll}>Refresh</Button>
                <PDFExportButton records={records} serviceTitle={filterTitle || undefined} />
              </div>

              <Card>
                <CardContent className="p-0">
                  {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                      <p>No records found</p>
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
                        {records.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-muted-foreground">{r.email}</TableCell>
                            <TableCell>{r.branch}</TableCell>
                            <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.attendance_type === 'Family' ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{r.attendance_type}</span></TableCell>
                            <TableCell className="max-w-[160px] truncate text-muted-foreground">{r.stream_title}</TableCell>
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
          )}

          {/* Branches tab */}
          {activeTab === 'branches' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Add Branch</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input value={newBranch} onChange={e => setNewBranch(e.target.value)} placeholder="Branch name" className="max-w-xs" />
                    <Button onClick={addBranch} disabled={!newBranch.trim()}>Add</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteBranch(b.id)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Staff tab */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Add Staff Account</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <select value={newStaffBranch} onChange={e => setNewStaffBranch(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Select branch...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <Input type="password" value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} placeholder="Staff password" className="max-w-[200px]" />
                    <Button onClick={addStaff} disabled={!newStaffBranch || !newStaffPassword}>Add</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{branches.find(b => b.id === s.branch_id)?.name || s.branch_id}</TableCell>
                          <TableCell className="text-muted-foreground tabular-nums">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteStaff(s.id)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {staffList.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No staff accounts yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
