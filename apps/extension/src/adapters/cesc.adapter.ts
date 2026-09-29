import type { SiteAdapter, AdapterExecutionResult } from "./types.js";
import type { PageObservation, WorkflowStep, WorkflowPlan } from "@difm/shared";

export class CescAdapter implements SiteAdapter {
  name = "CescAdapter";

  matches(url: string): boolean {
    return /cesc\.(co\.in|com)/i.test(url);
  }

  async executeStep(
    step: WorkflowStep,
    doc: Document,
    observation: PageObservation,
    plan: WorkflowPlan
  ): Promise<AdapterExecutionResult> {
    const url = (observation.url || doc.defaultView?.location.href || "").toLowerCase();

    // 1. If on overview / options hub page (e.g. online_payment_options.php)
    if (url.includes("option") || url.includes("quick") || doc.querySelector('a[href*="monthlybill"]')) {
      const cycle = plan.parameters.billingCycle || "Monthly Bill";
      let targetLink: HTMLAnchorElement | null = null;

      if (cycle === "Monthly Bill") {
        targetLink = doc.querySelector('a[href*="monthlybill.php"], a[href*="monthly"]') as HTMLAnchorElement | null;
      } else if (cycle === "Advance Payment") {
        targetLink = doc.querySelector('a[href*="advance"], a[href*="adv"]') as HTMLAnchorElement | null;
      } else if (cycle === "Quarterly Bill") {
        targetLink = doc.querySelector('a[href*="quarter"]') as HTMLAnchorElement | null;
      }

      if (!targetLink) {
        targetLink = doc.querySelector('a[href*="monthlybill.php"]') as HTMLAnchorElement | null;
      }

      if (targetLink && targetLink.href) {
        targetLink.target = "_self";
        const destHref = targetLink.href;
        if (doc.defaultView && doc.defaultView.location.href !== destHref) {
          doc.defaultView.location.href = destHref;
        } else {
          targetLink.click();
        }

        return {
          handled: true,
          navigated: true,
          action: {
            type: "CLICK",
            target: { id: "bill-cycle-link", name: cycle, role: "link", selector: 'a[href*="monthlybill"]' },
            description: `Navigated to ${cycle} payment form`
          }
        };
      }
    }

    // 2. If on payment form (e.g. monthlybill.php)
    const consumerInput = doc.querySelector('input[name="compno"], input[id="compno"], input[name*="consumer" i], input[placeholder*="consumer" i], input[placeholder*="11 digit" i]') as HTMLInputElement | null;
    const consumerNumber = plan.parameters.consumerNumber || "102938492019";

    if (consumerInput) {
      if (consumerInput.value !== consumerNumber) {
        consumerInput.focus();
        consumerInput.value = consumerNumber;
        consumerInput.dispatchEvent(new Event("input", { bubbles: true }));
        consumerInput.dispatchEvent(new Event("change", { bubbles: true }));

        const submitBtn = doc.querySelector('input[type="submit"], button[type="submit"], input[value*="Proceed" i], input[value*="Submit" i]') as HTMLElement | null;
        if (submitBtn) {
          submitBtn.click();
        }

        return {
          handled: true,
          action: {
            type: "TYPE",
            target: { id: "compno", name: "Consumer Number", role: "textbox", selector: 'input[name="compno"]' },
            text: consumerNumber,
            clearExisting: true,
            maskInput: false,
            description: `Entered consumer number "${consumerNumber}" and submitted payment query`
          }
        };
      }
    }

    // 3. Bill details / QR Code screen
    const qrElem = doc.querySelector('img[src*="qr" i], canvas, [id*="qr" i], [class*="qr" i]');
    if (qrElem || url.includes("billdetail") || url.includes("payment")) {
      return {
        handled: true,
        completed: true,
        summary: "Electricity bill details loaded. Ready for UPI / QR scan payment."
      };
    }

    return { handled: false };
  }
}
