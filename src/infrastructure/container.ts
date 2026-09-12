import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type {
  IMatchRepository,
  IAttendanceRepository,
  IFinanceRepository,
  IGoalRepository,
} from '../core/domain/index.ts';
import { InMemoryMatchRepository } from './repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryAttendanceRepository } from './repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryFinanceRepository } from './repositories/in-memory/InMemoryFinanceRepository.ts';
import { InMemoryGoalRepository } from './repositories/in-memory/InMemoryGoalRepository.ts';
import {
  SupabaseMatchRepository,
  SupabaseAttendanceRepository,
  SupabaseFinanceRepository,
  SupabaseGoalRepository,
} from './repositories/supabase/index.ts';
import {
  SettleMatchUseCase,
  CalculateMatchFeeUseCase,
  CreateMatchUseCase,
  OpenMatchRegistrationUseCase,
  RegisterAttendanceUseCase,
  CancelAttendanceUseCase,
  CheckinAttendanceUseCase,
  RecordPlayerCreditUseCase,
  GetPlayerStatementUseCase,
  GetMatchFinancialSummaryUseCase,
  GetAllPlayersFinancialOverviewUseCase,
  RecordGoalEventUseCase,
  GetTopScorersUseCase,
  GetPlayerStatsUseCase,
  AssignMatchMvpUseCase,
  GetLeaderboardOverviewUseCase,
} from '../core/use-cases/index.ts';
import { initialMatch, initialAttendances, initialGoals } from './seed-data.ts';

// Singleton container interface typed to domain interfaces (Ports)
export interface DIContainer {
  dataSource: 'in-memory' | 'supabase';
  matchRepository: IMatchRepository;
  attendanceRepository: IAttendanceRepository;
  financeRepository: IFinanceRepository;
  goalRepository: IGoalRepository;
  settleMatchUseCase: SettleMatchUseCase;
  calculateMatchFeeUseCase: CalculateMatchFeeUseCase;
  createMatchUseCase: CreateMatchUseCase;
  openMatchRegistrationUseCase: OpenMatchRegistrationUseCase;
  registerAttendanceUseCase: RegisterAttendanceUseCase;
  cancelAttendanceUseCase: CancelAttendanceUseCase;
  checkinAttendanceUseCase: CheckinAttendanceUseCase;
  recordPlayerCreditUseCase: RecordPlayerCreditUseCase;
  getPlayerStatementUseCase: GetPlayerStatementUseCase;
  getMatchFinancialSummaryUseCase: GetMatchFinancialSummaryUseCase;
  getAllPlayersFinancialOverviewUseCase: GetAllPlayersFinancialOverviewUseCase;
  recordGoalEventUseCase: RecordGoalEventUseCase;
  getTopScorersUseCase: GetTopScorersUseCase;
  getPlayerStatsUseCase: GetPlayerStatsUseCase;
  assignMatchMvpUseCase: AssignMatchMvpUseCase;
  getLeaderboardOverviewUseCase: GetLeaderboardOverviewUseCase;
}

// Preserve singletons in development / serverless context
const globalForDI = globalThis as unknown as { __diContainer?: DIContainer };

