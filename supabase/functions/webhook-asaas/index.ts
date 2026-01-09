
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_API_TOKEN = Deno.env.get('ASAAS_API_KEY'); // Para validar (opcional, mas recomendado verificar assinatura se possível)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const event = await req.json();
    console.log('Webhook recebido:', event.event);

    // Estrutura do evento Asaas: { event: 'PAYMENT_RECEIVED', payment: { ... } }
    const payment = event.payment;
    
    // Precisamos encontrar o usuário dono desta assinatura.
    const customerId = payment.customer;
    
    // ESTRATÉGIA DE BUSCA HÍBRIDA
    // O banco pode ter armazenado:
    // 1. ID da Assinatura (sub_...) -> para planos mensais/anuais recorrentes
    // 2. ID do Pagamento (pay_...) -> para planos anuais parcelados (onde salvamos o id da primeira cobrança)
    
    let currentSub = null;
    let usedId = null;

    // Tentativa 1: Buscar por ID de Assinatura (se existir no evento)
    if (payment.subscription) {
        const { data } = await supabase
            .from('user_subscriptions')
            .select('plan_type, user_id, asaas_subscription_id')
            .eq('asaas_subscription_id', payment.subscription)
            .maybeSingle();
            
        if (data) {
            currentSub = data;
            usedId = payment.subscription;
            console.log('Encontrado por Subscription ID:', usedId);
        }
    }

    // Tentativa 2: Buscar por ID do Pagamento (para parcelados ou avulsos)
    if (!currentSub && payment.id) {
        const { data } = await supabase
            .from('user_subscriptions')
            .select('plan_type, user_id, asaas_subscription_id')
            .eq('asaas_subscription_id', payment.id)
            .maybeSingle();

        if (data) {
            currentSub = data;
            usedId = payment.id;
            console.log('Encontrado por Payment ID:', usedId);
        }
    }
    
    // Tentativa 3: Buscar por ID do Parcelamento (caso tenhamos mudado a lógica de salvar)
    if (!currentSub && payment.installment) {
        const { data } = await supabase
            .from('user_subscriptions')
            .select('plan_type, user_id, asaas_subscription_id')
            .eq('asaas_subscription_id', payment.installment)
            .maybeSingle();

        if (data) {
            currentSub = data;
            usedId = payment.installment;
            console.log('Encontrado por Installment ID:', usedId);
        }
    }

    if (!currentSub) {
         console.error('Assinatura/Pagamento não encontrado no banco. IDs tentados:', { 
             sub: payment.subscription, 
             pay: payment.id, 
             inst: payment.installment 
         });
         // Retornamos 200 para o Asaas não ficar retentando infinitamente se for um evento irrelevante
         return new Response(JSON.stringify({ error: 'Registro não encontrado' }), { status: 200 });
    }

    if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
        
        let shouldUpdateDate = true;
        
        // Se for parcelado (installments), verificar se é a primeira parcela
        if (payment.installmentNumber && payment.installmentNumber > 1) {
            // Se for plano anual parcelado, o acesso já foi concedido na primeira parcela por 1 ano.
            // Não devemos estender a data de fim a cada parcela paga.
            if (currentSub.plan_type === 'yearly') {
                shouldUpdateDate = false;
            }
        }

        const updates: any = {
            status: 'active',
            updated_at: new Date().toISOString()
        };

        if (shouldUpdateDate) {
            let daysToAdd = 30;
            if (currentSub.plan_type === 'yearly') daysToAdd = 365;

            // Calcular nova data de fim baseada na data de pagamento (ou hoje)
            // Preferir a data do pagamento para manter consistência
            const baseDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
            
            // Ajuste de fuso horário se necessário, mas new Date(string) geralmente pega UTC ou local corretamente.
            // Para garantir, vamos adicionar os dias.
            const newEndDate = new Date(baseDate);
            newEndDate.setDate(newEndDate.getDate() + daysToAdd);
            
            updates.current_period_end = newEndDate.toISOString();
        }

        // 1. Atualizar user_subscriptions
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update(updates)
            .eq('asaas_subscription_id', usedId); // Usar o ID que de fato achamos

        if (updateError) console.error('Erro ao ativar assinatura:', updateError);
        
        // 2. Atualizar profiles
        if (currentSub.user_id) {
             console.log(`Atualizando perfil do usuário ${currentSub.user_id} para PRO`);
             const { error: profileError } = await supabase.from('profiles')
                .update({ subscription_status: 'pro' })
                .eq('id', currentSub.user_id);
                
             if (profileError) console.error('Erro ao atualizar profile:', profileError);
        }

    } else if (event.event === 'PAYMENT_OVERDUE') {
        // Pagamento atrasado: Bloquear
        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
            })
            .eq('asaas_subscription_id', usedId);
            
        if (error) console.error('Erro ao bloquear assinatura:', error);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error('Erro no webhook:', error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 400 });
  }
});
