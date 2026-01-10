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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) throw new Error('User not found')

    // Get current subscription
    const { data: sub, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!sub || !sub.asaas_subscription_id) {
        return new Response(JSON.stringify({ status: 'no_subscription' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (sub.status === 'active') {
         return new Response(JSON.stringify({ status: 'active', synced: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check Asaas
    const ASAAS_ENV = Deno.env.get('ASAAS_ENV')
    let ASAAS_API_URL = Deno.env.get('ASAAS_API_URL')
    if (!ASAAS_API_URL) {
      ASAAS_API_URL = (ASAAS_ENV === 'production') 
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/api/v3'
    }

    const isPayment = sub.asaas_subscription_id.startsWith('pay_')
    const endpoint = isPayment ? 'payments' : 'subscriptions'
    
    console.log(`Checking Asaas ${endpoint}: ${sub.asaas_subscription_id}`)
    
    const response = await fetch(`${ASAAS_API_URL}/${endpoint}/${sub.asaas_subscription_id}`, {
        headers: { 'access_token': asaasApiKey }
    })

    if (!response.ok) {
        // If not found, maybe it was deleted?
        if (response.status === 404) {
             return new Response(JSON.stringify({ status: 'not_found_in_asaas' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        throw new Error(`Asaas error: ${response.statusText}`)
    }

    const data = await response.json()
    let isActive = false

    if (isPayment) {
        // Payment status: CONFIRMED, RECEIVED
        if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(data.status)) {
            isActive = true
        }
    } else {
        // Subscription status: ACTIVE
        if (data.status === 'ACTIVE') {
            isActive = true
        }
    }

    if (isActive) {
        console.log(`Syncing status to active for user ${user.id}`)
        
        let shouldUpdateDate = true;
        
        if (isPayment && data.installmentNumber && data.installmentNumber > 1) {
             if (sub.plan_type === 'yearly') {
                 shouldUpdateDate = false;
             }
        }
        
        const updates: any = {
             status: 'active',
             updated_at: new Date().toISOString()
        }
        
        if (shouldUpdateDate) {
            let daysToAdd = 30
            if (sub.plan_type === 'yearly') daysToAdd = 365
            
            // Prefer payment date
            const baseDate = data.paymentDate ? new Date(data.paymentDate) : (data.confirmedDate ? new Date(data.confirmedDate) : new Date());
            
            const newEndDate = new Date(baseDate)
            newEndDate.setDate(newEndDate.getDate() + daysToAdd)
            updates.current_period_end = newEndDate.toISOString()
        }

        // Update DB
        await supabaseAdmin
            .from('user_subscriptions')
            .update(updates)
            .eq('user_id', user.id)
            
        await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'pro' })
            .eq('id', user.id)
            
        return new Response(JSON.stringify({ status: 'active', synced: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ status: sub.status, asaas_status: data.status, synced: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
