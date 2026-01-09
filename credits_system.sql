-- Create table for user credits
create table if not exists public.user_credits (
  user_id uuid references auth.users not null primary key,
  credits_remaining int default 20,
  last_reset_date timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_credits enable row level security;

-- Policies

-- 1. Users can view their own credits
drop policy if exists "Users can view their own credits" on public.user_credits;
create policy "Users can view their own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- 2. Users can update their own credits (via functions only usually, but allowed here for flexibility if needed)
drop policy if exists "Users can update their own credits" on public.user_credits;
create policy "Users can update their own credits"
  on public.user_credits for update
  using (auth.uid() = user_id);

-- 3. Users can insert their own credits
drop policy if exists "Users can insert their own credits" on public.user_credits;
create policy "Users can insert their own credits"
  on public.user_credits for insert
  with check (auth.uid() = user_id);

-- 4. Admins can perform all actions on user_credits
drop policy if exists "Admins can perform all actions on user_credits" on public.user_credits;
create policy "Admins can perform all actions on user_credits"
  on public.user_credits
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to handle deduction and auto-renewal
create or replace function deduct_user_credit(user_id_input uuid)
returns json
language plpgsql
security definer
as $$
declare
  user_credit_row public.user_credits%rowtype;
  is_renewal_needed boolean;
begin
  -- Get record
  select * into user_credit_row from public.user_credits where user_id = user_id_input;

  -- If no record exists, create one (lazy init)
  if not found then
    insert into public.user_credits (user_id, credits_remaining, last_reset_date)
    values (user_id_input, 20, now())
    returning * into user_credit_row;
  end if;

  -- Check renewal (simple month check)
  -- If current month is different from last reset month
  is_renewal_needed := (date_trunc('month', now()) > date_trunc('month', user_credit_row.last_reset_date));

  if is_renewal_needed then
    update public.user_credits
    set credits_remaining = 20, last_reset_date = now()
    where user_id = user_id_input;
    
    -- Reset local variable
    user_credit_row.credits_remaining := 20;
  end if;

  -- Check balance
  if user_credit_row.credits_remaining > 0 then
    update public.user_credits
    set credits_remaining = credits_remaining - 1
    where user_id = user_id_input;
    
    return json_build_object('success', true, 'remaining', user_credit_row.credits_remaining - 1);
  else
    return json_build_object('success', false, 'remaining', 0, 'message', 'Saldo insuficiente. Seus créditos renovam no próximo mês.');
  end if;
end;
$$;

-- Grant execute permission
grant execute on function deduct_user_credit(uuid) to authenticated;
grant execute on function deduct_user_credit(uuid) to service_role;
