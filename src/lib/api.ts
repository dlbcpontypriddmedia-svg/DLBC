import { clearAuthToken, getAuthToken, saveAuthToken } from './session';

import { getSupabaseFunctionsBaseUrl } from './config';

async function call(
  fn: string,
  body?: unknown,
  method = 'POST',
  options?: { credentials?: RequestCredentials },
) {
  const BASE = getSupabaseFunctionsBaseUrl();
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: options?.credentials ?? 'include',
  };
  const token = getAuthToken();
  if (token && opts.headers) {
    (opts.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const url = method === 'GET' && body
    ? `${BASE}/${fn}?${new URLSearchParams(body as Record<string, string>)}`
    : `${BASE}/${fn}`;

  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  adminAuth: async (password: string) => {
    const data = await call('admin-auth', { password });
    if (data?.token) saveAuthToken(data.token);
    return data;
  },
  staffAuth: async (branch_id: string, password: string) => {
    const data = await call('staff-auth', { branch_id, password });
    if (data?.token) saveAuthToken(data.token);
    return data;
  },
  logout: async () => {
    try {
      return await call('auth-logout');
    } finally {
      clearAuthToken();
    }
  },

  adminAction: (action: string, params?: Record<string, unknown>) =>
    call('admin-actions', { action, ...params }),

  heartbeat: (data: Record<string, unknown>) => call('attendance-heartbeat', data),

  getAttendanceData: (params?: Record<string, string>) =>
    call('attendance-data', params, 'GET'),

  getActiveViewers: (branch_id?: string) =>
    call('active-viewers', branch_id ? { branch_id } : {}, 'GET', { credentials: 'omit' }),

  getActiveViewerMembers: (branch_id?: string) =>
    call('active-viewers', branch_id ? { branch_id, include_members: 'true' } : { include_members: 'true' }, 'GET', { credentials: 'omit' }),

  sendLeaveHeartbeat: (data: Record<string, unknown>) => {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;

    const BASE = getSupabaseFunctionsBaseUrl();
    const blob = new Blob([JSON.stringify({ ...data, presence_event: 'leave' })], {
      type: 'application/json',
    });
    return navigator.sendBeacon(`${BASE}/attendance-heartbeat`, blob);
  },

  getPublicBranches: () => call('public-branches', undefined, 'GET', { credentials: 'omit' }),
};
