export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  phone: string; // International phone format (e.g. 919876543210)
  apiKey: string; // CallMeBot free API key or WhatsApp Gateway API Key
  customWebhookUrl?: string; // Optional custom WhatsApp gateway endpoint
}

export interface WebhookConfig {
  enabled: boolean;
  url: string; // Discord, Slack, Zapier, n8n, or Custom endpoint
  secretHeader?: string;
}

export interface NotificationSettings {
  telegram: TelegramConfig;
  whatsapp: WhatsAppConfig;
  webhook: WebhookConfig;
  events: {
    onTaskCompleted: boolean;
    onTaskFailed: boolean;
    onApprovalRequired: boolean;
    onScheduledReminder: boolean;
  };
}

export interface NotificationPayload {
  title: string;
  summary: string;
  taskTitle?: string;
  category?: string;
  status: "COMPLETED" | "FAILED" | "APPROVAL_REQUIRED" | "REMINDER" | "INFO";
  amount?: string;
  portalUrl?: string;
  consumerNumber?: string;
  timestamp?: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  telegram: {
    enabled: false,
    botToken: "",
    chatId: ""
  },
  whatsapp: {
    enabled: false,
    phone: "",
    apiKey: "",
    customWebhookUrl: ""
  },
  webhook: {
    enabled: false,
    url: "",
    secretHeader: ""
  },
  events: {
    onTaskCompleted: true,
    onTaskFailed: true,
    onApprovalRequired: true,
    onScheduledReminder: true
  }
};
