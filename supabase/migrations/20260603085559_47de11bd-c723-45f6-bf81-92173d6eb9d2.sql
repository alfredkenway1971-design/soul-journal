-- Remove admin SELECT on profiles so admins can no longer read pin_hash or other personal data via the client
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Helper function: returns true if the current user has a PIN set, without exposing the hash
CREATE OR REPLACE FUNCTION public.has_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND pin_hash IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.has_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_pin() TO authenticated;