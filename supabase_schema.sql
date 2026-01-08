-- Tabela de Perfis (Gamificação)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  level int default 1,
  current_xp int default 0,
  current_streak int default 0,
  last_activity_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Hábitos
create table if not exists habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Conclusão de Hábitos (Logs)
create table if not exists habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references auth.users not null,
  completed_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(habit_id, completed_date)
);

-- ==========================================
-- FINANÇAS
-- ==========================================

-- Balanço Mensal
create table if not exists finance_months (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  month_index int not null, -- 1=Janeiro, 12=Dezembro
  receitas numeric default 0,
  custos_fixos numeric default 0,
  custos_variaveis numeric default 0,
  dividas numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, month_index)
);

-- Orçamento Mensal
create table if not exists finance_budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  month_index int not null,
  valor numeric default 0, -- Armazenando como numeric, frontend pode formatar
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, month_index)
);

-- Resumo Financeiro (Cards)
create table if not exists finance_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  card_id int not null, -- 1=Receitas, 2=Despesas, etc.
  label text,
  value text,
  icon text,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, card_id)
);

-- ==========================================
-- ESTUDOS
-- ==========================================

-- Conteúdos
create table if not exists study_contents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  leitura boolean default false,
  resumo boolean default false,
  exercicio boolean default false,
  revisao boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Provas e Entregas
