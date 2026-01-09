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

    // Ping check para validar status da função
    if (body.ping) {
        return new Response(JSON.stringify({ message: 'pong', success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { plan, cpf, creditCard, holderName, expiryMonth, expiryYear, ccv, debug, email, billingType = null, installments = 1 } = body
    const startTime = Date.now();
    const logStep = (step: string) => console.log(`[${Date.now() - startTime}ms] ${step}`);

    logStep(`Payment Request: ${JSON.stringify({ plan, email, billingType, hasCreditCard: !!creditCard, installments })}`);

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
    logStep('Initializing Supabase Admin');
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

    logStep(`Using Asaas API URL: ${ASAAS_API_URL}`);

    // 6. BUSCAR PLANO
    logStep('Fetching Plan Details');
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
    logStep('Managing Customer');
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
    logStep(`Fetching Asaas Customer for email: ${email}`);
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
         logStep('Updating Customer CPF');
         await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
           method: 'POST',
           headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
           body: JSON.stringify({ cpfCnpj: userCpf })
         })
      }
    } else {
      // Cria novo cliente
      logStep('Creating New Customer');
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

    // 8. LOGICA DE ASSINATURA VS PARCELAMENTO
    logStep('Processing Payment/Subscription');
    let responseId = '';
    let isInstallmentPayment = false;

    // Se for Anual e Parcelado (>1), usamos endpoint de Cobrança Parcelada (/payments)
    // Se for Assinatura recorrente padrão, usamos (/subscriptions)
    if (planDetails.interval === 'yearly' && installments > 1) {
         isInstallmentPayment = true;
         logStep('Creating Installment Payment (Yearly)');

         const paymentBody: any = {
             customer: customerId,
             billingType: billingType || (creditCard ? 'CREDIT_CARD' : 'UNDEFINED'),
             value: planDetails.price, // Valor total
             dueDate: new Date().toISOString().split('T')[0], // Vence hoje
             installmentCount: installments,
             installmentValue: planDetails.price / installments, // Opcional, Asaas calcula se omitir, mas bom mandar
             description: `Plano Anual (Parcelado em ${installments}x)`
         };

         if (creditCard) {
            paymentBody.creditCard = {
                holderName: holderName,
                number: creditCard,
                expiryMonth: expiryMonth,
                expiryYear: expiryYear,
                ccv: ccv
            }
            paymentBody.creditCardHolderInfo = {
                name: holderName,
                email: email,
                cpfCnpj: userCpf,
                postalCode: '00000000', 
                addressNumber: '0',
                phone: '00000000000'
            }
        }

        const payResponse = await fetch(`${ASAAS_API_URL}/payments`, {
            method: 'POST',
            headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentBody)
        })
        const payData = await payResponse.json()

        if (payData.errors) {
            console.error('Erro Asaas Payment (Parcelado):', payData.errors)
            throw new Error('Pagamento recusado: ' + payData.errors[0].description)
        }
        
        console.log('Installment Payment created:', payData.id);
        responseId = payData.id; 
        
    } else {
        // ASSINATURA RECORRENTE PADRÃO (Mensal ou Anual à vista)
        logStep('Creating Standard Subscription');
        
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
            billingType: billingType || (creditCard ? 'CREDIT_CARD' : 'UNDEFINED')
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

        console.log('Subscription created:', subData.id);
        responseId = subData.id;
    }


    // 9. SALVAR NO SUPABASE
    logStep('Saving to Supabase');
    const { error: dbError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
            user_id: userId,
            asaas_subscription_id: responseId, // Pode ser ID de assinatura ou pagamento
            plan_type: planDetails.interval,
            status: 'pending',
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

    if (dbError) {
        console.error('Erro ao salvar user_subscriptions:', dbError)
    }

    // Link de pagamento e Detalhes Próprios (Pix/Boleto)
    let paymentUrl = null
    let pixQrCode = null
    let pixCopyPaste = null
    let boletoBarcode = null
    let boletoUrl = null

    if (!creditCard) {
        logStep('Retrieving Pix/Boleto Details');
        // Se for Assinatura, precisamos buscar a cobrança gerada
        // Se for Parcelamento, 'responseId' já é a cobrança (ou a primeira delas)
        
        let chargeId = null;

        if (isInstallmentPayment) {
            chargeId = responseId; // Para /payments, o retorno é a cobrança criada
        } else {
            // Retry logic para buscar cobrança da assinatura
            let chargesData = { data: [] };
            let retries = 5; // Increased retries but shorter intervals
            while (retries > 0 && chargesData.data.length === 0) {
                // Circuit breaker: se já passou de 8 segundos, aborta para evitar timeout da Edge Function (limit 10s)
                if (Date.now() - startTime > 8000) {
                    console.warn('Timeout prevention: Aborting charge fetch loop.');
                    break;
                }

                logStep(`Fetching charges (retry ${6 - retries})`);
                try {
                    const chargesResponse = await fetch(`${ASAAS_API_URL}/subscriptions/${responseId}/payments?limit=1`, {
                        headers: { 'access_token': asaasApiKey }
                    })
                    chargesData = await chargesResponse.json()
                } catch (err) {
                    console.warn('Erro ao buscar cobranças (tentativa):', err);
                }
                
                if (chargesData.data && chargesData.data.length > 0) break;
                
                await new Promise(r => setTimeout(r, 300)); // Reduced wait time
                retries--;
            }
            if (chargesData.data && chargesData.data.length > 0) {
                chargeId = chargesData.data[0].id;
            }
        }

        if (chargeId) {
            // Buscar detalhes da cobrança para pegar URL
             const chargeRes = await fetch(`${ASAAS_API_URL}/payments/${chargeId}`, {
                headers: { 'access_token': asaasApiKey }
             });
             const charge = await chargeRes.json();
             
             paymentUrl = charge.invoiceUrl;
            
            // Buscar dados específicos de Pix
            if (charge.billingType === 'PIX' || charge.billingType === 'UNDEFINED') {
                 const pixRes = await fetch(`${ASAAS_API_URL}/payments/${chargeId}/pixQrCode`, {
                    headers: { 'access_token': asaasApiKey }
                 });
                 const pixData = await pixRes.json();
                 if (pixData.encodedImage) {
                     pixQrCode = pixData.encodedImage;
                     pixCopyPaste = pixData.payload;
                 }
            }
            
            // Buscar dados específicos de Boleto
            if (charge.billingType === 'BOLETO' || charge.billingType === 'UNDEFINED') {
                const boletoRes = await fetch(`${ASAAS_API_URL}/payments/${chargeId}/identificationField`, {
                    headers: { 'access_token': asaasApiKey }
                 });
                 const boletoData = await boletoRes.json();
                 if (boletoData.identificationField) {
                     boletoBarcode = boletoData.identificationField;
                     boletoUrl = charge.bankSlipUrl; 
                 }
            }
        }
    }

    // SUCESSO!
    logStep('Success! Returning Response');
    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriptionId: responseId,
        paymentUrl: paymentUrl,
        pixQrCode,
        pixCopyPaste,
        boletoBarcode,
        boletoUrl,
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 } // Changed to 200 to avoid FunctionsHttpError
    )
  }
})
