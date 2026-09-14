import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Match } from '../src/core/domain/index.ts';
import {
  InvalidFinancialAmountError,
  MatchNotFoundError,
} from '../src/core/domain/index.ts';

import {
  RecordPlayerCreditUseCase,
  GetPlayerStatementUseCase,
  GetMatchFinancialSummaryUseCase,
  GetAllPlayersFinancialOverviewUseCase,
  SettleMatchUseCase,
} from '../src/core/use-cases/index.ts';

import {
  InMemoryMatchRepository,
  InMemoryAttendanceRepository,
  InMemoryFinanceRepository,
} from './use-cases.test.ts';

describe('Phase 4: Player Wallet & Financial Module Use Cases', () => {
  let matchRepo: InMemoryMatchRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let financeRepo: InMemoryFinanceRepository;

  let recordCredit: RecordPlayerCreditUseCase;
  let getStatement: GetPlayerStatementUseCase;
  let getMatchSummary: GetMatchFinancialSummaryUseCase;
  let getTreasuryOverview: GetAllPlayersFinancialOverviewUseCase;
  let settleMatch: SettleMatchUseCase;

  beforeEach(() => {
    matchRepo = new InMemoryMatchRepository();
    attendanceRepo = new InMemoryAttendanceRepository();
    financeRepo = new InMemoryFinanceRepository();

    recordCredit = new RecordPlayerCreditUseCase(financeRepo);
    getStatement = new GetPlayerStatementUseCase(financeRepo);
    getMatchSummary = new GetMatchFinancialSummaryUseCase(
      matchRepo,
      financeRepo,
      attendanceRepo
    );
    getTreasuryOverview = new GetAllPlayersFinancialOverviewUseCase(financeRepo);
    settleMatch = new SettleMatchUseCase(matchRepo, attendanceRepo, financeRepo);
  });

  describe('RecordPlayerCreditUseCase', () => {
    it('should successfully record a positive credit and update player balance', async () => {
      const result = await recordCredit.execute({
        playerId: 'player-1',
        amount: 50000,
        note: 'Recarga Nequi #12345',
        receiptUrl: 'https://storage.mizpa.com/receipts/rec-1.pdf',
      });

      assert.equal(result.entry.type, 'CREDIT');
      assert.equal(result.entry.amount, 50000);
      assert.equal(result.entry.playerId, 'player-1');
      assert.equal(result.entry.note, 'Recarga Nequi #12345');
      assert.equal(result.entry.receiptUrl, 'https://storage.mizpa.com/receipts/rec-1.pdf');
      assert.equal(result.newBalance, 50000);

      // Verify in repository
      const balanceInRepo = await financeRepo.getPlayerBalance('player-1');
      assert.equal(balanceInRepo, 50000);
    });

    it('should throw InvalidFinancialAmountError if amount is zero or negative', async () => {
      await assert.rejects(
        async () =>
          await recordCredit.execute({
            playerId: 'player-1',
            amount: 0,
          }),
        (err: Error) => {
          assert.ok(err instanceof InvalidFinancialAmountError);
          return true;
        }
      );

      await assert.rejects(
        async () =>
          await recordCredit.execute({
            playerId: 'player-1',
            amount: -25000,
          }),
        (err: Error) => {
          assert.ok(err instanceof InvalidFinancialAmountError);
          return true;
        }
      );
    });
  });

  describe('GetPlayerStatementUseCase', () => {
    it('should return a solvent statement when credits exceed debits', async () => {
      // Credit 100,000
      await recordCredit.execute({
        playerId: 'player-solvent',
        amount: 100000,
      });

      // Debit 30,000
      await financeRepo.recordEntry({
        id: 'debit-1',
        playerId: 'player-solvent',
        matchId: 'match-1',
        type: 'DEBIT',
        amount: 30000,
        referenceDate: new Date('2026-09-05'),
        createdAt: new Date('2026-09-05'),
      });

      const statement = await getStatement.execute('player-solvent');

      assert.equal(statement.totalCredits, 100000);
      assert.equal(statement.totalDebits, 30000);
      assert.equal(statement.netBalance, 70000);
      assert.equal(statement.status, 'SOLVENT');
      assert.equal(statement.debtAmount, 0);
      assert.equal(statement.entries.length, 2);
    });

    it('should return a debtor statement when debits exceed credits', async () => {
      // Debit 50,000 without prior credit
      await financeRepo.recordEntry({
        id: 'debit-debtor',
        playerId: 'player-debtor',
        matchId: 'match-1',
        type: 'DEBIT',
        amount: 50000,
        referenceDate: new Date('2026-09-05'),
        createdAt: new Date('2026-09-05'),
      });

      const statement = await getStatement.execute('player-debtor');

      assert.equal(statement.totalCredits, 0);
      assert.equal(statement.totalDebits, 50000);
      assert.equal(statement.netBalance, -50000);
      assert.equal(statement.status, 'DEBTOR');
      assert.equal(statement.debtAmount, 50000);
    });
  });

  describe('GetMatchFinancialSummaryUseCase', () => {
    it('should audit match costs, collections and rounding surplus correctly', async () => {
      const matchId = 'match-audit-1';
      const match: Match = {
        id: matchId,
        date: new Date('2026-09-10T20:00:00Z'),
        location: 'Cancha Los Olivos',
        pitchRentalCost: 100000,
        extraCosts: 25000, // Total = 125,000
        maxPlayers: 10,
        settledFeePerPlayer: null,
        status: 'PLAYED',
        createdAt: new Date('2026-09-01'),
        updatedAt: new Date('2026-09-01'),
      };
      await matchRepo.save(match);

      // 3 attended players -> 100,000 / 3 = 33,333.33 -> Math.ceil = 33,334 each base fee
      await attendanceRepo.save({
        id: 'att-1',
        matchId,
        playerId: 'player-1',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });
      await attendanceRepo.save({
        id: 'att-2',
        matchId,
        playerId: 'player-2',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });
      await attendanceRepo.save({
        id: 'att-3',
        matchId,
        playerId: 'player-3',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });

      // Settle match
      await settleMatch.execute({ matchId });

      // Audit summary
      const summary = await getMatchSummary.execute(matchId);

      assert.equal(summary.matchId, matchId);
      assert.equal(summary.totalMatchCost, 125000);
      assert.equal(summary.attendedPlayersCount, 3);
      assert.equal(summary.settledFeePerPlayer, 33334);
      assert.equal(summary.totalDebitedAmount, 100002); // 3 * 33334
      assert.equal(summary.isSettled, true);
    });

    it('should throw MatchNotFoundError if match does not exist', async () => {
      await assert.rejects(
        async () => await getMatchSummary.execute('non-existent'),
        (err: Error) => {
          assert.ok(err instanceof MatchNotFoundError);
          return true;
        }
      );
    });
  });

  describe('GetAllPlayersFinancialOverviewUseCase', () => {
    it('should compute aggregated treasury metrics accurately', async () => {
      // Player 1: Credit 100,000, Debit 30,000 (Balance +70,000)
      await recordCredit.execute({ playerId: 'p1', amount: 100000 });
      await financeRepo.recordEntry({
        id: 'd1',
        playerId: 'p1',
        type: 'DEBIT',
        amount: 30000,
        referenceDate: new Date(),
        createdAt: new Date(),
      });

      // Player 2: No credit, Debit 40,000 (Balance -40,000, Debt 40,000)
      await financeRepo.recordEntry({
        id: 'd2',
        playerId: 'p2',
        type: 'DEBIT',
        amount: 40000,
        referenceDate: new Date(),
        createdAt: new Date(),
      });

      const overview = await getTreasuryOverview.execute(['p1', 'p2']);

      assert.equal(overview.totalCreditsCollected, 100000);
      assert.equal(overview.totalDebitsIssued, 70000);
      assert.equal(overview.totalTreasuryBalance, 30000); // 100,000 - 70,000
      assert.equal(overview.totalOutstandingDebt, 40000);
      assert.equal(overview.playerBalances.length, 2);

      const p1Item = overview.playerBalances.find((p) => p.playerId === 'p1');
      assert.equal(p1Item?.balance, 70000);
      assert.equal(p1Item?.status, 'SOLVENT');

      const p2Item = overview.playerBalances.find((p) => p.playerId === 'p2');
      assert.equal(p2Item?.balance, -40000);
      assert.equal(p2Item?.status, 'DEBTOR');
    });
  });
});
