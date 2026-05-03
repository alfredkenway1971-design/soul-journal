-- Restore EXECUTE on has_role for authenticated users.
-- It is SECURITY DEFINER and used inside RLS policies on public.profiles
-- and other tables, so revoking it broke all profile reads/writes.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;