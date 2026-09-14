import {
  getLeaderboardOverviewUseCase,
  getPlayerStatsUseCase,
  playerRepository,
  matchRepository,
} from '../../infrastructure/container.ts';
import { initialPlayers } from '../../infrastructure/seed-data.ts';
import { LeaderboardView } from '../../components/stats/LeaderboardView.tsx';

import type { LeaderboardOverview } from '../../core/use-cases/index.ts';
import type { PlayerPerformanceStats } from '../../core/domain/types.ts';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  let players: any[] = [];
  let allMatches: any[] = [];

  try {
    const dbPlayers = await playerRepository.findAll();
    if (dbPlayers && dbPlayers.length > 0) {
      players = dbPlayers;
    } else {
      players = initialPlayers;
    }
  } catch (err) {
    console.warn('StatsPage players warning:', err);
    players = initialPlayers;
  }

  try {
    allMatches = await matchRepository.findAll();
  } catch (err) {
    console.warn('StatsPage matches warning:', err);
  }

  const activeMatch = allMatches.length > 0
    ? [...allMatches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  const playerIds = players.map((p) => p.id);
  let overview: LeaderboardOverview = {
    topScorers: [],
    attendanceRankings: [],
    mvpRankings: [],
    totalGoalsScored: 0,
    totalMatchesPlayed: 0,
  };

  try {
    overview = await getLeaderboardOverviewUseCase.execute(playerIds);
  } catch (err) {
    console.warn('StatsPage overview warning:', err);
  }

  let firstPlayerStats: PlayerPerformanceStats = {
    playerId: playerIds[0] || '',
    matchesPlayed: 0,
    goalsCount: 0,
    ownGoalsCount: 0,
    goalsBreakdown: {
      openPlay: 0,
      penalty: 0,
      ownGoal: 0,
    },
    goalsPerMatchRatio: 0,
    currentAttendanceStreak: 0,
    bestAttendanceStreak: 0,
    mvpCount: 0,
    badges: [],
  };

  if (playerIds.length > 0) {
    try {
      firstPlayerStats = await getPlayerStatsUseCase.execute(playerIds[0]);
    } catch (err) {
      console.warn('StatsPage firstPlayerStats warning:', err);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <LeaderboardView
        players={players}
        activeMatch={activeMatch}
        initialOverview={overview}
        initialPlayerStats={firstPlayerStats}
      />
    </main>
  );
}
