-- 1. Adicionar colunas de controle na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text default 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text default 'free'; -- free, premium
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text; -- monthly, yearly
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone;

-- 2. Criar tabela de histórico de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    external_id text, -- ID do pagamento no Asaas/Stripe
    plan_type text NOT NULL, -- monthly, yearly
    amount decimal(10,2) NOT NULL,
    status text NOT NULL, -- active, pending, canceled
    payment_method text, -- credit_card, pix
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS (Segurança)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
-- Usuários podem ver suas próprias assinaturas
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ver todas as assinaturas
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 5. TRANSFORMAR SEU USUÁRIO EM ADMIN
-- Substitua 'admin@teste.com' pelo seu email de login se for diferente
DO $$
DECLARE
    target_email text := 'fernandes.advocacia@gmail.com';
    target_user_id uuid;
BEGIN
    -- Busca o ID do usuário pelo email na tabela de autenticação
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
    
    IF target_user_id IS NOT NULL THEN
        -- Atualiza o perfil para Admin e Premium
        UPDATE public.profiles 
        SET 
            role = 'admin',
            is_admin = true,
            subscription_status = 'premium',
            subscription_plan = 'lifetime'
        WHERE id = target_user_id;
        
        RAISE NOTICE 'SUCESSO: Usuário % agora é um ADMIN!', target_email;
    ELSE
        RAISE NOTICE 'AVISO: Usuário % não encontrado. Crie a conta primeiro no site.', target_email;
    END IF;
END $$;
