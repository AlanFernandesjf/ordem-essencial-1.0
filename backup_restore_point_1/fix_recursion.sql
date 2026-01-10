-- CORREÇÃO DO ERRO DE RECURSÃO INFINITA
-- Execute este script no SQL Editor do Supabase para corrigir o erro 42P17

-- 1. Criar uma função segura para verificar se é admin
-- O "SECURITY DEFINER" permite que esta função leia a tabela profiles sem acionar as policies (RLS), evitando o loop infinito.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Prática de segurança recomendada
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR is_admin = true)
  );
END;
$$;

-- 2. Remover as policies que estavam causando o erro
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 3. Recriar as policies usando a nova função segura
CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (
  is_admin() = true
);

CREATE POLICY "Admins can update all profiles" 
ON profiles 
FOR UPDATE 
USING (
  is_admin() = true
);

-- Garantir permissão de execução na função
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
