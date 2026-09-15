import type {
  INotificationGateway,
  WhatsAppGroupMessagePayload,
  SecurityGateRosterPayload,
  NotificationGatewayResult,
} from '../../../core/domain/index.ts';

export interface WhatsAppGatewayConfig {
  provider?: 'meta' | 'twilio' | 'webhook' | 'simulation';
  metaToken?: string;
  metaPhoneNumberId?: string;
  metaDefaultGroupRecipient?: string;
  metaDefaultGateRecipient?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

/**
 * Production Infrastructure Adapter for WhatsApp Notification Gateway.
 * Supports Meta Cloud API, Twilio WhatsApp, Webhook Bridges (Baileys/WPPConnect),
 * and zero-credential simulation mode with complete telemetry.
 */
export class WhatsAppNotificationGateway implements INotificationGateway {
  private config: WhatsAppGatewayConfig;

  constructor(config: WhatsAppGatewayConfig = {}) {
    this.config = {
      provider:
        config.provider ||
        (process.env.WHATSAPP_PROVIDER as 'meta' | 'twilio' | 'webhook' | 'simulation') ||
        (process.env.WHATSAPP_TOKEN ? 'meta' : process.env.TWILIO_AUTH_TOKEN ? 'twilio' : process.env.WHATSAPP_WEBHOOK_URL ? 'webhook' : 'simulation'),
      metaToken: config.metaToken || process.env.WHATSAPP_TOKEN,
      metaPhoneNumberId: config.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID,
      metaDefaultGroupRecipient: config.metaDefaultGroupRecipient || process.env.WHATSAPP_GROUP_JID || process.env.WHATSAPP_GROUP_RECIPIENT,
      metaDefaultGateRecipient: config.metaDefaultGateRecipient || process.env.WHATSAPP_GATE_RECIPIENT || process.env.ADMIN_PHONE || '+573000000000',
      twilioAccountSid: config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      twilioFromNumber: config.twilioFromNumber || process.env.TWILIO_WHATSAPP_FROM,
      webhookUrl: config.webhookUrl || process.env.WHATSAPP_WEBHOOK_URL,
      webhookSecret: config.webhookSecret || process.env.WHATSAPP_WEBHOOK_SECRET,
    };
  }

  async sendWhatsAppGroupMessage(
    payload: WhatsAppGroupMessagePayload,
    formattedText: string
  ): Promise<NotificationGatewayResult> {
    const recipient = payload.recipient || this.config.metaDefaultGroupRecipient || 'GROUP_BROADCAST';
    return this.dispatchMessage('group', recipient, formattedText, {
      matchId: payload.matchId,
      matchLocation: payload.matchLocation,
      confirmedCount: payload.confirmedCount,
    });
  }

  async sendSecurityGateRoster(
    payload: SecurityGateRosterPayload,
    formattedText: string
  ): Promise<NotificationGatewayResult> {
    const recipient = payload.recipient || this.config.metaDefaultGateRecipient || 'GATE_VIGILANCE';
    return this.dispatchMessage('gate', recipient, formattedText, {
      matchId: payload.matchId,
      matchLocation: payload.matchLocation,
      confirmedCount: payload.confirmedCount,
    });
  }

  private async dispatchMessage(
    channelType: 'group' | 'gate',
    recipient: string,
    messageText: string,
    metadata: Record<string, unknown>
  ): Promise<NotificationGatewayResult> {
    const timestamp = new Date();
    const provider = this.config.provider || 'simulation';

    // 1. Meta Cloud API
    if (provider === 'meta' && this.config.metaToken && this.config.metaPhoneNumberId) {
      try {
        const cleanRecipient = recipient.replace(/[^0-9]/g, '');
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${this.config.metaPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.metaToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanRecipient,
              type: 'text',
              text: { body: messageText },
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message || `Meta API Error (${response.status})`);
        }

        return {
          success: true,
          messageId: data?.messages?.[0]?.id || `meta-${Date.now()}`,
          provider: 'meta-cloud-api',
          recipient,
          timestamp,
        };
      } catch (err: any) {
        console.warn(`[WhatsAppGateway:Meta] Dispatch warning (${channelType}):`, err.message);
        return {
          success: false,
          error: err.message,
          provider: 'meta-cloud-api',
          recipient,
          timestamp,
        };
      }
    }

    // 2. Twilio WhatsApp API
    if (provider === 'twilio' && this.config.twilioAccountSid && this.config.twilioAuthToken) {
      try {
        const cleanRecipient = recipient.startsWith('+') ? recipient : `+${recipient.replace(/[^0-9]/g, '')}`;
        const from = this.config.twilioFromNumber?.startsWith('whatsapp:')
          ? this.config.twilioFromNumber
          : `whatsapp:${this.config.twilioFromNumber || '+14155238886'}`;

        const authHeader = Buffer.from(
          `${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`
        ).toString('base64');

        const params = new URLSearchParams();
        params.append('From', from);
        params.append('To', `whatsapp:${cleanRecipient}`);
        params.append('Body', messageText);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || `Twilio Error (${response.status})`);
        }

        return {
          success: true,
          messageId: data?.sid || `twilio-${Date.now()}`,
          provider: 'twilio-whatsapp',
          recipient,
          timestamp,
        };
      } catch (err: any) {
        console.warn(`[WhatsAppGateway:Twilio] Dispatch warning (${channelType}):`, err.message);
        return {
          success: false,
          error: err.message,
          provider: 'twilio-whatsapp',
          recipient,
          timestamp,
        };
      }
    }

    // 3. Webhook / WPPConnect / Baileys Bridge API
    if (provider === 'webhook' && this.config.webhookUrl) {
      try {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.webhookSecret ? { 'x-webhook-secret': this.config.webhookSecret } : {}),
          },
          body: JSON.stringify({
            channelType,
            recipient,
            message: messageText,
            metadata,
            timestamp: timestamp.toISOString(),
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(`Webhook Error (${response.status})`);
        }

        return {
          success: true,
          messageId: data?.id || `webhook-${Date.now()}`,
          provider: 'webhook-bridge',
          recipient,
          timestamp,
        };
      } catch (err: any) {
        console.warn(`[WhatsAppGateway:Webhook] Dispatch warning (${channelType}):`, err.message);
        return {
          success: false,
          error: err.message,
          provider: 'webhook-bridge',
          recipient,
          timestamp,
        };
      }
    }

    // 4. Fallback / Simulation Mode (Always reliable for local development and demos)
    console.info(
      `📢 [WhatsAppGateway:Simulated] Dispatched ${channelType.toUpperCase()} message to '${recipient}':\n` +
      `----------------------------------------\n` +
      `${messageText}\n` +
      `----------------------------------------`
    );

    return {
      success: true,
      messageId: `sim-${channelType}-${crypto.randomUUID()}`,
      provider: 'simulation',
      recipient,
      timestamp,
    };
  }
}
