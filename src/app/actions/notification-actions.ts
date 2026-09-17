'use server';

import { revalidatePath } from 'next/cache';
import {
  sendMatchConvocationUseCase,
  sendSettlementAlertsUseCase,
  sendDebtReminderUseCase,
  getNotificationsLogUseCase,
  checkAndNotifyCapacityReachedUseCase,
  notificationService,
} from '../../infrastructure/container.ts';
import type { NotificationMessage, CheckAndNotifyCapacityResult } from '../../core/domain/types.ts';

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
      message: 'Convocatoria de grupo lista.',
      data: notif,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al enviar convocatoria.',
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
      message: 'Datos de convocatoria listos.',
      data: {
        messageText: notif.content,
        rsvpUrl: notif.actionUrl || `/rsvp/${matchId}`,
        whatsappShareUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo generar la convocatoria.',
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
      message: `${notifications.length} avisos de cobro preparados para WhatsApp.`,
      data: notifications,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al generar avisos de liquidación.',
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
        message: 'Jugador al día. Sin cobros pendientes.',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Recordatorio de pago listo.',
      data: reminder,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al generar recordatorio.',
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
      message: 'Historial de notificaciones cargado.',
      data: logs,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al cargar historial.',
    };
  }
}

export async function generateWhatsAppLinkAction(
  phone: string,
  messageText: string
): Promise<string> {
  return notificationService.generateWhatsAppLink(phone, messageText);
}

export async function checkAndNotifyCapacityReachedAction(
  matchId: string,
  force?: boolean,
  baseUrl?: string
): Promise<NotificationActionResult<CheckAndNotifyCapacityResult>> {
  try {
    const result = await checkAndNotifyCapacityReachedUseCase.execute({
      matchId,
      force,
      baseUrl,
    });

    if (result.triggered) {
      revalidatePath('/notifications');
      revalidatePath('/matches');
      revalidatePath(`/rsvp/${matchId}`);
    }

    const message = result.triggered
      ? 'Quórum de 10 alcanzado. Mensajes de grupo y portería listos.'
      : result.reason === 'ALREADY_SENT'
      ? 'Notificación de quórum ya emitida anteriormente.'
      : `${result.confirmedCount} confirmados (faltan ${Math.max(0, 10 - result.confirmedCount)} para quórum).`;

    return {
      success: true,
      message,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Error al validar quórum.',
    };
  }
}

