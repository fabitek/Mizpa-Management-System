import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function printAttendances() {
  const matchId = '09043c9d-b2a9-4407-a98e-2cbdff304351';
  const { data: attendances } = await supabase
    .from('attendances')
    .select('*')
    .eq('match_id', matchId);

  const { data: players } = await supabase.from('players').select('*');
  const playerMap = new Map(players.map(p => [p.id, p]));

  console.log('ATTENDANCES COUNT:', attendances?.length);
  for (const a of attendances || []) {
    const p = playerMap.get(a.player_id);
    console.log(`- ${p?.full_name || a.guest_name || a.player_id}: status=${a.status}, guestType=${a.guest_type}`);
  }
}

printAttendances();
