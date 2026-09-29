import { describe, it, expect, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { FlipkartAdapter, extractPriceNumber, isExactModelMatch } from "../src/adapters/flipkart.adapter.js";
import { findMatchingAdapter } from "../src/adapters/index.js";
import type { PageObservation, WorkflowPlan } from "@difm/shared";

describe("Flipkart Adapter & Multi-Store Helpers", () => {
  let window: Window;
  let document: Document;
  const adapter = new FlipkartAdapter();

  beforeEach(() => {
    window = new Window({ url: "https://www.flipkart.com" });
    document = window.document as unknown as Document;
  });

  describe("extractPriceNumber", () => {
    it("parses prices with Indian rupee symbol, commas, and decimals", () => {
      expect(extractPriceNumber("₹24,999")).toBe(24999);
      expect(extractPriceNumber("₹ 1,29,999.00")).toBe(129999);
      expect(extractPriceNumber("Rs. 4,500")).toBe(4500);
      expect(extractPriceNumber("INR 999")).toBe(999);
      expect(extractPriceNumber("29999")).toBe(29999);
      expect(extractPriceNumber("")).toBe(0);
    });
  });

  describe("isExactModelMatch", () => {
    it("correctly matches exact model codes and rejects wrong model numbers", () => {
      // WH-1000XM5 vs WF-1000XM5 vs WH-1000XM4
      expect(isExactModelMatch("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Sony WH-1000XM5")).toBe(true);
      expect(isExactModelMatch("Sony WF-1000XM5 Truly Wireless Earbuds", "Sony WH-1000XM5")).toBe(false);
      expect(isExactModelMatch("Sony WH-1000XM4 Wireless Headphones", "Sony WH-1000XM5")).toBe(false);
      expect(isExactModelMatch("Apple iPhone 15 Pro Max 256GB", "iPhone 15 Pro Max")).toBe(true);
      expect(isExactModelMatch("Apple iPhone 14 Pro Max 256GB", "iPhone 15 Pro Max")).toBe(false);
    });
  });

  describe("Adapter routing & URL matching", () => {
    it("matches flipkart.com URLs via adapter and index finder", () => {
      expect(adapter.matches("https://www.flipkart.com/search?q=sony+xm5")).toBe(true);
      expect(adapter.matches("https://flipkart.com/p/itm12345")).toBe(true);
      expect(adapter.matches("https://www.amazon.in")).toBe(false);

      const matched = findMatchingAdapter("https://www.flipkart.com/headphones");
      expect(matched).toBeDefined();
      expect(matched?.name).toBe("FlipkartAdapter");
    });
  });

  describe("executeStep", () => {
    const samplePlan: WorkflowPlan = {
      id: "plan_test_flipkart",
      domain: "flipkart",
      goalType: "PURCHASE_PRICE_DROP",
      targetUrl: "https://www.flipkart.com",
      parameters: {
        productQuery: "Sony WH-1000XM5",
        productModel: "Sony WH-1000XM5",
        maxPriceThreshold: 26000
      },
      steps: [],
      createdAt: Date.now()
    };

    const emptyObs: PageObservation = {
      url: "https://www.flipkart.com",
      title: "Flipkart",
      interactiveNodes: [],
      timestamp: Date.now()
    };

    it("executes SEARCH step on Flipkart input", async () => {
      document.body.innerHTML = `
        <form>
          <input name="q" type="text" placeholder="Search for Products, Brands and More" />
          <button type="submit">Search</button>
        </form>
      `;

      const res = await adapter.executeStep(
        { type: "SEARCH", query: "Sony WH-1000XM5", description: "Search" },
        document,
        emptyObs,
        samplePlan
      );

      expect(res.handled).toBe(true);
      expect(res.action?.type).toBe("TYPE");
      expect((document.querySelector('input[name="q"]') as HTMLInputElement).value).toBe("Sony WH-1000XM5");
    });

    it("executes SELECT_PRODUCT step with exact title matching", async () => {
      document.body.innerHTML = `
        <div class="results">
          <a href="/sony-wf-1000xm5/p/itm1" class="_1fQZEK">
            <div class="_4rR01T">Sony WF-1000XM5 Truly Wireless Earbuds</div>
          </a>
          <a href="/sony-wh-1000xm5/p/itm2" class="_1fQZEK">
            <div class="_4rR01T">Sony WH-1000XM5 Wireless Noise Cancelling Headphones</div>
          </a>
        </div>
      `;

      const obs: PageObservation = {
        url: "https://www.flipkart.com/search?q=sony",
        title: "Search Results",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      const res = await adapter.executeStep(
        { type: "SELECT_PRODUCT", matchQuery: "Sony WH-1000XM5", description: "Select product" },
        document,
        obs,
        samplePlan
      );

      expect(res.handled).toBe(true);
      expect(res.action?.type).toBe("CLICK");
      expect(res.action?.target.name).toContain("Sony WH-1000XM5");
    });

    it("executes VERIFY_PRICE_AND_CART and adds to cart when price <= threshold", async () => {
      document.body.innerHTML = `
        <div class="Nx9bqj CxhGGd">₹24,990</div>
        <button class="_2KpZ6l _2U9uAL">Add to Cart</button>
      `;

      const obs: PageObservation = {
        url: "https://www.flipkart.com/sony-wh-1000xm5/p/itm2",
        title: "Sony WH-1000XM5",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      let buttonClicked = false;
      document.querySelector("button")?.addEventListener("click", () => {
        buttonClicked = true;
      });

      const res = await adapter.executeStep(
        { type: "VERIFY_PRICE_AND_CART", maxPriceThreshold: 26000, description: "Verify price and add to cart" },
        document,
        obs,
        samplePlan
      );

      expect(res.handled).toBe(true);
      expect(res.action?.type).toBe("CLICK");
      expect(buttonClicked).toBe(true);
    });

    it("does not add to cart and completes when price > threshold", async () => {
      document.body.innerHTML = `
        <div class="Nx9bqj CxhGGd">₹29,990</div>
        <button class="_2KpZ6l _2U9uAL">Add to Cart</button>
      `;

      const obs: PageObservation = {
        url: "https://www.flipkart.com/sony-wh-1000xm5/p/itm2",
        title: "Sony WH-1000XM5",
        interactiveNodes: [],
        timestamp: Date.now()
      };

      const res = await adapter.executeStep(
        { type: "VERIFY_PRICE_AND_CART", maxPriceThreshold: 25000, description: "Verify price and add to cart" },
        document,
        obs,
        samplePlan
      );

      expect(res.handled).toBe(true);
      expect(res.completed).toBe(true);
      expect(res.summary).toContain("Price condition not met on Flipkart");
      expect(res.summary).toContain("29,990");
    });
  });
});
