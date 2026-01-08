
-- Adicionar campos de nome e CPF na tabela de perfis
alter table profiles 
add column if not exists name text,
add column if not exists cpf text;

-- Atualizar políticas de segurança se necessário (normalmente update já é permitido para o próprio usuário)
