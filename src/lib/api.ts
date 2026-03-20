const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

async function call(fn: string, body?: unknown, method = 'POST') {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const url = method === 'GET' && body
    ? `${BASE}/${fn}?${new URLSearchParams(body as Record<string, string>)}`
    : `${BASE}/${fn}`;

  const res = await fetch(method === 'GET' ? url : `${BASE}/${fn}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  adminAuth: (password: string) => call('admin-auth', { password }),
  staffAuth: (branch_id: string, password: string) => call('staff-auth', { branch_id, password }),
  logout: () => call('auth-logout'),

  adminAction: (action: string, params?: Record<string, unknown>) =>
    call('admin-actions', { action, ...params }),

  heartbeat: (data: Record<string, unknown>) => call('attendance-heartbeat', data),

  getAttendanceData: (params?: Record<string, string>) =>
    call('attendance-data', params, 'GET'),

  getActiveViewers: (branch_id?: string) =>
    call('active-viewers', branch_id ? { branch_id } : {}, 'GET'),

  getBranches: () => call('admin-actions', { action: 'get_branches' }),
};
