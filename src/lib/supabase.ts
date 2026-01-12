import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zkrgtnvyquwulcxdjoti.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprcmd0bnZ5cXV3dWxjeGRqb3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTk0MDIsImV4cCI6MjA4MzI5NTQwMn0.vSZNNOKB-opsfvyqEF60ddUHMftyuMLs6Ni3iqLLVKs';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('VITE_SUPABASE_ANON_KEY não encontrada no .env. Usando chave fallback (pode estar incorreta).');
} else {
  console.log('Supabase Anon Key carregada (inicia com):', import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
