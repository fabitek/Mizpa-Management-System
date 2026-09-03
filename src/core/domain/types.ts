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
  pitchRentalCost: number;
  extraCosts: number;
  maxPlayers: number;
  settledFeePerPlayer: number | null;
  status: MatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  alias?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Attendance {
  id: string;
  matchId: string;
  playerId: string;
  status: AttendanceStatus;
  registeredAt: Date;
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
}
