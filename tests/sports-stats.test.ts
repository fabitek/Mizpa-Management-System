import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Match, Attendance, GoalEvent, FinancialEntry } from '../src/core/domain/types.ts';
import {
  MatchNotFoundError,
  InvalidGoalDataError,
  InvalidAttendanceStateError,
} from '../src/core/domain/exceptions.ts';
import { InMemoryMatchRepository } from '../src/infrastructure/repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryAttendanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryGoalRepository } from '../src/infrastructure/repositories/in-memory/InMemoryGoalRepository.ts';
import { InMemoryFinanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryFinanceRepository.ts';
import {
  RecordGoalEventUseCase,
  GetTopScorersUseCase,
  GetPlayerStatsUseCase,
  AssignMatchMvpUseCase,
  GetLeaderboardOverviewUseCase,
} from '../src/core/use-cases/index.ts';

describe('Phase 5: Sports Stats & Gamification Use Cases', () => {
  let matchRepo: InMemoryMatchRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let goalRepo: InMemoryGoalRepository;
  let financeRepo: InMemoryFinanceRepository;

  let recordGoal: RecordGoalEventUseCase;
  let getTopScorers: GetTopScorersUseCase;
  let getPlayerStats: GetPlayerStatsUseCase;
  let assignMvp: AssignMatchMvpUseCase;
  let getLeaderboard: GetLeaderboardOverviewUseCase;

  const sampleMatch: Match = {
    id: 'match-1',
    date: new Date('2026-09-01T19:00:00Z'),
    location: 'Cancha 1',
    pitchRentalCost: 100000,
    extraCosts: 0,
    maxPlayers: 10,
    settledFeePerPlayer: 10000,
    status: 'PLAYED',
    createdAt: new Date('2026-08-20'),
    updatedAt: new Date('2026-08-20'),
  };

  beforeEach(() => {
    matchRepo = new InMemoryMatchRepository([sampleMatch]);
    attendanceRepo = new InMemoryAttendanceRepository();
    goalRepo = new InMemoryGoalRepository();
    financeRepo = new InMemoryFinanceRepository();

    recordGoal = new RecordGoalEventUseCase(matchRepo, goalRepo);
    getTopScorers = new GetTopScorersUseCase(goalRepo, attendanceRepo);
    getPlayerStats = new GetPlayerStatsUseCase(goalRepo, attendanceRepo, matchRepo, financeRepo);
    assignMvp = new AssignMatchMvpUseCase(matchRepo, attendanceRepo);
    getLeaderboard = new GetLeaderboardOverviewUseCase(goalRepo, attendanceRepo, matchRepo);
  });

  describe('RecordGoalEventUseCase', () => {
    it('should successfully record a goal event for an existing match', async () => {
      const goal = await recordGoal.execute({
        matchId: 'match-1',
        playerId: 'player-falcao',
        minute: 25,
        type: 'OPEN_PLAY',
      });

      assert.ok(goal.id);
      assert.equal(goal.matchId, 'match-1');
      assert.equal(goal.playerId, 'player-falcao');
      assert.equal(goal.minute, 25);
      assert.equal(goal.type, 'OPEN_PLAY');

      const savedGoals = await goalRepo.findByMatchId('match-1');
      assert.equal(savedGoals.length, 1);
      assert.equal(savedGoals[0].playerId, 'player-falcao');
    });

    it('should throw MatchNotFoundError when match does not exist', async () => {
      await assert.rejects(
        async () =>
          await recordGoal.execute({
            matchId: 'non-existent',
            playerId: 'player-1',
          }),
        (err: Error) => {
          assert.ok(err instanceof MatchNotFoundError);
          return true;
        }
      );
    });

    it('should throw InvalidGoalDataError when match is CANCELLED', async () => {
      await matchRepo.save({
        ...sampleMatch,
        id: 'match-cancelled',
        status: 'CANCELLED',
      });

      await assert.rejects(
        async () =>
          await recordGoal.execute({
            matchId: 'match-cancelled',
            playerId: 'player-1',
          }),
        (err: Error) => {
          assert.ok(err instanceof InvalidGoalDataError);
          return true;
        }
      );
    });

    it('should throw InvalidGoalDataError when minute is out of valid range (0-130)', async () => {
      await assert.rejects(
        async () =>
          await recordGoal.execute({
            matchId: 'match-1',
            playerId: 'player-1',
            minute: 145,
          }),
        (err: Error) => {
          assert.ok(err instanceof InvalidGoalDataError);
          return true;
        }
      );
    });
  });

  describe('GetTopScorersUseCase', () => {
    it('should correctly calculate top scorers, ignoring own goals and sorting properly', async () => {
      // Register attendances
      await attendanceRepo.save({
        id: 'att-1',
        matchId: 'match-1',
        playerId: 'player-falcao',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });
      await attendanceRepo.save({
        id: 'att-2',
        matchId: 'match-1',
        playerId: 'player-diaz',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });

      // Goals: Falcao has 2 (1 open play, 1 penalty), Diaz has 3 (open play), Player-X has 1 own goal
      await goalRepo.recordGoal({
        id: 'g-1',
        matchId: 'match-1',
        playerId: 'player-falcao',
        minute: 10,
        type: 'OPEN_PLAY',
      });
      await goalRepo.recordGoal({
        id: 'g-2',
        matchId: 'match-1',
        playerId: 'player-falcao',
        minute: 40,
        type: 'PENALTY',
      });

      await goalRepo.recordGoal({
        id: 'g-3',
        matchId: 'match-1',
        playerId: 'player-diaz',
        minute: 15,
        type: 'OPEN_PLAY',
      });
      await goalRepo.recordGoal({
        id: 'g-4',
        matchId: 'match-1',
        playerId: 'player-diaz',
        minute: 30,
        type: 'OPEN_PLAY',
      });
      await goalRepo.recordGoal({
        id: 'g-5',
        matchId: 'match-1',
        playerId: 'player-diaz',
        minute: 75,
        type: 'OPEN_PLAY',
      });

      // Own goal by defender
      await goalRepo.recordGoal({
        id: 'g-6',
        matchId: 'match-1',
        playerId: 'player-defender',
        minute: 88,
        type: 'OWN_GOAL',
      });

      const ranking = await getTopScorers.execute();

      // Top scorer should be Diaz (3 goals), then Falcao (2 goals), and defender should not be in scorers list
      assert.equal(ranking.length, 2);
      assert.equal(ranking[0].playerId, 'player-diaz');
      assert.equal(ranking[0].goals, 3);
      assert.equal(ranking[0].openPlayGoals, 3);
      assert.equal(ranking[0].penalties, 0);
      assert.equal(ranking[0].matchesPlayed, 1);
      assert.equal(ranking[0].ratio, 3);

      assert.equal(ranking[1].playerId, 'player-falcao');
      assert.equal(ranking[1].goals, 2);
      assert.equal(ranking[1].openPlayGoals, 1);
      assert.equal(ranking[1].penalties, 1);
      assert.equal(ranking[1].matchesPlayed, 1);
      assert.equal(ranking[1].ratio, 2);
    });
  });

  describe('GetPlayerStatsUseCase & Gamification Badges', () => {
    it('should compute chronological streaks and unlock appropriate badges', async () => {
      const playerId = 'player-ironman';

      // Create 3 chronological matches
      const m1: Match = {
        ...sampleMatch,
        id: 'match-ch-1',
        date: new Date('2026-09-01'),
        status: 'SETTLED',
      };
      const m2: Match = {
        ...sampleMatch,
        id: 'match-ch-2',
        date: new Date('2026-09-08'),
        status: 'SETTLED',
      };
      const m3: Match = {
        ...sampleMatch,
        id: 'match-ch-3',
        date: new Date('2026-09-15'),
        status: 'SETTLED',
      };
      // Reinitialize matchRepo with only the 3 chronological matches
      matchRepo = new InMemoryMatchRepository([m1, m2, m3]);
      getPlayerStats = new GetPlayerStatsUseCase(goalRepo, attendanceRepo, matchRepo, financeRepo);

      // Player attended all 3 matches
      await attendanceRepo.save({
        id: 'att-iron-1',
        matchId: m1.id,
        playerId,
        status: 'ATTENDED',
        registeredAt: new Date(),
      });
      await attendanceRepo.save({
        id: 'att-iron-2',
        matchId: m2.id,
        playerId,
        status: 'ATTENDED',
        registeredAt: new Date(),
      });
      await attendanceRepo.save({
        id: 'att-iron-3',
        matchId: m3.id,
        playerId,
        status: 'ATTENDED',
        registeredAt: new Date(),
      });

      // Player scored 3 goals in match-ch-2 (Hat-trick)
      await goalRepo.recordGoal({
        id: 'g-ht-1',
        matchId: m2.id,
        playerId,
        minute: 10,
        type: 'OPEN_PLAY',
      });
      await goalRepo.recordGoal({
        id: 'g-ht-2',
        matchId: m2.id,
        playerId,
        minute: 20,
        type: 'OPEN_PLAY',
      });
      await goalRepo.recordGoal({
        id: 'g-ht-3',
        matchId: m2.id,
        playerId,
        minute: 30,
        type: 'PENALTY',
      });

      // Player is solvent (has positive balance)
      await financeRepo.recordEntry({
        id: 'fin-1',
        playerId,
        type: 'CREDIT',
        amount: 50000,
        referenceDate: new Date(),
        createdAt: new Date(),
      });

      const stats = await getPlayerStats.execute(playerId);

      assert.equal(stats.playerId, playerId);
      assert.equal(stats.matchesPlayed, 3);
      assert.equal(stats.goalsCount, 3);
      assert.equal(stats.goalsBreakdown.openPlay, 2);
      assert.equal(stats.goalsBreakdown.penalty, 1);
      assert.equal(stats.currentAttendanceStreak, 3);
      assert.equal(stats.bestAttendanceStreak, 3);

      // Verify Badges
      const ironManBadge = stats.badges.find((b) => b.code === 'IRON_MAN');
      assert.ok(ironManBadge?.unlocked, 'Iron man badge should be unlocked for streak >= 3');

      const hatTrickBadge = stats.badges.find((b) => b.code === 'HAT_TRICK_HERO');
      assert.ok(hatTrickBadge?.unlocked, 'Hat trick badge should be unlocked');

      const pichichiBadge = stats.badges.find((b) => b.code === 'PICHICHI');
      assert.ok(pichichiBadge?.unlocked, 'Pichichi badge should be unlocked for >= 3 goals');

      const solventBadge = stats.badges.find((b) => b.code === 'FAIR_PLAY_SOLVENT');
      assert.ok(solventBadge?.unlocked, 'Fair play solvent badge should be unlocked');

      const centurionBadge = stats.badges.find((b) => b.code === 'FIEL_MIZPA');
      assert.equal(centurionBadge?.unlocked, false, 'Fiel Mizpa should not be unlocked yet (< 5 matches)');
    });
  });

  describe('AssignMatchMvpUseCase', () => {
    it('should assign MVP to a player who participated in the match', async () => {
      await attendanceRepo.save({
        id: 'att-mvp-1',
        matchId: 'match-1',
        playerId: 'player-pibe',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });

      const updated = await assignMvp.execute({
        matchId: 'match-1',
        playerId: 'player-pibe',
      });

      assert.equal(updated.mvpPlayerId, 'player-pibe');
      const found = await matchRepo.findById('match-1');
      assert.equal(found?.mvpPlayerId, 'player-pibe');
    });

    it('should throw InvalidAttendanceStateError if player did not participate in match', async () => {
      await assert.rejects(
        async () =>
          await assignMvp.execute({
            matchId: 'match-1',
            playerId: 'non-participating-player',
          }),
        (err: Error) => {
          assert.ok(err instanceof InvalidAttendanceStateError);
          return true;
        }
      );
    });
  });

  describe('GetLeaderboardOverviewUseCase', () => {
    it('should consolidate top scorers, attendance rankings and total metrics', async () => {
      await attendanceRepo.save({
        id: 'att-lb-1',
        matchId: 'match-1',
        playerId: 'player-1',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });
      await goalRepo.recordGoal({
        id: 'g-lb-1',
        matchId: 'match-1',
        playerId: 'player-1',
        type: 'OPEN_PLAY',
      });

      const overview = await getLeaderboard.execute(['player-1', 'player-2']);

      assert.ok(overview.topScorers.length >= 1);
      assert.equal(overview.totalGoalsScored, 1);
      assert.equal(overview.totalMatchesPlayed, 1);
      assert.equal(overview.attendanceRankings.length, 2);
    });
  });
});
