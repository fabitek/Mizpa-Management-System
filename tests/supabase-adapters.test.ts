import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseMatchRepository,
  SupabaseAttendanceRepository,
  SupabaseFinanceRepository,
} from '../src/infrastructure/repositories/supabase/index.ts';
import type {
  Match,
  Attendance,
  FinancialEntry,
} from '../src/core/domain/index.ts';

// ==============================================================================
// Mock Supabase Client Helper for Testing
// ==============================================================================

type QueryResult = { data: any; error: any };

class MockQueryBuilder {
  private result: QueryResult;
  public operations: Array<{ method: string; args: any[] }> = [];

  constructor(result: QueryResult = { data: null, error: null }) {
    this.result = result;
  }

  select(...args: any[]) {
    this.operations.push({ method: 'select', args });
    return this;
  }

  eq(...args: any[]) {
    this.operations.push({ method: 'eq', args });
    return this;
  }

  order(...args: any[]) {
    this.operations.push({ method: 'order', args });
    return this;
  }

  insert(...args: any[]) {
    this.operations.push({ method: 'insert', args });
    return Promise.resolve(this.result);
  }

  update(...args: any[]) {
    this.operations.push({ method: 'update', args });
    return this;
  }

  maybeSingle() {
    this.operations.push({ method: 'maybeSingle', args: [] });
    return Promise.resolve(this.result);
  }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function createMockSupabaseClient(tableHandlers: Record<string, (builder: MockQueryBuilder) => void>) {
  return {
    from: (tableName: string) => {
      const builder = new MockQueryBuilder();
      if (tableHandlers[tableName]) {
        tableHandlers[tableName](builder);
      }
      return builder as unknown as any;
    },
  } as unknown as SupabaseClient;
}

// ==============================================================================
// Test Suites: Supabase Repositories (Adapters)
// ==============================================================================

const TEST_MATCH_ID_1 = '11111111-1111-4111-8111-111111111111';
const TEST_MATCH_ID_2 = '22222222-2222-4222-8222-222222222222';
const TEST_PLAYER_ID_1 = '33333333-3333-4333-8333-333333333333';
const TEST_PLAYER_ID_2 = '44444444-4444-4444-8444-444444444444';
const TEST_ATT_ID_1 = '55555555-5555-4555-8555-555555555555';
const TEST_ATT_ID_2 = '66666666-6666-4666-8666-666666666666';
const TEST_FIN_ID_1 = '77777777-7777-4777-8777-777777777777';
const TEST_FIN_ID_2 = '88888888-8888-4888-8888-888888888888';

describe('SupabaseMatchRepository Adapter', () => {
  it('should find match by id and correctly map snake_case to Domain entity', async () => {
    const rawRow = {
      id: TEST_MATCH_ID_1,
      date: '2026-09-20T20:00:00.000Z',
      location: 'Cancha La 10',
      pitch_rental_cost: '150000.00',
      extra_costs: '25000.00',
      max_players: 12,
      settled_fee_per_player: '14584.00',
      status: 'SETTLED',
      created_at: '2026-09-01T10:00:00.000Z',
      updated_at: '2026-09-20T22:00:00.000Z',
    };

    const client = {
      from: (table: string) => {
        assert.equal(table, 'matches');
        return {
          select: () => ({
            eq: (_col: string, val: string) => {
              assert.equal(val, TEST_MATCH_ID_1);
              return {
                maybeSingle: async () => ({ data: rawRow, error: null }),
              };
            },
          }),
        };
      },
    } as unknown as SupabaseClient;

    const repo = new SupabaseMatchRepository(client);
    const match = await repo.findById(TEST_MATCH_ID_1);

    assert.ok(match);
    assert.equal(match.id, TEST_MATCH_ID_1);
    assert.equal(match.location, 'Cancha La 10');
    assert.equal(match.pitchRentalCost, 150000);
    assert.equal(match.extraCosts, 25000);
    assert.equal(match.maxPlayers, 12);
    assert.equal(match.settledFeePerPlayer, 14584);
    assert.equal(match.status, 'SETTLED');
    assert.ok(match.date instanceof Date);
    assert.ok(match.createdAt instanceof Date);
    assert.ok(match.updatedAt instanceof Date);
  });

  it('should return null when match is not found', async () => {
    const nonExistentId = '99999999-9999-4999-8999-999999999999';
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseMatchRepository(client);
    const match = await repo.findById(nonExistentId);
    assert.equal(match, null);
  });

  it('should save match mapping domain entity to database row', async () => {
    let insertedRow: any = null;

    const client = {
      from: (table: string) => {
        assert.equal(table, 'matches');
        return {
          insert: async (row: any) => {
            insertedRow = row;
            return { error: null };
          },
        };
      },
    } as unknown as SupabaseClient;

    const repo = new SupabaseMatchRepository(client);
    const domainMatch: Match = {
      id: TEST_MATCH_ID_2,
      date: new Date('2026-09-25T18:00:00.000Z'),
      location: 'Cancha Campín 5',
      pitchRentalCost: 120000,
      extraCosts: 20000,
      maxPlayers: 10,
      settledFeePerPlayer: null,
      status: 'OPEN_REGISTRATION',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    };

    await repo.save(domainMatch);

    assert.ok(insertedRow);
    assert.equal(insertedRow.id, TEST_MATCH_ID_2);
    assert.equal(insertedRow.pitch_rental_cost, 120000);
    assert.equal(insertedRow.extra_costs, 20000);
    assert.equal(insertedRow.status, 'OPEN_REGISTRATION');
  });
});

describe('SupabaseAttendanceRepository Adapter', () => {
  it('should find attendances by match id and map to domain entities', async () => {
    const rawRows = [
      {
        id: TEST_ATT_ID_1,
        match_id: TEST_MATCH_ID_1,
        player_id: TEST_PLAYER_ID_1,
        status: 'ATTENDED',
        registered_at: '2026-09-10T12:00:00.000Z',
      },
      {
        id: TEST_ATT_ID_2,
        match_id: TEST_MATCH_ID_1,
        player_id: TEST_PLAYER_ID_2,
        status: 'CONFIRMED',
        registered_at: '2026-09-10T12:05:00.000Z',
      },
    ];

    const client = {
      from: (table: string) => {
        assert.equal(table, 'attendances');
        return {
          select: () => ({
            eq: (_col: string, val: string) => {
              assert.equal(val, TEST_MATCH_ID_1);
              return Promise.resolve({ data: rawRows, error: null });
            },
          }),
        };
      },
    } as unknown as SupabaseClient;

    const repo = new SupabaseAttendanceRepository(client);
    const attendances = await repo.findByMatchId(TEST_MATCH_ID_1);

    assert.equal(attendances.length, 2);
    assert.equal(attendances[0].id, TEST_ATT_ID_1);
    assert.equal(attendances[0].status, 'ATTENDED');
    assert.equal(attendances[0].playerId, TEST_PLAYER_ID_1);
    assert.ok(attendances[0].registeredAt instanceof Date);
    assert.equal(attendances[1].status, 'CONFIRMED');
  });
});

describe('SupabaseFinanceRepository Adapter', () => {
  it('should record batch financial entries', async () => {
    let insertedRows: any[] = [];

    const client = {
      from: (table: string) => {
        assert.equal(table, 'financial_entries');
        return {
          insert: async (rows: any[]) => {
            insertedRows = rows;
            return { error: null };
          },
        };
      },
    } as unknown as SupabaseClient;

    const repo = new SupabaseFinanceRepository(client);
    const entries: FinancialEntry[] = [
      {
        id: TEST_FIN_ID_1,
        playerId: TEST_PLAYER_ID_1,
        matchId: TEST_MATCH_ID_1,
        type: 'DEBIT',
        amount: 14000,
        referenceDate: new Date('2026-09-15T21:00:00.000Z'),
        createdAt: new Date('2026-09-15T21:00:00.000Z'),
      },
    ];

    await repo.recordBatchEntries(entries);
    assert.equal(insertedRows.length, 1);
    assert.equal(insertedRows[0].id, TEST_FIN_ID_1);
    assert.equal(insertedRows[0].player_id, TEST_PLAYER_ID_1);
    assert.equal(insertedRows[0].type, 'DEBIT');
    assert.equal(insertedRows[0].amount, 14000);
  });

  it('should calculate player balance correctly from credit and debit entries', async () => {
    const rawRows = [
      {
        id: TEST_FIN_ID_1,
        player_id: TEST_PLAYER_ID_1,
        match_id: null,
        type: 'CREDIT',
        amount: '50000.00',
        reference_date: '2026-09-01T10:00:00.000Z',
        receipt_url: 'https://receipts.com/1.pdf',
        note: 'Recarga inicial',
        created_at: '2026-09-01T10:00:00.000Z',
      },
      {
        id: TEST_FIN_ID_2,
        player_id: TEST_PLAYER_ID_1,
        match_id: TEST_MATCH_ID_1,
        type: 'DEBIT',
        amount: '14000.00',
        reference_date: '2026-09-15T21:00:00.000Z',
        receipt_url: null,
        note: 'Liquidación partido',
        created_at: '2026-09-15T21:00:00.000Z',
      },
    ];

    const client = {
      from: (table: string) => {
        assert.equal(table, 'financial_entries');
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: rawRows, error: null }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;

    const repo = new SupabaseFinanceRepository(client);
    const balance = await repo.getPlayerBalance(TEST_PLAYER_ID_1);

    // 50000 CREDIT - 14000 DEBIT = 36000 balance
    assert.equal(balance, 36000);
  });
});
