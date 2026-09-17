import type { NotificationMessage } from '../domain/types.ts';
import type { IFinanceRepository, INotificationService } from '../domain/repositories.ts';

export class SendDebtReminderUseCase {
  private readonly financeRepository: IFinanceRepository;
  private readonly notificationService: INotificationService;

  constructor(
    financeRepository: IFinanceRepository,
    notificationService: INotificationService
  ) {
    this.financeRepository = financeRepository;
    this.notificationService = notificationService;
  }

  async execute(playerId: string): Promise<NotificationMessage | null> {
    const balance = await this.financeRepository.getPlayerBalance(playerId);

    // If player is solvent, no debt reminder needed
    if (balance >= 0) {
      return null;
    }

    const debtAmount = Math.abs(balance);
    const title = `⚠️ Estado de Cuenta: $${debtAmount.toLocaleString('es-CO')} COP`;
    const content =
      `⚠️ *ESTADO DE CUENTA • MIZPA FC* ⚽\n\n` +
      `Hola! Registras un saldo pendiente de *$${debtAmount.toLocaleString('es-CO')} COP* de partidos anteriores.\n\n` +
      `🔗 *Paga o sube tu comprobante aquí:*\n` +
      `👉 https://mizpa-fc.vercel.app/pago?player=${playerId}\n\n` +
      `📱 *Nequi / Daviplata:* 312 357 8415 (Cesar Tellez)\n\n` +
      `_Porfa ponte al día para poder hacer el pago de la reserva del próximo partido._`;

    return await this.notificationService.sendNotification({
      recipientPlayerId: playerId,
      channel: 'WHATSAPP',
      type: 'DEBT_REMINDER',
      title,
      content,
      actionUrl: `/wallet`,
      sentAt: new Date(),
    });
  }
}
