import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectMatchDetails() {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  const match = matches[0];
  console.log('Pitch rental cost:', match.pitch_rental_cost);
  console.log('Extra costs:', match.extra_costs);
  console.log('Location:', match.location);
  console.log('Status:', match.status);
  console.log('Date:', match.date);
}

inspectMatchDetails();
