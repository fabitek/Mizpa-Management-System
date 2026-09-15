import type {
  IMatchRepository,
  IPlayerRepository,
  IAttendanceRepository,
  IFinanceRepository,
  IOperatingExpenseRepository,
  IGoalRepository,
  IAuthService,
  INotificationService,
  INotificationGateway,
} from '../core/domain/index.ts';
import { InMemoryMatchRepository } from './repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryPlayerRepository } from './repositories/in-memory/InMemoryPlayerRepository.ts';
import { InMemoryAttendanceRepository } from './repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryFinanceRepository } from './repositories/in-memory/InMemoryFinanceRepository.ts';
import { InMemoryOperatingExpenseRepository } from './repositories/in-memory/InMemoryOperatingExpenseRepository.ts';
import { InMemoryGoalRepository } from './repositories/in-memory/InMemoryGoalRepository.ts';
import { InMemoryAuthService } from './repositories/in-memory/InMemoryAuthService.ts';
import { InMemoryNotificationService } from './repositories/in-memory/InMemoryNotificationService.ts';
import {
  WhatsAppNotificationGateway,
  InMemoryNotificationGateway,
} from './adapters/whatsapp/index.ts';
import {
  SupabaseMatchRepository,
  SupabasePlayerRepository,
  SupabaseAttendanceRepository,
  SupabaseFinanceRepository,
  SupabaseOperatingExpenseRepository,
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
  RecordOperatingExpenseUseCase,
  GetAllOperatingExpensesUseCase,
  DeleteOperatingExpenseUseCase,
  ProcessReceiptOcrUseCase,
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
  CheckAndNotifyCapacityReachedUseCase,
  ReconcileMatchAttendancesUseCase,
} from '../core/use-cases/index.ts';
import { initialMatches, initialAttendances, initialGoals, initialNotifications, initialPlayers } from './seed-data.ts';

