import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRecent() {
  const { data: entries } = await supabase
    .from('financial_entries')
    .select('*, players(full_name, alias)')
    .order('created_at', { ascending: false });

  console.log(JSON.stringify(entries, null, 2));
}

checkRecent();
