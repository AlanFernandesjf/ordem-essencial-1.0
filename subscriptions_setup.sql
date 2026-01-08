
-- Tabela para controlar status da assinatura
create table if not exists user_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  asaas_customer_id text,
  asaas_subscription_id text,
  status text default 'trial', -- trial, active, past_due, canceled
  plan_type text, -- monthly, yearly
  trial_ends_at timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Política de Segurança (RLS)
alter table user_subscriptions enable row level security;

create policy "Usuários podem ver sua própria assinatura"
  on user_subscriptions for select
  using ( auth.uid() = user_id );

-- Função para atualizar updated_at automaticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_subscriptions_updated_at
before update on user_subscriptions
for each row
execute procedure update_updated_at_column();
