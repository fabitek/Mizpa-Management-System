import type {
  INotificationGateway,
  WhatsAppGroupMessagePayload,
  SecurityGateRosterPayload,
  NotificationGatewayResult,
} from '../../../core/domain/index.ts';

export interface DispatchedGroupMessage {
  payload: WhatsAppGroupMessagePayload;
  formattedText: string;
  timestamp: Date;
}

export interface DispatchedGateMessage {
  payload: SecurityGateRosterPayload;
  formattedText: string;
  timestamp: Date;
}

/**
 * In-Memory Adapter for INotificationGateway.
 * Used for fast, zero-dependency unit testing and local development.
 */
export class InMemoryNotificationGateway implements INotificationGateway {
  private sentGroupMessages: DispatchedGroupMessage[] = [];
  private sentGateMessages: DispatchedGateMessage[] = [];

  async sendWhatsAppGroupMessage(
    payload: WhatsAppGroupMessagePayload,
    formattedText: string
  ): Promise<NotificationGatewayResult> {
    const timestamp = new Date();
    this.sentGroupMessages.push({
      payload: { ...payload },
      formattedText,
      timestamp,
    });

    return {
      success: true,
      messageId: `wa-group-${crypto.randomUUID()}`,
      provider: 'in-memory-whatsapp',
      recipient: payload.recipient || 'GROUP',
      timestamp,
    };
  }

  async sendSecurityGateRoster(
    payload: SecurityGateRosterPayload,
    formattedText: string
  ): Promise<NotificationGatewayResult> {
    const timestamp = new Date();
    this.sentGateMessages.push({
      payload: { ...payload },
      formattedText,
      timestamp,
    });

    return {
      success: true,
      messageId: `gate-roster-${crypto.randomUUID()}`,
      provider: 'in-memory-security-gate',
      recipient: payload.recipient || 'GATE_VIGILANCE',
      timestamp,
    };
  }

  // Inspection helpers for unit & integration testing
  getSentGroupMessages(): DispatchedGroupMessage[] {
    return [...this.sentGroupMessages];
  }

  getSentGateMessages(): DispatchedGateMessage[] {
    return [...this.sentGateMessages];
  }

  clear(): void {
    this.sentGroupMessages = [];
    this.sentGateMessages = [];
  }
}
