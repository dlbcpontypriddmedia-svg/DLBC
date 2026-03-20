WITH ranked_active_records AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY email, branch_id, stream_title
      ORDER BY last_seen_at DESC, start_time DESC, id DESC
    ) AS row_num
  FROM public.attendance_records
  WHERE is_archived = false
)
UPDATE public.attendance_records AS attendance
SET
  is_archived = true,
  end_time = COALESCE(attendance.end_time, attendance.last_seen_at, now())
FROM ranked_active_records AS ranked
WHERE attendance.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_attendance_per_service
  ON public.attendance_records (email, branch_id, stream_title)
  WHERE is_archived = false;
