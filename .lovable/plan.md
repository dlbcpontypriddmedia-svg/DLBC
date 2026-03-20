

## DLBC Streaming — Implementation Plan

### Phase 1: Database & Backend Foundation

**Database Migration**
- Create `branches`, `stream_settings`, `attendance_records`, `attendance_staff` tables with all specified columns, indexes, and constraints
- Seed 5 branches and 1 stream_settings row with fixed UUID
- Enable `pg_cron` and `pg_net` extensions
- Schedule cron job calling `check-youtube-live` every minute
- RLS disabled; all access mediated by Edge Functions

**Secrets Setup**
- Add `ADMIN_PASSWORD`, `YOUTUBE_API_KEY`, `SESSION_SECRET`

**Edge Functions (8 total)**
1. `admin-auth` — validate admin password, issue httpOnly JWT cookie
2. `staff-auth` — validate staff credentials, issue JWT cookie with branch_id
3. `auth-logout` — clear auth cookie
4. `admin-actions` — CRUD branches, update stream settings, start/stop attendance, check-live-now (admin-only)
5. `attendance-heartbeat` — public, Zod-validated upsert of viewer attendance
6. `attendance-data` — cookie-verified, returns records scoped by role
7. `active-viewers` — public, returns count of active viewers per branch
8. `check-youtube-live` — cron/admin triggered, YouTube API live detection, auto-start/stop attendance

### Phase 2: Frontend — Viewer Experience

**Join Page (`/`)**
- Single/Family attendance toggle with conditional fields (age category for single; surname + family member counts for family)
- Branch dropdown populated from Edge Function
- Stores viewer session in localStorage, redirects to `/stream`

**Stream Page (`/stream`)**
- YouTube embed with audio-only toggle
- Branch name in header, active viewer count, elapsed time
- 30-second heartbeat loop to `attendance-heartbeat`
- Final heartbeat on tab close/hide
- Redirects to `/` if no session

### Phase 3: Frontend — Staff & Admin

**Attendance Staff Portal**
- `/attendance/login` — branch select + password, calls `staff-auth`
- `/attendance/dashboard` — branch-scoped summary card (age category totals), records table with date/title filters, start/stop attendance, PDF export

**Admin Portal**
- `/admin/login` — password input, calls `admin-auth`
- `/admin/dashboard` — stream URL config, auto-detection settings, check-live-now button, start/stop attendance, branch CRUD, all records with filters, PDF export, detection state display

### Phase 4: PDF Export & Branding

**PDF Export** — jsPDF + jspdf-autotable, branded with "Deeper Life Bible Church", branch, service title, date range, records, totals

**Branding** — "DLBC Streaming" throughout, logo placeholder, clean modern design, branded meta tags and PWA manifest basics

### Shared Components
- `AttendanceForm`, `StreamPlayer`, `HeartbeatProvider`, `AttendanceTable`, `StreamSummaryCard`, `PDFExportButton`, `ActiveViewersCount`, `BranchSelector`, `Logo`
- `lib/api.ts` for Edge Function calls, `lib/session.ts` for cookie-based auth state

### Security Model
- No client-side table queries — all data through Edge Functions with service role key
- httpOnly JWT cookies for auth (no localStorage tokens)
- Zod validation on all public endpoints
- Single-row enforcement on stream_settings

