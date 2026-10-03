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
  durationMs = 400
): Promise<void> {
  // Fire-and-forget: perform DOM styling and visual pulse without blocking execution
  if (typeof element.getBoundingClientRect === "function") {
    try {
      if (typeof element.scrollIntoView === "function") {
        try {
          element.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "nearest", inline: "nearest" });
        } catch {}
      }

      const doc = element.ownerDocument || document;
      const rect = element.getBoundingClientRect();

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
      overlay.style.transition = "opacity 0.2s ease-out";

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
        }, 150);
      }, durationMs);
    } catch {}
  }
  return Promise.resolve();
}

export function waitForSettlement(doc: Document = document, timeoutMs = 100): Promise<void> {
  return new Promise((resolve) => {
    if (typeof MutationObserver === "undefined" || !doc?.body) {
      setTimeout(resolve, 10);
      return;
    }

    let timeoutId: NodeJS.Timeout | number;

    try {
      const observer = new MutationObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 40);
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
      setTimeout(resolve, 10);
    }
  });
}

export function simulateRealClick(element: HTMLElement | Element): void {
  const doc = element.ownerDocument || document;
  const win = doc.defaultView || (typeof window !== "undefined" ? window : globalThis.window);
  let clientX = 0;
  let clientY = 0;

  if (typeof element.getBoundingClientRect === "function") {
    try {
      const rect = element.getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    } catch {}
  }

  const events = ["pointerdown", "mousedown", "focus", "pointerup", "mouseup", "click"];
  const EventCtor = (win as any)?.Event || (typeof Event !== "undefined" ? Event : null);
  const MouseEventCtor = (win as any)?.MouseEvent || (typeof MouseEvent !== "undefined" ? MouseEvent : EventCtor);
  const PointerEventCtor = (win as any)?.PointerEvent || (typeof PointerEvent !== "undefined" ? PointerEvent : MouseEventCtor);

  for (const eventName of events) {
    try {
      let evt: any;
      if (eventName.startsWith("pointer") && PointerEventCtor) {
        evt = new PointerEventCtor(eventName, {
          bubbles: true,
          cancelable: true,
          view: win,
          clientX,
          clientY,
          pointerType: "mouse"
        });
      } else if ((eventName.startsWith("mouse") || eventName === "click") && MouseEventCtor) {
        evt = new MouseEventCtor(eventName, {
          bubbles: true,
          cancelable: true,
          view: win,
          clientX,
          clientY,
          buttons: eventName.includes("down") ? 1 : 0
        });
      } else if (EventCtor) {
        evt = new EventCtor(eventName, { bubbles: true, cancelable: true });
      }
      if (evt) {
        element.dispatchEvent(evt);
      }
    } catch {}
  }

  if (typeof (element as HTMLElement).click === "function") {
    try {
      (element as HTMLElement).click();
    } catch {}
  }

  // If inside an Amazon button wrapper (.a-button), trigger click on wrapper as well
  const parentBtn = element.closest(".a-button, .a-button-inner, [role='button'], button");
  if (parentBtn && parentBtn !== element) {
    if (typeof (parentBtn as HTMLElement).click === "function") {
      try {
        (parentBtn as HTMLElement).click();
      } catch {}
    }
  }

  // If this is an input submit inside a form (e.g. Amazon addToCart form)
  if (element.tagName === "INPUT" && (element as HTMLInputElement).type === "submit" && (element as HTMLInputElement).form) {
    try {
      const form = (element as HTMLInputElement).form;
      if (form && typeof form.requestSubmit === "function") {
        form.requestSubmit(element as HTMLInputElement);
      }
    } catch {}
  }
}

