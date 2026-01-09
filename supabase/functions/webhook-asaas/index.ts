
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
    // O Asaas envia o 'customer' ID e o 'subscription' ID (se for assinatura).
    const customerId = payment.customer;
    const subscriptionId = payment.subscription;

    if (!subscriptionId) {
        // Se for cobrança avulsa sem assinatura, ignoramos por enquanto
        console.log('Evento ignorado: Sem subscriptionId');
        return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
        // Pagamento confirmado: Ativar usuário e estender prazo
        // Se for mensal, +30 dias. Se anual, +365 dias.
        
        // Buscar assinatura atual para saber o plano
        const { data: currentSub } = await supabase
            .from('user_subscriptions')
            .select('plan_type')
            .eq('asaas_subscription_id', subscriptionId)
            .single();

        let daysToAdd = 30;
        if (currentSub?.plan_type === 'yearly') daysToAdd = 365;

        // Calcular nova data de fim
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);

        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                status: 'active',
                current_period_end: newEndDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('asaas_subscription_id', subscriptionId);

        if (error) console.error('Erro ao ativar assinatura:', error);
        
        // Atualizar também o profile para redundância e cache
        if (currentSub && !error) {
             // Precisamos do user_id, vamos buscar da subscription se não tivermos
             const { data: subWithUser } = await supabase
                .from('user_subscriptions')
                .select('user_id')
                .eq('asaas_subscription_id', subscriptionId)
                .single();
                
             if (subWithUser?.user_id) {
                 await supabase.from('profiles')
                    .update({ subscription_status: 'pro' })
                    .eq('id', subWithUser.user_id);
             }
        }

    } else if (event.event === 'PAYMENT_OVERDUE') {
        // Pagamento atrasado: Bloquear (status past_due)
        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
            })
            .eq('asaas_subscription_id', subscriptionId);
            
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