// Singleton container interface typed to domain interfaces (Ports)
export interface DIContainer {
  dataSource: 'in-memory' | 'supabase';
  matchRepository: IMatchRepository;
  playerRepository: IPlayerRepository;
  attendanceRepository: IAttendanceRepository;
  financeRepository: IFinanceRepository;
  operatingExpenseRepository: IOperatingExpenseRepository;
  goalRepository: IGoalRepository;
  authService: IAuthService;
  notificationService: INotificationService;
  notificationGateway: INotificationGateway;
  createPlayerUseCase: CreatePlayerUseCase;
  settleMatchUseCase: SettleMatchUseCase;
  calculateMatchFeeUseCase: CalculateMatchFeeUseCase;
  createMatchUseCase: CreateMatchUseCase;
  updateMatchUseCase: UpdateMatchUseCase;
  reconcileMatchAttendancesUseCase: ReconcileMatchAttendancesUseCase;
  deleteMatchUseCase: DeleteMatchUseCase;
  openMatchRegistrationUseCase: OpenMatchRegistrationUseCase;
  registerAttendanceUseCase: RegisterAttendanceUseCase;
  cancelAttendanceUseCase: CancelAttendanceUseCase;
  checkinAttendanceUseCase: CheckinAttendanceUseCase;
  recordPlayerCreditUseCase: RecordPlayerCreditUseCase;
  getPlayerStatementUseCase: GetPlayerStatementUseCase;
  getMatchFinancialSummaryUseCase: GetMatchFinancialSummaryUseCase;
  getAllPlayersFinancialOverviewUseCase: GetAllPlayersFinancialOverviewUseCase;
  recordOperatingExpenseUseCase: RecordOperatingExpenseUseCase;
  getAllOperatingExpensesUseCase: GetAllOperatingExpensesUseCase;
  deleteOperatingExpenseUseCase: DeleteOperatingExpenseUseCase;
  processReceiptOcrUseCase: ProcessReceiptOcrUseCase;
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
  checkAndNotifyCapacityReachedUseCase: CheckAndNotifyCapacityReachedUseCase;
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
  let operatingExpenseRepository: IOperatingExpenseRepository;
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
      operatingExpenseRepository = new SupabaseOperatingExpenseRepository(client);
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
      operatingExpenseRepository = new InMemoryOperatingExpenseRepository();
      goalRepository = new InMemoryGoalRepository(initialGoals);
      authService = new InMemoryAuthService(initialPlayers);
      notificationService = new InMemoryNotificationService(initialNotifications);
    }
  } else {
    matchRepository = new InMemoryMatchRepository(initialMatches);
    playerRepository = new InMemoryPlayerRepository(initialPlayers);
    attendanceRepository = new InMemoryAttendanceRepository(initialAttendances);
    financeRepository = new InMemoryFinanceRepository();
    operatingExpenseRepository = new InMemoryOperatingExpenseRepository();
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
  const updateMatchUseCase = new UpdateMatchUseCase(matchRepository, attendanceRepository);
  const reconcileMatchAttendancesUseCase = new ReconcileMatchAttendancesUseCase(
    matchRepository,
    attendanceRepository
  );
  const deleteMatchUseCase = new DeleteMatchUseCase(matchRepository, attendanceRepository);
  const openMatchRegistrationUseCase = new OpenMatchRegistrationUseCase(matchRepository);
  const registerAttendanceUseCase = new RegisterAttendanceUseCase(
    matchRepository,
    attendanceRepository,
    playerRepository
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
    financeRepository,
    operatingExpenseRepository
  );

  const recordOperatingExpenseUseCase = new RecordOperatingExpenseUseCase(operatingExpenseRepository);
  const getAllOperatingExpensesUseCase = new GetAllOperatingExpensesUseCase(operatingExpenseRepository);
  const deleteOperatingExpenseUseCase = new DeleteOperatingExpenseUseCase(operatingExpenseRepository);
  const processReceiptOcrUseCase = new ProcessReceiptOcrUseCase();

  const recordGoalEventUseCase = new RecordGoalEventUseCase(matchRepository, goalRepository);
  const getTopScorersUseCase = new GetTopScorersUseCase(goalRepository, attendanceRepository);
  const getPlayerStatsUseCaseInst = new GetPlayerStatsUseCase(
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

  const notificationGateway = new WhatsAppNotificationGateway();
  const checkAndNotifyCapacityReachedUseCase = new CheckAndNotifyCapacityReachedUseCase(
    matchRepository,
    attendanceRepository,
    playerRepository,
    notificationGateway,
    notificationService
  );

  return {
    dataSource: activeDataSource,
    matchRepository,
    playerRepository,
    attendanceRepository,
    financeRepository,
    operatingExpenseRepository,
    goalRepository,
    authService,
    notificationService,
    notificationGateway,
    createPlayerUseCase,
    settleMatchUseCase,
    calculateMatchFeeUseCase,
    createMatchUseCase,
    updateMatchUseCase,
    reconcileMatchAttendancesUseCase,
    deleteMatchUseCase,
    openMatchRegistrationUseCase,
    registerAttendanceUseCase,
    cancelAttendanceUseCase,
    checkinAttendanceUseCase,
    recordPlayerCreditUseCase,
    getPlayerStatementUseCase,
    getMatchFinancialSummaryUseCase,
    getAllPlayersFinancialOverviewUseCase,
    recordOperatingExpenseUseCase,
    getAllOperatingExpensesUseCase,
    deleteOperatingExpenseUseCase,
    processReceiptOcrUseCase,
    recordGoalEventUseCase,
    getTopScorersUseCase,
    getPlayerStatsUseCase: getPlayerStatsUseCaseInst,
    assignMatchMvpUseCase,
    getLeaderboardOverviewUseCase,
    sendMatchConvocationUseCase,
    sendSettlementAlertsUseCase,
    sendDebtReminderUseCase,
    getNotificationsLogUseCase,
    switchSessionUserUseCase,
    checkAndNotifyCapacityReachedUseCase,
  };
}

export const container: DIContainer = createContainer();

export const {
  dataSource,
  matchRepository,
  playerRepository,
  attendanceRepository,
  financeRepository,
  operatingExpenseRepository,
  goalRepository,
  authService,
  notificationService,
  notificationGateway,
  createPlayerUseCase,
  settleMatchUseCase,
  calculateMatchFeeUseCase,
  createMatchUseCase,
  updateMatchUseCase,
  reconcileMatchAttendancesUseCase,
  deleteMatchUseCase,
  openMatchRegistrationUseCase,
  registerAttendanceUseCase,
  cancelAttendanceUseCase,
  checkinAttendanceUseCase,
  recordPlayerCreditUseCase,
  getPlayerStatementUseCase,
  getMatchFinancialSummaryUseCase,
  getAllPlayersFinancialOverviewUseCase,
  recordOperatingExpenseUseCase,
  getAllOperatingExpensesUseCase,
  deleteOperatingExpenseUseCase,
  processReceiptOcrUseCase,
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
  checkAndNotifyCapacityReachedUseCase,
} = container;



