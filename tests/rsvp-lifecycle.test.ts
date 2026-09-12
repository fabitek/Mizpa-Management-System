import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Match, Attendance } from '../src/core/domain/index.ts';
import {
  MatchNotFoundError,
  MatchRegistrationClosedError,
  PlayerAlreadyRegisteredError,
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
} from '../src/core/domain/index.ts';

import {
  CreateMatchUseCase,
  OpenMatchRegistrationUseCase,
  RegisterAttendanceUseCase,
  CancelAttendanceUseCase,
  CheckinAttendanceUseCase,
  SettleMatchUseCase,
} from '../src/core/use-cases/index.ts';

import {
  InMemoryMatchRepository,
  InMemoryAttendanceRepository,
  InMemoryFinanceRepository,
} from './use-cases.test.ts';

describe('Phase 3: Match Lifecycle & RSVP Use Cases', () => {
  let matchRepo: InMemoryMatchRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let financeRepo: InMemoryFinanceRepository;

  let createMatch: CreateMatchUseCase;
  let openRegistration: OpenMatchRegistrationUseCase;
  let registerAttendance: RegisterAttendanceUseCase;
  let cancelAttendance: CancelAttendanceUseCase;
  let checkinAttendance: CheckinAttendanceUseCase;
  let settleMatch: SettleMatchUseCase;

  beforeEach(() => {
    matchRepo = new InMemoryMatchRepository();
    attendanceRepo = new InMemoryAttendanceRepository();
    financeRepo = new InMemoryFinanceRepository();

    createMatch = new CreateMatchUseCase(matchRepo);
    openRegistration = new OpenMatchRegistrationUseCase(matchRepo);
    registerAttendance = new RegisterAttendanceUseCase(matchRepo, attendanceRepo);
    cancelAttendance = new CancelAttendanceUseCase(matchRepo, attendanceRepo);
    checkinAttendance = new CheckinAttendanceUseCase(matchRepo, attendanceRepo);
    settleMatch = new SettleMatchUseCase(matchRepo, attendanceRepo, financeRepo);
  });

  it('should create a match in DRAFT status by default, and open registration', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 10000,
      maxPlayers: 10,
    });

    assert.equal(match.status, 'DRAFT');
    assert.equal(match.location, 'Cancha La 10');
    assert.equal(match.maxPlayers, 10);

    const opened = await openRegistration.execute({ matchId: match.id });
    assert.equal(opened.status, 'OPEN_REGISTRATION');
  });

  it('should register a player as CONFIRMED when capacity is available', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 10000,
      maxPlayers: 2,
      openImmediately: true,
    });

    const res1 = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
    });

    assert.equal(res1.attendance.status, 'CONFIRMED');
    assert.equal(res1.isWaitlist, false);
    assert.equal(res1.activeConfirmedCount, 1);
  });

  it('should prevent duplicate self-registration for the same match', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 10000,
      maxPlayers: 10,
      openImmediately: true,
    });

    await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
    });

    await assert.rejects(
      async () =>
        await registerAttendance.execute({
          matchId: match.id,
          playerId: 'player-1',
        }),
      (err: Error) => {
        assert.ok(err instanceof PlayerAlreadyRegisteredError);
        return true;
      }
    );
  });

  it('should allow a player to register a guest (+1) with host reference', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 10000,
      maxPlayers: 10,
      openImmediately: true,
    });

    // Player registers self
    await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
    });

    // Player registers guest (+1)
    const guestRes = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
      guestName: 'Andres Gomez',
    });

    assert.equal(guestRes.attendance.status, 'CONFIRMED');
    assert.equal(guestRes.attendance.guestName, 'Andres Gomez');
    assert.equal(guestRes.attendance.registeredByPlayerId, 'player-1');
  });

  it('should put subsequent registrations into WAITLIST when capacity is reached', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 10000,
      maxPlayers: 2,
      openImmediately: true,
    });

    // 1st confirmed
    await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
    });

    // 2nd confirmed (player-1 brings a +1)
    await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
      guestName: 'Carlos Guest',
    });

    // 3rd reaches capacity -> WAITLIST
    const waitlistRes = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-2',
    });

    assert.equal(waitlistRes.attendance.status, 'WAITLIST');
    assert.equal(waitlistRes.isWaitlist, true);
  });

  it('should automatically promote the earliest WAITLIST player when a CONFIRMED player cancels', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 10000,
      maxPlayers: 1,
      openImmediately: true,
    });

    // Player 1 fills the only spot
    const res1 = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-1',
      registeredAt: new Date('2026-10-01T10:00:00Z'),
    });

    // Player 2 enters waitlist
    const res2 = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-2',
      registeredAt: new Date('2026-10-01T10:05:00Z'),
    });

    // Player 3 enters waitlist later
    const res3 = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-3',
      registeredAt: new Date('2026-10-01T10:10:00Z'),
    });

    assert.equal(res1.attendance.status, 'CONFIRMED');
    assert.equal(res2.attendance.status, 'WAITLIST');
    assert.equal(res3.attendance.status, 'WAITLIST');

    // Player 1 cancels
    const cancelRes = await cancelAttendance.execute({
      attendanceId: res1.attendance.id,
    });

    assert.equal(cancelRes.cancelledAttendance.status, 'CANCELLED');
    assert.ok(cancelRes.promotedAttendance);
    assert.equal(cancelRes.promotedAttendance.id, res2.attendance.id);
    assert.equal(cancelRes.promotedAttendance.playerId, 'player-2');
    assert.equal(cancelRes.promotedAttendance.status, 'CONFIRMED');

    // Verify repository persisted status
    const inDbPlayer2 = await attendanceRepo.findById(res2.attendance.id);
    assert.equal(inDbPlayer2?.status, 'CONFIRMED');

    // Player 3 remains in waitlist
    const inDbPlayer3 = await attendanceRepo.findById(res3.attendance.id);
    assert.equal(inDbPlayer3?.status, 'WAITLIST');
  });

  it('should support pitch check-in and settle match charging both player and their +1 to the host', async () => {
    const match = await createMatch.execute({
      date: new Date('2026-10-01T20:00:00Z'),
      location: 'Cancha La 10',
      pitchRentalCost: 100000,
      extraCosts: 20000, // Total = 120000
      maxPlayers: 10,
      openImmediately: true,
    });

    // Player 1 registers self
    const attPlayer = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-host',
    });

    // Player 1 registers +1 guest
    const attGuest = await registerAttendance.execute({
      matchId: match.id,
      playerId: 'player-host',
      guestName: 'Amigo Del Host',
    });

    // Checkin both at pitch
    await checkinAttendance.execute({
      attendanceId: attPlayer.attendance.id,
      status: 'ATTENDED',
    });
    await checkinAttendance.execute({
      attendanceId: attGuest.attendance.id,
      status: 'ATTENDED',
    });

    // Total 120000 / 2 attendees = 60000 each
    const settleResult = await settleMatch.execute({ matchId: match.id });
    assert.equal(settleResult.settledFeePerPlayer, 60000);
    assert.equal(settleResult.entries.length, 2);

    // Both entries should be billed to player-host!
    assert.equal(settleResult.entries[0].playerId, 'player-host');
    assert.equal(settleResult.entries[1].playerId, 'player-host');

    // Check financial balance of player-host
    const balance = await financeRepo.getPlayerBalance('player-host');
    // Balance is -120000 (two debits of 60000)
    assert.equal(balance, -120000);
  });
});
