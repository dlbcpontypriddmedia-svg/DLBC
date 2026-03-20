
CREATE OR REPLACE FUNCTION public.prevent_stream_settings_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.stream_settings) >= 1 THEN
    RAISE EXCEPTION 'Only one stream_settings row is allowed';
  END IF;
  RETURN NEW;
END;
$$;
