import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  Match,
  Player,
  Attendance,
  FinancialEntry,
  GoalEvent,
  MatchStatus,
  AttendanceStatus,
  FinancialEntryType,
  GoalType,
} from '../src/core/domain/types.ts';
import {
  MatchAlreadySettledError,
  MaxCapacityReachedError,
  InvalidAttendanceStateError,
  InvalidFinancialAmountError,
} from '../src/core/domain/index.ts';
import * as DomainIndex from '../src/core/domain/index.ts';

describe('Pure Core Domain - Types and Interfaces', () => {
  it('should instantiate a valid Player entity', () => {
    const player: Player = {
      id: 'player-1',
      fullName: 'Lionel Messi',
      email: 'messi@example.com',
      phone: '+1234567890',
      alias: 'La Pulga',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    assert.equal(player.id, 'player-1');
    assert.equal(player.fullName, 'Lionel Messi');
    assert.equal(player.email, 'messi@example.com');
    assert.equal(player.phone, '+1234567890');
    assert.equal(player.alias, 'La Pulga');
    assert.equal(player.isActive, true);
    assert.ok(player.createdAt instanceof Date);
  });

  it('should instantiate a Player entity with minimal required fields', () => {
    const player: Player = {
      id: 'player-2',
      fullName: 'Cristiano Ronaldo',
      email: 'cr7@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    assert.equal(player.id, 'player-2');
    assert.equal(player.phone, undefined);
    assert.equal(player.alias, undefined);
  });

  it('should instantiate a valid Match entity across all MatchStatus values', () => {
    const statuses: MatchStatus[] = [
      'DRAFT',
      'OPEN_REGISTRATION',
      'PLAYED',
      'SETTLED',
      'CANCELLED',
    ];

    for (const status of statuses) {
      const match: Match = {
        id: `match-${status.toLowerCase()}`,
        date: new Date('2026-09-10T20:00:00Z'),
        location: 'Camp Nou Arena 1',
        pitchRentalCost: 120.0,
        extraCosts: 15.5,
        maxPlayers: 10,
        settledFeePerPlayer: status === 'SETTLED' ? 13.55 : null,
        status,
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:00:00Z'),
      };

      assert.equal(match.status, status);
      assert.equal(match.location, 'Camp Nou Arena 1');
      assert.equal(match.pitchRentalCost, 120.0);
      assert.equal(match.extraCosts, 15.5);
      assert.equal(match.maxPlayers, 10);
      if (status === 'SETTLED') {
        assert.equal(match.settledFeePerPlayer, 13.55);
      } else {
        assert.equal(match.settledFeePerPlayer, null);
      }
    }
  });

  it('should instantiate Attendance entities across all AttendanceStatus values', () => {
    const statuses: AttendanceStatus[] = [
      'CONFIRMED',
      'WAITLIST',
      'CANCELLED',
      'ATTENDED',
    ];

    for (const status of statuses) {
      const attendance: Attendance = {
        id: `att-${status.toLowerCase()}`,
        matchId: 'match-101',
        playerId: 'player-1',
        status,
        registeredAt: new Date('2026-09-02T15:30:00Z'),
      };

      assert.equal(attendance.matchId, 'match-101');
      assert.equal(attendance.playerId, 'player-1');
      assert.equal(attendance.status, status);
      assert.ok(attendance.registeredAt instanceof Date);
    }
  });

  it('should instantiate FinancialEntry entities for DEBIT and CREDIT', () => {
    const types: FinancialEntryType[] = ['DEBIT', 'CREDIT'];

    for (const type of types) {
      const entry: FinancialEntry = {
        id: `fe-${type.toLowerCase()}`,
        playerId: 'player-1',
        matchId: type === 'DEBIT' ? 'match-101' : null,
        type,
        amount: type === 'DEBIT' ? 13.55 : 50.0,
        referenceDate: new Date('2026-09-10T22:00:00Z'),
        receiptUrl: type === 'CREDIT' ? 'https://example.com/receipt.pdf' : undefined,
        note: `${type} transaction note`,
        createdAt: new Date('2026-09-10T22:05:00Z'),
      };

      assert.equal(entry.playerId, 'player-1');
      assert.equal(entry.type, type);
      assert.ok(entry.amount > 0);
      assert.ok(entry.referenceDate instanceof Date);
      assert.ok(entry.createdAt instanceof Date);
    }
  });

  it('should instantiate GoalEvent entities across all GoalType values', () => {
    const types: GoalType[] = ['OPEN_PLAY', 'PENALTY', 'OWN_GOAL'];

    for (const type of types) {
      const goal: GoalEvent = {
        id: `goal-${type.toLowerCase()}`,
        matchId: 'match-101',
        playerId: 'player-1',
        minute: 42,
        type,
      };

      assert.equal(goal.matchId, 'match-101');
      assert.equal(goal.playerId, 'player-1');
      assert.equal(goal.minute, 42);
      assert.equal(goal.type, type);
    }

    const unminutedGoal: GoalEvent = {
      id: 'goal-no-min',
      matchId: 'match-101',
      playerId: 'player-2',
      type: 'OPEN_PLAY',
    };
    assert.equal(unminutedGoal.minute, undefined);
  });
});

describe('Pure Core Domain - Semantic Exceptions', () => {
  it('MatchAlreadySettledError should have correct properties and inheritance', () => {
    const defaultErr = new MatchAlreadySettledError();
    assert.ok(defaultErr instanceof Error);
    assert.ok(defaultErr instanceof MatchAlreadySettledError);
    assert.equal(defaultErr.name, 'MatchAlreadySettledError');
    assert.equal(defaultErr.message, 'Match is already settled.');

    const customErr = new MatchAlreadySettledError('Cannot modify match M-1: already settled.');
    assert.equal(customErr.message, 'Cannot modify match M-1: already settled.');
  });

  it('MaxCapacityReachedError should have correct properties and inheritance', () => {
    const defaultErr = new MaxCapacityReachedError();
    assert.ok(defaultErr instanceof Error);
    assert.ok(defaultErr instanceof MaxCapacityReachedError);
    assert.equal(defaultErr.name, 'MaxCapacityReachedError');
    assert.equal(defaultErr.message, 'Maximum match capacity reached.');

    const customErr = new MaxCapacityReachedError('Match capacity of 10 reached.');
    assert.equal(customErr.message, 'Match capacity of 10 reached.');
  });

  it('InvalidAttendanceStateError should have correct properties and inheritance', () => {
    const defaultErr = new InvalidAttendanceStateError();
    assert.ok(defaultErr instanceof Error);
    assert.ok(defaultErr instanceof InvalidAttendanceStateError);
    assert.equal(defaultErr.name, 'InvalidAttendanceStateError');
    assert.equal(defaultErr.message, 'Invalid attendance state transition.');

    const customErr = new InvalidAttendanceStateError('Cannot transition from CANCELLED to ATTENDED.');
    assert.equal(customErr.message, 'Cannot transition from CANCELLED to ATTENDED.');
  });

  it('InvalidFinancialAmountError should have correct properties and inheritance', () => {
    const defaultErr = new InvalidFinancialAmountError();
    assert.ok(defaultErr instanceof Error);
    assert.ok(defaultErr instanceof InvalidFinancialAmountError);
    assert.equal(defaultErr.name, 'InvalidFinancialAmountError');
    assert.equal(defaultErr.message, 'Invalid financial amount.');

    const customErr = new InvalidFinancialAmountError('Amount cannot be negative or zero.');
    assert.equal(customErr.message, 'Amount cannot be negative or zero.');
  });

  it('should support try/catch and retain instance type', () => {
    function throwSettled() {
      throw new MatchAlreadySettledError('Settled match');
    }

    assert.throws(
      () => throwSettled(),
      (err) => {
        assert.ok(err instanceof MatchAlreadySettledError);
        assert.ok(err instanceof Error);
        assert.equal((err as MatchAlreadySettledError).name, 'MatchAlreadySettledError');
        return true;
      }
    );
  });

  it('should differentiate between distinct domain exceptions', () => {
    const err1 = new MatchAlreadySettledError();
    const err2 = new MaxCapacityReachedError();
    const err3 = new InvalidAttendanceStateError();
    const err4 = new InvalidFinancialAmountError();

    assert.ok(err1 instanceof MatchAlreadySettledError);
    assert.ok(!(err1 instanceof MaxCapacityReachedError));
    assert.ok(!(err1 instanceof InvalidAttendanceStateError));
    assert.ok(!(err1 instanceof InvalidFinancialAmountError));

    assert.ok(err2 instanceof MaxCapacityReachedError);
    assert.ok(!(err2 instanceof MatchAlreadySettledError));

    assert.ok(err3 instanceof InvalidAttendanceStateError);
    assert.ok(!(err3 instanceof MaxCapacityReachedError));

    assert.ok(err4 instanceof InvalidFinancialAmountError);
    assert.ok(!(err4 instanceof InvalidAttendanceStateError));
  });

  it('should preserve stack traces on all exceptions', () => {
    const exceptions = [
      new MatchAlreadySettledError(),
      new MaxCapacityReachedError(),
      new InvalidAttendanceStateError(),
      new InvalidFinancialAmountError(),
    ];

    for (const exc of exceptions) {
      assert.ok(exc.stack !== undefined && exc.stack.length > 0);
      assert.ok(exc.stack.includes(exc.name));
    }
  });

  it('should verify all semantic exceptions are re-exported correctly via barrel index', () => {
    assert.equal(DomainIndex.MatchAlreadySettledError, MatchAlreadySettledError);
    assert.equal(DomainIndex.MaxCapacityReachedError, MaxCapacityReachedError);
    assert.equal(DomainIndex.InvalidAttendanceStateError, InvalidAttendanceStateError);
    assert.equal(DomainIndex.InvalidFinancialAmountError, InvalidFinancialAmountError);
  });

  it('should support async error rejection with custom messages', async () => {
    async function settleMatchAsync() {
      throw new MatchAlreadySettledError('Async settlement error: match #999');
    }

    await assert.rejects(
      async () => await settleMatchAsync(),
      (err: Error) => {
        assert.ok(err instanceof MatchAlreadySettledError);
        assert.equal(err.message, 'Async settlement error: match #999');
        return true;
      }
    );
  });
});

