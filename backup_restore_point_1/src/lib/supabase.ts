import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zkrgtnvyquwulcxdjoti.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Tge8aZJSgC7v42WKFiKq9g_sbRvVk0K';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('VITE_SUPABASE_ANON_KEY não encontrada no .env. Usando chave fallback (pode estar incorreta).');
} else {
  console.log('Supabase Anon Key carregada (inicia com):', import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
