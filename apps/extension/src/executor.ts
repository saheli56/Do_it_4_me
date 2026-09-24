import type { AgentAction, ElementLocator } from "@difm/shared";

export function findTargetElement(locator: ElementLocator, doc: Document = document): Element | null {
  if (locator.selector) {
    try {
      const el = doc.querySelector(locator.selector);
      if (el) return el;
    } catch {
      // Fallback if selector is invalid
    }
  }

  if (locator.id && !locator.id.startsWith("node-")) {
    const el = doc.getElementById(locator.id);
    if (el) return el;
  }

  if (locator.name) {
    const candidates = Array.from(
      doc.querySelectorAll("button, a, input, select, textarea, [role='button']")
    );
    const match = candidates.find((c) => {
      const aria = c.getAttribute("aria-label");
      const text = c.textContent?.trim();
      return aria === locator.name || text === locator.name;
    });
    if (match) return match;
  }

  return null;
}

export function highlightElement(element: Element, durationMs = 100): Promise<void> {
  return new Promise((resolve) => {
    if (typeof element.getBoundingClientRect !== "function") {
      resolve();
      return;
    }

    try {
      const doc = element.ownerDocument || document;
      const rect = element.getBoundingClientRect();
      const overlay = doc.createElement("div");
      overlay.setAttribute("data-difm-highlight", "true");
      overlay.style.position = "fixed";
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.border = "2px solid #6366f1";
      overlay.style.backgroundColor = "rgba(99, 102, 241, 0.15)";
      overlay.style.borderRadius = "4px";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2147483647";

      doc.body.appendChild(overlay);

      setTimeout(() => {
        overlay.remove();
        resolve();
      }, durationMs);
    } catch {
      resolve();
    }
  });
}

export function waitForSettlement(doc: Document = document, timeoutMs = 200): Promise<void> {
  return new Promise((resolve) => {
    if (typeof MutationObserver === "undefined" || !doc?.body) {
      setTimeout(resolve, 20);
      return;
    }

    let timeoutId: NodeJS.Timeout | number;

    try {
      const observer = new MutationObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 50);
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
      setTimeout(resolve, 20);
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
        await highlightElement(el);
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
        await highlightElement(el);
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
        if ("focus" in inputEl && typeof inputEl.focus === "function") {
          inputEl.focus();
        }
        if (action.clearExisting) {
          inputEl.value = "";
        }
        inputEl.value = action.text;

        const win = doc.defaultView || globalThis.window;
        const Evt = (win && (win as unknown as { Event: typeof Event }).Event) || Event;

        if (typeof inputEl.dispatchEvent === "function") {
          try {
            inputEl.dispatchEvent(new Evt("input", { bubbles: true }));
            inputEl.dispatchEvent(new Evt("change", { bubbles: true }));
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
        await highlightElement(el);
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
