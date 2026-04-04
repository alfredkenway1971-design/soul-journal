

# Auto-populate Display Name from Google Profile

## Problem
When signing in with Google, the `handle_new_user` trigger only reads `raw_user_meta_data->>'display_name'`, but Google OAuth stores the name in `full_name` (and sometimes `name`). This results in a NULL display name for Google sign-in users.

## Plan

### 1. Update the `handle_new_user` database function (Migration)
Modify the trigger function to check multiple metadata fields with a COALESCE fallback:
```sql
INSERT INTO public.profiles (id, display_name)
VALUES (
  new.id,
  COALESCE(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  )
);
```
This covers email signup (`display_name`), Google OAuth (`full_name`/`name`), and other providers.

### 2. Fix existing Google users with missing display names
Add a one-time update in `AuthContext.tsx` — after detecting a signed-in user whose profile has no `display_name`, read it from `user.user_metadata.full_name` or `user.user_metadata.name` and patch the `profiles` table.

### 3. Files to change
- **New migration SQL** — update `handle_new_user` function
- **`src/contexts/AuthContext.tsx`** — backfill logic for existing users

