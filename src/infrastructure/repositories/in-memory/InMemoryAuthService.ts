import type { IAuthService, AuthSession, UserRole, Player } from '../../../core/domain/index.ts';
import { initialPlayers } from '../../seed-data.ts';

export class InMemoryAuthService implements IAuthService {
  private currentSession: AuthSession;
  private players: Player[];

  constructor(players: Player[] = initialPlayers) {
    this.players = players;
    // Default to the first player (Admin)
    const admin = players[0] ?? {
      id: 'f0000000-0000-4000-8000-000000000001',
      fullName: 'Fabián Téllez',
      email: 'fabian.tellez@gmail.com',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
    };

    this.currentSession = {
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role ?? 'ADMIN',
        playerId: admin.id,
        fullName: admin.fullName,
      },
    };
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return { ...this.currentSession };
  }

  async switchUser(playerId: string): Promise<AuthSession> {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player with ID '${playerId}' not found.`);
    }

    this.currentSession = {
      user: {
        id: player.id,
        email: player.email,
        role: player.role ?? 'PLAYER',
        playerId: player.id,
        fullName: player.fullName,
      },
    };

    return { ...this.currentSession };
  }

  checkPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    if (requiredRole === 'PLAYER') return true;
    if (requiredRole === 'CAPTAIN') return userRole === 'ADMIN' || userRole === 'CAPTAIN';
    if (requiredRole === 'ADMIN') return userRole === 'ADMIN';
    return false;
  }
}
