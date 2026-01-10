-- Tabela para armazenar planos gerados por IA (Dieta e Treino)
create table if not exists public.ai_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  plan_type text not null check (plan_type in ('diet', 'workout')),
  content jsonb not null,
  user_data jsonb not null, -- Dados usados para gerar (peso, altura, objetivo, etc)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.ai_plans enable row level security;

-- Remove políticas existentes para evitar conflito ao rodar novamente
drop policy if exists "Users can view their own plans" on public.ai_plans;
drop policy if exists "Users can insert their own plans" on public.ai_plans;

create policy "Users can view their own plans"
  on public.ai_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plans"
  on public.ai_plans for insert
  with check (auth.uid() = user_id);

-- Índices para performance
create index if not exists ai_plans_user_id_idx on public.ai_plans(user_id);
create index if not exists ai_plans_type_idx on public.ai_plans(plan_type);
