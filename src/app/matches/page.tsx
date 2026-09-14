import { matchRepository, attendanceRepository, playerRepository, calculateMatchFeeUseCase } from '../../infrastructure/container.ts';
import { initialPlayers, initialMatch } from '../../infrastructure/seed-data.ts';
import { MatchSettlementCard } from '../../components/matches/MatchSettlementCard.tsx';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  let allMatches: any[] = [];
  let dbPlayers: any[] = [];
  let attendances: any[] = [];

  try {
    allMatches = await matchRepository.findAll();
  } catch (err) {
    console.warn('MatchesPage matchRepository.findAll warning:', err);
  }

  try {
    dbPlayers = await playerRepository.findAll();
  } catch (err) {
    console.warn('MatchesPage playerRepository.findAll warning:', err);
  }

  const sortedMatches = [...allMatches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const match = sortedMatches.length > 0 ? sortedMatches[0] : null;

  if (match) {
    try {
      attendances = await attendanceRepository.findByMatchId(match.id);
    } catch (err) {
      console.warn('MatchesPage attendanceRepository.findByMatchId warning:', err);
    }
  }

  const playersList = dbPlayers.length > 0 ? dbPlayers : initialPlayers;
  const attendedCount = attendances.filter((a) => a.status === 'ATTENDED').length;
  const totalCost = match ? (match.pitchRentalCost || 0) + (match.extraCosts || 0) : 0;
  const estimatedFee = match ? calculateMatchFeeUseCase.execute(totalCost, attendedCount || match.maxPlayers || 18) : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <MatchSettlementCard
        initialMatch={match}
        allMatches={sortedMatches}
        initialAttendances={attendances}
        players={playersList}
        estimatedFee={estimatedFee}
      />
    </main>
  );
}
