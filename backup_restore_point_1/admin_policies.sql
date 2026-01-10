-- Habilitar admins para ver e editar TODOS os perfis
-- Execute este script no SQL Editor do Supabase

-- 1. Remover policies antigas se existirem para evitar conflitos (opcional, mas seguro)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 2. Criar policy para Admin ver todos
CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
  OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 3. Criar policy para Admin editar todos
CREATE POLICY "Admins can update all profiles" 
ON profiles 
FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
  OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 4. Garantir que a coluna is_admin e role existam (caso não tenham sido criadas)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan text;
