import type { Match, Player, Attendance, GoalEvent, NotificationMessage } from '../core/domain/index.ts';

export const initialPlayers: Player[] = [
  { id: 'player-1', fullName: 'Carlos Valderrama', email: 'pibe@mizpa.com', phone: '+573001234567', alias: 'El Pibe', role: 'ADMIN', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-2', fullName: 'Faustino Asprilla', email: 'tino@mizpa.com', phone: '+573002345678', alias: 'El Tino', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-3', fullName: 'Radamel Falcao', email: 'tigre@mizpa.com', phone: '+573187654321', alias: 'El Tigre', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-4', fullName: 'James Rodríguez', email: 'james@mizpa.com', phone: '+573004567890', alias: 'El 10', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-5', fullName: 'Juan Cuadrado', email: 'cuadrado@mizpa.com', phone: '+573005678901', alias: 'Neco', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-6', fullName: 'David Ospina', email: 'ospina@mizpa.com', phone: '+573006789012', alias: 'San David', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-7', fullName: 'Mario Yepes', email: 'yepes@mizpa.com', phone: '+573109876543', alias: 'El Mariscal', role: 'CAPTAIN', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-8', fullName: 'Luis Díaz', email: 'lucho@mizpa.com', phone: '+573201112233', alias: 'Luchito', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-9', fullName: 'Freddy Rincón', email: 'rincon@mizpa.com', phone: '+573008901234', alias: 'El Coloso', role: 'PLAYER', isActive: true, createdAt: new Date('2026-01-01') },
  { id: 'player-10', fullName: 'Iván Córdoba', email: 'cordoba@mizpa.com', phone: '+573155554321', alias: 'El Capitán', role: 'CAPTAIN', isActive: true, createdAt: new Date('2026-01-01') },
];

export const initialMatch: Match = {
  id: 'match-campin-5',
  date: new Date('2026-09-15T19:00:00.000Z'),
  location: 'Cancha El Campín 5',
  locationAddress: 'Cra. 30 #57-60, Bogotá',
  googleMapsUrl: 'https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic',
  pitchRentalCost: 120000,
  extraCosts: 20000,
  maxPlayers: 18,
  settledFeePerPlayer: null,
  status: 'OPEN_REGISTRATION',
  mvpPlayerId: 'player-3',
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
};

export const initialAttendances: Attendance[] = initialPlayers.slice(0, 4).map((player, idx) => ({
  id: `att-${initialMatch.id}-${player.id}`,
  matchId: initialMatch.id,
  playerId: player.id,
  status: 'CONFIRMED',
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

export const initialNotifications: NotificationMessage[] = [
  {
    id: 'notif-1',
    recipientPlayerId: 'player-3',
    recipientPhone: '+573187654321',
    channel: 'WHATSAPP',
    type: 'MATCH_CONVOCATION',
    title: '⚽ Convocatoria Partido: Cancha El Campín 5',
    content: '⚽ *¡CONVOCATORIA MIZPA FC!*\n\n📍 *Cancha:* Cancha El Campín 5\n👥 *Cupo:* 10 jugadores\n💵 *Cuota Estimada:* $14,000 COP\n\n🔗 Confirma tu asistencia en la app.',
    actionUrl: '/matches',
    status: 'SENT',
    sentAt: new Date('2026-09-10T10:00:00Z'),
    createdAt: new Date('2026-09-10T10:00:00Z'),
  },
  {
    id: 'notif-2',
    recipientPlayerId: 'player-8',
    recipientPhone: '+573201112233',
    channel: 'WHATSAPP',
    type: 'MATCH_SETTLED_FEE',
    title: '💰 Liquidación Cuota: $14,000 COP',
    content: '💰 *LIQUIDACIÓN DE PARTIDO - MIZPA FC*\n\n📍 *Cancha:* Cancha El Campín 5\n💵 *Cuota Congelada:* $14,000 COP\n📊 *Tu Saldo en Billetera:* $0 COP (Al día ✅)',
    actionUrl: '/wallet',
    status: 'SENT',
    sentAt: new Date('2026-09-11T12:00:00Z'),
    createdAt: new Date('2026-09-11T12:00:00Z'),
  },
];
