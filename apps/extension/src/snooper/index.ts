import { detectBillOnDocument, type DetectedBillInfo } from "./bill-detector.js";
import { renderFloatingBillPill } from "./floating-pill.js";

export * from "./bill-detector.js";
export * from "./floating-pill.js";

let snooperInitialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function inspectAndRenderBill(): DetectedBillInfo | null {
  try {
    const bill = detectBillOnDocument(document, window.location.href);
    if (bill) {
      renderFloatingBillPill(bill);
      return bill;
    }
  } catch (err) {
    console.debug("[DIFM Snooper] Bill scan error:", err);
  }
  return null;
}

export function initBillSnooper(): void {
  if (snooperInitialized) return;
  snooperInitialized = true;

  // Run initial scan after page settles
  const scheduleScan = (delayMs = 1200) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      inspectAndRenderBill();
    }, delayMs);
  };

  if (document.readyState === "complete") {
    scheduleScan(1000);
  } else {
    window.addEventListener("load", () => scheduleScan(1000), { once: true });
    document.addEventListener("DOMContentLoaded", () => scheduleScan(1200), { once: true });
  }

  // Observe dynamically loaded SPAs / AJAX bills with mutation observer
  let mutationCount = 0;
  const observer = new MutationObserver(() => {
    mutationCount++;
    if (mutationCount < 20) {
      scheduleScan(1800);
    }
  });

  try {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  } catch {}
}
