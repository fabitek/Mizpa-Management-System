import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixHistoricalMatchIds() {
  const matchId = 'd968a8b1-7023-428d-9a93-6ac35a439108';
  const entryIds = [
    'cbdfa10e-4932-4301-a442-4efd306e5aea',
    '7cfd4332-2157-4e9e-a042-32255f80209f',
    '9445c633-89fb-4520-b87f-ee5de4039f1e',
    '100a1d56-9248-448a-9f6c-036533ee3fb1',
    'b050273f-a644-4daf-b9c4-b580f7a67963'
  ];

  const { data, error } = await supabase
    .from('financial_entries')
    .update({ match_id: matchId })
    .in('id', entryIds)
    .select();

  console.log('Updated historical entries:', data?.length, 'Error:', error);
}

fixHistoricalMatchIds();
