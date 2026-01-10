-- Enable pgcrypto for password hashing if not already enabled
create extension if not exists pgcrypto;

-- Create function to allow admins to create users
create or replace function create_user_by_admin(
  new_email text,
  new_password text
) returns uuid as $$
declare
  new_user_id uuid;
  is_admin boolean;
  check_role text;
begin
  -- Check if executing user is admin
  select role, is_admin into check_role, is_admin
  from public.profiles
  where id = auth.uid();

  if check_role != 'admin' and is_admin != true then
    raise exception 'Apenas administradores podem criar usuários.';
  end if;

  -- Check if email already exists
  if exists (select 1 from auth.users where email = new_email) then
    raise exception 'Este email já está cadastrado.';
  end if;

  -- Generate new UUID
  new_user_id := gen_random_uuid();

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
    new_user_id,
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

  return new_user_id;
end;
$$ language plpgsql security definer;
