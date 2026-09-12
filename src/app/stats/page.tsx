import {
  getLeaderboardOverviewUseCase,
  getPlayerStatsUseCase,
} from '../../infrastructure/container.ts';
import { initialPlayers, initialMatch } from '../../infrastructure/seed-data.ts';
import { LeaderboardView } from '../../components/stats/LeaderboardView.tsx';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const playerIds = initialPlayers.map((p) => p.id);
  const overview = await getLeaderboardOverviewUseCase.execute(playerIds);
  const firstPlayerStats = await getPlayerStatsUseCase.execute(playerIds[0]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <LeaderboardView
        players={initialPlayers}
        activeMatch={initialMatch}
        initialOverview={overview}
        initialPlayerStats={firstPlayerStats}
      />
    </main>
  );
}
