import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ntjcedrmvftoexcicsfb.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_0iN4YOWw-WSdl6TF3fna3g_1tqgtLL0';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
