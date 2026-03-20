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
- `ALLOWED_ORIGINS` should be configured in Supabase function secrets for accepted frontend domains.
- YouTube auto-detection depends on valid channel configuration and `YOUTUBE_API_KEY`.
