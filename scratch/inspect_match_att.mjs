import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectMatchAttendances() {
  const matchId = '09043c9d-b2a9-4407-a98e-2cbdff304351';

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, players(full_name, alias)')
    .eq('match_id', matchId);

  const { data: entries } = await supabase
    .from('financial_entries')
    .select('*')
    .eq('match_id', matchId);

  console.log('MATCH:', match);
  console.log('ATTENDANCES COUNT:', attendances?.length);
  console.log('PLAYING ATTENDANCES:', attendances?.filter(a => a.guest_type !== 'COMPANION' && a.status !== 'CANCELLED').length);
  console.log('ENTRIES:', entries);
}

inspectMatchAttendances();
