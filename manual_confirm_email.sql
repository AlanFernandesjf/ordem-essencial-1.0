-- Function to manually confirm a user's email
-- Run this via Supabase SQL Editor: SELECT confirm_user_email('user@email.com');

CREATE OR REPLACE FUNCTION confirm_user_email(target_email text)
RETURNS text AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
  
  IF v_user_id IS NULL THEN
    RETURN 'Usuário não encontrado.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = now(),
      confirmed_at = now(),
      last_sign_in_at = now(),
      raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'::jsonb
  WHERE id = v_user_id;
  
  RETURN 'Email confirmado com sucesso para: ' || target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
