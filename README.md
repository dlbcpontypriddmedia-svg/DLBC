# Deeper Life Bible Church Attendance Streaming Portal

This repository contains the branded attendance streaming system for Deeper Life Bible Church.

## Ownership And Usage

This software is custom-branded for Deeper Life Bible Church and is not intended for public reuse, resale, redistribution, or white-label deployment by third parties without explicit permission from the project owner.

## Security Model

This app uses a strict server-mediated access model:

- The browser never queries database tables directly.
- Privileged reads and writes happen only in Supabase Edge Functions using the service role key.
- Admin and staff access is enforced through protected function endpoints and session validation.
- Public endpoints are limited to minimal behavior:
  - `attendance-heartbeat` for attendance session sync
  - `active-viewers` for viewer counts and active viewer lists
  - `public-branches` for the public branch list

## Database Access Controls

- RLS is enabled on all sensitive tables.
- No public `anon` or unrestricted browser access is allowed on attendance, branch, staff, or stream settings tables.
- Operational data is mediated by Edge Functions, not direct frontend table calls.

## Frontend Scope

- Stream viewers only see branch-scoped active viewers for their own branch.
- Staff dashboards are branch-scoped.
- Admin dashboards can view the full cross-branch workspace.
- Realtime updates are used for active attendance, stream state, and viewer activity.

## Deployment Notes

- Supabase Edge Functions must be deployed for attendance, admin actions, active viewers, auth, and live-check automation.
- `ALLOWED_ORIGINS` should be configured in Supabase function secrets for accepted frontend domains (comma-separated). Supports exact origins (recommended) and wildcard subdomains like `https://*.vercel.app`.
- YouTube auto-detection depends on valid channel configuration and `YOUTUBE_API_KEY`.

## Environment Variables

This project has two runtimes with separate environment variables:

### Frontend (Vercel / Vite)

Set these in Vercel Environment Variables (do not upload `.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase anon/public key)
- `VITE_SUPABASE_PROJECT_ID` (optional fallback)
- `VITE_API_BASE_URL` (optional; normally unset so the app uses same-origin `/api`)

## Local Development

This repo includes Vercel Serverless Routes under `api/`. The Vite dev server (`npm run dev`) does not run those routes.

Recommended local dev options:

1) Use the deployed API while developing the UI:
   - Set `VITE_API_BASE_URL` to your Vercel app URL (e.g. `https://dlcmstreaming.vercel.app`)
   - Run `npm run dev`

2) Or run a local Vercel dev server for the API:
   - Terminal A: `npx vercel dev --listen 3000`
   - Terminal B: `VITE_API_BASE_URL=http://localhost:3000 npm run dev`

### Vercel Serverless API (Vercel Secrets)

Set these in Vercel Environment Variables (server-only, not `VITE_`):

- `PROJECT_URL` (e.g. `https://<ref>.supabase.co`)
- `SERVICE_ROLE_KEY` (server-only, never in the browser)
- `SUPABASE_ANON_KEY` (required for invoking Supabase Edge Functions when proxying)
- `SESSION_SECRET`
- `ADMIN_PASSWORD` (bootstrap only; once the admin password hash is stored in DB, this is no longer used)
- `ALLOWED_ORIGINS` (comma-separated, supports `https://*.vercel.app`)
- `CRON_SECRET` (optional; if set, cron callers must send `x-cron-secret`)

### Supabase Edge Functions (Supabase Secrets) — Optional

If you keep using Supabase Edge Functions (this repo currently keeps `attendance-heartbeat` and `check-youtube-live` deployable), set these in Supabase → Edge Functions → Secrets:

- `PROJECT_URL` (e.g. `https://<ref>.supabase.co`)
- `SERVICE_ROLE_KEY` (server-only, never in the browser)
- `ALLOWED_ORIGINS` (e.g. `https://dlcmstreaming.vercel.app,https://*.vercel.app,http://localhost:5173`)
- `SESSION_SECRET`
- `ADMIN_PASSWORD` (bootstrap only; once the admin password hash is stored in DB, this is no longer used)
- `YOUTUBE_API_KEY` (if using YouTube live checks)
