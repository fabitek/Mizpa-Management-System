import type {
  WhatsAppGroupMessagePayload,
  SecurityGateRosterPayload,
  NotificationGatewayResult,
} from './types.ts';

/**
 * Clean Architecture Domain Port: NotificationGateway
 * Defines boundary interface for dispatching external notifications
 * (WhatsApp groups, SMS/Meta API, Security gate sheets, Webhooks).
 */
export interface INotificationGateway {
  /**
   * Dispatches the 10-player capacity confirmed message to the WhatsApp group.
   */
  sendWhatsAppGroupMessage(
    payload: WhatsAppGroupMessagePayload,
    formattedText: string
  ): Promise<NotificationGatewayResult>;

  /**
   * Dispatches the official security access control roster to the gate / complex guard.
   */
  sendSecurityGateRoster(
    payload: SecurityGateRosterPayload,
    formattedText: string
  ): Promise<NotificationGatewayResult>;
}
