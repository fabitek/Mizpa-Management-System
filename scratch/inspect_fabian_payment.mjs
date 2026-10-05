import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectCurrentMatch() {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('--- RECENT MATCHES ---');
  console.log(JSON.stringify(matches, null, 2));

  const currentMatch = matches?.[0];
  if (!currentMatch) return;

  const { data: entries } = await supabase
    .from('financial_entries')
    .select('*, players(full_name, alias)')
    .eq('match_id', currentMatch.id)
    .order('created_at', { ascending: false });

  console.log('--- FINANCIAL ENTRIES FOR CURRENT MATCH ---');
  console.log(JSON.stringify(entries, null, 2));

  const { data: fabian } = await supabase
    .from('players')
    .select('*')
    .ilike('full_name', '%Fabian%');

  console.log('--- FABIAN PLAYER ---');
  console.log(JSON.stringify(fabian, null, 2));
}

inspectCurrentMatch();
