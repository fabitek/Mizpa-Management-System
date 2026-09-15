import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryMatchRepository } from '../src/infrastructure/repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryAttendanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryFinanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryFinanceRepository.ts';
import { UpdateMatchUseCase } from '../src/core/use-cases/UpdateMatch.ts';
import { ReconcileMatchAttendancesUseCase } from '../src/core/use-cases/ReconcileMatchAttendances.ts';
import { SettleMatchUseCase } from '../src/core/use-cases/SettleMatch.ts';
import type { Match, Attendance } from '../src/core/domain/index.ts';

describe('Match Update & Waitlist Reconciliation', () => {
  function createTestSetup() {
    const testMatch: Match = {
      id: 'match-reconcile-1',
      date: new Date('2026-03-20T19:00:00-05:00'),
      location: 'Cancha La 10',
      pitchRentalCost: 180000,
      extraCosts: 0,
      durationHours: 2,
      parkingFeePerHour: 1000,
      maxPlayers: 10,
      settledFeePerPlayer: null,
      status: 'OPEN_REGISTRATION',
      createdAt: new Date('2026-03-10T10:00:00Z'),
      updatedAt: new Date('2026-03-10T10:00:00Z'),
    };

    // 10 Confirmed players
    const attendances: Attendance[] = [];
    for (let i = 1; i <= 10; i++) {
      attendances.push({
        id: `att-confirmed-${i}`,
        matchId: 'match-reconcile-1',
        playerId: `player-${i}`,
        status: 'CONFIRMED',
        registeredAt: new Date(`2026-03-11T10:0${i}:00Z`),
        guestType: 'PLAYER',
      });
    }

    // 3 Waitlisted players (registered in order)
    const waitlistTimes = ['11:00:00Z', '11:15:00Z', '11:30:00Z'];
    for (let i = 1; i <= 3; i++) {
      attendances.push({
        id: `att-waitlist-${i}`,
        matchId: 'match-reconcile-1',
        playerId: `waitlist-player-${i}`,
        status: 'WAITLIST',
        registeredAt: new Date(`2026-03-12T${waitlistTimes[i - 1]}`),
        guestType: 'PLAYER',
      });
    }

    // 1 Companion (non-playing)
    attendances.push({
      id: 'att-companion-1',
      matchId: 'match-reconcile-1',
      playerId: 'player-1',
      guestName: 'Ana Companion',
      guestType: 'COMPANION',
      status: 'CONFIRMED',
      registeredAt: new Date('2026-03-11T10:05:00Z'),
    });

    const matchRepo = new InMemoryMatchRepository([testMatch]);
    const attendanceRepo = new InMemoryAttendanceRepository(attendances);
    const financeRepo = new InMemoryFinanceRepository();

    return {
      matchRepo,
      attendanceRepo,
      financeRepo,
      testMatch,
    };
  }

  it('automatically promotes all waitlisted players when maxPlayers increases from 10 to 18', async () => {
    const { matchRepo, attendanceRepo } = createTestSetup();
    const updateUseCase = new UpdateMatchUseCase(matchRepo, attendanceRepo);

    const result = await updateUseCase.execute({
      id: 'match-reconcile-1',
      maxPlayers: 18,
    });

    assert.strictEqual(result.match.maxPlayers, 18);
    assert.strictEqual(result.promotedAttendances.length, 3);
    assert.deepStrictEqual(
      result.promotedAttendances.map((a) => a.id),
      ['att-waitlist-1', 'att-waitlist-2', 'att-waitlist-3']
    );

    // Verify in repository
    const updatedAttendances = await attendanceRepo.findByMatchId('match-reconcile-1');
    const confirmedCount = updatedAttendances.filter(
      (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
    ).length;
    const waitlistCount = updatedAttendances.filter(
      (a) => a.status === 'WAITLIST' && a.guestType !== 'COMPANION'
    ).length;

    assert.strictEqual(confirmedCount, 13);
    assert.strictEqual(waitlistCount, 0);
  });

  it('promotes only up to available capacity in strict FIFO order when partially expanded', async () => {
    const { matchRepo, attendanceRepo } = createTestSetup();
    const updateUseCase = new UpdateMatchUseCase(matchRepo, attendanceRepo);

    // Expanding from 10 to 12 (only 2 spots available for 3 waitlisted)
    const result = await updateUseCase.execute({
      id: 'match-reconcile-1',
      maxPlayers: 12,
    });

    assert.strictEqual(result.match.maxPlayers, 12);
    assert.strictEqual(result.promotedAttendances.length, 2);
    assert.strictEqual(result.promotedAttendances[0].id, 'att-waitlist-1');
    assert.strictEqual(result.promotedAttendances[1].id, 'att-waitlist-2');

    // 3rd waitlist player remains in WAITLIST
    const remainingWaitlist = await attendanceRepo.findById('att-waitlist-3');
    assert.strictEqual(remainingWaitlist?.status, 'WAITLIST');

    const updatedAttendances = await attendanceRepo.findByMatchId('match-reconcile-1');
    const confirmedCount = updatedAttendances.filter(
      (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
    ).length;
    assert.strictEqual(confirmedCount, 12);
  });

  it('reconcileMatchAttendancesUseCase reconciles standalone on demand', async () => {
    const { matchRepo, attendanceRepo, testMatch } = createTestSetup();
    // Directly update match in repo without use case
    await matchRepo.update({
      ...testMatch,
      maxPlayers: 15,
    });

    const reconcileUseCase = new ReconcileMatchAttendancesUseCase(matchRepo, attendanceRepo);
    const result = await reconcileUseCase.execute('match-reconcile-1');

    assert.strictEqual(result.promotedCount, 3);
    assert.strictEqual(result.activeConfirmedCount, 13);
    assert.strictEqual(result.waitlistCount, 0);
  });

  it('dynamic fee calculation adjusts properly after waitlist promotion and allows settlement', async () => {
    const { matchRepo, attendanceRepo, financeRepo } = createTestSetup();
    const updateUseCase = new UpdateMatchUseCase(matchRepo, attendanceRepo);

    // Step 1: Update match capacity from 10 to 18
    await updateUseCase.execute({
      id: 'match-reconcile-1',
      maxPlayers: 18,
    });

    // Step 2: All 13 confirmed players attend (checkin)
    const allAtts = await attendanceRepo.findByMatchId('match-reconcile-1');
    for (const att of allAtts) {
      if (att.status === 'CONFIRMED' && att.guestType !== 'COMPANION') {
        await attendanceRepo.update({ ...att, status: 'ATTENDED' });
      }
    }

    // Step 3: Settle match
    const settleUseCase = new SettleMatchUseCase(matchRepo, attendanceRepo, financeRepo);
    const settleResult = await settleUseCase.execute({ matchId: 'match-reconcile-1' });

    // 180,000 / 13 = 13,846.15 -> Ceil = 13,847 COP
    assert.strictEqual(settleResult.settledFeePerPlayer, Math.ceil(180000 / 13));
    assert.strictEqual(settleResult.entries.length, 13);
    assert.strictEqual(settleResult.match.status, 'SETTLED');
  });
});
