
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Branches table
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Stream settings (single-row)
CREATE TABLE public.stream_settings (
  id uuid PRIMARY KEY DEFAULT '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b'::uuid,
  youtube_url text DEFAULT '',
  stream_title text DEFAULT '',
  is_attendance_active boolean DEFAULT false,
  youtube_channel_id text DEFAULT '',
  check_day text DEFAULT 'Sunday',
  check_start_time text DEFAULT '09:00',
  check_end_time text DEFAULT '18:00',
  auto_attendance_duration_hours integer DEFAULT 4,
  last_live_check_date text DEFAULT '',
  auto_detected_url text DEFAULT '',
  attendance_auto_stop_at timestamptz NULL,
  check_interval_minutes integer DEFAULT 5,
  last_api_check_time timestamptz NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.stream_settings ENABLE ROW LEVEL SECURITY;

-- Prevent additional rows in stream_settings
CREATE OR REPLACE FUNCTION public.prevent_stream_settings_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.stream_settings) >= 1 THEN
    RAISE EXCEPTION 'Only one stream_settings row is allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_stream_settings
  BEFORE INSERT ON public.stream_settings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_stream_settings_insert();

-- Attendance records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  branch text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) NOT NULL,
  stream_session_id text NOT NULL,
  stream_title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NULL,
  last_seen_at timestamptz NOT NULL,
  duration_seconds integer DEFAULT 0,
  "timestamp" timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  attendance_type text DEFAULT 'Single',
  age_category text NULL,
  family_surname text NULL,
  family_adult_count integer NULL,
  family_young_adult_count integer NULL,
  family_youth_count integer NULL,
  family_children_count integer NULL
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_attendance_email_session_branch ON public.attendance_records(email, stream_session_id, branch);
CREATE INDEX idx_attendance_branch ON public.attendance_records(branch);
CREATE INDEX idx_attendance_branch_id ON public.attendance_records(branch_id);
CREATE INDEX idx_attendance_last_seen ON public.attendance_records(last_seen_at);
CREATE INDEX idx_attendance_stream_title ON public.attendance_records(stream_title);
CREATE INDEX idx_attendance_timestamp ON public.attendance_records("timestamp");

-- Attendance staff
CREATE TABLE public.attendance_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.attendance_staff ENABLE ROW LEVEL SECURITY;

-- Seed branches
INSERT INTO public.branches (name) VALUES
  ('Gbagada HQ'),
  ('Ikeja'),
  ('Lekki'),
  ('Abuja'),
  ('Port Harcourt');

-- Seed stream_settings
INSERT INTO public.stream_settings (id) VALUES ('8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b'::uuid);
