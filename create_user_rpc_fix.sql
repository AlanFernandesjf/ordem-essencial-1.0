-- CORREÇÃO DE AMBIGUIDADE DE COLUNA
-- Execute este script no SQL Editor do Supabase

create or replace function create_user_by_admin(
  new_email text,
  new_password text
) returns uuid as $$
declare
  v_new_user_id uuid;
  v_is_admin boolean;
  v_check_role text;
begin
  -- Check if executing user is admin
  -- Usamos qualificação completa (public.profiles.is_admin) e variáveis com prefixo v_
  select public.profiles.role, public.profiles.is_admin 
  into v_check_role, v_is_admin
  from public.profiles
  where id = auth.uid();

  if v_check_role != 'admin' and v_is_admin != true then
    raise exception 'Apenas administradores podem criar usuários.';
  end if;

  -- Check if email already exists
  if exists (select 1 from auth.users where email = new_email) then
    raise exception 'Este email já está cadastrado.';
  end if;

  -- Generate new UUID
  v_new_user_id := gen_random_uuid();

  -- Insert into auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_new_user_id,
    'authenticated',
    'authenticated',
    new_email,
    crypt(new_password, gen_salt('bf')),
    now(),
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  );

  return v_new_user_id;
end;
$$ language plpgsql security definer;
