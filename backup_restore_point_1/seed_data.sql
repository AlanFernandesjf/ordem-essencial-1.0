-- INSTRUÇÕES:
-- 1. Cadastre um usuário no sistema com o email: admin@teste.com (ou altere o email abaixo)
-- 2. Rode este script no SQL Editor do Supabase para popular os dados desse usuário.

DO $$
DECLARE
    target_email text := 'admin@teste.com'; -- ALTERE AQUI SE USAR OUTRO EMAIL
    target_user_id uuid;
    habit1_id uuid;
    habit2_id uuid;
    habit3_id uuid;
BEGIN
    -- Busca o ID do usuário pelo email
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- 1. Atualizar Perfil (Nível 15, Streak de 10 dias)
        UPDATE public.profiles
        SET 
            level = 15,
            current_xp = 8500,
            current_streak = 10,
            last_activity_date = now()
        WHERE id = target_user_id;

        -- 2. Limpar dados antigos para evitar duplicidade
        DELETE FROM public.habit_logs WHERE user_id = target_user_id;
        DELETE FROM public.habits WHERE user_id = target_user_id;

        -- 3. Criar Hábitos de Admin
        INSERT INTO public.habits (user_id, title) VALUES (target_user_id, 'Análise de Sistema') RETURNING id INTO habit1_id;
        INSERT INTO public.habits (user_id, title) VALUES (target_user_id, 'Gestão de Equipe') RETURNING id INTO habit2_id;
        INSERT INTO public.habits (user_id, title) VALUES (target_user_id, 'Review de Código') RETURNING id INTO habit3_id;
        
        -- Inserir hábitos padrão também
        INSERT INTO public.habits (user_id, title) VALUES (target_user_id, 'Acordar 6am');
        INSERT INTO public.habits (user_id, title) VALUES (target_user_id, 'Treino Pesado');

        -- 4. Simular Logs de Hábitos (Histórico da semana)
        -- Hoje
        INSERT INTO public.habit_logs (habit_id, user_id, completed_date) VALUES (habit1_id, target_user_id, CURRENT_DATE);
        INSERT INTO public.habit_logs (habit_id, user_id, completed_date) VALUES (habit2_id, target_user_id, CURRENT_DATE);
        
        -- Ontem
        INSERT INTO public.habit_logs (habit_id, user_id, completed_date) VALUES (habit1_id, target_user_id, CURRENT_DATE - 1);
        INSERT INTO public.habit_logs (habit_id, user_id, completed_date) VALUES (habit2_id, target_user_id, CURRENT_DATE - 1);
        INSERT INTO public.habit_logs (habit_id, user_id, completed_date) VALUES (habit3_id, target_user_id, CURRENT_DATE - 1);

        -- Anteontem
        INSERT INTO public.habit_logs (habit_id, user_id, completed_date) VALUES (habit1_id, target_user_id, CURRENT_DATE - 2);

        RAISE NOTICE 'Usuário % atualizado com dados de teste!', target_email;
    ELSE
        RAISE NOTICE 'Usuário % não encontrado. Crie a conta na tela de login primeiro.', target_email;
    END IF;
END $$;
