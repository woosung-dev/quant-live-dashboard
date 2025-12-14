
export interface NotificationConfig {
  webhookUrl?: string;
  enableBrowserNotifications: boolean;
  enableWebhook: boolean;
}

export type NotificationType = 'buy' | 'sell' | 'info' | 'error';

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  updateConfig(newConfig: NotificationConfig) {
    this.config = newConfig;
  }

  async send(type: NotificationType, title: string, message: string) {
    const promises = [];

    if (this.config.enableBrowserNotifications) {
      promises.push(this.sendBrowserNotification(title, message));
    }

    if (this.config.enableWebhook && this.config.webhookUrl) {
      promises.push(this.sendWebhook(title, message, type));
    }

    await Promise.allSettled(promises);
  }

  private async sendBrowserNotification(title: string, body: string) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }

  private async sendWebhook(title: string, message: string, type: NotificationType) {
    if (!this.config.webhookUrl) return;

    try {
      // Discord/Slack compatible payload
      const payload = {
        content: `**${title}**\n${message}`,
        username: "Quant Live Bot",
      };

      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  static async requestPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}
