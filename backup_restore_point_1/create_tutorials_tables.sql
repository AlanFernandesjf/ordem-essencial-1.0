-- Create tutorial_videos table
create table if not exists public.tutorial_videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tutorial_faqs table
create table if not exists public.tutorial_faqs (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tutorial_videos enable row level security;
alter table public.tutorial_faqs enable row level security;

-- Policies for tutorial_videos
-- Everyone can read
create policy "Everyone can read tutorial videos"
  on public.tutorial_videos for select
  using (true);

-- Only admins can insert/update/delete
create policy "Admins can manage tutorial videos"
  on public.tutorial_videos for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policies for tutorial_faqs
create policy "Everyone can read tutorial faqs"
  on public.tutorial_faqs for select
  using (true);

create policy "Admins can manage tutorial faqs"
  on public.tutorial_faqs for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
