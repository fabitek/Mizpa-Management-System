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
  {
    id: 'p-02',
    fullName: 'Mario Yepes',
    email: 'mario@mizpa.com',
    phone: '+573002223344',
    role: 'CAPTAIN',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'p-03',
    fullName: 'Radamel Falcao',
    email: 'falcao@mizpa.com',
    phone: '+573003334455',
    role: 'PLAYER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'p-04',
    fullName: 'James Rodriguez',
    email: 'james@mizpa.com',
    phone: '+573004445566',
    role: 'PLAYER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'p-05',
    fullName: 'Juan Cuadrado',
    email: 'cuadrado@mizpa.com',
    phone: '+573005556677',
    role: 'PLAYER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'p-06',
    fullName: 'David Ospina',
    email: 'ospina@mizpa.com',
    phone: '+573006667788',
    role: 'PLAYER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'p-07',
    fullName: 'Luis Diaz',
    email: 'lucho@mizpa.com',
    phone: '+573007778899',
    role: 'PLAYER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'p-08',
    fullName: 'Carlos Valderrama',
    email: 'pibe@mizpa.com',
    phone: '+573008889900',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

export const initialMatch: Match = {
  id: '39d4c9cc-af7e-407a-adae-a521ec2e728f',
  date: new Date('2026-11-10T20:00:00-05:00'),
  location: 'Cancha Abedules de Santa Fe (Bogotá)',
  locationAddress: 'Cra. 20 #185-58',
  googleMapsUrl: 'https://maps.google.com/?q=Cra.+20+%23185-58,+Bogota',
  pitchRentalCost: 100000,
  extraCosts: 0,
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
    matchId: '39d4c9cc-af7e-407a-adae-a521ec2e728f',
    playerId: 'f0000000-0000-4000-8000-000000000001',
    status: 'CONFIRMED',
    registeredAt: new Date(),
  },
];

export const initialGoals: GoalEvent[] = [];

export const initialNotifications: NotificationMessage[] = [];
