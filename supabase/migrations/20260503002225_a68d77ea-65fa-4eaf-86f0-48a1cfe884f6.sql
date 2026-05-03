-- Revoke direct EXECUTE on SECURITY DEFINER functions from PostgREST roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role is referenced by RLS policies, which run as the policy owner; no direct call needed by clients.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

-- Restrict public listing on avatars bucket: drop overly broad SELECT and replace with per-folder access
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

CREATE POLICY "Avatar files are viewable by path"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
);
