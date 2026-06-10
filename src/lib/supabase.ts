import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Questa funzione crea un client che legge e scrive automaticamente i cookie
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
