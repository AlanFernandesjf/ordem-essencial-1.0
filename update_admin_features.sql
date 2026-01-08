-- Create plans table if it doesn't exist
create table if not exists public.plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  interval text not null check (interval in ('monthly', 'yearly', 'lifetime')),
  features jsonb default '[]'::jsonb,
  active boolean default true,
  asaas_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on plans
alter table public.plans enable row level security;

-- Create payments table if it doesn't exist (for history)
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  status text not null,
  payment_method text,
  asaas_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on payments
alter table public.payments enable row level security;

-- Policies for Plans
create policy "Public plans are viewable by everyone"
  on public.plans for select
  using ( true );

create policy "Admins can insert plans"
  on public.plans for insert
  with check (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

create policy "Admins can update plans"
  on public.plans for update
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

create policy "Admins can delete plans"
  on public.plans for delete
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- Policies for Payments
create policy "Users can view own payments"
  on public.payments for select
  using ( auth.uid() = user_id );

create policy "Admins can view all payments"
  on public.payments for select
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- Ensure profiles has necessary columns (idempotent)
alter table public.profiles 
add column if not exists subscription_status text default 'free',
add column if not exists subscription_plan text,
add column if not exists is_admin boolean default false;

-- Create subscriptions table for active subscription management if not exists
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null,
  plan_type text,
  payment_method text,
  amount numeric,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on subscriptions
alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using ( auth.uid() = user_id );

create policy "Admins can view all subscriptions"
  on public.subscriptions for select
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

create policy "Admins can insert/update subscriptions"
  on public.subscriptions for all
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );
