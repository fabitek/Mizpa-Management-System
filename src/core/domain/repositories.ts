import type {
  Match,
  Player,
  Attendance,
  FinancialEntry,
  GoalEvent,
  AuthSession,
  UserRole,
  NotificationMessage,
} from './types.ts';

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByDocumentId(documentId: string): Promise<Player | null>;
  findAll(): Promise<Player[]>;
  save(player: Player): Promise<void>;
  update(player: Player): Promise<void>;
}

export interface IMatchRepository {
  findById(id: string): Promise<Match | null>;
  findAll(): Promise<Match[]>;
  save(match: Match): Promise<void>;
  update(match: Match): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAttendanceRepository {
  findById(id: string): Promise<Attendance | null>;
  findByMatchId(matchId: string): Promise<Attendance[]>;
  findByPlayerId(playerId: string): Promise<Attendance[]>;
  findAll(): Promise<Attendance[]>;
  save(attendance: Attendance): Promise<void>;
  update(attendance: Attendance): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByMatchId(matchId: string): Promise<void>;
}

export interface IFinanceRepository {
  recordEntry(entry: FinancialEntry): Promise<void>;
  recordBatchEntries(entries: FinancialEntry[]): Promise<void>;
  getEntriesByPlayerId(playerId: string): Promise<FinancialEntry[]>;
  getEntriesByMatchId(matchId: string): Promise<FinancialEntry[]>;
  getAllEntries(): Promise<FinancialEntry[]>;
  getPlayerBalance(playerId: string): Promise<number>;
}

export interface IGoalRepository {
  recordGoal(goal: GoalEvent): Promise<void>;
  findByMatchId(matchId: string): Promise<GoalEvent[]>;
  findByPlayerId(playerId: string): Promise<GoalEvent[]>;
  getAll(): Promise<GoalEvent[]>;
  deleteGoal(id: string): Promise<void>;
}

export interface IAuthService {
  getCurrentSession(): Promise<AuthSession | null>;
  switchUser(playerId: string): Promise<AuthSession>;
  checkPermission(userRole: UserRole, requiredRole: UserRole): boolean;
}

export interface INotificationService {
  sendNotification(
    msg: Omit<NotificationMessage, 'id' | 'createdAt' | 'status'>
  ): Promise<NotificationMessage>;
  sendBatchNotifications(
    msgs: Omit<NotificationMessage, 'id' | 'createdAt' | 'status'>[]
  ): Promise<NotificationMessage[]>;
  findByPlayerId(playerId: string): Promise<NotificationMessage[]>;
  getAll(): Promise<NotificationMessage[]>;
  generateWhatsAppLink(phone: string, messageText: string): string;
}
