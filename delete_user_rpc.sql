-- Create function to allow admins to delete users
create or replace function delete_user_by_admin(
  user_id_to_delete uuid
) returns void as $$
declare
  is_executing_admin boolean;
  check_role text;
begin
  -- Check if executing user is admin
  select role, is_admin into check_role, is_executing_admin
  from public.profiles
  where id = auth.uid();

  -- Allow if role is admin OR is_admin flag is true
  if check_role != 'admin' and is_executing_admin != true then
    raise exception 'Apenas administradores podem deletar usuários.';
  end if;

  -- Delete from auth.users (this should cascade to profiles and other tables)
  delete from auth.users where id = user_id_to_delete;
end;
$$ language plpgsql security definer;
