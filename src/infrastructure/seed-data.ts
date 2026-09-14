import type { Match, Player, Attendance, GoalEvent, NotificationMessage } from '../core/domain/index.ts';

export const initialPlayers: Player[] = [
  {
    id: 'f0000000-0000-4000-8000-000000000001',
    fullName: 'Fabián Téllez',
    email: 'fabian.tellez@gmail.com',
    phone: '+573000000000',
    alias: 'Admin',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

export const initialMatches: Match[] = [];
export const initialMatch: Match | null = null;

export const initialAttendances: Attendance[] = [];

export const initialGoals: GoalEvent[] = [];

export const initialNotifications: NotificationMessage[] = [];
