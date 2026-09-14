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

export const initialMatch: Match = {
  id: 'm1000000-0000-4000-8000-000000000001',
  date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  location: 'Cancha Sintética El Campín (Bogotá)',
  locationAddress: 'Calle 53 # 30-15',
  googleMapsUrl: 'https://maps.google.com',
  pitchRentalCost: 180000,
  extraCosts: 20000,
  durationHours: 2,
  parkingFeePerHour: 1000,
  maxPlayers: 18,
  settledFeePerPlayer: null,
  status: 'OPEN_REGISTRATION',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const initialMatches: Match[] = [initialMatch];

export const initialAttendances: Attendance[] = [
  {
    id: 'att-00000000-0000-4000-8000-000000000001',
    matchId: initialMatch.id,
    playerId: 'f0000000-0000-4000-8000-000000000001',
    status: 'CONFIRMED',
    registeredAt: new Date(),
  },
];

export const initialGoals: GoalEvent[] = [];

export const initialNotifications: NotificationMessage[] = [];
