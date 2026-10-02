import { defineBackground } from "wxt/sandbox";
import type { PendingTaskItem, ExecutionStepDetail } from "@difm/shared";

const CHECK_INTERVAL_MINUTES = 1;
const NOTIFIED_CACHE = new Set<string>();

interface NotificationMetadata {
  taskId: string;
  targetUrl?: string;
  taskTitle: string;
  actionType: "BUY_NOW" | "EXECUTE_NOW" | "REMINDER" | "SENSITIVE_APPROVAL";
  priceCondition?: any;
}

const notificationMetadataMap = new Map<string, NotificationMetadata>();

/**
 * Utility to wait for a tab to finish loading
 */
function waitForTabComplete(tabId: number, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
    };

    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    chrome.tabs.onUpdated.addListener(listener);

    // Initial check in case it is already loaded
    chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (tab?.status === "complete") {
          cleanup();
          resolve();
        }
      })
      .catch(() => {});
  });
}

/**
 * Handles action button clicks and notification clicks by opening/focusing
 * the target tab, opening the sidepanel, and notifying the extension.
 */
async function handleTaskNotificationAction(meta: NotificationMetadata) {
  let targetTab: chrome.tabs.Tab | undefined;

  try {
    if (meta.targetUrl) {
      let targetHostname = "";
      try {
        targetHostname = new URL(meta.targetUrl).hostname;
      } catch {}

      const allTabs = await chrome.tabs.query({});
      const existing = allTabs.find(
        (t) => t.url && (t.url === meta.targetUrl || (targetHostname && t.url.includes(targetHostname)))
      );

      if (existing && existing.id) {
        targetTab = await chrome.tabs.update(existing.id, { active: true });
        if (existing.windowId) {
          await chrome.windows.update(existing.windowId, { focused: true }).catch(() => {});
        }
      } else {
        targetTab = await chrome.tabs.create({ url: meta.targetUrl, active: true });
      }
    } else {
      const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTab = current;
    }

    // Open side panel for the active tab/window
    if (targetTab?.id && targetTab.windowId && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ tabId: targetTab.id, windowId: targetTab.windowId }).catch(() => {});
    }

    // Send execution trigger message to sidepanel / extension runtime
    chrome.runtime
      .sendMessage({
        type: "TRIGGER_TASK_EXECUTION",
        taskId: meta.taskId,
        targetUrl: meta.targetUrl,
        actionType: meta.actionType,
        taskTitle: meta.taskTitle
      })
      .catch(() => {});
  } catch (err) {
    console.error("[DIFM Background] Error handling notification action:", err);
  }
}

/**
 * Autonomous background tab inspector for COMMERCE_WATCH tasks
 */