create table if not exists study_exams (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  date text, -- Manter como text para flexibilidade ou date
  time text,
  color text, -- 'pink', 'blue', 'yellow'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Grade Horária
create table if not exists study_schedule (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  horario text not null,
  seg text,
  ter text,
  qua text,
  qui text,
  sex text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tarefas Semanais
create table if not exists study_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  text text not null,
  done boolean default false,
  day text not null, -- 'SEGUNDA', 'TERÇA', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- SAÚDE
-- ==========================================

-- Consultas
create table if not exists health_appointments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  specialty text,
  doctor text,
  date text,
  time text,
  location text,
  status text default 'scheduled', -- 'scheduled', 'completed', 'canceled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Medicamentos
create table if not exists health_medications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  dosage text,
  frequency text,
  time text,
  stock int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cuidados Pessoais
create table if not exists health_care (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  frequency text,
  last_done text,
  next_due text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- POLICIES (RLS)
-- ==========================================

-- Habilitar RLS (seguro re-executar, mas podemos checar, porém alter table enable row level security é idempotente em termos de erro se já estiver habilitado? Não, ele não falha, apenas re-habilita ou nada faz)
alter table profiles enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;

alter table finance_months enable row level security;
alter table finance_budgets enable row level security;
alter table finance_summaries enable row level security;

alter table study_contents enable row level security;
alter table study_exams enable row level security;
alter table study_schedule enable row level security;
alter table study_tasks enable row level security;

alter table health_appointments enable row level security;
alter table health_medications enable row level security;
alter table health_care enable row level security;

-- Policies: DROP antes de criar para evitar erro de duplicidade
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;

drop policy if exists "Users can view own habits" on habits;
drop policy if exists "Users can insert own habits" on habits;
drop policy if exists "Users can update own habits" on habits;
drop policy if exists "Users can delete own habits" on habits;

drop policy if exists "Users can view own logs" on habit_logs;
drop policy if exists "Users can insert own logs" on habit_logs;
drop policy if exists "Users can delete own logs" on habit_logs;

drop policy if exists "Users can manage own finance_months" on finance_months;
drop policy if exists "Users can manage own finance_budgets" on finance_budgets;
drop policy if exists "Users can manage own finance_summaries" on finance_summaries;
create policy "Users can manage own finance_summaries" on finance_summaries for all using (auth.uid() = user_id);

-- Studies
drop policy if exists "Users can manage own study_contents" on study_contents;
create policy "Users can manage own study_contents" on study_contents for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own study_exams" on study_exams;
create policy "Users can manage own study_exams" on study_exams for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own study_schedule" on study_schedule;
create policy "Users can manage own study_schedule" on study_schedule for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own study_tasks" on study_tasks;
create policy "Users can manage own study_tasks" on study_tasks for all using (auth.uid() = user_id);

-- Health
drop policy if exists "Users can manage own health_appointments" on health_appointments;
create policy "Users can manage own health_appointments" on health_appointments for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own health_medications" on health_medications;
create policy "Users can manage own health_medications" on health_medications for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own health_care" on health_care;
create policy "Users can manage own health_care" on health_care for all using (auth.uid() = user_id);

-- ==========================================
-- CASA (HOME)
-- ==========================================

-- Categorias de Compras
create table if not exists home_shopping_categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text,
  color_bg text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Itens de Compras
create table if not exists home_shopping_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category_id uuid references home_shopping_categories on delete cascade not null,
  name text not null,
  checked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tarefas de Limpeza
create table if not exists home_cleaning_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  task text not null,
  frequency text,
  last_done text,
  room text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Afazeres (Chores)
create table if not exists home_chores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  due_date text,
  priority text, -- 'alta', 'media', 'baixa'
  done boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Casa
alter table home_shopping_categories enable row level security;
alter table home_shopping_items enable row level security;
alter table home_cleaning_tasks enable row level security;
alter table home_chores enable row level security;

drop policy if exists "Users can manage own home_shopping_categories" on home_shopping_categories;
create policy "Users can manage own home_shopping_categories" on home_shopping_categories for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own home_shopping_items" on home_shopping_items;
create policy "Users can manage own home_shopping_items" on home_shopping_items for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own home_cleaning_tasks" on home_cleaning_tasks;
create policy "Users can manage own home_cleaning_tasks" on home_cleaning_tasks for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own home_chores" on home_chores;
create policy "Users can manage own home_chores" on home_chores for all using (auth.uid() = user_id);

-- ==========================================
-- VIAGENS (TRAVEL)
-- ==========================================

-- Viagens
create table if not exists travel_trips (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  destination text not null,
  image text,
  departure_date text,
  return_date text,
  nights text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Despesas de Viagem
create table if not exists travel_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  trip_id uuid references travel_trips on delete cascade not null,
  description text not null,
  estimated_value numeric default 0,
  real_value numeric default 0,
  category text not null, -- 'flights', 'tours', 'hotels', 'food'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Lugares para visitar
create table if not exists travel_places (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  trip_id uuid references travel_trips on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Viagens
alter table travel_trips enable row level security;
alter table travel_expenses enable row level security;
alter table travel_places enable row level security;

drop policy if exists "Users can manage own travel_trips" on travel_trips;
create policy "Users can manage own travel_trips" on travel_trips for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own travel_expenses" on travel_expenses;
create policy "Users can manage own travel_expenses" on travel_expenses for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own travel_places" on travel_places;
create policy "Users can manage own travel_places" on travel_places for all using (auth.uid() = user_id);

-- ==========================================
-- TREINOS (FITNESS)
-- ==========================================

-- Dias de Treino
create table if not exists fitness_workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  day text not null, -- 'SEGUNDA', etc.
  focus text,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exercícios
create table if not exists fitness_exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  workout_id uuid references fitness_workouts on delete cascade not null,
  name text not null,
  reps text,
  done boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Medidas
create table if not exists fitness_measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  value text,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dieta
create table if not exists fitness_diet (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  meal text not null,
  description text,
  calories text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cuidados (Saúde e Beleza no contexto Fitness/Wellness)
create table if not exists fitness_care (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  frequency text,
  last_done text,
  category text not null, -- 'saude', 'beleza'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Treinos
alter table fitness_workouts enable row level security;
alter table fitness_exercises enable row level security;
alter table fitness_measurements enable row level security;
alter table fitness_diet enable row level security;
alter table fitness_care enable row level security;

drop policy if exists "Users can manage own fitness_workouts" on fitness_workouts;
create policy "Users can manage own fitness_workouts" on fitness_workouts for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own fitness_exercises" on fitness_exercises;
create policy "Users can manage own fitness_exercises" on fitness_exercises for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own fitness_measurements" on fitness_measurements;
create policy "Users can manage own fitness_measurements" on fitness_measurements for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own fitness_diet" on fitness_diet;
create policy "Users can manage own fitness_diet" on fitness_diet for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own fitness_care" on fitness_care;
create policy "Users can manage own fitness_care" on fitness_care for all using (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente ao cadastrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Atualização da tabela Profiles
alter table profiles add column if not exists name text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists role text default 'user';
alter table profiles add column if not exists subscription_status text default 'free';
alter table profiles add column if not exists subscription_plan text;
alter table profiles add column if not exists is_admin boolean default false;
alter table profiles add column if not exists cpf text;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Tabela de Assinaturas
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  status text not null,
  plan_type text not null,
  payment_method text,
  amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table subscriptions enable row level security;

drop policy if exists "Users can view own subscriptions" on subscriptions;
create policy "Users can view own subscriptions" on subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Admins can view all subscriptions" on subscriptions;
-- Policy para admins verem tudo (depende da coluna role em profiles)
create policy "Admins can view all subscriptions" on subscriptions for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Function placeholder for user creation (requires admin privileges/extensions not available via SQL editor usually)
drop function if exists create_user_by_admin(text, text);
create or replace function create_user_by_admin(new_email text, new_password text)
returns void as $$
begin
  raise exception 'Funcionalidade indisponível via SQL direto. Utilize o Dashboard do Supabase para criar usuários.';
end;
$$ language plpgsql;

-- Tabela de Configurações do Usuário
create table if not exists user_settings (
  user_id uuid references auth.users not null primary key,
  theme text default 'light',
  notify_habits boolean default true,
  notify_bills boolean default true,
  notify_exams boolean default true,
  gender text default 'female',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_settings enable row level security;

drop policy if exists "Users can view own settings" on user_settings;
create policy "Users can view own settings" on user_settings for select using (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on user_settings;
create policy "Users can update own settings" on user_settings for update using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on user_settings;
create policy "Users can insert own settings" on user_settings for insert with check (auth.uid() = user_id);

-- Drop trigger if exists to avoid duplication errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

NOTIFY pgrst, 'reload config';
