-- Habilitar a extensão de storage se ainda não estiver
-- (Geralmente já vem habilitada no Supabase)

-- 1. Criar o Bucket para Imagens de Viagem
insert into storage.buckets (id, name, public)
values ('travel-images', 'travel-images', true)
on conflict (id) do nothing;

-- 2. Políticas de Segurança (RLS) para o Bucket

-- Permitir leitura pública (para exibir as imagens)
create policy "Imagens de viagem são públicas"
on storage.objects for select
using ( bucket_id = 'travel-images' );

-- Permitir upload apenas para usuários autenticados
create policy "Usuários podem fazer upload de imagens de viagem"
on storage.objects for insert
with check (
  bucket_id = 'travel-images' and
  auth.role() = 'authenticated'
);

-- Permitir atualização apenas pelo próprio usuário (opcional, mas bom)
create policy "Usuários podem atualizar suas próprias imagens"
on storage.objects for update
using (
  bucket_id = 'travel-images' and
  auth.uid() = owner
);

-- Permitir deleção apenas pelo próprio usuário
create policy "Usuários podem deletar suas próprias imagens"
on storage.objects for delete
using (
  bucket_id = 'travel-images' and
  auth.uid() = owner
);
