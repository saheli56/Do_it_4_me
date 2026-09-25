import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotificationService } from "../src/notification.js";
import type { NotificationPayload } from "@difm/shared";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  it("loads and updates notification settings", () => {
    const initial = service.getSettings();
    expect(initial).toBeDefined();
    expect(initial.telegram).toBeDefined();
    expect(initial.whatsapp).toBeDefined();
    expect(initial.webhook).toBeDefined();

    const updated = service.saveSettings({
      telegram: {
        enabled: true,
        botToken: "test_bot_token_123",
        chatId: "987654321"
      }
    });

    expect(updated.telegram.enabled).toBe(true);
    expect(updated.telegram.botToken).toBe("test_bot_token_123");
    expect(updated.telegram.chatId).toBe("987654321");
  });

  it("handles webhook dispatch formatting for generic endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "OK"
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload: NotificationPayload = {
      title: "Bill Payment Successful",
      summary: "Paid ₹1,450 to CESC electricity.",
      status: "COMPLETED",
      amount: "₹1,450.00",
      consumerNumber: "102938492019",
      portalUrl: "https://www.cesc.co.in"
    };

    await service.sendWebhook(payload, {
      enabled: true,
      url: "https://api.mywebhook.com/notifications"
    });

    expect(fetchMock).toHaveBeenCalled();
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://api.mywebhook.com/notifications");
    expect(calledOpts.method).toBe("POST");
    const parsedBody = JSON.parse(calledOpts.body);
    expect(parsedBody.title).toBe("Bill Payment Successful");
    expect(parsedBody.amount).toBe("₹1,450.00");
    expect(parsedBody.status).toBe("COMPLETED");

    vi.unstubAllGlobals();
  });

  it("formats Discord webhook embed payloads correctly", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "OK"
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload: NotificationPayload = {
      title: "Action Confirmation Required",
      summary: "Please review the QR code on screen.",
      status: "APPROVAL_REQUIRED",
      amount: "₹999.00"
    };

    await service.sendWebhook(payload, {
      enabled: true,
      url: "https://discord.com/api/webhooks/12345/abcdef"
    });

    expect(fetchMock).toHaveBeenCalled();
    const [, calledOpts] = fetchMock.mock.calls[0];
    const parsedBody = JSON.parse(calledOpts.body);
    expect(parsedBody.embeds).toBeDefined();
    expect(parsedBody.embeds[0].title).toBe("Action Confirmation Required");
    expect(parsedBody.embeds[0].color).toBe(0xf59e0b); // Amber for approval

    vi.unstubAllGlobals();
  });
});
