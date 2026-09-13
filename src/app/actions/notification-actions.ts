'use server';

import { revalidatePath } from 'next/cache';
import {
  sendMatchConvocationUseCase,
  sendSettlementAlertsUseCase,
  sendDebtReminderUseCase,
  getNotificationsLogUseCase,
  notificationService,
} from '../../infrastructure/container.ts';
import type { NotificationMessage } from '../../core/domain/types.ts';

export interface NotificationActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export async function sendMatchConvocationAction(
  matchId: string,
  recipientPlayerId?: string,
  baseUrl?: string,
  recipientPhone?: string
): Promise<NotificationActionResult<NotificationMessage>> {
  try {
    const notif = await sendMatchConvocationUseCase.execute({
      matchId,
      recipientPlayerId: recipientPlayerId || 'GROUP',
      recipientPhone,
      baseUrl,
    });

    revalidatePath('/notifications');
    revalidatePath('/matches');

    return {
      success: true,
      message: 'Convocatoria oficial para grupo generada y registrada exitosamente.',
      data: notif,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al enviar convocatoria.',
    };
  }
}

export async function getMatchConvocationDataAction(
  matchId: string,
  baseUrl?: string
): Promise<
  NotificationActionResult<{
    messageText: string;
    rsvpUrl: string;
    whatsappShareUrl: string;
  }>
> {
  try {
    const notif = await sendMatchConvocationUseCase.execute({
      matchId,
      recipientPlayerId: 'GROUP',
      baseUrl,
    });

    const whatsappShareUrl = notificationService.generateWhatsAppLink('', notif.content);

    return {
      success: true,
      message: 'Datos de convocatoria generados correctamente.',
      data: {
        messageText: notif.content,
        rsvpUrl: notif.actionUrl || `/rsvp/${matchId}`,
        whatsappShareUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al generar convocatoria.',
    };
  }
}

export async function sendSettlementAlertsAction(
  matchId: string
): Promise<NotificationActionResult<NotificationMessage[]>> {
  try {
    const notifications = await sendSettlementAlertsUseCase.execute(matchId);

    revalidatePath('/notifications');
    revalidatePath('/wallet');

    return {
      success: true,
      message: `Se emitieron ${notifications.length} alertas de cuota liquidada por WhatsApp.`,
      data: notifications,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al enviar alertas de liquidación.',
    };
  }
}

export async function sendDebtReminderAction(
  playerId: string
): Promise<NotificationActionResult<NotificationMessage | null>> {
  try {
    const reminder = await sendDebtReminderUseCase.execute(playerId);

    revalidatePath('/notifications');
    revalidatePath('/wallet');

    if (!reminder) {
      return {
        success: true,
        message: 'El jugador se encuentra al día (solvente); no requiere recordatorio de cobro.',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Recordatorio de pago generado exitosamente.',
      data: reminder,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al enviar recordatorio de cartera.',
    };
  }
}

export async function getNotificationsLogAction(): Promise<
  NotificationActionResult<NotificationMessage[]>
> {
  try {
    const logs = await getNotificationsLogUseCase.execute();
    return {
      success: true,
      message: 'Historial de notificaciones obtenido exitosamente.',
      data: logs,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener historial.',
    };
  }
}

export async function generateWhatsAppLinkAction(
  phone: string,
  messageText: string
): Promise<string> {
  return notificationService.generateWhatsAppLink(phone, messageText);
}
