import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type {
  Match,
  Attendance,
  FinancialEntry,
  IMatchRepository,
  IAttendanceRepository,
  IFinanceRepository,
} from '../src/core/domain/index.ts';

import {
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
} from '../src/core/domain/index.ts';

import {
  calculateMatchFee,
  CalculateMatchFeeUseCase,
  SettleMatchUseCase,
  CreateMatchUseCase,
} from '../src/core/use-cases/index.ts';

// ==========================================
// In-Memory Repository Mocks (Zero External Deps)
// ==========================================

export class InMemoryMatchRepository implements IMatchRepository {
  public matches: Map<string, Match> = new Map();

  async findById(id: string): Promise<Match | null> {
    const match = this.matches.get(id);
    return match ? { ...match } : null;
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, { ...match });
  }

  async update(match: Match): Promise<void> {
    if (!this.matches.has(match.id)) {
      throw new Error(`Match with ID '${match.id}' not found in repository.`);
    }
    this.matches.set(match.id, { ...match });
  }

  async findAll(): Promise<Match[]> {
    return Array.from(this.matches.values()).map((m) => ({ ...m }));
  }
}

export class InMemoryAttendanceRepository implements IAttendanceRepository {
  public attendances: Attendance[] = [];

  async findById(id: string): Promise<Attendance | null> {
    const attendance = this.attendances.find((a) => a.id === id);
    return attendance ? { ...attendance } : null;
  }

  async findByMatchId(matchId: string): Promise<Attendance[]> {
    return this.attendances
      .filter((a) => a.matchId === matchId)
      .map((a) => ({ ...a }));
  }

  async findByPlayerId(playerId: string): Promise<Attendance[]> {
    return this.attendances
      .filter((a) => a.playerId === playerId || a.registeredByPlayerId === playerId)
      .map((a) => ({ ...a }));
  }

  async findAll(): Promise<Attendance[]> {
    return this.attendances.map((a) => ({ ...a }));
  }

  async save(attendance: Attendance): Promise<void> {
    this.attendances.push({ ...attendance });
  }

  async update(attendance: Attendance): Promise<void> {
    const index = this.attendances.findIndex((a) => a.id === attendance.id);
    if (index === -1) {
      throw new Error(`Attendance with ID '${attendance.id}' not found.`);
    }
    this.attendances[index] = { ...attendance };
  }
}

export class InMemoryFinanceRepository implements IFinanceRepository {
  public entries: FinancialEntry[] = [];

