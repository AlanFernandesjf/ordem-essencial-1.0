-- Add status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'online';

-- Add check constraint for valid status values
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('online', 'away', 'busy', 'invisible'));
