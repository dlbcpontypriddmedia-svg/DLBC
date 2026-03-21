export interface ViewerSession {
  name?: string;
  email: string;
  branch: string;
  branch_id: string;
  stream_session_id: string;
  stream_started_at?: number;
  attendance_type: 'Single' | 'Family';
  age_category?: string;
  family_surname?: string;
  family_adult_count?: number;
  family_young_adult_count?: number;
  family_youth_count?: number;
  family_children_count?: number;
}

const SESSION_KEY = 'dlbc_viewer_session';
const AUTH_TOKEN_KEY = 'dlbc_auth_token';

export function saveViewerSession(session: ViewerSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getViewerSession(): ViewerSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  // Migrate older browser-wide sessions into the current tab once, then remove them.
  const legacyRaw = localStorage.getItem(SESSION_KEY);
  if (!legacyRaw) return null;
  try {
    const parsed = JSON.parse(legacyRaw);
    sessionStorage.setItem(SESSION_KEY, legacyRaw);
    localStorage.removeItem(SESSION_KEY);
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function updateViewerSession(patch: Partial<ViewerSession>) {
  const current = getViewerSession();
  if (!current) return null;

  const next = { ...current, ...patch };
  saveViewerSession(next);
  return next;
}

export function clearViewerSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function saveAuthToken(token: string) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