async function inspectCommerceTask(task: PendingTaskItem): Promise<void> {
  const startTime = Date.now();
  const priceCond = task.priceCondition || task.billerInfo?.priceCondition;
  const targetPrice = priceCond?.targetPrice;
  const targetUrl =
    task.targetUrl ||
    task.billerInfo?.portalUrl ||
    (task.title ? `https://www.amazon.in/s?k=${encodeURIComponent(task.title)}` : undefined);

  if (!targetUrl) return;

  let inspectionTabId: number | undefined;

  try {
    // 1. Open background tab (active: false)
    const tab = await chrome.tabs.create({ url: targetUrl, active: false });
    inspectionTabId = tab.id;
    if (!inspectionTabId) return;

    // 2. Wait for page load
    await waitForTabComplete(inspectionTabId, 15000);
    // Allow DOM to settle and run client hydration
    await new Promise((r) => setTimeout(r, 1200));

    // 3. Send message to content script to inspect price via adapters
    let response = await chrome.tabs
      .sendMessage(inspectionTabId, { type: "INSPECT_PRICE" })
      .catch(() => null);

    if (!response || !response.result) {
      // If content script was not yet attached to the unfocused tab, inject and retry
      await chrome.scripting
        ?.executeScript({
          target: { tabId: inspectionTabId },
          files: ["content-scripts/content.js"]
        })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 600));

      response = await chrome.tabs
        .sendMessage(inspectionTabId, { type: "INSPECT_PRICE" })
        .catch(() => null);
    }

    const inspected = response?.result;
    const currentPrice = inspected?.currentPrice;
    const durationMs = Date.now() - startTime;

    if (currentPrice !== undefined && currentPrice > 0) {
      const isPriceDrop = targetPrice !== undefined ? currentPrice <= targetPrice : true;
      const formattedLive = `₹${currentPrice.toLocaleString("en-IN")}`;
      const formattedTarget = targetPrice ? `₹${targetPrice.toLocaleString("en-IN")}` : "target price";

      const stepDetail: ExecutionStepDetail = {
        id: `step_${Date.now()}_1`,
        stepNumber: 1,
        timestamp: Date.now(),
        actionType: "PRICE_INSPECTION",
        description: `Inspected live price on ${new URL(targetUrl).hostname}: ${formattedLive} (Target: ≤ ${formattedTarget})`,
        url: targetUrl,
        pageTitle: inspected?.title || task.title,
        status: isPriceDrop ? "SUCCESS" : "SUCCESS",
        durationMs
      };

      if (isPriceDrop) {
        const notifId = `commerce-drop-${task.id}`;
        const now = Date.now();
        const lastNotifiedPrice = priceCond?.lastNotifiedPrice;
        const lastNotifiedAt = priceCond?.lastNotifiedAt || 0;
        const isNewPriceOrCooldownPassed =
          !lastNotifiedPrice ||
          currentPrice < lastNotifiedPrice ||
          now - lastNotifiedAt > 15 * 60 * 1000;

        notificationMetadataMap.set(notifId, {
          taskId: task.id,
          targetUrl,
          taskTitle: task.title,
          actionType: "BUY_NOW",
          priceCondition: { ...priceCond, currentPrice, targetPrice }
        });

        if (isNewPriceOrCooldownPassed) {
          const notifOptions: chrome.notifications.NotificationOptions<true> = {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icon-128.png"),
            title: `🎯 Price Target Met: ${task.title}`,
            message: `Live Price: ${formattedLive} (Target: ≤ ${formattedTarget})!\nClick below to 1-click checkout with DIFM agent.`,
            priority: 2,
            requireInteraction: true,
            buttons: [
              { title: "🛒 Add to Cart & Checkout" },
              { title: "✕ Dismiss" }
            ]
          };

          chrome.notifications.create(notifId, notifOptions, () => {
            if (chrome.runtime.lastError) {
              chrome.notifications.create(notifId + "_fb", {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icon-128.png"),
                title: `🎯 Price Target Met: ${task.title}`,
                message: `Live Price: ${formattedLive} (Target: ≤ ${formattedTarget})! Click to open & checkout.`,
                priority: 2,
                requireInteraction: true
              });
            }
          });
        }

        // Record successful price match in server run history
        await fetch(`http://127.0.0.1:3001/pending-tasks/${task.id}/record-run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "SUCCESS",
            durationMs,
            summary: `Autonomous price check: Live price ${formattedLive} meets target (≤ ${formattedTarget}).`,
            stepsCount: 1,
            steps: [stepDetail]
          })
        }).catch(() => {});

        // Update task in server: mark completed and save final price details
        await fetch(`http://127.0.0.1:3001/pending-tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            priceCondition: {
              ...(priceCond || {}),
              currentPrice,
              lastCheckedAt: Date.now(),
              lastNotifiedPrice: currentPrice,
              lastNotifiedAt: Date.now(),
              priceMatched: true,
              productTitle: inspected?.title || task.title,
              productImageUrl: inspected?.imageUrl
            }
          })
        }).catch(() => {});
      } else {
        // Record check run when price is still above target
        await fetch(`http://127.0.0.1:3001/pending-tasks/${task.id}/record-run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "SUCCESS",
            durationMs,
            summary: `Autonomous price check: Live price is ${formattedLive} (Target: ≤ ${formattedTarget}). Target threshold not yet met.`,
            stepsCount: 1,
            steps: [stepDetail]
          })
        }).catch(() => {});

        await fetch(`http://127.0.0.1:3001/pending-tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceCondition: {
              ...(priceCond || {}),
              currentPrice,
              lastCheckedAt: Date.now(),
              priceMatched: false,
              productTitle: inspected?.title || task.title,
              productImageUrl: inspected?.imageUrl
            }
          })
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[DIFM Background] Commerce inspection error for task ${task.id}:`, err);
  } finally {
    // 4. Close background inspection tab cleanly to avoid tab clutter
    if (inspectionTabId) {
      chrome.tabs.remove(inspectionTabId).catch(() => {});
    }
  }
}

/**
 * Checks due tasks, performs autonomous checks for commerce tasks,
 * and delivers rich push notifications with action buttons.
 */
async function checkDueTasksAndNotify() {
  try {
    const res = await fetch("http://127.0.0.1:3001/pending-tasks");
    if (!res.ok) return;
    const data = (await res.json()) as {
      tasks: PendingTaskItem[];
      remindersDue: PendingTaskItem[];
      scheduledReady: PendingTaskItem[];
    };

    const now = Date.now();
    const inspectedTaskIds = new Set<string>();

    // 1. Process Due Date Reminders
    if (Array.isArray(data.remindersDue)) {
      for (const task of data.remindersDue) {
        if (task.status === "COMPLETED" || task.status === "CANCELLED") continue;
        const cacheKey = `reminder-${task.id}-${task.dueDate}`;
        if (NOTIFIED_CACHE.has(cacheKey)) continue;

        const dueMsg = task.dueDate ? `Due date: ${new Date(task.dueDate).toLocaleDateString()}` : "Due soon!";
        const amtMsg = task.billerInfo?.amount ? `\nPayable Amount: ${task.billerInfo.amount}` : "";
        const acctMsg = task.billerInfo?.consumerNumber ? `\nA/C No: ${task.billerInfo.consumerNumber}` : "";
        const notesMsg = task.notes ? `\nNotes: ${task.notes}` : "";

        const notifId = `reminder-${task.id}`;
        notificationMetadataMap.set(notifId, {
          taskId: task.id,
          targetUrl: task.targetUrl || task.billerInfo?.portalUrl,
          taskTitle: task.title,
          actionType: "REMINDER"
        });

        chrome.notifications.create(notifId, {
          type: "basic",
          iconUrl: chrome.runtime.getURL("icon-128.png"),
          title: `⏰ Pending Task Due: ${task.title}`,
          message: `${task.description || task.title}\n${dueMsg}${amtMsg}${acctMsg}${notesMsg}`,
          priority: 2,
          requireInteraction: true,
          buttons: [
            { title: "💳 Open & Pay Now" },
            { title: "✕ Dismiss" }
          ]
        });

        NOTIFIED_CACHE.add(cacheKey);
      }
    }

    // 2. Process Scheduled Tasks Ready To Run
    if (Array.isArray(data.scheduledReady)) {
      for (const task of data.scheduledReady) {
        const cacheKey = `sched-${task.id}-${task.schedule?.nextRunAt}`;
        if (NOTIFIED_CACHE.has(cacheKey)) continue;

        if (task.category === "COMMERCE_WATCH" || task.priceCondition || task.billerInfo?.priceCondition) {
          inspectedTaskIds.add(task.id);
          await inspectCommerceTask(task);
        } else if (task.schedule?.autoExecute) {
          const notifId = `sched-run-${task.id}`;
          notificationMetadataMap.set(notifId, {
            taskId: task.id,
            targetUrl: task.targetUrl || task.billerInfo?.portalUrl,
            taskTitle: task.title,
            actionType: "EXECUTE_NOW"
          });

          chrome.notifications.create(notifId, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icon-128.png"),
            title: `⚡ DIFM Scheduled Trigger: ${task.title}`,
            message: `Starting automated action for: ${task.title}. Click to supervise or execute with AI agent.`,
            priority: 2,
            requireInteraction: true,
            buttons: [
              { title: "⚡ Execute Now" },
              { title: "✕ Dismiss" }
            ]
          });
        } else {
          const notifId = `sched-alert-${task.id}`;
          notificationMetadataMap.set(notifId, {
            taskId: task.id,
            targetUrl: task.targetUrl || task.billerInfo?.portalUrl,
            taskTitle: task.title,
            actionType: "EXECUTE_NOW"
          });

          chrome.notifications.create(notifId, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icon-128.png"),
            title: `🗓️ Scheduled Action Ready: ${task.title}`,
            message: `Task is scheduled for execution right now. Click to execute.`,
            priority: 2,
            requireInteraction: true,
            buttons: [
              { title: "▶ Open & Execute" },
              { title: "✕ Dismiss" }
            ]
          });
        }

        NOTIFIED_CACHE.add(cacheKey);
      }
    }

    // 3. Dynamic per-task price inspection check for any remaining COMMERCE_WATCH tasks
    if (Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        if (task.status === "COMPLETED" || task.status === "CANCELLED" || inspectedTaskIds.has(task.id)) continue;
        const cond = task.priceCondition || task.billerInfo?.priceCondition;
        if (!cond) continue;

        const intervalMinutes = cond.checkIntervalMinutes || 30;
        const intervalMs = intervalMinutes * 60 * 1000;
        const lastChecked = cond.lastCheckedAt || 0;

        if (now - lastChecked >= intervalMs) {
          inspectedTaskIds.add(task.id);
          await inspectCommerceTask(task);
        }
      }
    }
  } catch (err) {
    console.warn("[DIFM Background] Background poll check failed:", err);
  }
}

export default defineBackground(() => {
  // Allow opening sidepanel on extension icon click
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});

  // Setup periodic unified polling alarm
  chrome.alarms.create("check-due-tasks", {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "check-due-tasks") {
      checkDueTasksAndNotify();
    }
  });

  // Handle Action Button Clicks on desktop push notifications
  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    const meta = notificationMetadataMap.get(notificationId);
    chrome.notifications.clear(notificationId);

    if (buttonIndex === 0 && meta) {
      // Primary Action clicked ("Buy Now" / "Execute Now" / "Open & Pay")
      await handleTaskNotificationAction(meta);
    }
  });

  // Handle clicking the notification body directly
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    const meta = notificationMetadataMap.get(notificationId);
    chrome.notifications.clear(notificationId);

    if (meta) {
      await handleTaskNotificationAction(meta);
    }
  });

  // Handle sensitive action approval requests & immediate trigger requests
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "CHECK_TASKS_IMMEDIATELY" || message?.type === "TASK_SCHEDULED") {
      checkDueTasksAndNotify();
    } else if (message?.type === "SENSITIVE_APPROVAL_REQUIRED") {
      const notifId = `approval-${Date.now()}`;
      chrome.notifications.create(notifId, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon-128.png"),
        title: "⚠️ Action Approval Required (Sensitive Decision)",
        message: `Task "${message.goal}" requires your confirmation for: ${message.actionType}.`,
        priority: 2,
        requireInteraction: true,
        buttons: [
          { title: "✓ Review & Confirm" },
          { title: "✕ Reject" }
        ]
      });
    }
  });

  chrome.runtime.onInstalled.addListener(() => {
    checkDueTasksAndNotify();
  });
});
