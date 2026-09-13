import type { AuthSession } from '../domain/types.ts';
import type { IAuthService } from '../domain/repositories.ts';

export class SwitchSessionUserUseCase {
  private readonly authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
  }

  async execute(playerId: string): Promise<AuthSession> {
    return await this.authService.switchUser(playerId);
  }
}
