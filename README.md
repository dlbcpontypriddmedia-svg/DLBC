# DLBC Attendance

## Security Model

This app uses a strict server-mediated access model:

- The browser never queries database tables directly.
- Privileged reads/writes happen only in Supabase Edge Functions using the service role key.
- Admin/staff auth uses httpOnly cookies (`dlbc_session`). The frontend never reads auth tokens.
- Public endpoints are limited to minimal behavior:
  - `attendance-heartbeat` for public attendance ingestion
  - `active-viewers` for branch-safe viewer counts
  - `public-branches` for the branch list (id + name only)

## Database Access Controls

- RLS is enabled on all tables, and no public/anon policies are defined.
- Direct grants for `anon` and `authenticated` roles are revoked on sensitive tables
  (`attendance_records`, `attendance_staff`, `stream_settings`, `branches`).
- All table access is performed through Edge Functions with the service role key.

## Frontend Data Safety

- Frontend types only include safe, public data (`public-types.ts`).
- Sensitive fields like `attendance_staff.password_hash` are never returned to the browser.
- Attendance records are only exposed to authenticated admin/staff UIs via protected Edge Functions.

## CORS Configuration

Edge Functions validate the request origin when `credentials: "include"` is used.
Set `ALLOWED_ORIGINS` (comma-separated) in Supabase Function env, e.g.
`http://localhost:8080,https://your-domain.com`.
