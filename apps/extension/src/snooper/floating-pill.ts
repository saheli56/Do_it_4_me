import type { DetectedBillInfo } from "./bill-detector.js";

const SNOOZE_KEY_PREFIX = "difm_snooze_";
const HOST_ID = "difm-bill-snooper-host";

/**
 * Injects a discrete, non-intrusive floating pill banner into the page
 * using an isolated Shadow DOM.
 */
export function renderFloatingBillPill(billInfo: DetectedBillInfo): void {
  // Check if user already dismissed or scheduled this domain in current session
  try {
    const hostname = window.location.hostname;
    if (sessionStorage.getItem(`${SNOOZE_KEY_PREFIX}${hostname}`)) {
      return;
    }
  } catch {}

  // Avoid duplicate injection
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "all: initial; position: fixed; top: 20px; right: 24px; z-index: 2147483647;";

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .pill-container {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px 8px 12px;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(59, 130, 246, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 9999px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255, 255, 255, 0.06);
      color: #f8fafc;
      font-size: 13px;
      animation: slideInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      user-select: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .pill-container.closing {
      opacity: 0;
      transform: translateY(-16px) scale(0.95);
    }

    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .badge-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.35));
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60a5fa;
      flex-shrink: 0;
      font-size: 14px;
    }

    .content-wrap {
      display: flex;
      flex-direction: column;
      gap: 1px;
      max-width: 320px;
    }

    .pill-title {
      font-weight: 600;
      font-size: 13px;
      color: #f1f5f9;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pill-subtitle {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.2;
    }

    .action-btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      border: none;
      padding: 6px 13px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
      transition: all 0.15s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .action-btn:hover {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
      transform: translateY(-1px);
    }

    .action-btn:active {
      transform: translateY(0);
    }

    .action-btn.success {
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
      cursor: default;
    }

    .action-btn:disabled {
      opacity: 0.8;
      cursor: not-allowed;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      padding: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f1f5f9;
    }
  `;

  const container = document.createElement("div");
  container.className = "pill-container";

  const icon = document.createElement("div");
  icon.className = "badge-icon";
  icon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

  const contentWrap = document.createElement("div");
  contentWrap.className = "content-wrap";

  const titleEl = document.createElement("div");
  titleEl.className = "pill-title";
  titleEl.textContent = billInfo.summaryText;

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "pill-subtitle";
  if (billInfo.consumerNumber) {
    subtitleEl.textContent = `Account: ${billInfo.consumerNumber}${billInfo.dueDate ? ` • Due: ${billInfo.dueDate}` : ""}`;
  } else if (billInfo.dueDate) {
    subtitleEl.textContent = `Due Date: ${billInfo.dueDate}`;
  } else {
    subtitleEl.textContent = "Detected by DIFM Passive Snooper";
  }

  contentWrap.appendChild(titleEl);
  contentWrap.appendChild(subtitleEl);

  const actionBtn = document.createElement("button");
  actionBtn.className = "action-btn";
  actionBtn.innerHTML = `<span>⚡</span><span>Automate & Schedule</span>`;

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.innerHTML = "&times;";

  const dismissPill = () => {
    try {
      sessionStorage.setItem(`${SNOOZE_KEY_PREFIX}${window.location.hostname}`, "true");
    } catch {}
    container.classList.add("closing");
    setTimeout(() => {
      host.remove();
    }, 260);
  };

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissPill();
  });

  actionBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    actionBtn.disabled = true;
    actionBtn.innerHTML = `<span>⏳</span><span>Scheduling...</span>`;

    try {
      const taskTitle = `Pay ${billInfo.providerName}${billInfo.dueAmount ? ` (${billInfo.dueAmount})` : ""}`;
      const payload = {
        title: taskTitle,
        category: billInfo.category,
        targetUrl: billInfo.portalUrl,
        billerInfo: {
          providerName: billInfo.providerName,
          consumerNumber: billInfo.consumerNumber,
          customerName: billInfo.customerName,
          billingCycle: billInfo.billingCycle,
          portalUrl: billInfo.portalUrl,
          dueAmount: billInfo.dueAmount,
          dueAmountNum: billInfo.dueAmountNum
        },
        dueDate: billInfo.dueDate,
        schedule: {
          enabled: true,
          autoExecute: true,
          scheduledFor: billInfo.dueDate ? new Date(billInfo.dueDate).getTime() : undefined
        }
      };

      // Call pending-tasks API
      await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Broadcast task update to background and sidepanel
      chrome.runtime?.sendMessage?.({ type: "CHECK_TASKS_IMMEDIATELY" });

      actionBtn.className = "action-btn success";
      actionBtn.innerHTML = `<span>✓</span><span>Scheduled!</span>`;

      try {
        sessionStorage.setItem(`${SNOOZE_KEY_PREFIX}${window.location.hostname}`, "true");
      } catch {}

      setTimeout(() => {
        dismissPill();
      }, 2000);
    } catch (err) {
      console.warn("[DIFM Snooper] Failed to schedule bill:", err);
      actionBtn.disabled = false;
      actionBtn.innerHTML = `<span>⚡</span><span>Automate & Schedule</span>`;
    }
  });

  container.appendChild(icon);
  container.appendChild(contentWrap);
  container.appendChild(actionBtn);
  container.appendChild(closeBtn);

  shadow.appendChild(style);
  shadow.appendChild(container);

  (document.body || document.documentElement).appendChild(host);
}
