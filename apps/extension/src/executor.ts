import type { AgentAction, ElementLocator } from "@difm/shared";

function escapeCss(str: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(str);
  }
  return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

export function findTargetElement(locator: ElementLocator, doc: Document = document): Element | null {
  // 1. Direct ID / data-difm-id lookup (Guarantees clicking the exact extracted element)
  if (locator.id) {
    try {
      const elById = doc.querySelector(`[data-difm-id="${escapeCss(locator.id)}"]`);
      if (elById) return elById;
    } catch {}

    if (!locator.id.startsWith("node-")) {
      const el = doc.getElementById(locator.id);
      if (el) return el;
    }
  }

  // 2. Stable Selector lookup
  if (locator.selector) {
    try {
      const el = doc.querySelector(locator.selector);
      if (el) return el;
    } catch {
      // Fallback if selector is invalid
    }
  }

  if (locator.name) {
    const targetName = locator.name.toLowerCase().trim();
    const candidates = Array.from(
      doc.querySelectorAll("button, a, input, select, textarea, [role='button'], label")
    );
    const match = candidates.find((c) => {
      const aria = (c.getAttribute("aria-label") || "").toLowerCase().trim();
      const text = (c.textContent || "").toLowerCase().trim();
      const placeholder = (c.getAttribute("placeholder") || "").toLowerCase().trim();
      const nameAttr = (c.getAttribute("name") || "").toLowerCase().trim();
      const idAttr = (c.getAttribute("id") || "").toLowerCase().trim();

      return (
        aria === targetName ||
        text === targetName ||
        placeholder === targetName ||
        nameAttr === targetName ||
        idAttr === targetName
      );
    });
    if (match) return match;
  }

  return null;
}

export function highlightElement(
  element: Element,
  label = "DIFM Action",
  durationMs = 450
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof element.getBoundingClientRect !== "function") {
      resolve();
      return;
    }

    try {
      // Smoothly bring element into viewport center if needed
      if (typeof element.scrollIntoView === "function") {
        try {
          element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        } catch {}
      }

      const doc = element.ownerDocument || document;
      const rect = element.getBoundingClientRect();

      // Highlight Container Box
      const overlay = doc.createElement("div");
      overlay.setAttribute("data-difm-highlight", "true");
      overlay.style.position = "fixed";
      overlay.style.top = `${Math.max(0, rect.top - 4)}px`;
      overlay.style.left = `${Math.max(0, rect.left - 4)}px`;
      overlay.style.width = `${rect.width + 8}px`;
      overlay.style.height = `${rect.height + 8}px`;
      overlay.style.border = "2px solid #6366f1";
      overlay.style.backgroundColor = "rgba(99, 102, 241, 0.16)";
      overlay.style.boxShadow = "0 0 16px rgba(99, 102, 241, 0.65)";
      overlay.style.borderRadius = "6px";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2147483647";
      overlay.style.transition = "all 0.2s ease-out";

      // Floating Live Action Pill Badge
      const badge = doc.createElement("div");
      badge.style.position = "absolute";
      badge.style.top = rect.top > 32 ? "-26px" : `${rect.height + 6}px`;
      badge.style.left = "0px";
      badge.style.backgroundColor = "#4f46e5";
      badge.style.color = "#ffffff";
      badge.style.fontSize = "11px";
      badge.style.fontFamily = "system-ui, -apple-system, sans-serif";
      badge.style.fontWeight = "600";
      badge.style.padding = "2px 8px";
      badge.style.borderRadius = "4px";
      badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      badge.style.whiteSpace = "nowrap";
      badge.style.pointerEvents = "none";
      badge.textContent = `⚡ ${label}`;

      overlay.appendChild(badge);
      doc.body.appendChild(overlay);

      setTimeout(() => {
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 150);
      }, durationMs);
    } catch {
      resolve();
    }
  });
}

