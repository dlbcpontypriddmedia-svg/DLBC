export interface ViewerSession {
  name: string;
  email: string;
  branch: string;
  branch_id: string;
  stream_session_id: string;
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
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getViewerSession(): ViewerSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearViewerSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function saveAuthToken(token: string) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
