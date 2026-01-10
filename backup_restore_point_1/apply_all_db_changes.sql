-- ==============================================================================
-- MASTER SCRIPT: APLICA TODAS AS MUDANÇAS DE BANCO DE DADOS NECESSÁRIAS
-- ==============================================================================

-- 1. ESTRUTURA DE PLANOS E PAGAMENTOS
-- ==============================================================================
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

-- Habilitar RLS
alter table public.plans enable row level security;

-- Adicionar colunas de marketing (Versão 2)
alter table public.plans 
add column if not exists description text, 
add column if not exists marketing_features jsonb default '[]'::jsonb, 
add column if not exists is_popular boolean default false;

-- Tabela de pagamentos (histórico)
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  status text not null,
  payment_method text,
  asaas_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.payments enable row level security;

-- Tabela de assinaturas (estado atual)
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
alter table public.subscriptions enable row level security;

-- 2. POLÍTICAS DE SEGURANÇA (RLS) - Com verificação se já existe
-- ==============================================================================
do $$
begin
  -- Plans
  if not exists (select 1 from pg_policies where policyname = 'Public plans are viewable by everyone' and tablename = 'plans') then
    create policy "Public plans are viewable by everyone" on public.plans for select using ( true );
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Admins can insert plans' and tablename = 'plans') then
    create policy "Admins can insert plans" on public.plans for insert with check ( auth.uid() in (select id from public.profiles where role = 'admin') );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins can update plans' and tablename = 'plans') then
    create policy "Admins can update plans" on public.plans for update using ( auth.uid() in (select id from public.profiles where role = 'admin') );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins can delete plans' and tablename = 'plans') then
    create policy "Admins can delete plans" on public.plans for delete using ( auth.uid() in (select id from public.profiles where role = 'admin') );
  end if;

  -- Payments
  if not exists (select 1 from pg_policies where policyname = 'Users can view own payments' and tablename = 'payments') then
    create policy "Users can view own payments" on public.payments for select using ( auth.uid() = user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins can view all payments' and tablename = 'payments') then
    create policy "Admins can view all payments" on public.payments for select using ( auth.uid() in (select id from public.profiles where role = 'admin') );
  end if;

  -- Subscriptions
  if not exists (select 1 from pg_policies where policyname = 'Users can view own subscription' and tablename = 'subscriptions') then
    create policy "Users can view own subscription" on public.subscriptions for select using ( auth.uid() = user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins can view all subscriptions' and tablename = 'subscriptions') then
    create policy "Admins can view all subscriptions" on public.subscriptions for select using ( auth.uid() in (select id from public.profiles where role = 'admin') );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins can insert/update subscriptions' and tablename = 'subscriptions') then
    create policy "Admins can insert/update subscriptions" on public.subscriptions for all using ( auth.uid() in (select id from public.profiles where role = 'admin') );
  end if;
end $$;


-- 3. ATUALIZAÇÃO DE PERFIL E TRIGGER DE CADASTRO
-- ==============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text default 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean default false;

-- Atualizar trigger para capturar metadados do cadastro (CPF, Nome, Nascimento)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Inserir no perfil
  INSERT INTO public.profiles (id, email, name, cpf, birth_date, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    CASE 
      WHEN new.raw_user_meta_data->>'birth_date' = '' THEN NULL
      ELSE (new.raw_user_meta_data->>'birth_date')::date
    END,
    'user' -- Role padrão
  );

  -- Inserir nas configurações
  INSERT INTO public.user_settings (user_id, gender)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'gender', 'female')
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
