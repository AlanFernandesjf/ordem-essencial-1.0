-- Script para atualizar o fluxo de criação de usuários
-- Adiciona campos faltantes e atualiza a trigger para popular dados automaticamente

-- 1. Adicionar coluna de data de nascimento na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Atualizar a função handle_new_user para ler os metadados do cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Inserir no perfil
  INSERT INTO public.profiles (id, email, name, cpf, birth_date)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    CASE 
      WHEN new.raw_user_meta_data->>'birth_date' = '' THEN NULL
      ELSE (new.raw_user_meta_data->>'birth_date')::date
    END
  );

  -- Inserir nas configurações (com gênero)
  INSERT INTO public.user_settings (user_id, gender)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'gender', 'female')
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
