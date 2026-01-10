-- Atualização para Finanças: Controle Diário e Investimentos

-- Adicionar coluna de investimentos no balanço mensal
alter table finance_months add column if not exists investimentos numeric default 0;

-- Tabela de Transações Financeiras (Controle Diário)
create table if not exists finance_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  type text not null, -- 'receita', 'despesa', 'divida', 'investimento'
  category text, -- Opcional: 'alimentacao', 'transporte', etc.
  date date not null default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Transações
alter table finance_transactions enable row level security;

drop policy if exists "Users can manage own finance_transactions" on finance_transactions;
create policy "Users can manage own finance_transactions" on finance_transactions for all using (auth.uid() = user_id);