export async function executeAgentAction(
  action: AgentAction,
  doc: Document = typeof document !== "undefined" ? document : (globalThis.document as Document)
): Promise<{ success: boolean; error?: string; navigated?: boolean }> {
  try {
    switch (action.type) {
      case "CLICK": {
        const el = findTargetElement(action.target, doc);
        if (!el) {
          return { success: false, error: `Target element not found: ${action.target.name || action.target.selector}` };
        }
        await highlightElement(el, `Clicking "${action.target.name || 'target'}"`);

        if ("focus" in el && typeof (el as { focus: () => void }).focus === "function") {
          try {
            (el as { focus: () => void }).focus();
          } catch {}
        }

        // Force links with target="_blank" or nested anchor clicks to navigate in the current tab
        const anchor = (el.tagName === "A" ? el : el.closest("a") || el.querySelector("a")) as HTMLAnchorElement | null;
        if (anchor && anchor.href) {
          try {
            anchor.target = "_self";
            anchor.removeAttribute("target");
          } catch {}

          const destHref = anchor.href;
          if (destHref && (destHref.startsWith("http://") || destHref.startsWith("https://"))) {
            try {
              anchor.click();
            } catch {}

            simulateRealClick(el);

            if (doc.defaultView && doc.defaultView.location.href !== destHref) {
              try {
                doc.defaultView.location.href = destHref;
              } catch {}
            }
            return { success: true, navigated: true };
          }
        }

        simulateRealClick(el);
        await waitForSettlement(doc, 120);
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

        const win = doc.defaultView || (typeof window !== "undefined" ? window : globalThis.window);
        const HTMLTextareaCtor = (win as any)?.HTMLTextAreaElement || (typeof HTMLTextAreaElement !== "undefined" ? HTMLTextAreaElement : null);
        const HTMLInputCtor = (win as any)?.HTMLInputElement || (typeof HTMLInputElement !== "undefined" ? HTMLInputElement : null);

        const proto =
          inputEl.tagName === "TEXTAREA"
            ? (HTMLTextareaCtor ? HTMLTextareaCtor.prototype : Object.getPrototypeOf(inputEl))
            : (HTMLInputCtor ? HTMLInputCtor.prototype : Object.getPrototypeOf(inputEl));
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

        if (nativeSetter) {
          nativeSetter.call(inputEl, action.text);
        } else {
          inputEl.value = action.text;
        }

        const Evt = (win && (win as unknown as { Event: typeof Event }).Event) || Event;

        if (typeof inputEl.dispatchEvent === "function") {
          try {
            inputEl.dispatchEvent(new Evt("input", { bubbles: true, composed: true }));
            inputEl.dispatchEvent(new Evt("change", { bubbles: true, composed: true }));
            
            // If the element is a search box or input inside a search form (e.g. Myntra, Flipkart, Amazon, Google)
            const isSearchInput =
              inputEl.type === "search" ||
              inputEl.getAttribute("role") === "searchbox" ||
              /search|query|desktop-searchBar/i.test(inputEl.name || inputEl.id || inputEl.className || inputEl.placeholder || "");

            if (isSearchInput) {
              const KeyboardEvt = (win as any)?.KeyboardEvent || (typeof KeyboardEvent !== "undefined" ? KeyboardEvent : Evt);
              try {
                inputEl.dispatchEvent(new KeyboardEvt("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                inputEl.dispatchEvent(new KeyboardEvt("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                inputEl.dispatchEvent(new KeyboardEvt("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
              } catch {}

              // If inside a form or search container, try submitting or finding search button
              if (inputEl.form && typeof inputEl.form.requestSubmit === "function") {
                try {
                  inputEl.form.requestSubmit();
                } catch {}
              }
            }

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
        const win = doc.defaultView || (typeof window !== "undefined" ? window : globalThis.window);
        const Evt = (win && (win as unknown as { Event: typeof Event }).Event) || Event;
        const selectEl = el as HTMLSelectElement;
        selectEl.value = action.value;
        selectEl.dispatchEvent(new Evt("change", { bubbles: true }));
        await waitForSettlement(doc);
        return { success: true };
      }

      case "SCROLL": {
        const amount = action.amount || 600;
        const dir = (action.direction || "DOWN").toUpperCase();
        try {
          const win = doc.defaultView || (typeof window !== "undefined" ? window : globalThis.window);
          const root = doc.scrollingElement || doc.documentElement || doc.body;

          if (dir === "DOWN") {
            if (win && typeof win.scrollBy === "function") win.scrollBy({ top: amount, left: 0, behavior: "instant" as ScrollBehavior });
            if (root) root.scrollTop += amount;
          } else if (dir === "UP") {
            if (win && typeof win.scrollBy === "function") win.scrollBy({ top: -amount, left: 0, behavior: "instant" as ScrollBehavior });
            if (root) root.scrollTop -= amount;
          } else if (dir === "TOP") {
            if (win && typeof win.scrollTo === "function") win.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
            if (root) root.scrollTop = 0;
          } else if (dir === "BOTTOM") {
            const bottom = Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);
            if (win && typeof win.scrollTo === "function") win.scrollTo({ top: bottom, left: 0, behavior: "instant" as ScrollBehavior });
            if (root) root.scrollTop = bottom;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 300));
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
