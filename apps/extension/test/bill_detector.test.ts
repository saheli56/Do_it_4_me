import { describe, it, expect, beforeEach } from "vitest";
import { Window } from "happy-dom";
import {
  detectBillOnDocument,
  parseAmountDigits,
  parseDueDateString
} from "../src/snooper/bill-detector.js";

describe("Tab Snooper & Bill Due-Date Detector", () => {
  describe("Helper Parsers", () => {
    it("parses rupee amount strings accurately", () => {
      expect(parseAmountDigits("₹1,450")?.num).toBe(1450);
      expect(parseAmountDigits("Rs. 2,890.50")?.num).toBe(2890.5);
      expect(parseAmountDigits("INR 500")?.num).toBe(500);
      expect(parseAmountDigits("Amount: ₹12,499.00")?.num).toBe(12499);
      expect(parseAmountDigits("No amount here")).toBeNull();
    });

    it("parses due date strings in various formats", () => {
      const rel = parseDueDateString("Due in 4 days");
      expect(rel.daysRemaining).toBe(4);

      const d1 = parseDueDateString("Due Date: 15-10-2026");
      expect(d1.isoDate).toBe("2026-10-15");

      const d2 = parseDueDateString("Pay before 25 Nov 2026");
      expect(d2.isoDate).toBe("2026-11-25");
    });
  });

  describe("Portal Bill Detection", () => {
    let window: Window;
    let document: Document;

    it("detects CESC electricity bill with amount, due date and consumer ID", () => {
      window = new Window({ url: "https://www.cesc.co.in/quickbill" });
      document = window.document as unknown as Document;
      document.title = "CESC Limited - Online Bill Payment";
      document.body.innerHTML = `
        <div class="bill-summary">
          <h2>CESC Electricity Bill</h2>
          <div class="customer-info">
            <span class="label">Consumer No:</span>
            <span id="consumerNo">02049182341</span>
          </div>
          <div class="bill-details">
            <div class="total-payable">Amount Due: ₹1,450</div>
            <div class="due-date">Due in 4 days</div>
          </div>
        </div>
      `;

      const result = detectBillOnDocument(document, window.location.href);
      expect(result).not.toBeNull();
      expect(result?.providerName).toBe("CESC Electricity");
      expect(result?.category).toBe("ELECTRICITY");
      expect(result?.dueAmount).toBe("₹1,450");
      expect(result?.dueAmountNum).toBe(1450);
      expect(result?.consumerNumber).toBe("02049182341");
      expect(result?.daysRemaining).toBe(4);
      expect(result?.summaryText).toContain("CESC Electricity Found: ₹1,450 due in 4 days");
    });

    it("detects WBSEDCL quarterly electricity bill", () => {
      window = new Window({ url: "https://www.wbsedcl.in/portal/payment" });
      document = window.document as unknown as Document;
      document.title = "WBSEDCL Portal - View & Pay Bill";
      document.body.innerHTML = `
        <div class="bill-card">
          <h1>WBSEDCL Consumer Services</h1>
          <div>Consumer ID: 502918471</div>
          <div class="payable_amount">Total Payable: ₹3,120</div>
          <div class="due-date">Pay By: 20-11-2026</div>
        </div>
      `;

      const result = detectBillOnDocument(document, window.location.href);
      expect(result).not.toBeNull();
      expect(result?.providerName).toBe("WBSEDCL Electricity");
      expect(result?.billingCycle).toBe("QUARTERLY");
      expect(result?.dueAmount).toBe("₹3,120");
      expect(result?.consumerNumber).toBe("502918471");
      expect(result?.dueDate).toBe("2026-11-20");
    });

    it("detects Airtel broadband bill", () => {
      window = new Window({ url: "https://www.airtel.in/broadband-bill-pay" });
      document = window.document as unknown as Document;
      document.title = "Airtel Xstream Fiber Payment";
      document.body.innerHTML = `
        <div class="airtel-container">
          <h2>Airtel Fiber Broadband</h2>
          <div class="account">Account No: 03324910291</div>
          <div class="amount-due">Bill Amount: ₹943</div>
          <div class="payment-due">Payment Due Date: 12-10-2026</div>
        </div>
      `;

      const result = detectBillOnDocument(document, window.location.href);
      expect(result).not.toBeNull();
      expect(result?.providerName).toBe("Airtel");
      expect(result?.category).toBe("INTERNET");
      expect(result?.dueAmount).toBe("₹943");
      expect(result?.consumerNumber).toBe("03324910291");
    });

    it("detects Jio mobile postpaid bill", () => {
      window = new Window({ url: "https://www.jio.com/selfcare/paybill" });
      document = window.document as unknown as Document;
      document.title = "Jio Postpaid Bill Payment";
      document.body.innerHTML = `
        <div class="jio-bill">
          <h3>Jio Postpaid Bill</h3>
          <p>Customer ID: 9830012345</p>
          <p class="due-amount">Outstanding Amount: ₹470.82</p>
          <p class="due-date">Due in 6 days</p>
        </div>
      `;

      const result = detectBillOnDocument(document, window.location.href);
      expect(result).not.toBeNull();
      expect(result?.providerName).toBe("Jio");
      expect(result?.category).toBe("MOBILE");
      expect(result?.dueAmountNum).toBe(470.82);
    });

    it("returns null for non-billing sites like Wikipedia or Google", () => {
      window = new Window({ url: "https://en.wikipedia.org/wiki/Electricity" });
      document = window.document as unknown as Document;
      document.title = "Electricity - Wikipedia";
      document.body.innerHTML = `<p>Electricity is the set of physical phenomena associated with the presence and motion of matter that has a property of electric charge.</p>`;

      const result = detectBillOnDocument(document, window.location.href);
      expect(result).toBeNull();
    });
  });

  describe("Floating Pill Shadow DOM & 1-Click Scheduling", () => {
    let window: Window;
    let document: Document;

    beforeEach(() => {
      window = new Window({ url: "https://www.cesc.co.in/quickbill" });
      document = window.document as unknown as Document;
      (globalThis as any).window = window;
      (globalThis as any).document = document;
      (globalThis as any).sessionStorage = window.sessionStorage;
      (globalThis as any).chrome = {
        runtime: {
          sendMessage: () => {}
        }
      };
    });

    it("renders floating pill inside isolated Shadow DOM with details and buttons", async () => {
      const { renderFloatingBillPill } = await import("../src/snooper/floating-pill.js");

      renderFloatingBillPill({
        providerName: "CESC Electricity",
        category: "ELECTRICITY",
        billingCycle: "MONTHLY",
        dueAmount: "₹1,450",
        dueAmountNum: 1450,
        dueDate: "2026-10-04",
        daysRemaining: 4,
        consumerNumber: "02049182341",
        portalUrl: "https://www.cesc.co.in/quickbill",
        summaryText: "CESC Electricity Found: ₹1,450 due in 4 days"
      });

      const host = document.getElementById("difm-bill-snooper-host");
      expect(host).not.toBeNull();
      expect(host?.shadowRoot).not.toBeNull();

      const shadow = host!.shadowRoot!;
      const title = shadow.querySelector(".pill-title");
      expect(title?.textContent).toBe("CESC Electricity Found: ₹1,450 due in 4 days");

      const subtitle = shadow.querySelector(".pill-subtitle");
      expect(subtitle?.textContent).toContain("02049182341");

      const actionBtn = shadow.querySelector(".action-btn");
      expect(actionBtn?.textContent).toContain("Automate & Schedule");

      const closeBtn = shadow.querySelector(".close-btn");
      expect(closeBtn).not.toBeNull();
    });

    it("automates and schedules task when action button is clicked", async () => {
      let postedBody: any = null;
      (globalThis as any).fetch = async (url: string, opts: any) => {
        if (url.includes("/pending-tasks")) {
          postedBody = JSON.parse(opts.body);
          return { ok: true, json: async () => ({ success: true, task: postedBody }) };
        }
        return { ok: false };
      };

      const { renderFloatingBillPill } = await import("../src/snooper/floating-pill.js");

      renderFloatingBillPill({
        providerName: "CESC Electricity",
        category: "ELECTRICITY",
        billingCycle: "MONTHLY",
        dueAmount: "₹1,450",
        dueAmountNum: 1450,
        dueDate: "2026-10-04",
        daysRemaining: 4,
        consumerNumber: "02049182341",
        portalUrl: "https://www.cesc.co.in/quickbill",
        summaryText: "CESC Electricity Found: ₹1,450 due in 4 days"
      });

      const host = document.getElementById("difm-bill-snooper-host")!;
      const shadow = host.shadowRoot!;
      const actionBtn = shadow.querySelector(".action-btn") as HTMLButtonElement;

      // Click Automate & Schedule
      actionBtn.click();

      // Allow async fetch
      await new Promise((r) => setTimeout(r, 50));

      expect(postedBody).not.toBeNull();
      expect(postedBody.title).toBe("Pay CESC Electricity (₹1,450)");
      expect(postedBody.category).toBe("ELECTRICITY");
      expect(postedBody.billerInfo.consumerNumber).toBe("02049182341");
      expect(postedBody.schedule.enabled).toBe(true);
      expect(postedBody.schedule.autoExecute).toBe(true);
      expect(actionBtn.textContent).toContain("Scheduled!");
    });

    it("dismisses pill and sets session snooze on close click", async () => {
      const { renderFloatingBillPill } = await import("../src/snooper/floating-pill.js");

      renderFloatingBillPill({
        providerName: "Airtel",
        category: "INTERNET",
        billingCycle: "MONTHLY",
        dueAmount: "₹943",
        portalUrl: "https://www.airtel.in/pay",
        summaryText: "Airtel Found: ₹943"
      });

      const host = document.getElementById("difm-bill-snooper-host")!;
      const shadow = host.shadowRoot!;
      const closeBtn = shadow.querySelector(".close-btn") as HTMLButtonElement;

      closeBtn.click();

      expect(window.sessionStorage.getItem("difm_snooze_www.cesc.co.in")).toBe("true");
    });
  });
});
