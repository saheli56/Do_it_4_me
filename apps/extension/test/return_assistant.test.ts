import { describe, it, expect, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { AmazonAdapter } from "../src/adapters/amazon.adapter.js";
import { FlipkartAdapter } from "../src/adapters/flipkart.adapter.js";
import type { WorkflowPlan, PageObservation } from "@difm/shared";

describe("1-Click Automated Return & Refund Assistant", () => {
  describe("Amazon Return Execution", () => {
    let adapter: AmazonAdapter;
    let window: Window;
    let document: Document;

    beforeEach(() => {
      adapter = new AmazonAdapter();
    });

    it("locates matching order and clicks return items button on Amazon Your Orders", async () => {
      window = new Window({ url: "https://www.amazon.in/gp/css/order-history" });
      document = window.document as unknown as Document;
      document.body.innerHTML = `
        <div class="order-card" id="order-1">
          <div class="yo-card-title">Wireless Bluetooth Earbuds</div>
          <a href="/gp/css/order-details?orderId=1">Order Details</a>
          <a class="return-or-replace-button" href="/returns/order/1">Return or replace items</a>
        </div>
        <div class="order-card" id="order-2">
          <div class="yo-card-title">Classic Blue Cotton Shirt</div>
          <a class="return-or-replace-button" href="/returns/order/2">Return or replace items</a>
        </div>
      `;

      const plan: WorkflowPlan = {
        id: "plan-ret-1",
        domain: "amazon",
        goalType: "RETURN_OR_REFUND",
        targetUrl: "https://www.amazon.in/gp/css/order-history",
        parameters: {
          itemMatchQuery: "Blue Cotton Shirt",
          returnReason: "Wrong size / Size issue"
        },
        steps: [
          { type: "NAVIGATE", url: "https://www.amazon.in/gp/css/order-history", description: "Navigate" },
          { type: "RETURN_ITEM", itemMatchQuery: "Blue Cotton Shirt", returnReason: "Wrong size / Size issue", description: "Return item" }
        ],
        createdAt: Date.now()
      };

      const obs: PageObservation = {
        url: window.location.href,
        title: "Your Orders",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      const res = await adapter.executeStep(plan.steps[1], document, obs, plan);
      expect(res.handled).toBe(true);
      expect(res.action?.type).toBe("CLICK");
      expect(res.action?.description).toContain("Blue Cotton Shirt");
    });

    it("selects return reason and proceeds on Amazon returns questionnaire", async () => {
      window = new Window({ url: "https://www.amazon.in/returns/order/2" });
      document = window.document as unknown as Document;
      document.body.innerHTML = `
        <form>
          <select id="reasonCode" name="reasonCode">
            <option value="">Select a reason</option>
            <option value="DEFECTIVE">Item defective or doesn't work</option>
            <option value="TOO_LARGE">Size too large / doesn't fit</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea name="customerComment"></textarea>
          <input type="submit" name="continue" value="Continue" />
        </form>
      `;

      const plan: WorkflowPlan = {
        id: "plan-ret-2",
        domain: "amazon",
        goalType: "RETURN_OR_REFUND",
        targetUrl: "https://www.amazon.in/returns/order/2",
        parameters: {
          returnReason: "Wrong size / Size issue"
        },
        steps: [
          { type: "RETURN_ITEM", returnReason: "Wrong size / Size issue", description: "Select reason" }
        ],
        createdAt: Date.now()
      };

      const obs: PageObservation = {
        url: window.location.href,
        title: "Return Items",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      const res = await adapter.executeStep(plan.steps[0], document, obs, plan);
      expect(res.handled).toBe(true);
      expect(res.action?.type).toBe("CLICK");

      const select = document.querySelector("#reasonCode") as HTMLSelectElement;
      expect(select.value).toBe("TOO_LARGE");
    });

    it("detects final return confirmation review page and prepares 1-click summary for user", async () => {
      window = new Window({ url: "https://www.amazon.in/returns/summary" });
      document = window.document as unknown as Document;
      document.body.innerHTML = `
        <div>
          <h2>Review your return</h2>
          <input type="submit" value="Confirm your return" />
        </div>
      `;

      const plan: WorkflowPlan = {
        id: "plan-ret-3",
        domain: "amazon",
        goalType: "RETURN_OR_REFUND",
        targetUrl: "https://www.amazon.in/returns/summary",
        parameters: {
          itemMatchQuery: "Blue Cotton Shirt",
          returnReason: "Wrong size / Size issue"
        },
        steps: [
          { type: "RETURN_ITEM", returnReason: "Wrong size / Size issue", description: "Review summary" }
        ],
        createdAt: Date.now()
      };

      const obs: PageObservation = {
        url: window.location.href,
        title: "Review Return",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      const res = await adapter.executeStep(plan.steps[0], document, obs, plan);
      expect(res.handled).toBe(true);
      expect(res.completed).toBe(true);
      expect(res.summary).toContain("Return request prepared successfully");
    });
  });

  describe("Flipkart Return Execution", () => {
    let adapter: FlipkartAdapter;
    let window: Window;
    let document: Document;

    beforeEach(() => {
      adapter = new FlipkartAdapter();
    });

    it("locates matching order and clicks Return on Flipkart My Orders", async () => {
      window = new Window({ url: "https://www.flipkart.com/account/orders" });
      document = window.document as unknown as Document;
      document.body.innerHTML = `
        <div class="row _2MMtq0">
          <span>Wireless Keyboard RGB</span>
          <button class="_2KpZ6l">Return</button>
        </div>
      `;

      const plan: WorkflowPlan = {
        id: "plan-fk-ret",
        domain: "flipkart",
        goalType: "RETURN_OR_REFUND",
        targetUrl: "https://www.flipkart.com/account/orders",
        parameters: {
          itemMatchQuery: "Wireless Keyboard",
          returnReason: "Item defective or doesn't work"
        },
        steps: [
          { type: "RETURN_ITEM", itemMatchQuery: "Wireless Keyboard", returnReason: "Item defective or doesn't work", description: "Return" }
        ],
        createdAt: Date.now()
      };

      const obs: PageObservation = {
        url: window.location.href,
        title: "My Orders",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      const res = await adapter.executeStep(plan.steps[0], document, obs, plan);
      expect(res.handled).toBe(true);
      expect(res.action?.type).toBe("CLICK");
    });
  });
});
