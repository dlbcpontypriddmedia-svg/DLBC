-- Allow anonymous users to read branches (public data)
GRANT SELECT ON TABLE public.branches TO anon;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read branches" ON public.branches;
CREATE POLICY "Public can read branches"
  ON public.branches
  FOR SELECT
  TO anon
  USING (true);
