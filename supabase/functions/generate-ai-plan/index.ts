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
      systemPrompt = `Você é um nutricionista esportivo especialista. 
      Gere um plano alimentar personalizado em formato JSON estrito.
      O JSON deve seguir a estrutura:
      {
        "calories_target": number,
        "macros_target": { "protein": string, "carbs": string, "fats": string },
        "meals": [
          {
            "name": "Nome da Refeição (ex: Café da Manhã)",
            "time": "Horário sugerido",
            "options": [
              {
                "name": "Nome do Prato",
                "ingredients": ["ingrediente 1", "ingrediente 2"],
                "preparation": "Breve modo de preparo se necessário"
              }
            ]
          }
        ],
        "hydration_target": "Quantidade de água diária"
      }
      Não inclua markdown, apenas o JSON puro.`

      userPrompt = `Crie uma dieta para:
      Idade: ${userData.age}
      Gênero: ${userData.gender}
      Peso: ${userData.weight}kg
      Altura: ${userData.height}cm
      Objetivo: ${userData.goal}
      Nível de Atividade: ${userData.activityLevel}
      Restrições Alimentares: ${userData.restrictions || 'Nenhuma'}
      Preferências: ${userData.preferences || 'Nenhuma'}
      `
    } else {
      systemPrompt = `Você é um personal trainer especialista.
      Gere uma ficha de treino personalizada em formato JSON estrito.
      O JSON deve seguir a estrutura:
      {
        "split": "Divisão do treino (ex: ABC, Full Body)",
        "frequency": "Dias por semana",
        "workouts": [
          {
            "name": "Nome do Treino (ex: Treino A - Peito e Tríceps)",
            "description": "Foco do treino",
            "exercises": [
              {
                "name": "Nome do Exercício",
                "sets": number,
                "reps": "Faixa de repetições (ex: 10-12)",
                "rest": "Tempo de descanso (ex: 60s)",
                "notes": "Dica de execução"
              }
            ]
          }
        ]
      }
      Não inclua markdown, apenas o JSON puro.`

      userPrompt = `Crie um treino para:
      Idade: ${userData.age}
      Gênero: ${userData.gender}
      Objetivo: ${userData.goal}
      Nível de Experiência: ${userData.experienceLevel} (Iniciante/Intermediário/Avançado)
      Dias disponíveis: ${userData.daysAvailable} dias por semana
      Local de treino: ${userData.location} (Academia/Casa)
      Limitações/Lesões: ${userData.limitations || 'Nenhuma'}
      `
    }

    console.log(`Gerando plano ${type} para usuário ${user.id}...`)

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-4o-mini', // Ou gpt-3.5-turbo se preferir mais barato, mas 4o-mini é bom e barato
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) throw new Error('Falha ao gerar conteúdo com a IA')

    const jsonContent = JSON.parse(content)

    // Salvar no banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
      // Não falhar a request se já gerou, retorna o gerado mesmo assim
    }

    return new Response(
      JSON.stringify({ success: true, plan: savedPlan || { content: jsonContent } }),
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
