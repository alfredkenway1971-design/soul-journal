-- Set onboarding_completed to true for existing users who already have profiles
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE created_at < NOW() - INTERVAL '1 minute';