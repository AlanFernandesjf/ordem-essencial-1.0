-- Script para zerar dados de usuário (mantendo conta e assinatura)
-- Execute este script no SQL Editor do Supabase

-- 1. Dados do Dashboard e Hábitos
TRUNCATE TABLE habit_logs CASCADE;
TRUNCATE TABLE habits CASCADE;
TRUNCATE TABLE study_schedule CASCADE;
TRUNCATE TABLE home_chores CASCADE;

-- 2. Dados Financeiros
TRUNCATE TABLE finance_summaries CASCADE;
TRUNCATE TABLE finance_months CASCADE;
TRUNCATE TABLE finance_budgets CASCADE;

-- 3. Dados de Saúde
TRUNCATE TABLE health_appointments CASCADE;
TRUNCATE TABLE health_medications CASCADE;
TRUNCATE TABLE health_care CASCADE;

-- 4. Dados de Treinos e Fitness
TRUNCATE TABLE fitness_exercises CASCADE;
TRUNCATE TABLE fitness_workouts CASCADE;
TRUNCATE TABLE fitness_measurements CASCADE;
TRUNCATE TABLE fitness_diet CASCADE;
TRUNCATE TABLE fitness_care CASCADE;

-- 5. Dados de Viagens
TRUNCATE TABLE travel_expenses CASCADE;
TRUNCATE TABLE travel_places CASCADE;
TRUNCATE TABLE travel_trips CASCADE;

-- 6. Configurações de Usuário (opcional, remova se quiser manter o tema)
TRUNCATE TABLE user_settings CASCADE;

-- Observação: As tabelas 'profiles' e 'user_subscriptions' foram mantidas
-- para que você não perca o acesso à conta nem o status do plano.
