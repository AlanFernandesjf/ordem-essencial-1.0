import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { type, userData } = await req.json()
    
    if (!['diet', 'workout'].includes(type)) {
      throw new Error('Tipo inválido. Use "diet" ou "workout".')
    }

    // Inicializar Supabase Admin para operações de banco privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar e Deduzir Créditos
    const { data: creditResult, error: creditError } = await supabaseAdmin
      .rpc('deduct_user_credit', { user_id_input: user.id })

    if (creditError) {
      console.error('Erro ao verificar créditos:', creditError)
      throw new Error('Erro ao verificar saldo de créditos.')
    }

    // @ts-ignore: creditResult is JSON
    if (!creditResult || !creditResult.success) {
      // @ts-ignore: creditResult is JSON
      throw new Error(creditResult?.message || 'Saldo de créditos insuficiente (20/mês).')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('Chave da API OpenAI não configurada no servidor.')
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    let systemPrompt = ''
    let userPrompt = ''

    if (type === 'diet') {
      systemPrompt = `Você é um nutricionista esportivo de elite com PhD em nutrição e fisiologia do exercício.
      Sua missão é criar planos alimentares altamente personalizados, cientificamente embasados e práticos.
      
      Diretrizes:
      1. Calcule as calorias e macros com precisão baseada nos dados do usuário (Mifflin-St Jeor ou Harris-Benedict ajustado).
      2. Priorize alimentos naturais, densos em nutrientes e acessíveis no Brasil.
      3. Adapte-se estritamente às restrições alimentares (ex: vegano, intolerante a lactose) e preferências.
      4. Ofereça variedade: inclua 2-3 opções para cada refeição para evitar monotonia.
      5. Para ganho de massa, foque em superávit calórico controlado e proteína adequada (1.6g a 2.2g/kg).
      6. Para perda de peso, foque em déficit moderado e alta saciedade (fibras e proteínas).
      
      Gere a resposta EXCLUSIVAMENTE em formato JSON estrito seguindo este schema:
      {
        "calories_target": number,
        "macros_target": { "protein": string, "carbs": string, "fats": string },
        "hydration_target": "Quantidade de água diária (ex: 3.5L)",
        "meals": [
          {
            "name": "Nome da Refeição (ex: Café da Manhã)",
            "time": "Horário sugerido (ex: 07:00 - 08:00)",
            "options": [
              {
                "name": "Nome do Prato",
                "ingredients": ["lista", "de", "ingredientes", "com", "quantidades"],
                "preparation": "Instruções breves e práticas de preparo"
              }
            ]
          }
        ],
        "tips": ["dica 1", "dica 2"]
      }`

      userPrompt = `Perfil do Paciente:
      - Idade: ${userData.age} anos
      - Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
      - Peso Atual: ${userData.weight}kg
      - Altura: ${userData.height}cm
      - Objetivo Principal: ${userData.goal}
      - Nível de Atividade Física: ${userData.activityLevel}
      - Restrições Alimentares: ${userData.restrictions || 'Nenhuma'}
      - Preferências Alimentares: ${userData.preferences || 'Nenhuma'}
      
      Crie um plano detalhado e motivador.`
    } else {
      systemPrompt = `Você é um treinador de elite (Personal Trainer) com experiência em fisiologia do exercício e periodização.
      Sua missão é criar fichas de treino otimizadas para resultados reais, segurança e aderência.

      Diretrizes:
      1. Adapte o volume e intensidade ao nível de experiência do usuário.
      2. Respeite as limitações e lesões informadas para evitar agravamento.
      3. Se o local for "Casa", use exercícios com peso do corpo ou itens comuns. Se "Academia", utilize equipamentos padrão.
      4. Estruture o treino com aquecimento, parte principal e desaquecimento/alongamento.
      5. Explique brevemente a técnica correta (notes) para garantir segurança.
      6. Use uma divisão de treino lógica (ex: Upper/Lower, PPL, Full Body) baseada na disponibilidade de dias.

      Gere a resposta EXCLUSIVAMENTE em formato JSON estrito seguindo este schema:
      {
        "split": "Nome da Divisão (ex: ABC - Push/Pull/Legs)",
        "frequency": "X dias por semana",
        "goal_focus": "Foco principal (ex: Hipertrofia, Força, Resistência)",
        "workouts": [
          {
            "name": "Título do Treino (ex: Treino A - Peito e Tríceps)",
            "description": "Breve descrição do foco deste dia",
            "exercises": [
              {
                "name": "Nome do Exercício",
                "sets": number,
                "reps": "Faixa de repetições (ex: 8-12)",
                "rest": "Intervalo de descanso (ex: 60-90s)",
                "notes": "Dica técnica crucial para execução correta"
              }
            ]
          }
        ]
      }`

      userPrompt = `Perfil do Aluno:
      - Idade: ${userData.age} anos
      - Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
      - Objetivo: ${userData.goal}
      - Nível de Experiência: ${userData.experienceLevel}
      - Disponibilidade: ${userData.daysAvailable} dias por semana
      - Local de Treino: ${userData.location}
      - Limitações/Lesões: ${userData.limitations || 'Nenhuma'}
      
      Crie uma periodização eficiente e segura.`
    }

    console.log(`Gerando plano ${type} melhorado para usuário ${user.id}...`)

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.7, // Um pouco de criatividade, mas controlado
    })

    const content = completion.choices[0].message.content
    if (!content) throw new Error('Falha ao gerar conteúdo com a IA')

    const jsonContent = JSON.parse(content)

    // Salvar no banco
    const { data: savedPlan, error: dbError } = await supabaseAdmin
      .from('ai_plans')
      .insert({
        user_id: user.id,
        plan_type: type,
        content: jsonContent,
        user_data: userData
      })
      .select()
      .single()

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: savedPlan || { content: jsonContent },
        credits: creditsRemaining
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
