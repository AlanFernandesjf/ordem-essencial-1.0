import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. LEITURA DO BODY
    let body
    try {
        body = await req.json()
    } catch (e) {
        body = {}
    }

    const { plan, cpf, creditCard, holderName, expiryMonth, expiryYear, ccv, debug, email } = body

    // 2. MODO DEBUG
    if (debug) {
        return new Response(
            JSON.stringify({ 
                success: true, 
                message: "Conexão OK (Bypass Auth)",
                env: {
                    asaas_key: Deno.env.get('ASAAS_API_KEY') ? 'OK' : 'MISSING',
                    supabase_url: Deno.env.get('SUPABASE_URL') ? 'OK' : 'MISSING',
                    service_role: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'OK' : 'MISSING'
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }

    // 3. VALIDAÇÃO BÁSICA
    if (!email) {
        throw new Error('Email do usuário não fornecido.')
    }

    // VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE CRÍTICAS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Configuração do Servidor incompleta: SUPABASE_URL ou SERVICE_ROLE_KEY ausentes.')
    }
    
    if (!asaasApiKey) {
        throw new Error('Configuração de Pagamento incompleta: ASAAS_API_KEY ausente.')
    }

    // 4. INICIALIZAÇÃO SUPABASE (Admin Client para bypass RLS)
    let supabaseAdmin;
    try {
        supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    } catch (clientErr: any) {
        throw new Error(`Erro ao inicializar Supabase Client: ${clientErr.message}`)
    }

    // 5. CONFIGURAÇÃO ASAAS
    const ASAAS_ENV = Deno.env.get('ASAAS_ENV')
    
    let ASAAS_API_URL = Deno.env.get('ASAAS_API_URL')
    if (!ASAAS_API_URL) {
      ASAAS_API_URL = (ASAAS_ENV === 'production') 
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/api/v3'
    }

    // 6. BUSCAR PLANO
    if (!plan) throw new Error('Plano não selecionado.')
    
    let planDetails = null;

    if (plan === 'monthly-default') {
        planDetails = {
            id: 'monthly-default',
            name: 'Mensal',
            price: 29.90,
            interval: 'monthly'
        }
    } else if (plan === 'yearly-default') {
        planDetails = {
            id: 'yearly-default',
            name: 'Anual',
            price: 299.90,
            interval: 'yearly'
        }
    }

    // Se não for um dos defaults, tenta buscar no banco
    if (!planDetails) {
        const { data: dbPlan, error: planError } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('id', plan)
          .single()
        
        if (dbPlan) {
            planDetails = dbPlan;
        } else {
            console.warn(`Plano ${plan} não encontrado no banco. Erro: ${planError?.message}`);
        }
    }

    if (!planDetails) {
        throw new Error(`Plano inválido ou não encontrado: ${plan}`)
    }

    // 7. GESTÃO DE CLIENTE (CUSTOMER)
    let userCpf = cpf
    let userId = null
    
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, cpf')
        .eq('email', email)
        .maybeSingle()
       
    if (profile) {
        userId = profile.id
        if (!userCpf && profile.cpf) userCpf = profile.cpf
    }
    
    if (!userId) {
        throw new Error('Usuário não encontrado no banco de dados (Profiles).')
    }

    // Busca cliente existente no Asaas pelo email
    const customerResponse = await fetch(`${ASAAS_API_URL}/customers?email=${email}`, {
      headers: { 'access_token': asaasApiKey }
    })
    
    if (!customerResponse.ok) {
        throw new Error(`Erro Asaas Customer: ${customerResponse.statusText}`)
    }

    const customerData = await customerResponse.json()
    let customerId = ''

    if (customerData.data && customerData.data.length > 0) {
      customerId = customerData.data[0].id
      // Atualiza CPF se necessário
      if (userCpf && userCpf !== customerData.data[0].cpfCnpj) {
         await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
           method: 'POST',
           headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
           body: JSON.stringify({ cpfCnpj: userCpf })
         })
      }
    } else {
      // Cria novo cliente
      const newCustomerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email, 
          email: email,
          cpfCnpj: userCpf
        })
      })
      const newCustomer = await newCustomerRes.json()
      if (newCustomer.errors) {
        throw new Error('Erro Criar Cliente Asaas: ' + newCustomer.errors[0].description)
      }
      customerId = newCustomer.id
    }

    // 8. CRIAR ASSINATURA
    const cycleMap: Record<string, string> = {
      'monthly': 'MONTHLY',
      'yearly': 'YEARLY',
      'quarterly': 'QUARTERLY'
    }
    const cycle = cycleMap[planDetails.interval] || 'MONTHLY'

    const subscriptionBody: any = {
      customer: customerId,
      value: planDetails.price,
      cycle: cycle,
      description: `Assinatura Plano ${planDetails.name}`,
      billingType: creditCard ? 'CREDIT_CARD' : 'UNDEFINED'
    }

    if (creditCard) {
        subscriptionBody.creditCard = {
            holderName: holderName,
            number: creditCard,
            expiryMonth: expiryMonth,
            expiryYear: expiryYear,
            ccv: ccv
        }
        subscriptionBody.creditCardHolderInfo = {
            name: holderName,
            email: email,
            cpfCnpj: userCpf,
            postalCode: '00000000', 
            addressNumber: '0',
            phone: '00000000000'
        }
    }

    const subResponse = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionBody)
    })
    const subData = await subResponse.json()

    if (subData.errors) {
       console.error('Erro Asaas Subscription:', subData.errors)
       throw new Error('Pagamento recusado: ' + subData.errors[0].description)
    }

    // 9. SALVAR NO SUPABASE
    const { error: dbError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
            user_id: userId,
            asaas_subscription_id: subData.id,
            plan_type: planDetails.interval,
            status: 'pending',
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

    if (dbError) {
        console.error('Erro ao salvar user_subscriptions:', dbError)
    }

    // Link de pagamento
    let paymentUrl = null
    if (!creditCard) {
        const chargesResponse = await fetch(`${ASAAS_API_URL}/subscriptions/${subData.id}/payments?limit=1`, {
            headers: { 'access_token': asaasApiKey }
        })
        const chargesData = await chargesResponse.json()
        if (chargesData.data && chargesData.data.length > 0) {
            paymentUrl = chargesData.data[0].invoiceUrl
        }
    }

    // SUCESSO!
    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriptionId: subData.id,
        paymentUrl: paymentUrl,
        message: 'Assinatura iniciada com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Erro Fatal Tratado:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erro no Servidor: ${error.message || 'Desconhecido'}`,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
