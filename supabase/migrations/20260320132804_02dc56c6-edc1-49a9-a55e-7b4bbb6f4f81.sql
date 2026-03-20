
SELECT cron.schedule(
  'check-youtube-live-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://bdiianwkpalzcmgbffeg.supabase.co/functions/v1/check-youtube-live',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaWlhbndrcGFsemNtZ2JmZmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDM0ODcsImV4cCI6MjA4OTU3OTQ4N30.DG9G4v41S3MMlLh_OtY7Zh_6GVowt9LMUZo8C-V6VDs"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
