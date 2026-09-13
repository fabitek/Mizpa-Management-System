import type { NotificationMessage } from '../domain/types.ts';
import type { INotificationService } from '../domain/repositories.ts';

export class GetNotificationsLogUseCase {
  private readonly notificationService: INotificationService;

  constructor(notificationService: INotificationService) {
    this.notificationService = notificationService;
  }

  async execute(): Promise<NotificationMessage[]> {
    return await this.notificationService.getAll();
  }
}
