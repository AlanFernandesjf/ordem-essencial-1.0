
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    // Buscar assinaturas ativas ou trial
    const { data: subs, error } = await supabase
        .from('user_subscriptions')
        .select('*, profiles(email, name)')
        .in('status', ['active', 'trial']);

    if (error) throw error;

    const notifications = [];
    const now = new Date();

    for (const sub of subs) {
        if (!sub.current_period_end) continue;
        
        const endDate = new Date(sub.current_period_end);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if ([7, 5, 3].includes(diffDays)) {
            console.log(`Usuário ${sub.profiles?.email} vence em ${diffDays} dias.`);
            
            // AQUI ENTRARIA O ENVIO DE EMAIL (Ex: Resend)
            // await sendEmail(sub.profiles.email, diffDays);
            
            notifications.push({
                email: sub.profiles?.email,
                days: diffDays
            });
        }
    }

    return new Response(JSON.stringify({ checked: subs.length, notifications }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 400 });
  }
});
