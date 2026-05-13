import { createClient } from '@supabase/supabase-js';

// Queste variabili verranno lette dal file .env che hai già nel progetto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ATTENZIONE: Mancano le chiavi di Supabase nel file .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
