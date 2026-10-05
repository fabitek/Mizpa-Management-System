import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixFabianPayment() {
  const entryId = '6938950e-2802-4d0b-9003-bc5f3d88892a';
  
  const { data, error } = await supabase
    .from('financial_entries')
    .update({ 
      amount: 7000,
      note: 'Cuota de cancha jugador - Abedules de Santa Fe'
    })
    .eq('id', entryId)
    .select();

  console.log('Updated entry:', data, 'Error:', error);
}

fixFabianPayment();
