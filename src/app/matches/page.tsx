import { matchRepository, attendanceRepository, calculateMatchFeeUseCase } from '../../infrastructure/container.ts';
import { initialPlayers, initialMatch } from '../../infrastructure/seed-data.ts';
import { MatchSettlementCard } from '../../components/matches/MatchSettlementCard.tsx';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const match = (await matchRepository.findById(initialMatch.id)) ?? initialMatch;
  const attendances = await attendanceRepository.findByMatchId(match.id);

  const attendedCount = attendances.filter((a) => a.status === 'ATTENDED').length;
  const totalCost = match.pitchRentalCost + match.extraCosts;
  const estimatedFee = calculateMatchFeeUseCase.execute(totalCost, attendedCount);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <MatchSettlementCard
        initialMatch={match}
        initialAttendances={attendances}
        players={initialPlayers}
        estimatedFee={estimatedFee}
      />
    </main>
  );
}
