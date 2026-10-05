import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function printAttendances() {
  const matchId = '09043c9d-b2a9-4407-a98e-2cbdff304351';
  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, players(full_name, alias)')
    .eq('match_id', matchId);

  console.log(attendances?.map(a => ({
    id: a.id,
    player: a.players?.full_name || a.guest_name,
    status: a.status,
    guest_type: a.guest_type,
    created_at: a.created_at
  })));
}

printAttendances();
