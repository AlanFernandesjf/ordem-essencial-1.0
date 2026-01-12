-- Fix Foreign Key Constraints to allow User Deletion (Cascade)

-- 1. Habits
ALTER TABLE public.habits
DROP CONSTRAINT IF EXISTS habits_user_id_fkey;

ALTER TABLE public.habits
ADD CONSTRAINT habits_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. Habit Logs
ALTER TABLE public.habit_logs
DROP CONSTRAINT IF EXISTS habit_logs_user_id_fkey;

ALTER TABLE public.habit_logs
ADD CONSTRAINT habit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Finance Months
ALTER TABLE public.finance_months
DROP CONSTRAINT IF EXISTS finance_months_user_id_fkey;

ALTER TABLE public.finance_months
ADD CONSTRAINT finance_months_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. Fitness Workouts
ALTER TABLE public.fitness_workouts
DROP CONSTRAINT IF EXISTS fitness_workouts_user_id_fkey;

ALTER TABLE public.fitness_workouts
ADD CONSTRAINT fitness_workouts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 5. Fitness Exercises
ALTER TABLE public.fitness_exercises
DROP CONSTRAINT IF EXISTS fitness_exercises_user_id_fkey;

ALTER TABLE public.fitness_exercises
ADD CONSTRAINT fitness_exercises_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 6. Fitness Measurements
ALTER TABLE public.fitness_measurements
DROP CONSTRAINT IF EXISTS fitness_measurements_user_id_fkey;

ALTER TABLE public.fitness_measurements
ADD CONSTRAINT fitness_measurements_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 7. Fitness Diet
ALTER TABLE public.fitness_diet
DROP CONSTRAINT IF EXISTS fitness_diet_user_id_fkey;

ALTER TABLE public.fitness_diet
ADD CONSTRAINT fitness_diet_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 8. Fitness Care
ALTER TABLE public.fitness_care
DROP CONSTRAINT IF EXISTS fitness_care_user_id_fkey;

ALTER TABLE public.fitness_care
ADD CONSTRAINT fitness_care_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 9. Profiles (Important!)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 10. Study Schedule (If exists)
ALTER TABLE public.study_schedule
DROP CONSTRAINT IF EXISTS study_schedule_user_id_fkey;

ALTER TABLE public.study_schedule
ADD CONSTRAINT study_schedule_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 11. Study Contents (If exists)
ALTER TABLE public.study_contents
DROP CONSTRAINT IF EXISTS study_contents_user_id_fkey;

ALTER TABLE public.study_contents
ADD CONSTRAINT study_contents_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 12. User Subscriptions (If exists)
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 13. Payments (If exists)
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 14. Subscriptions (If exists)
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