export function waitForSettlement(doc: Document = document, timeoutMs = 250): Promise<void> {
  return new Promise((resolve) => {
    if (typeof MutationObserver === "undefined" || !doc?.body) {
      setTimeout(resolve, 30);
      return;
    }

    let timeoutId: NodeJS.Timeout | number;

    try {
      const observer = new MutationObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 60);
      });

      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeoutMs);
    } catch {
      setTimeout(resolve, 30);
    }
  });
}

export async function executeAgentAction(
  action: AgentAction,
  doc: Document = typeof document !== "undefined" ? document : (globalThis.document as Document)
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case "CLICK": {
        const el = findTargetElement(action.target, doc);
        if (!el) {
          return { success: false, error: `Target element not found: ${action.target.name || action.target.selector}` };
        }
        await highlightElement(el, `Clicking "${action.target.name || 'target'}"`);
        if ("focus" in el && typeof (el as { focus: () => void }).focus === "function") {
          (el as { focus: () => void }).focus();
        }
        if (typeof (el as HTMLElement).click === "function") {
          (el as HTMLElement).click();
        } else if (typeof el.dispatchEvent === "function") {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }
        await waitForSettlement(doc);
        return { success: true };
      }

      case "TYPE": {
        const el = findTargetElement(action.target, doc);
        if (!el) {
          return { success: false, error: `Target input not found: ${action.target.name || action.target.selector}` };
        }
        await highlightElement(el, `Typing into ${action.target.name || 'input'}`);
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement;

        // If element is disabled or readonly (e.g. demo form inputs), enable it for interaction
        if ("disabled" in inputEl && inputEl.disabled) {
          inputEl.disabled = false;
          inputEl.removeAttribute("disabled");
          inputEl.removeAttribute("aria-disabled");
        }
        if ("readOnly" in inputEl && inputEl.readOnly) {
          inputEl.readOnly = false;
          inputEl.removeAttribute("readonly");
        }

        if ("focus" in inputEl && typeof inputEl.focus === "function") {
          try {
            inputEl.focus();
          } catch {}
        }
        if (action.clearExisting) {
          inputEl.value = "";
        }

        const proto =
          inputEl instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

        if (nativeSetter) {
          nativeSetter.call(inputEl, action.text);
        } else {
          inputEl.value = action.text;
        }

        const win = doc.defaultView || (typeof window !== "undefined" ? window : globalThis.window);
        const Evt = (win && (win as unknown as { Event: typeof Event }).Event) || Event;

        if (typeof inputEl.dispatchEvent === "function") {
          try {
            inputEl.dispatchEvent(new Evt("input", { bubbles: true, composed: true }));
            inputEl.dispatchEvent(new Evt("change", { bubbles: true, composed: true }));
            inputEl.dispatchEvent(new Evt("blur", { bubbles: true, composed: true }));
          } catch {
            // Ignored
          }
        }
        await waitForSettlement(doc);
        return { success: true };
      }

      case "SELECT": {
        const el = findTargetElement(action.target, doc);
        if (!el || el.tagName !== "SELECT") {
          return { success: false, error: `Select element not found: ${action.target.name || action.target.selector}` };
        }
        await highlightElement(el, `Selecting "${action.value}"`);
        const selectEl = el as HTMLSelectElement;
        selectEl.value = action.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        await waitForSettlement(doc);
        return { success: true };
      }

      case "SCROLL": {
        const amount = action.amount || 400;
        if (action.direction === "DOWN") {
          window.scrollBy({ top: amount, behavior: "smooth" });
        } else if (action.direction === "UP") {
          window.scrollBy({ top: -amount, behavior: "smooth" });
        } else if (action.direction === "TOP") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (action.direction === "BOTTOM") {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }
        await new Promise((r) => setTimeout(r, 400));
        return { success: true };
      }

      case "NAVIGATE": {
        window.location.href = action.url;
        return { success: true };
      }

      case "WAIT": {
        await new Promise((r) => setTimeout(r, action.durationMs));
        return { success: true };
      }

      case "COMPLETE":
      case "FAIL":
      case "REQUEST_APPROVAL":
      case "REQUEST_USER_INPUT":
        return { success: true };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Action execution failed";
    return { success: false, error: errorMsg };
  }
}
