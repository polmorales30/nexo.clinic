import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rgkymvhoewbozvxonlft.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AdPg8ID7Obr5T_FQplnYdg_4hV5tg73';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
