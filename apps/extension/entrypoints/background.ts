import { defineBackground } from "wxt/sandbox";

const CHECK_INTERVAL_MINUTES = 1;
const NOTIFIED_CACHE = new Set<string>();

async function checkDueTasksAndNotify() {
  try {
    const res = await fetch("http://127.0.0.1:3001/pending-tasks/due-soon");
    if (!res.ok) return;
    const tasks: Array<{
      id: string;
      title: string;
      goal: string;
      dueDate?: string;
      notes?: string;
      status: string;
    }> = await res.json();

    for (const task of tasks) {
      if (task.status === "COMPLETED" || task.status === "FAILED") continue;
      if (NOTIFIED_CACHE.has(task.id)) continue;

      const dueMsg = task.dueDate ? `Due date: ${new Date(task.dueDate).toLocaleString()}` : "Due soon!";
      const notesMsg = task.notes ? `\nNotes: ${task.notes}` : "";

      chrome.notifications.create(`task-${task.id}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("/wxt.svg"),
        title: `⏰ Pending Task Reminder: ${task.title}`,
        message: `${task.goal}\n${dueMsg}${notesMsg}`,
        priority: 2,
        requireInteraction: true
      });

      NOTIFIED_CACHE.add(task.id);
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
