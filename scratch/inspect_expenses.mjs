import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectExpenses() {
  const { data: expenses } = await supabase.from('operating_expenses').select('*');
  console.log('OPERATING EXPENSES:', expenses);
}

inspectExpenses();
