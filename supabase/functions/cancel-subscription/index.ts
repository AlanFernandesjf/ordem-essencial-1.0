import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')

    if (!supabaseUrl || !serviceRoleKey || !asaasApiKey) {
      throw new Error('Configuração incompleta.')
    }

    // Auth check using the user's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error('Usuário não autenticado.')
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
        throw new Error('Usuário inválido.')
    }

    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Get active subscription first to get Asaas ID
    const { data: sub, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('asaas_subscription_id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trial', 'pending', 'canceled']) // Include canceled to allow feedback even if already canceled locally? No, usually we cancel active.
        .single()

    // Config Asaas
    const ASAAS_ENV = Deno.env.get('ASAAS_ENV')
    let ASAAS_API_URL = Deno.env.get('ASAAS_API_URL')
    if (!ASAAS_API_URL) {
      ASAAS_API_URL = (ASAAS_ENV === 'production') 
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/api/v3'
    }

    let paymentMethod = 'Desconhecido';

    if (sub && sub.asaas_subscription_id) {
        try {
            const isPayment = sub.asaas_subscription_id.startsWith('pay_');
            const endpoint = isPayment ? 'payments' : 'subscriptions';
            
            const checkRes = await fetch(`${ASAAS_API_URL}/${endpoint}/${sub.asaas_subscription_id}`, {
                headers: { 'access_token': asaasApiKey }
            });
            
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.billingType) {
                    paymentMethod = checkData.billingType;
                }
            }
        } catch (e) {
            console.error('Erro ao buscar detalhes do Asaas:', e);
        }
    }

    // Capture feedback if provided
    try {
        const clonedReq = req.clone();
        const body = await clonedReq.json().catch(() => ({}));
        
        if (body.feedback) {
            console.log('Saving cancellation feedback:', body.feedback);
            
            // Add payment method to reasons or store it? 
            // We'll append it to reasons as a tag like "PAYMENT:PIX" to be easily parsable but avoiding schema changes for now.
            // Or just "PIX", "CREDIT_CARD" etc.
            const reasons = body.feedback.reasons || [];
            if (paymentMethod !== 'Desconhecido') {
                reasons.push(`PAYMENT:${paymentMethod}`);
            }

            await supabaseAdmin.from('cancellation_feedback').insert({
                user_id: user.id,
                reasons: reasons,
                other_reason: body.feedback.other
            });
        }
    } catch (err) {
        console.error('Error saving feedback:', err);
    }

    if (subError || !sub) {
        throw new Error('Nenhuma assinatura encontrada para cancelar.')
    }

    if (!sub.asaas_subscription_id) {
         // If trial without ID, just update DB
        await supabaseAdmin
            .from('user_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
        
        // Trial has no period end usually, or it does?
        // If it's a trial, we might want to end it immediately or not?
        // Assuming trial cancel means end immediately for now, or keep 'free' update
        await supabaseAdmin.from('profiles').update({ subscription_status: 'free' }).eq('id', user.id)

        return new Response(
            JSON.stringify({ success: true, message: 'Assinatura cancelada com sucesso.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }

    // Determine endpoint based on ID prefix
    const isPayment = sub.asaas_subscription_id.startsWith('pay_');
    const endpoint = isPayment ? 'payments' : 'subscriptions';
    
    console.log(`Cancelling ${endpoint}: ${sub.asaas_subscription_id}`);

    // Check status if it's a payment before deleting
    if (isPayment) {
        const checkRes = await fetch(`${ASAAS_API_URL}/payments/${sub.asaas_subscription_id}`, {
            headers: { 'access_token': asaasApiKey }
        });
        
        if (checkRes.ok) {
            const checkData = await checkRes.json();

            // CHECK FOR INSTALLMENT (Parcelamento)
            if (checkData.installment) {
                 console.log(`Payment is part of installment ${checkData.installment}. Deleting installment.`);
                 const instRes = await fetch(`${ASAAS_API_URL}/installments/${checkData.installment}`, {
                    method: 'DELETE',
                    headers: { 'access_token': asaasApiKey }
                 });
                 const instData = await instRes.json();
                 
                 // If deleted or already deleted
                 if (instData.deleted || instRes.ok || instData.errors?.[0]?.code === 'resource_not_found') {
                      await supabaseAdmin
                        .from('user_subscriptions')
                        .update({ status: 'canceled', updated_at: new Date().toISOString() })
                        .eq('asaas_subscription_id', sub.asaas_subscription_id);
                      
                      return new Response(
                        JSON.stringify({ success: true, message: 'Assinatura (Parcelamento) cancelada com sucesso.' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
                 } else {
                     console.error('Failed to delete installment:', instData);
                     // If we can't delete the installment (e.g. maybe it's fully paid?), we fall back to checking the specific payment status below.
                 }
            }

            const status = checkData.status;
            
            // If payment is already confirmed/received, we CANNOT delete it.
            // But we should allow the user to "cancel" the subscription locally (stop renewal/access at end of period)
            // For one-time/installment payments, "canceling" means marking as canceled locally.
            if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED'].includes(status)) {
                console.log(`Payment ${sub.asaas_subscription_id} is ${status}. Canceling locally only.`);
                
                // Update DB locally
                await supabaseAdmin
                    .from('user_subscriptions')
                    .update({ status: 'canceled', updated_at: new Date().toISOString() })
                    .eq('asaas_subscription_id', sub.asaas_subscription_id);
                
                // Do NOT downgrade profile immediately. Let them use until period end.
                // await supabaseAdmin
                //    .from('profiles')
                //    .update({ subscription_status: 'free' }) 
                //    .eq('id', user.id);

                return new Response(
                    JSON.stringify({ success: true, message: 'Assinatura cancelada com sucesso.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        }
    }

    // Cancel in Asaas
    const response = await fetch(`${ASAAS_API_URL}/${endpoint}/${sub.asaas_subscription_id}`, {
        method: 'DELETE',
        headers: { 'access_token': asaasApiKey }
    })

    const data = await response.json()

    // Success condition differs slightly:
    // Subscriptions return { deleted: true }
    // Payments return { deleted: true } or just 200 OK with data
    
    if (data.deleted || response.ok) {
        // Update DB
        await supabaseAdmin
            .from('user_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('asaas_subscription_id', sub.asaas_subscription_id)
        
        // Do NOT downgrade profile immediately. Let them use until period end.
        // await supabaseAdmin
        //    .from('profiles')
        //    .update({ subscription_status: 'free' })
        //    .eq('id', user.id)

        return new Response(
            JSON.stringify({ success: true, message: 'Assinatura cancelada com sucesso.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } else {
        // Sometimes it fails if already deleted, let's check
        if (data.errors?.[0]?.code === 'resource_not_found') {
             // Already deleted, sync DB
             await supabaseAdmin
                .from('user_subscriptions')
                .update({ status: 'canceled', updated_at: new Date().toISOString() })
                .eq('asaas_subscription_id', sub.asaas_subscription_id)
             
             // await supabaseAdmin.from('profiles').update({ subscription_status: 'free' }).eq('id', user.id)
             
             return new Response(
                JSON.stringify({ success: true, message: 'Assinatura sincronizada (já estava cancelada).' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        throw new Error(data.errors?.[0]?.description || 'Erro ao cancelar no Asaas.')
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
