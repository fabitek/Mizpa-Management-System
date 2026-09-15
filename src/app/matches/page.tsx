import {
  matchRepository,
  attendanceRepository,
  playerRepository,
  calculateMatchFeeUseCase,
  reconcileMatchAttendancesUseCase,
} from '../../infrastructure/container.ts';
import { initialPlayers } from '../../infrastructure/seed-data.ts';
import { MatchSettlementCard } from '../../components/matches/MatchSettlementCard.tsx';
import type { Match, Player, Attendance } from '../../core/domain/index.ts';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  let allMatches: Match[] = [];
  let dbPlayers: Player[] = [];
  let attendances: Attendance[] = [];

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
      const reconciled = await reconcileMatchAttendancesUseCase.execute(match.id);
      attendances = reconciled.allAttendances;
    } catch (err) {
      console.warn('MatchesPage auto-reconciliation warning:', err);
      try {
        attendances = await attendanceRepository.findByMatchId(match.id);
      } catch (attErr) {
        console.warn('MatchesPage attendanceRepository.findByMatchId warning:', attErr);
      }
    }
  }

  const playersList = dbPlayers.length > 0 ? dbPlayers : initialPlayers;
  const confirmedCount = attendances.filter(
    (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
  ).length;
  const totalCost = match ? (match.pitchRentalCost || 0) + (match.extraCosts || 0) : 0;
  const estimatedFee = match
    ? calculateMatchFeeUseCase.execute(totalCost, confirmedCount || match.maxPlayers || 18)
    : 0;

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
