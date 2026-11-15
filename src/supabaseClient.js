import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cxulxasxveljhhuipjpc.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WLhnVNzR8oE7eQXrJ0np2A_oBQJ0j6B';

export const supabase = createClient(supabaseUrl, supabaseKey);
