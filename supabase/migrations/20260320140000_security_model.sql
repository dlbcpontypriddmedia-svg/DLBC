-- Security hardening: restrict direct table access for browser roles

-- Revoke direct access from anon/authenticated for sensitive tables
REVOKE ALL ON TABLE public.attendance_records FROM anon, authenticated;
REVOKE ALL ON TABLE public.attendance_staff FROM anon, authenticated;
REVOKE ALL ON TABLE public.stream_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.branches FROM anon, authenticated;

-- Revoke sequence usage to prevent inserts via client roles
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Ensure future tables/sequences are locked down by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;