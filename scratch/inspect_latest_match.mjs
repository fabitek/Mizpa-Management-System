import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectLatest() {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  const match = matches[0];
  console.log('MATCH:', match);

  const { data: entries } = await supabase
    .from('financial_entries')
    .select('*')
    .eq('match_id', match.id);

  console.log('ENTRIES ON LATEST MATCH:', entries);
}

inspectLatest();
