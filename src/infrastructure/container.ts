import type {
  IMatchRepository,
  IPlayerRepository,
  IAttendanceRepository,
  IFinanceRepository,
  IGoalRepository,
  IAuthService,
  INotificationService,
} from '../core/domain/index.ts';
import { InMemoryMatchRepository } from './repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryPlayerRepository } from './repositories/in-memory/InMemoryPlayerRepository.ts';
import { InMemoryAttendanceRepository } from './repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryFinanceRepository } from './repositories/in-memory/InMemoryFinanceRepository.ts';
import { InMemoryGoalRepository } from './repositories/in-memory/InMemoryGoalRepository.ts';
import { InMemoryAuthService } from './repositories/in-memory/InMemoryAuthService.ts';
import { InMemoryNotificationService } from './repositories/in-memory/InMemoryNotificationService.ts';
import {
  SupabaseMatchRepository,
  SupabasePlayerRepository,
  SupabaseAttendanceRepository,
  SupabaseFinanceRepository,
  SupabaseGoalRepository,
} from './repositories/supabase/index.ts';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  CreatePlayerUseCase,
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
  SendMatchConvocationUseCase,
  SendSettlementAlertsUseCase,
  SendDebtReminderUseCase,
  GetNotificationsLogUseCase,
  SwitchSessionUserUseCase,
  UpdateMatchUseCase,
  DeleteMatchUseCase,
} from '../core/use-cases/index.ts';
import { initialMatches, initialAttendances, initialGoals, initialNotifications, initialPlayers } from './seed-data.ts';

// Singleton container interface typed to domain interfaces (Ports)
export interface DIContainer {
  dataSource: 'in-memory' | 'supabase';
  matchRepository: IMatchRepository;
  playerRepository: IPlayerRepository;
  attendanceRepository: IAttendanceRepository;
  financeRepository: IFinanceRepository;
  goalRepository: IGoalRepository;
  authService: IAuthService;
  notificationService: INotificationService;
  createPlayerUseCase: CreatePlayerUseCase;
  settleMatchUseCase: SettleMatchUseCase;
  calculateMatchFeeUseCase: CalculateMatchFeeUseCase;
  createMatchUseCase: CreateMatchUseCase;
  updateMatchUseCase: UpdateMatchUseCase;
  deleteMatchUseCase: DeleteMatchUseCase;
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
  sendMatchConvocationUseCase: SendMatchConvocationUseCase;
  sendSettlementAlertsUseCase: SendSettlementAlertsUseCase;
  sendDebtReminderUseCase: SendDebtReminderUseCase;
  getNotificationsLogUseCase: GetNotificationsLogUseCase;
  switchSessionUserUseCase: SwitchSessionUserUseCase;
}

// Preserve singletons in development / serverless context
const globalForDI = globalThis as unknown as { __diContainer?: DIContainer };

function createContainer(): DIContainer {
  const dataSource = (process.env.DATA_SOURCE || 'supabase').toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ntjcedrmvftoexcicsfb.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_0iN4YOWw-WSdl6TF3fna3g_1tqgtLL0';

  let matchRepository: IMatchRepository;
  let playerRepository: IPlayerRepository;
  let attendanceRepository: IAttendanceRepository;
  let financeRepository: IFinanceRepository;
  let goalRepository: IGoalRepository;
  let authService: IAuthService;
  let notificationService: INotificationService;
  let activeDataSource: 'in-memory' | 'supabase' = 'in-memory';

  if (dataSource === 'supabase' && supabaseUrl && supabaseKey) {
    try {
      const client = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      matchRepository = new SupabaseMatchRepository(client);
      playerRepository = new SupabasePlayerRepository(client);
      attendanceRepository = new SupabaseAttendanceRepository(client);
      financeRepository = new SupabaseFinanceRepository(client);
      goalRepository = new SupabaseGoalRepository(client);
      authService = new InMemoryAuthService(initialPlayers);
      notificationService = new InMemoryNotificationService(initialNotifications);
      activeDataSource = 'supabase';
    } catch (err) {
      console.warn(
        '⚠️ Failed to initialize Supabase adapters. Falling back to InMemory repositories.',
        err
      );
      matchRepository = new InMemoryMatchRepository(initialMatches);
      playerRepository = new InMemoryPlayerRepository(initialPlayers);
      attendanceRepository = new InMemoryAttendanceRepository(initialAttendances);
      financeRepository = new InMemoryFinanceRepository();
      goalRepository = new InMemoryGoalRepository(initialGoals);
      authService = new InMemoryAuthService(initialPlayers);
      notificationService = new InMemoryNotificationService(initialNotifications);
    }
  } else {
    matchRepository = new InMemoryMatchRepository(initialMatches);
    playerRepository = new InMemoryPlayerRepository(initialPlayers);
    attendanceRepository = new InMemoryAttendanceRepository(initialAttendances);
    financeRepository = new InMemoryFinanceRepository();
    goalRepository = new InMemoryGoalRepository(initialGoals);
    authService = new InMemoryAuthService(initialPlayers);
    notificationService = new InMemoryNotificationService(initialNotifications);
  }

  const createPlayerUseCase = new CreatePlayerUseCase(playerRepository);
  const settleMatchUseCase = new SettleMatchUseCase(
    matchRepository,
    attendanceRepository,
    financeRepository
  );

  const calculateMatchFeeUseCase = new CalculateMatchFeeUseCase();
  const createMatchUseCase = new CreateMatchUseCase(matchRepository);
  const updateMatchUseCase = new UpdateMatchUseCase(matchRepository);
  const deleteMatchUseCase = new DeleteMatchUseCase(matchRepository, attendanceRepository);
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

  const sendMatchConvocationUseCase = new SendMatchConvocationUseCase(
    matchRepository,
    notificationService
  );
  const sendSettlementAlertsUseCase = new SendSettlementAlertsUseCase(
    matchRepository,
    attendanceRepository,
    financeRepository,
    notificationService
  );
  const sendDebtReminderUseCase = new SendDebtReminderUseCase(
    financeRepository,
    notificationService
  );
  const getNotificationsLogUseCase = new GetNotificationsLogUseCase(notificationService);
  const switchSessionUserUseCase = new SwitchSessionUserUseCase(authService);

  return {
    dataSource: activeDataSource,
    matchRepository,
    playerRepository,
    attendanceRepository,
    financeRepository,
    goalRepository,
    authService,
    notificationService,
    createPlayerUseCase,
    settleMatchUseCase,
    calculateMatchFeeUseCase,
    createMatchUseCase,
    updateMatchUseCase,
    deleteMatchUseCase,
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
    sendMatchConvocationUseCase,
    sendSettlementAlertsUseCase,
    sendDebtReminderUseCase,
    getNotificationsLogUseCase,
    switchSessionUserUseCase,
  };
}

export const container: DIContainer = createContainer();

export const {
  dataSource,
  matchRepository,
  playerRepository,
  attendanceRepository,
  financeRepository,
  goalRepository,
  authService,
  notificationService,
  createPlayerUseCase,
  settleMatchUseCase,
  calculateMatchFeeUseCase,
  createMatchUseCase,
  updateMatchUseCase,
  deleteMatchUseCase,
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
  sendMatchConvocationUseCase,
  sendSettlementAlertsUseCase,
  sendDebtReminderUseCase,
  getNotificationsLogUseCase,
  switchSessionUserUseCase,
} = container;
