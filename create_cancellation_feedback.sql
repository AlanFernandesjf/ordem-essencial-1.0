-- Tabela de feedback de cancelamento
create table if not exists public.cancellation_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  reasons text[] not null,
  other_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.cancellation_feedback enable row level security;

-- Políticas de segurança
-- Usuários podem inserir seu próprio feedback
create policy "Users can insert own cancellation feedback"
  on public.cancellation_feedback for insert
  with check ( auth.uid() = user_id );

-- Apenas admins podem ver o feedback
create policy "Admins can view all cancellation feedback"
  on public.cancellation_feedback for select
  using ( 
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
