import fs from "fs";
import path from "path";
import type {
  NotificationSettings,
  NotificationPayload,
  TelegramConfig,
  WhatsAppConfig,
  WebhookConfig
} from "@difm/shared";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@difm/shared";

export class NotificationService {
  private configPath: string;
  private settings: NotificationSettings;

  constructor(dataDir?: string) {
    const dir = dataDir || path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.configPath = path.join(dir, "notification_settings.json");
    this.settings = this.loadSettings();
  }

  private loadSettings(): NotificationSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn("Failed to load notification settings from disk:", e);
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  public getSettings(): NotificationSettings {
    return this.settings;
  }

  public saveSettings(newSettings: Partial<NotificationSettings>): NotificationSettings {
    this.settings = {
      ...this.settings,
      ...newSettings,
      telegram: { ...this.settings.telegram, ...newSettings.telegram },
      whatsapp: { ...this.settings.whatsapp, ...newSettings.whatsapp },
      webhook: { ...this.settings.webhook, ...newSettings.webhook },
      events: { ...this.settings.events, ...newSettings.events }
    };
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save notification settings to disk:", e);
    }
    return this.settings;
  }

  public async dispatch(payload: NotificationPayload): Promise<{
    telegram?: { success: boolean; error?: string };
    whatsapp?: { success: boolean; error?: string };
    webhook?: { success: boolean; error?: string };
  }> {
    const results: {
      telegram?: { success: boolean; error?: string };
      whatsapp?: { success: boolean; error?: string };
      webhook?: { success: boolean; error?: string };
    } = {};

    // Check event preferences
    if (payload.status === "COMPLETED" && !this.settings.events.onTaskCompleted) {
      return results;
    }
    if (payload.status === "FAILED" && !this.settings.events.onTaskFailed) {
      return results;
    }
    if (payload.status === "APPROVAL_REQUIRED" && !this.settings.events.onApprovalRequired) {
      return results;
    }
    if (payload.status === "REMINDER" && !this.settings.events.onScheduledReminder) {
      return results;
    }

    const promises: Promise<void>[] = [];

    // 1. Telegram
    if (this.settings.telegram.enabled && this.settings.telegram.botToken && this.settings.telegram.chatId) {
      promises.push(
        this.sendTelegram(payload, this.settings.telegram)
          .then(() => {
            results.telegram = { success: true };
          })
          .catch((err) => {
            results.telegram = { success: false, error: err.message };
          })
      );
    }

    // 2. WhatsApp
    if (this.settings.whatsapp.enabled && (this.settings.whatsapp.apiKey || this.settings.whatsapp.customWebhookUrl)) {
      promises.push(
        this.sendWhatsApp(payload, this.settings.whatsapp)
          .then(() => {
            results.whatsapp = { success: true };
          })
          .catch((err) => {
            results.whatsapp = { success: false, error: err.message };
          })
      );
    }

    // 3. Webhook (Discord / Slack / Generic)
    if (this.settings.webhook.enabled && this.settings.webhook.url) {
      promises.push(
        this.sendWebhook(payload, this.settings.webhook)
          .then(() => {
            results.webhook = { success: true };
          })
          .catch((err) => {
            results.webhook = { success: false, error: err.message };
          })
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  public async sendTelegram(payload: NotificationPayload, config: TelegramConfig): Promise<void> {
    const statusEmoji =
      payload.status === "COMPLETED"
        ? "✅"
        : payload.status === "FAILED"
        ? "❌"
        : payload.status === "APPROVAL_REQUIRED"
        ? "⚠️"
        : "ℹ️";

    let messageText = `🤖 <b>DIFM Agent Notification</b>\n\n`;
    messageText += `${statusEmoji} <b>${escapeHtml(payload.title)}</b>\n`;
    messageText += `${escapeHtml(payload.summary)}\n\n`;

    if (payload.taskTitle) {
      messageText += `📌 <b>Task:</b> ${escapeHtml(payload.taskTitle)}\n`;
    }
    if (payload.amount) {
      messageText += `💰 <b>Amount:</b> ${escapeHtml(payload.amount)}\n`;
    }
    if (payload.consumerNumber) {
      messageText += `🔢 <b>Consumer ID:</b> ${escapeHtml(payload.consumerNumber)}\n`;
    }
    if (payload.portalUrl) {
      messageText += `🔗 <b>Portal:</b> ${escapeHtml(payload.portalUrl)}\n`;
    }

    messageText += `\n🕒 <i>${new Date(payload.timestamp || Date.now()).toLocaleString()}</i>`;

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: messageText,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Telegram API returned ${res.status}: ${errBody}`);
    }
  }

  public async sendWhatsApp(payload: NotificationPayload, config: WhatsAppConfig): Promise<void> {
    const statusEmoji =
      payload.status === "COMPLETED"
        ? "✅"
        : payload.status === "FAILED"
        ? "❌"
        : payload.status === "APPROVAL_REQUIRED"
        ? "⚠️"
        : "ℹ️";

    let text = `*DIFM Notification*\n\n${statusEmoji} *${payload.title}*\n${payload.summary}\n`;
    if (payload.amount) text += `Amount: ${payload.amount}\n`;
    if (payload.consumerNumber) text += `Consumer No: ${payload.consumerNumber}\n`;
    if (payload.portalUrl) text += `Portal: ${payload.portalUrl}\n`;
    text += `Time: ${new Date(payload.timestamp || Date.now()).toLocaleString()}`;

    // Custom Webhook or CallMeBot free API
    if (config.customWebhookUrl) {
      const res = await fetch(config.customWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: config.phone,
          message: text,
          payload
        })
      });
      if (!res.ok) {
        throw new Error(`WhatsApp custom gateway returned ${res.status}: ${await res.text()}`);
      }
    } else {
      // CallMeBot Free WhatsApp API (https://www.callmebot.com/blog/free-api-whatsapp-messages/)
      const cleanPhone = config.phone.replace(/[^\d]/g, "");
      const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        cleanPhone
      )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(config.apiKey)}`;

      const res = await fetch(callmebotUrl);
      if (!res.ok) {
        throw new Error(`CallMeBot WhatsApp returned ${res.status}: ${await res.text()}`);
      }
    }
  }

  public async sendWebhook(payload: NotificationPayload, config: WebhookConfig): Promise<void> {
    const isDiscord = config.url.includes("discord.com/api/webhooks");
    const isSlack = config.url.includes("hooks.slack.com");

    let bodyData: any;
    if (isDiscord) {
      const color =
        payload.status === "COMPLETED"
          ? 0x10b981 // Emerald
          : payload.status === "FAILED"
          ? 0xef4444 // Red
          : payload.status === "APPROVAL_REQUIRED"
          ? 0xf59e0b // Amber
          : 0x6366f1; // Indigo

      bodyData = {
        username: "DIFM Agent",
        avatar_url: "https://raw.githubusercontent.com/google/material-design-icons/master/png/action/auto_fix_high/materialicons/48dp/2x/baseline_auto_fix_high_black_48dp.png",
        embeds: [
          {
            title: payload.title,
            description: payload.summary,
            color,
            fields: [
              ...(payload.amount ? [{ name: "Amount", value: payload.amount, inline: true }] : []),
              ...(payload.consumerNumber ? [{ name: "Account No", value: payload.consumerNumber, inline: true }] : []),
              ...(payload.portalUrl ? [{ name: "Portal URL", value: payload.portalUrl }] : []),
              { name: "Status", value: payload.status, inline: true }
            ],
            timestamp: new Date(payload.timestamp || Date.now()).toISOString()
          }
        ]
      };
    } else if (isSlack) {
      bodyData = {
        text: `*${payload.title}*\n${payload.summary}\nStatus: ${payload.status} | Time: ${new Date().toLocaleTimeString()}`
      };
    } else {
      // Standard Generic JSON Webhook
      bodyData = {
        source: "DIFM-Automation-Agent",
        ...payload,
        timestamp: payload.timestamp || Date.now()
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (config.secretHeader) {
      headers["Authorization"] = config.secretHeader;
    }

    const res = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyData)
    });

    if (!res.ok) {
      throw new Error(`Webhook endpoint returned status ${res.status}: ${await res.text()}`);
    }
  }

  public async testChannel(
    channel: "telegram" | "whatsapp" | "webhook",
    customConfig?: TelegramConfig | WhatsAppConfig | WebhookConfig
  ): Promise<{ success: boolean; message: string }> {
    const testPayload: NotificationPayload = {
      title: "DIFM Notification Bridge Connected",
      summary: "This is a test notification confirming your channel configuration is live and functioning properly.",
      status: "INFO",
      amount: "₹1,450.00",
      consumerNumber: "102938492019",
      portalUrl: "https://www.cesc.co.in",
      timestamp: Date.now()
    };

    try {
      if (channel === "telegram") {
        const config = (customConfig as TelegramConfig) || this.settings.telegram;
        if (!config.botToken || !config.chatId) {
          throw new Error("Telegram Bot Token and Chat ID are required.");
        }
        await this.sendTelegram(testPayload, config);
        return { success: true, message: "Telegram test message delivered successfully!" };
      } else if (channel === "whatsapp") {
        const config = (customConfig as WhatsAppConfig) || this.settings.whatsapp;
        if (!config.apiKey && !config.customWebhookUrl) {
          throw new Error("WhatsApp API Key or Custom Webhook URL is required.");
        }
        if (!config.phone && !config.customWebhookUrl) {
          throw new Error("WhatsApp phone number is required.");
        }
        await this.sendWhatsApp(testPayload, config);
        return { success: true, message: "WhatsApp test notification sent successfully!" };
      } else if (channel === "webhook") {
        const config = (customConfig as WebhookConfig) || this.settings.webhook;
        if (!config.url) {
          throw new Error("Webhook URL is required.");
        }
        await this.sendWebhook(testPayload, config);
        return { success: true, message: "Webhook ping delivered successfully!" };
      }
      throw new Error("Invalid channel specified.");
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to deliver test notification." };
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
