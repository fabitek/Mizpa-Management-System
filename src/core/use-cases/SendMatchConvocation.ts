import type { NotificationMessage } from '../domain/types.ts';
import type {
  IMatchRepository,
  INotificationService,
} from '../domain/repositories.ts';
import { MatchNotFoundError, InvalidAttendanceStateError } from '../domain/exceptions.ts';

export interface SendMatchConvocationDTO {
  matchId: string;
  recipientPlayerId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  baseUrl?: string;
}

export class SendMatchConvocationUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly notificationService: INotificationService;

  constructor(
    matchRepository: IMatchRepository,
    notificationService: INotificationService
  ) {
    this.matchRepository = matchRepository;
    this.notificationService = notificationService;
  }

  async execute(dto: SendMatchConvocationDTO): Promise<NotificationMessage> {
    const match = await this.matchRepository.findById(dto.matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID ${dto.matchId} does not exist.`);
    }

    if (match.status !== 'OPEN_REGISTRATION' && match.status !== 'DRAFT') {
      throw new InvalidAttendanceStateError(
        'Cannot send convocation for a match that is not open for registration.'
      );
    }

    const formattedDate = new Date(match.date).toLocaleString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const estFee = Math.ceil(
      (match.pitchRentalCost + match.extraCosts) / (match.maxPlayers || 18)
    );

    const actionUrl = `/rsvp/${match.id}`;
    const base = (dto.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://mizpa-fc.vercel.app').replace(/\/+$/, '');
    const fullRsvpUrl = `${base}${actionUrl}`;

    const mapsLine = match.googleMapsUrl
      ? `🗺️ *Mapa / Cómo llegar:* ${match.googleMapsUrl}\n`
      : '';

    const title = `⚽ Convocatoria Oficial: ${match.location}`;
    const content =
      `⚽ *¡CONVOCATORIA OFICIAL MIZPA FC!* ⚽\n\n` +
      `🔗 *INSCRÍBETE AQUÍ (FORMULARIO OFICIAL):*\n` +
      `👉 ${fullRsvpUrl}\n\n` +
      `📍 *Cancha:* ${match.location}${match.locationAddress ? ` (${match.locationAddress})` : ''}\n` +
      `📅 *Fecha:* ${formattedDate}\n` +
      `👥 *Cupo:* ${match.maxPlayers} jugadores (¡por orden de llegada!)\n` +
      `💵 *Cuota Estimada:* $${estFee.toLocaleString('es-CO')} COP\n` +
      (mapsLine ? `${mapsLine}` : '') +
      `\n📌 *Para tener en cuenta:*\n` +
      `👟 *Calzado:* Únicamente tenis o zapatillas para cancha sintética (sin taches / cero guayos).\n` +
      `🤝 *Ambiente:* Juego limpio, respeto y compañerismo.\n\n` +
      `¿Cómo confirmar tu cupo?\n` +
      `1️⃣ Haz clic en el enlace oficial de arriba:\n` +
      `🔗 ${fullRsvpUrl}\n` +
      `2️⃣ Selecciona tu nombre o regístrate con tu invitado (+1).\n\n` +
      `⚠️ *Nota:* Al llenarse los ${match.maxPlayers} cupos titulares, los siguientes registros ingresarán automáticamente a Lista de Espera.`;

    return await this.notificationService.sendNotification({
      recipientPlayerId: dto.recipientPlayerId || 'GROUP',
      recipientPhone: dto.recipientPhone,
      recipientEmail: dto.recipientEmail,
      channel: 'WHATSAPP',
      type: 'MATCH_CONVOCATION',
      title,
      content,
      actionUrl,
      sentAt: new Date(),
    });
  }
}
