import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  // Build-time placeholder
  supabase = createClient('https://placeholder.supabase.co', 'placeholder');
  if (typeof window !== 'undefined') {
    console.warn('Supabase environment variables are not set. Database operations will fail.');
  }
}

export { supabase };