function createContainer(): DIContainer {
  const dataSource = (process.env.DATA_SOURCE || 'in-memory').toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let matchRepository: IMatchRepository;
  let attendanceRepository: IAttendanceRepository;
  let financeRepository: IFinanceRepository;
  let goalRepository: IGoalRepository;
  let activeDataSource: 'in-memory' | 'supabase' = 'in-memory';

  if (dataSource === 'supabase' && supabaseUrl && supabaseKey) {
    try {
      const client = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      matchRepository = new SupabaseMatchRepository(client);
      attendanceRepository = new SupabaseAttendanceRepository(client);
      financeRepository = new SupabaseFinanceRepository(client);
      goalRepository = new SupabaseGoalRepository(client);
      activeDataSource = 'supabase';
    } catch (err) {
      console.warn(
        '⚠️ Failed to initialize Supabase adapters. Falling back to InMemory repositories.',
        err
      );
      matchRepository = new InMemoryMatchRepository([initialMatch]);
      attendanceRepository = new InMemoryAttendanceRepository(initialAttendances);
      financeRepository = new InMemoryFinanceRepository();
      goalRepository = new InMemoryGoalRepository(initialGoals);
    }
  } else {
    matchRepository = new InMemoryMatchRepository([initialMatch]);
    attendanceRepository = new InMemoryAttendanceRepository(initialAttendances);
    financeRepository = new InMemoryFinanceRepository();
    goalRepository = new InMemoryGoalRepository(initialGoals);
  }

  const settleMatchUseCase = new SettleMatchUseCase(
    matchRepository,
    attendanceRepository,
    financeRepository
  );

  const calculateMatchFeeUseCase = new CalculateMatchFeeUseCase();
  const createMatchUseCase = new CreateMatchUseCase(matchRepository);
  const openMatchRegistrationUseCase = new OpenMatchRegistrationUseCase(matchRepository);
  const registerAttendanceUseCase = new RegisterAttendanceUseCase(
    matchRepository,
    attendanceRepository
  );
  const cancelAttendanceUseCase = new CancelAttendanceUseCase(
    matchRepository,
    attendanceRepository
  );
  const checkinAttendanceUseCase = new CheckinAttendanceUseCase(
    matchRepository,
    attendanceRepository
  );

  const recordPlayerCreditUseCase = new RecordPlayerCreditUseCase(financeRepository);
  const getPlayerStatementUseCase = new GetPlayerStatementUseCase(financeRepository);
  const getMatchFinancialSummaryUseCase = new GetMatchFinancialSummaryUseCase(
    matchRepository,
    financeRepository,
    attendanceRepository
  );
  const getAllPlayersFinancialOverviewUseCase = new GetAllPlayersFinancialOverviewUseCase(
    financeRepository
  );

  const recordGoalEventUseCase = new RecordGoalEventUseCase(matchRepository, goalRepository);
  const getTopScorersUseCase = new GetTopScorersUseCase(goalRepository, attendanceRepository);
  const getPlayerStatsUseCase = new GetPlayerStatsUseCase(
    goalRepository,
    attendanceRepository,
    matchRepository,
    financeRepository
  );
  const assignMatchMvpUseCase = new AssignMatchMvpUseCase(matchRepository, attendanceRepository);
  const getLeaderboardOverviewUseCase = new GetLeaderboardOverviewUseCase(
    goalRepository,
    attendanceRepository,
    matchRepository
  );

  return {
    dataSource: activeDataSource,
    matchRepository,
    attendanceRepository,
    financeRepository,
    goalRepository,
    settleMatchUseCase,
    calculateMatchFeeUseCase,
    createMatchUseCase,
    openMatchRegistrationUseCase,
    registerAttendanceUseCase,
    cancelAttendanceUseCase,
    checkinAttendanceUseCase,
    recordPlayerCreditUseCase,
    getPlayerStatementUseCase,
    getMatchFinancialSummaryUseCase,
    getAllPlayersFinancialOverviewUseCase,
    recordGoalEventUseCase,
    getTopScorersUseCase,
    getPlayerStatsUseCase,
    assignMatchMvpUseCase,
    getLeaderboardOverviewUseCase,
  };
}

export const container: DIContainer = globalForDI.__diContainer ?? createContainer();

if (process.env.NODE_ENV !== 'production') {
  globalForDI.__diContainer = container;
}

export const {
  dataSource,
  matchRepository,
  attendanceRepository,
  financeRepository,
  goalRepository,
  settleMatchUseCase,
  calculateMatchFeeUseCase,
  createMatchUseCase,
  openMatchRegistrationUseCase,
  registerAttendanceUseCase,
  cancelAttendanceUseCase,
  checkinAttendanceUseCase,
  recordPlayerCreditUseCase,
  getPlayerStatementUseCase,
  getMatchFinancialSummaryUseCase,
  getAllPlayersFinancialOverviewUseCase,
  recordGoalEventUseCase,
  getTopScorersUseCase,
  getPlayerStatsUseCase,
  assignMatchMvpUseCase,
  getLeaderboardOverviewUseCase,
} = container;
