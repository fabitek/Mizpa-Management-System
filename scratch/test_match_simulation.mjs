import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMatchSimulation() {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: attendances } = await supabase.from('attendances').select('*');
  const { data: financialEntries } = await supabase.from('financial_entries').select('*');
  const { data: players } = await supabase.from('players').select('*');

  const playerMap = new Map(players.map(p => [p.id, p]));

  console.log('=== VERIFYING MATCHES ===');
  for (const match of matches) {
    console.log(`\n--- MATCH: ${match.location} (${match.date}) | Status: ${match.status} | ID: ${match.id} ---`);

    const matchAttendances = attendances.filter(a => a.match_id === match.id);
    const playingAttendances = matchAttendances.filter(a => a.guest_type !== 'COMPANION' && a.status !== 'CANCELLED');

    const matchFinancialCredits = financialEntries.filter(
      e => e.type === 'CREDIT' && e.match_id === match.id
    );

    const totalCollected = matchFinancialCredits.reduce((acc, e) => acc + e.amount, 0);

    console.log(`Total Credits registered for this match: ${matchFinancialCredits.length}`);
    console.log(`Total Recaudado: $${totalCollected.toLocaleString('es-CO')} COP`);
    console.log(`Playing Roster (${playingAttendances.length} players):`);

    for (const att of playingAttendances) {
      const player = playerMap.get(att.player_id);
      const isDriver = !!(att.has_vehicle || att.vehicle_plate);
      const basePitchFee = match.status === 'SETTLED'
        ? (match.settled_fee_per_player || 8334)
        : Math.ceil((match.pitch_rental_cost || 100000) / playingAttendances.length);
      const fee = basePitchFee + (isDriver ? 2000 : 0);

      const playerCredits = financialEntries.filter(
        e => e.type === 'CREDIT' && e.match_id === match.id && e.player_id === att.player_id
      );
      const totalPaid = playerCredits.reduce((sum, e) => sum + e.amount, 0);
      const isPaid = fee > 0 ? totalPaid >= fee : totalPaid > 0;
      const isPartial = totalPaid > 0 && totalPaid < fee;
      const pendingAmount = Math.max(0, fee - totalPaid);

      const statusStr = isPaid
        ? `✅ Pagó $${totalPaid.toLocaleString('es-CO')}`
        : isPartial
        ? `⚠️ Abonó $${totalPaid.toLocaleString('es-CO')} (Resta: $${pendingAmount.toLocaleString('es-CO')})`
        : `⏳ Pendiente (Debe: $${fee.toLocaleString('es-CO')})`;

      console.log(`  - ${player?.full_name || att.guest_name || att.player_id}: Cuota $${fee.toLocaleString('es-CO')} -> ${statusStr}`);
    }
  }
}

testMatchSimulation();
