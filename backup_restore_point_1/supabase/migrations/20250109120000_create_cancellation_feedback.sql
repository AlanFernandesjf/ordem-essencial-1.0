-- Create cancellation_feedback table
create table if not exists public.cancellation_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  reasons text[] default '{}',
  other_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.cancellation_feedback enable row level security;

-- Create policy for Admins to view feedback
create policy "Admins can view feedback"
  on public.cancellation_feedback
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create policy for Service Role to insert (implicit, but good to have explicit if we ever use client insert)
-- create policy "Service role can insert feedback" ... (not needed for service_role key)

-- Grant permissions if necessary (usually authenticated users have public access if RLS allows)
grant select, insert on public.cancellation_feedback to authenticated;
grant select, insert on public.cancellation_feedback to service_role;
