import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectMatchesAndEntries() {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  for (const m of matches || []) {
    console.log(`\nMatch: ID=${m.id}, location=${m.location}, date=${m.date}, cost=${m.pitch_rental_cost}, extra=${m.extra_costs}, status=${m.status}`);
    const { data: entries } = await supabase
      .from('financial_entries')
      .select('*, players(full_name, alias)')
      .eq('match_id', m.id);
    console.log('Entries:', entries?.map(e => ({
      id: e.id,
      player: e.players?.full_name || e.player_id,
      amount: e.amount,
      type: e.type,
      note: e.note,
      created_at: e.created_at
    })));
  }

  const { data: players } = await supabase.from('players').select('*');
  console.log('\nAll players:');
  console.log(players?.map(p => ({ id: p.id, name: p.full_name, alias: p.alias, email: p.email })));
}

inspectMatchesAndEntries();
