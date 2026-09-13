import type {
  INotificationService,
  NotificationMessage,
} from '../../../core/domain/index.ts';

export class InMemoryNotificationService implements INotificationService {
  private notifications: NotificationMessage[];

  constructor(initialNotifications: NotificationMessage[] = []) {
    this.notifications = initialNotifications.map((n) => ({ ...n }));
  }

  async sendNotification(
    msg: Omit<NotificationMessage, 'id' | 'createdAt' | 'status'>
  ): Promise<NotificationMessage> {
    const notification: NotificationMessage = {
      ...msg,
      id: crypto.randomUUID(),
      status: 'SENT',
      createdAt: new Date(),
    };

    this.notifications.unshift(notification);
    return { ...notification };
  }

  async sendBatchNotifications(
    msgs: Omit<NotificationMessage, 'id' | 'createdAt' | 'status'>[]
  ): Promise<NotificationMessage[]> {
    const results: NotificationMessage[] = [];
    for (const msg of msgs) {
      const sent = await this.sendNotification(msg);
      results.push(sent);
    }
    return results;
  }

  async findByPlayerId(playerId: string): Promise<NotificationMessage[]> {
    return this.notifications
      .filter((n) => n.recipientPlayerId === playerId)
      .map((n) => ({ ...n }));
  }

  async getAll(): Promise<NotificationMessage[]> {
    return this.notifications.map((n) => ({ ...n }));
  }

  generateWhatsAppLink(phone: string, messageText: string): string {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(messageText);

    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }
}
