-- Script para garantir unicidade do CPF e função de verificação
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar constraint UNIQUE na coluna CPF da tabela profiles
-- (Isso impede que o mesmo CPF seja inserido duas vezes)
ALTER TABLE profiles 
ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);

-- 2. Criar função segura para verificar se CPF já existe (para usar no frontend)
-- Esta função deve ser acessível publicamente (ou por usuários autenticados, dependendo do fluxo)
-- Como o cadastro é público, precisamos de uma função SECURITY DEFINER que possa ser chamada pela API

CREATE OR REPLACE FUNCTION public.check_cpf_exists(cpf_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Permite executar com privilégios de dono (bypass RLS para leitura específica)
AS $$
DECLARE
  exists_cpf boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE cpf = cpf_check
  ) INTO exists_cpf;
  
  RETURN exists_cpf;
END;
$$;

-- Permissões para a função ser chamada via API
GRANT EXECUTE ON FUNCTION public.check_cpf_exists(text) TO anon, authenticated, service_role;
