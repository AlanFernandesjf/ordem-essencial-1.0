-- Add columns for marketing display on the subscription page
alter table public.plans 
add column if not exists description text, -- Subtitle like "Flexibilidade total"
add column if not exists marketing_features jsonb default '[]'::jsonb, -- Array of strings for the checkmark list
add column if not exists is_popular boolean default false; -- To show the "Mais Popular" badge

-- Update default plans if they exist (Data Migration)
update public.plans 
set description = 'Flexibilidade total',
    marketing_features = '["Acesso ilimitado a todas as áreas", "Dashboard de Gamificação completa", "Suporte prioritário"]'::jsonb,
    is_popular = false
where interval = 'monthly' and description is null;

update public.plans 
set description = 'Economize 2 meses',
    marketing_features = '["Todos os benefícios do Mensal", "Emblema exclusivo de Membro Pro", "Acesso antecipado a novas features"]'::jsonb,
    is_popular = true
where interval = 'yearly' and description is null;
