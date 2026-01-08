-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Table: finance_transactions
create table if not exists public.finance_transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    description text not null,
    amount numeric not null default 0,
    type text not null check (type in ('receita', 'custo_fixo', 'custo_variavel', 'divida', 'investimento')),
    category text,
    date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for finance_transactions
alter table public.finance_transactions enable row level security;

create policy "Users can view their own transactions"
    on public.finance_transactions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
    on public.finance_transactions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
    on public.finance_transactions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
    on public.finance_transactions for delete
    using (auth.uid() = user_id);


-- Table: finance_months
create table if not exists public.finance_months (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    month_index int not null check (month_index between 1 and 12),
    receitas numeric default 0,
    custos_fixos numeric default 0,
    custos_variaveis numeric default 0,
    dividas numeric default 0,
    investimentos numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, month_index)
);

-- RLS for finance_months
alter table public.finance_months enable row level security;

create policy "Users can view their own month data"
    on public.finance_months for select
    using (auth.uid() = user_id);

create policy "Users can insert/update their own month data"
    on public.finance_months for all
    using (auth.uid() = user_id);


-- Table: finance_budgets
create table if not exists public.finance_budgets (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    month_index int not null check (month_index between 1 and 12),
    valor numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, month_index)
);

-- RLS for finance_budgets
alter table public.finance_budgets enable row level security;

create policy "Users can view their own budgets"
    on public.finance_budgets for select
    using (auth.uid() = user_id);

create policy "Users can insert/update their own budgets"
    on public.finance_budgets for all
    using (auth.uid() = user_id);


-- Table: finance_summaries
create table if not exists public.finance_summaries (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    card_id int not null,
    label text,
    value text,
    icon text,
    color text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, card_id)
);

-- RLS for finance_summaries
alter table public.finance_summaries enable row level security;

create policy "Users can view their own summaries"
    on public.finance_summaries for select
    using (auth.uid() = user_id);

create policy "Users can insert/update their own summaries"
    on public.finance_summaries for all
    using (auth.uid() = user_id);
