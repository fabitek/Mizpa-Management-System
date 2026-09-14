export type MatchStatus =
  | 'DRAFT'
  | 'OPEN_REGISTRATION'
  | 'PLAYED'
  | 'SETTLED'
  | 'CANCELLED';

export type AttendanceStatus =
  | 'CONFIRMED'
  | 'WAITLIST'
  | 'CANCELLED'
  | 'ATTENDED';

export type FinancialEntryType = 'DEBIT' | 'CREDIT';

export type GoalType = 'OPEN_PLAY' | 'PENALTY' | 'OWN_GOAL';

export interface Match {
  id: string;
  date: Date;
  location: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  pitchRentalCost: number;
  extraCosts: number;
  durationHours?: number;
  parkingFeePerHour?: number;
  maxPlayers: number;
  settledFeePerPlayer: number | null;
  status: MatchStatus;
  mvpPlayerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'ADMIN' | 'CAPTAIN' | 'PLAYER';

export interface Player {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  documentId?: string; // Cédula o Documento de Identidad
  alias?: string;
  role?: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface Attendance {
  id: string;
  matchId: string;
  playerId: string;
  status: AttendanceStatus;
  registeredAt: Date;
  registeredByPlayerId?: string;
  guestName?: string;
  hasVehicle?: boolean;
  vehiclePlate?: string;
}

export interface FinancialEntry {
  id: string;
  playerId: string;
  matchId?: string | null;
  type: FinancialEntryType;
  amount: number;
  referenceDate: Date;
  receiptUrl?: string;
  note?: string;
  createdAt: Date;
}

export interface GoalEvent {
  id: string;
  matchId: string;
  playerId: string;
  minute?: number;
  type: GoalType;
  createdAt?: Date;
}

export type BadgeCode =
  | 'PICHICHI'
  | 'IRON_MAN'
  | 'HAT_TRICK_HERO'
  | 'FIEL_MIZPA'
  | 'FAIR_PLAY_SOLVENT';

export interface PlayerBadge {
  code: BadgeCode;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface PlayerPerformanceStats {
  playerId: string;
  matchesPlayed: number;
  goalsCount: number;
  ownGoalsCount: number;
  goalsBreakdown: {
    openPlay: number;
    penalty: number;
    ownGoal: number;
  };
  goalsPerMatchRatio: number;
  currentAttendanceStreak: number;
  bestAttendanceStreak: number;
  mvpCount: number;
  badges: PlayerBadge[];
}

export interface TopScorerEntry {
  playerId: string;
  goals: number;
  matchesPlayed: number;
  ratio: number;
  penalties: number;
  openPlayGoals: number;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
    playerId: string;
    fullName: string;
  };
}

export type NotificationChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP';

export type NotificationType =
  | 'MATCH_CONVOCATION'
  | 'RSVP_CONFIRMATION'
  | 'WAITLIST_PROMOTION'
  | 'MATCH_SETTLED_FEE'
  | 'DEBT_REMINDER';

export interface NotificationMessage {
  id: string;
  recipientPlayerId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  content: string;
  actionUrl?: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: Date;
  createdAt: Date;
}
