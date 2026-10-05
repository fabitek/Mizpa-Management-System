import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectAll() {
  const { data: entries } = await supabase
    .from('financial_entries')
    .select('*, players(full_name, alias)');

  console.log('--- ALL FINANCIAL ENTRIES ---');
  for (const e of entries || []) {
    console.log({
      id: e.id,
      player: e.players?.full_name || e.players?.alias || e.player_id,
      match_id: e.match_id,
      type: e.type,
      amount: e.amount,
      note: e.note,
      created_at: e.created_at
    });
  }
}

inspectAll();
