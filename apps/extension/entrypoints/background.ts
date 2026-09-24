import { defineBackground } from "wxt/sandbox";
import type { PendingTaskItem } from "@difm/shared";

const CHECK_INTERVAL_MINUTES = 1;
const NOTIFIED_CACHE = new Set<string>();

async function checkDueTasksAndNotify() {
  try {
    const res = await fetch("http://127.0.0.1:3001/pending-tasks/due-soon");
    if (!res.ok) return;
    const data = (await res.json()) as {
      reminders: PendingTaskItem[];
      scheduled: PendingTaskItem[];
    };

    // 1. Process Due Date Reminders
    if (Array.isArray(data.reminders)) {
      for (const task of data.reminders) {
        if (task.status === "COMPLETED" || task.status === "CANCELLED") continue;
        const cacheKey = `reminder-${task.id}-${task.dueDate}`;
        if (NOTIFIED_CACHE.has(cacheKey)) continue;

        const dueMsg = task.dueDate ? `Due date: ${new Date(task.dueDate).toLocaleDateString()}` : "Due soon!";
        const notesMsg = task.notes ? `\nNotes: ${task.notes}` : "";

        chrome.notifications.create(`task-${task.id}`, {
          type: "basic",
          iconUrl: chrome.runtime.getURL("/wxt.svg"),
          title: `⏰ Pending Task Due: ${task.title}`,
          message: `${task.description || task.title}\n${dueMsg}${notesMsg}`,
          priority: 2,
          requireInteraction: true
        });

        NOTIFIED_CACHE.add(cacheKey);
      }
    }

    // 2. Process Scheduled Tasks
    if (Array.isArray(data.scheduled)) {
      for (const task of data.scheduled) {
        const cacheKey = `sched-${task.id}-${task.schedule?.nextRunAt}`;
        if (NOTIFIED_CACHE.has(cacheKey)) continue;

        if (task.schedule?.autoExecute) {
          chrome.notifications.create(`sched-run-${task.id}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("/wxt.svg"),
            title: `⚡ DIFM Scheduled Trigger: ${task.title}`,
            message: `Starting automated action for: ${task.title}. Open sidepanel to supervise.`,
            priority: 2
          });
        } else {
          chrome.notifications.create(`sched-alert-${task.id}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("/wxt.svg"),
            title: `🗓️ Scheduled Action Ready: ${task.title}`,
            message: `Task is scheduled for execution right now. Click to execute.`,
            priority: 2,
            requireInteraction: true
          });
        }

        NOTIFIED_CACHE.add(cacheKey);
      }
    }
  } catch {}
}

export default defineBackground(() => {
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});

  chrome.alarms.create("check-due-tasks", {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "check-due-tasks") {
      checkDueTasksAndNotify();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SENSITIVE_APPROVAL_REQUIRED") {
      chrome.notifications.create(`approval-${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("/wxt.svg"),
        title: "⚠️ Action Approval Required (Sensitive Decision)",
        message: `Task "${message.goal}" requires your confirmation for: ${message.actionType}.`,
        priority: 2,
        requireInteraction: true
      });
    }
  });

  chrome.runtime.onInstalled.addListener(() => {
    checkDueTasksAndNotify();
  });
});