  async recordEntry(entry: FinancialEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async recordBatchEntries(entries: FinancialEntry[]): Promise<void> {
    this.entries.push(...entries.map((e) => ({ ...e })));
  }

  async getEntriesByPlayerId(playerId: string): Promise<FinancialEntry[]> {
    return this.entries
      .filter((e) => e.playerId === playerId)
      .map((e) => ({ ...e }));
  }

  async getEntriesByMatchId(matchId: string): Promise<FinancialEntry[]> {
    return this.entries
      .filter((e) => e.matchId === matchId)
      .map((e) => ({ ...e }));
  }

  async getAllEntries(): Promise<FinancialEntry[]> {
    return this.entries.map((e) => ({ ...e }));
  }

  async getPlayerBalance(playerId: string): Promise<number> {
    const playerEntries = await this.getEntriesByPlayerId(playerId);
    return playerEntries.reduce((acc, entry) => {
      if (entry.type === 'CREDIT') {
        return acc + entry.amount;
      }
      if (entry.type === 'DEBIT') {
        return acc - entry.amount;
      }
      return acc;
    }, 0);
  }
}

// ==========================================
// Test Suites
// ==========================================

describe('CalculateMatchFee Use Case', () => {
  const useCase = new CalculateMatchFeeUseCase();

  it('should calculate exact fee when division has no remainder', () => {
    // 100 + 20 = 120 / 10 = 12
    const fee = calculateMatchFee(120, 10);
    assert.equal(fee, 12);
    assert.equal(useCase.execute(120, 10), 12);
  });

  it('should round up fee with Math.ceil to prevent deficit when fractional remainder exists', () => {
    // 100 / 3 = 33.3333... -> 34
    const fee = calculateMatchFee(100, 3);
    assert.equal(fee, 34);

    // 125 / 6 = 20.8333... -> 21
    const fee2 = calculateMatchFee(125, 6);
    assert.equal(fee2, 21);
  });

  it('should return 0 when player count is 0 or negative', () => {
    assert.equal(calculateMatchFee(120, 0), 0);
    assert.equal(calculateMatchFee(120, -5), 0);
    assert.equal(useCase.execute(120, 0), 0);
  });

  it('should return 0 when total cost is 0 or negative', () => {
    assert.equal(calculateMatchFee(0, 10), 0);
    assert.equal(calculateMatchFee(-50, 10), 0);
  });
});

describe('SettleMatch Use Case', () => {
  let matchRepo: InMemoryMatchRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let financeRepo: InMemoryFinanceRepository;
  let settleMatch: SettleMatchUseCase;

  beforeEach(() => {
    matchRepo = new InMemoryMatchRepository();
    attendanceRepo = new InMemoryAttendanceRepository();
    financeRepo = new InMemoryFinanceRepository();
    settleMatch = new SettleMatchUseCase(matchRepo, attendanceRepo, financeRepo);
  });

  it('should settle match successfully, prorating costs and creating DEBIT entries for each ATTENDED player', async () => {
    const matchId = 'match-100';
    const match: Match = {
      id: matchId,
      date: new Date('2026-09-10T20:00:00Z'),
      location: 'Sintética Los Olivos',
      pitchRentalCost: 100,
      extraCosts: 25, // Total = 125
      maxPlayers: 10,
      settledFeePerPlayer: null,
      status: 'PLAYED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      updatedAt: new Date('2026-09-01T10:00:00Z'),
    };
    await matchRepo.save(match);

    // 3 attended, 1 cancelled, 1 waitlist
    await attendanceRepo.save({
      id: 'att-1',
      matchId,
      playerId: 'player-1',
      status: 'ATTENDED',
      registeredAt: new Date('2026-09-02T10:00:00Z'),
    });
    await attendanceRepo.save({
      id: 'att-2',
      matchId,
      playerId: 'player-2',
      status: 'ATTENDED',
      registeredAt: new Date('2026-09-02T10:05:00Z'),
    });
    await attendanceRepo.save({
      id: 'att-3',
      matchId,
      playerId: 'player-3',
      status: 'ATTENDED',
      registeredAt: new Date('2026-09-02T10:10:00Z'),
    });
    await attendanceRepo.save({
      id: 'att-4',
      matchId,
      playerId: 'player-4',
      status: 'CANCELLED',
      registeredAt: new Date('2026-09-02T10:15:00Z'),
    });
    await attendanceRepo.save({
      id: 'att-5',
      matchId,
      playerId: 'player-5',
      status: 'WAITLIST',
      registeredAt: new Date('2026-09-02T10:20:00Z'),
    });

    // 100 / 3 = 33.333... -> Math.ceil = 34
    const result = await settleMatch.execute({ matchId });

    assert.equal(result.settledFeePerPlayer, 34);
    assert.equal(result.match.status, 'SETTLED');
    assert.equal(result.match.settledFeePerPlayer, 34);
    assert.ok(result.match.updatedAt instanceof Date);

    // Verify repository update
    const updatedInDb = await matchRepo.findById(matchId);
    assert.ok(updatedInDb);
    assert.equal(updatedInDb.status, 'SETTLED');
    assert.equal(updatedInDb.settledFeePerPlayer, 34);

    // Verify financial entries
    assert.equal(result.entries.length, 3);
    assert.equal(financeRepo.entries.length, 3);

    const player1Entries = await financeRepo.getEntriesByPlayerId('player-1');
    assert.equal(player1Entries.length, 1);
    assert.equal(player1Entries[0].type, 'DEBIT');
    assert.equal(player1Entries[0].amount, 34);
    assert.equal(player1Entries[0].matchId, matchId);

    const player2Entries = await financeRepo.getEntriesByPlayerId('player-2');
    assert.equal(player2Entries.length, 1);
    assert.equal(player2Entries[0].type, 'DEBIT');
    assert.equal(player2Entries[0].amount, 34);

    const player4Entries = await financeRepo.getEntriesByPlayerId('player-4');
    assert.equal(player4Entries.length, 0);
  });

  it('should throw MatchAlreadySettledError when attempting to settle a match that is already SETTLED', async () => {
    const matchId = 'match-settled';
    const match: Match = {
      id: matchId,
      date: new Date('2026-09-10T20:00:00Z'),
      location: 'Cancha Central',
      pitchRentalCost: 100,
      extraCosts: 0,
      maxPlayers: 10,
      settledFeePerPlayer: 10,
      status: 'SETTLED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      updatedAt: new Date('2026-09-01T10:00:00Z'),
    };
    await matchRepo.save(match);

    await assert.rejects(
      async () => await settleMatch.execute({ matchId }),
      (err: Error) => {
        assert.ok(err instanceof MatchAlreadySettledError);
        assert.equal(err.name, 'MatchAlreadySettledError');
        assert.match(err.message, /already settled/i);
        return true;
      }
    );
  });

  it('should throw InvalidAttendanceStateError when no players have status ATTENDED', async () => {
    const matchId = 'match-no-attendees';
    const match: Match = {
      id: matchId,
      date: new Date('2026-09-10T20:00:00Z'),
      location: 'Cancha Norte',
      pitchRentalCost: 100,
      extraCosts: 0,
      maxPlayers: 10,
      settledFeePerPlayer: null,
      status: 'PLAYED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      updatedAt: new Date('2026-09-01T10:00:00Z'),
    };
    await matchRepo.save(match);

    // Only CONFIRMED, none marked as ATTENDED
    await attendanceRepo.save({
      id: 'att-1',
      matchId,
      playerId: 'player-1',
      status: 'CONFIRMED',
      registeredAt: new Date(),
    });

    await assert.rejects(
      async () => await settleMatch.execute({ matchId }),
      (err: Error) => {
        assert.ok(err instanceof InvalidAttendanceStateError);
        assert.equal(err.name, 'InvalidAttendanceStateError');
        assert.match(err.message, /No attendees with 'ATTENDED' status/i);
        return true;
      }
    );
  });

  it('should throw an Error if the match is not found', async () => {
    await assert.rejects(
      async () => await settleMatch.execute({ matchId: 'non-existent-match' }),
      (err: Error) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /not found/i);
        return true;
      }
    );
  });
});

