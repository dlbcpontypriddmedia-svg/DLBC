-- Store admin password securely (hash + salt) in the single-row stream_settings table.
-- This allows password rotation without redeploying/updating secrets.

ALTER TABLE public.stream_settings
  ADD COLUMN IF NOT EXISTS admin_password_salt text NULL,
  ADD COLUMN IF NOT EXISTS admin_password_hash text NULL;

