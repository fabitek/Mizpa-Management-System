import type { Match, Player, Attendance, GoalEvent } from '../core/domain/index.ts';

export const initialPlayers: Player[] = [
  { id: 'player-1', fullName: 'Carlos Valderrama', email: 'pibe@mizpa.com', alias: 'El Pibe', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-2', fullName: 'Faustino Asprilla', email: 'tino@mizpa.com', alias: 'El Tino', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-3', fullName: 'Radamel Falcao', email: 'tigre@mizpa.com', alias: 'El Tigre', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-4', fullName: 'James Rodríguez', email: 'james@mizpa.com', alias: 'El 10', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-5', fullName: 'Juan Cuadrado', email: 'cuadrado@mizpa.com', alias: 'Neco', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-6', fullName: 'David Ospina', email: 'ospina@mizpa.com', alias: 'San David', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-7', fullName: 'Mario Yepes', email: 'yepes@mizpa.com', alias: 'El Mariscal', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-8', fullName: 'Luis Díaz', email: 'lucho@mizpa.com', alias: 'Luchito', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-9', fullName: 'Freddy Rincón', email: 'rincon@mizpa.com', alias: 'El Coloso', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-10', fullName: 'Iván Córdoba', email: 'cordoba@mizpa.com', alias: 'El Capitán', isActive: true, createdAt: new Date('2026-01-01') },
];

export const initialMatch: Match = {
  id: 'match-campin-5',
  date: new Date('2026-09-15T19:00:00.000Z'),
  location: 'Cancha El Campín 5',
  pitchRentalCost: 120000,
  extraCosts: 20000,
  maxPlayers: 10,
  settledFeePerPlayer: null,
  status: 'OPEN_REGISTRATION',
  mvpPlayerId: 'player-3',
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
};

export const initialAttendances: Attendance[] = initialPlayers.map((player, idx) => ({
  id: `att-${initialMatch.id}-${player.id}`,
  matchId: initialMatch.id,
  playerId: player.id,
  status: 'ATTENDED',
  registeredAt: new Date(`2026-09-02T10:${String(idx).padStart(2, '0')}:00.000Z`),
}));

export const initialGoals: GoalEvent[] = [
  { id: 'goal-1', matchId: initialMatch.id, playerId: 'player-3', minute: 12, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:12:00Z') },
  { id: 'goal-2', matchId: initialMatch.id, playerId: 'player-3', minute: 28, type: 'PENALTY', createdAt: new Date('2026-09-15T19:28:00Z') },
  { id: 'goal-3', matchId: initialMatch.id, playerId: 'player-3', minute: 45, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:45:00Z') },
  { id: 'goal-4', matchId: initialMatch.id, playerId: 'player-3', minute: 58, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:58:00Z') },
  { id: 'goal-5', matchId: initialMatch.id, playerId: 'player-8', minute: 15, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:15:00Z') },
  { id: 'goal-6', matchId: initialMatch.id, playerId: 'player-8', minute: 32, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:32:00Z') },
  { id: 'goal-7', matchId: initialMatch.id, playerId: 'player-8', minute: 50, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:50:00Z') },
  { id: 'goal-8', matchId: initialMatch.id, playerId: 'player-2', minute: 22, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:22:00Z') },
  { id: 'goal-9', matchId: initialMatch.id, playerId: 'player-4', minute: 40, type: 'OPEN_PLAY', createdAt: new Date('2026-09-15T19:40:00Z') },
];
