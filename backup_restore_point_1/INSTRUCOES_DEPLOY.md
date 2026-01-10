# Instruções para Ativar Pagamentos

Para que o sistema de pagamentos funcione, você precisa implantar a "Edge Function" no Supabase e configurar as chaves de acesso do Asaas.

Siga os passos abaixo no seu terminal (PowerShell ou CMD):

## 1. Login no Supabase
Caso ainda não esteja logado, execute:
```bash
npx supabase login
```
Isso abrirá o navegador para você confirmar o acesso.

## 2. Implantar a Função (Deploy)
Execute o comando abaixo para enviar o código da função para o servidor:
```bash
npx supabase functions deploy create-payment --project-ref zkrgtnvyquwulcxdjoti --no-verify-jwt
```

## 3. Configurar Variáveis de Ambiente (Segredos)
Você precisa definir as chaves do Asaas no Supabase para que a função consiga criar cobranças.

Substitua `SUA_CHAVE_API_DO_ASAAS` pela chave que você obteve no painel do Asaas (Sandbox ou Produção).

```bash
npx supabase secrets set --project-ref zkrgtnvyquwulcxdjoti ASAAS_API_KEY="SUA_CHAVE_API_DO_ASAAS" ASAAS_ENV="sandbox"
```
> Se for para produção, mude `ASAAS_ENV` para `production`.

## 4. Testar
Após configurar, recarregue a página da aplicação e tente assinar um plano novamente.

---
**Nota sobre erro de "Refresh Token":**
Se você ver erros de autenticação no console, é porque sua sessão local expirou. Faça **Logout** na aplicação e entre novamente.