describe('InMemoryFinanceRepository - Balance Calculations', () => {
  it('should calculate player balance precisely by adding CREDIT and subtracting DEBIT', async () => {
    const financeRepo = new InMemoryFinanceRepository();
    const playerId = 'player-finance-test';

    // Initial balance should be 0
    let balance = await financeRepo.getPlayerBalance(playerId);
    assert.equal(balance, 0);

    // Deposit 100 (CREDIT)
    await financeRepo.recordEntry({
      id: 'fe-credit-1',
      playerId,
      type: 'CREDIT',
      amount: 100,
      referenceDate: new Date('2026-09-01'),
      createdAt: new Date('2026-09-01'),
      note: 'Deposit via transfer',
    });

    balance = await financeRepo.getPlayerBalance(playerId);
    assert.equal(balance, 100);

    // Match fee charged: 35 (DEBIT)
    await financeRepo.recordEntry({
      id: 'fe-debit-1',
      playerId,
      matchId: 'match-1',
      type: 'DEBIT',
      amount: 35,
      referenceDate: new Date('2026-09-05'),
      createdAt: new Date('2026-09-05'),
      note: 'Match settlement',
    });

    balance = await financeRepo.getPlayerBalance(playerId);
    assert.equal(balance, 65);

    // Another match fee charged: 20 (DEBIT)
    await financeRepo.recordEntry({
      id: 'fe-debit-2',
      playerId,
      matchId: 'match-2',
      type: 'DEBIT',
      amount: 20,
      referenceDate: new Date('2026-09-12'),
      createdAt: new Date('2026-09-12'),
      note: 'Match settlement',
    });

    balance = await financeRepo.getPlayerBalance(playerId);
    assert.equal(balance, 45);

    // Refund / Credit: 15 (CREDIT)
    await financeRepo.recordEntry({
      id: 'fe-credit-2',
      playerId,
      type: 'CREDIT',
      amount: 15,
      referenceDate: new Date('2026-09-15'),
      createdAt: new Date('2026-09-15'),
      note: 'Adjustment credit',
    });

    balance = await financeRepo.getPlayerBalance(playerId);
    assert.equal(balance, 60);

    // Overdraft debit of 80 (DEBIT -> balance becomes -20)
    await financeRepo.recordEntry({
      id: 'fe-debit-3',
      playerId,
      matchId: 'match-3',
      type: 'DEBIT',
      amount: 80,
      referenceDate: new Date('2026-09-20'),
      createdAt: new Date('2026-09-20'),
      note: 'Match settlement',
    });

    balance = await financeRepo.getPlayerBalance(playerId);
    assert.equal(balance, -20);
  });
});

describe('CreateMatchUseCase - Pitch Location & Google Maps', () => {
  let matchRepo: InMemoryMatchRepository;
  let createMatch: CreateMatchUseCase;

  beforeEach(() => {
    matchRepo = new InMemoryMatchRepository();
    createMatch = new CreateMatchUseCase(matchRepo);
  });

  it('should create a match with address and explicit Google Maps link', async () => {
    const match = await createMatch.execute({
      location: 'Cancha El Campín 5',
      locationAddress: 'Cra. 30 #57-60, Bogotá',
      googleMapsUrl: 'https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic',
      date: new Date('2026-09-15T19:00:00Z'),
      pitchRentalCost: 120000,
      extraCosts: 20000,
      maxPlayers: 18,
      openImmediately: true,
    });

    assert.equal(match.location, 'Cancha El Campín 5');
    assert.equal(match.locationAddress, 'Cra. 30 #57-60, Bogotá');
    assert.equal(match.googleMapsUrl, 'https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic');
    assert.equal(match.maxPlayers, 18);
    assert.equal(match.status, 'OPEN_REGISTRATION');

    const saved = await matchRepo.findById(match.id);
    assert.ok(saved);
    assert.equal(saved.googleMapsUrl, 'https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic');
  });

  it('should automatically generate a Google Maps search URL when no custom link is provided', async () => {
    const match = await createMatch.execute({
      location: 'Cancha Los Sauces',
      locationAddress: 'Calle 100 #15-20',
      date: new Date('2026-09-20T20:00:00Z'),
      pitchRentalCost: 100000,
      extraCosts: 0,
      maxPlayers: 18,
    });

    assert.ok(match.googleMapsUrl);
    assert.ok(match.googleMapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='));
    assert.ok(match.googleMapsUrl.includes('Cancha%20Los%20Sauces'));
    assert.ok(match.googleMapsUrl.includes('Calle%20100'));
  });
});
