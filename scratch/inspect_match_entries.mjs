import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspect() {
  const matchId = '50a672e1-8574-40e9-b31a-c241f0e9b815';

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*')
    .eq('match_id', matchId);

  const { data: players } = await supabase.from('players').select('*');
  const playerMap = new Map(players?.map(p => [p.id, p]));

  console.log('--- ATTENDANCES FOR NEW MATCH ---');
  for (const a of attendances || []) {
    const p = playerMap.get(a.player_id);
    console.log(`Player: ${p?.full_name} (${p?.alias}) | status: ${a.status} | hasVehicle: ${a.has_vehicle}`);
  }

  const { data: entries } = await supabase
    .from('financial_entries')
    .select('*');

  console.log('--- ALL ENTRIES COUNT ---', entries?.length);
  
  // Let's check what financial entries matchId has:
  console.log('Entries with match_id = matchId:', entries?.filter(e => e.match_id === matchId));
}

inspect();
