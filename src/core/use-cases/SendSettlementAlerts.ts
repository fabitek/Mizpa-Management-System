import type { NotificationMessage } from '../domain/types.ts';
import type {
  IMatchRepository,
  IAttendanceRepository,
  IFinanceRepository,
  INotificationService,
} from '../domain/repositories.ts';
import { MatchNotFoundError, InvalidAttendanceStateError } from '../domain/exceptions.ts';

export class SendSettlementAlertsUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly financeRepository: IFinanceRepository;
  private readonly notificationService: INotificationService;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository,
    financeRepository: IFinanceRepository,
    notificationService: INotificationService
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
    this.financeRepository = financeRepository;
    this.notificationService = notificationService;
  }

  async execute(matchId: string): Promise<NotificationMessage[]> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID ${matchId} does not exist.`);
    }

    if (match.status !== 'SETTLED' || match.settledFeePerPlayer === null) {
      throw new InvalidAttendanceStateError(
        'Cannot send settlement alerts for a match that is not yet settled.'
      );
    }

    const attendances = await this.attendanceRepository.findByMatchId(matchId);
    const attended = attendances.filter((a) => a.status === 'ATTENDED');

    const notifications: NotificationMessage[] = [];

    for (const att of attended) {
      // If guest, charge host
      const payerId = att.registeredByPlayerId ?? att.playerId;
      const balance = await this.financeRepository.getPlayerBalance(payerId);
      const isSolvent = balance >= 0;

      const title = `⚽ Cuota de Partido: $${match.settledFeePerPlayer.toLocaleString('es-CO')} COP`;
      const content =
        `⚽ *CUOTA DE PARTIDO • MIZPA FC* ⚽\n\n` +
        `📍 *Cancha:* ${match.location}\n` +
        `💵 *Cuota:* $${match.settledFeePerPlayer.toLocaleString('es-CO')} COP\n` +
        `📊 *Saldo en Billetera:* $${balance.toLocaleString('es-CO')} COP (${isSolvent ? '✅ Al día' : '🔴 Pendiente'})\n\n` +
        `🔗 *Paga o sube tu comprobante aquí:*\n` +
        `👉 https://mizpa-fc.vercel.app/pago?player=${payerId}\n\n` +
        `📱 *Nequi / Daviplata:* 312 357 8415 (Cesar Tellez)`;

      const notif = await this.notificationService.sendNotification({
        recipientPlayerId: payerId,
        channel: 'WHATSAPP',
        type: 'MATCH_SETTLED_FEE',
        title,
        content,
        actionUrl: `/wallet`,
        sentAt: new Date(),
      });

      notifications.push(notif);
    }

    return notifications;
  }
}
