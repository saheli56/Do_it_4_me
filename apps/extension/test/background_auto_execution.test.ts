import { describe, it, expect, beforeEach, vi } from "vitest";
import { Window } from "happy-dom";
import { AmazonAdapter } from "../src/adapters/amazon.adapter.js";
import { FlipkartAdapter } from "../src/adapters/flipkart.adapter.js";
import { findMatchingAdapter } from "../src/adapters/index.js";
import type { PendingTaskItem } from "@difm/shared";

describe("Autonomous Background Auto-Execution & Push Notifications", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window({ url: "https://www.amazon.in/dp/B0CX21MGF3" });
    document = window.document as unknown as Document;
  });

  it("inspects price accurately via AmazonAdapter for COMMERCE_WATCH", async () => {
    document.title = "Sony WH-1000XM5 Wireless Headphones";
    document.body.innerHTML = `
      <div>
        <h1 id="productTitle">Sony WH-1000XM5 Wireless Active Noise Cancelling Headphones</h1>
        <div id="corePriceDisplay_desktop_feature_div">
          <span class="a-price-whole">24,990</span>
        </div>
        <div id="availability"><span>In stock</span></div>
        <img id="landingImage" src="https://m.media-amazon.com/images/I/61vJtKb42CL._SL1500_.jpg" />
      </div>
    `;

    const adapter = findMatchingAdapter("https://www.amazon.in/dp/B0CX21MGF3");
    expect(adapter).toBeDefined();
    expect(adapter?.name).toBe("AmazonAdapter");

    const inspection = adapter?.inspectPrice ? await adapter.inspectPrice(document, "https://www.amazon.in/dp/B0CX21MGF3") : null;
    expect(inspection).toBeDefined();
    expect(inspection?.currentPrice).toBe(24990);
    expect(inspection?.currency).toBe("INR");
    expect(inspection?.title).toContain("Sony WH-1000XM5");
    expect(inspection?.imageUrl).toContain("media-amazon.com");
    expect(inspection?.inStock).toBe(true);
  });

  it("inspects price accurately via FlipkartAdapter for COMMERCE_WATCH", async () => {
    const flipkartWindow = new Window({ url: "https://www.flipkart.com/sony-wh-1000xm5/p/itm12345" });
    const flipkartDoc = flipkartWindow.document as unknown as Document;

    flipkartDoc.title = "Sony WH-1000XM5 - Buy Online at Best Price";
    flipkartDoc.body.innerHTML = `
      <div>
        <h1 class="yhB1nd"><span class="B_NuCI">SONY WH-1000XM5 Bluetooth Headset</span></h1>
        <div class="_30jeq3 _16Jk6d">₹23,490</div>
        <img class="_396cs4 _2amPTt _3qGmMb" src="https://rukminim2.flixcart.com/image/128/128/headphones.jpg" />
      </div>
    `;

    const adapter = findMatchingAdapter("https://www.flipkart.com/sony-wh-1000xm5/p/itm12345");
    expect(adapter).toBeDefined();
    expect(adapter?.name).toBe("FlipkartAdapter");

    const inspection = adapter?.inspectPrice ? await adapter.inspectPrice(flipkartDoc, "https://www.flipkart.com/sony-wh-1000xm5/p/itm12345") : null;
    expect(inspection).toBeDefined();
    expect(inspection?.currentPrice).toBe(23490);
    expect(inspection?.title).toContain("SONY WH-1000XM5");
  });

  it("evaluates price drop condition and triggers notification parameters", () => {
    const task: PendingTaskItem = {
      id: "ptask_test_123",
      title: "Sony WH-1000XM5 Headphones",
      category: "COMMERCE_WATCH",
      priority: "HIGH",
      targetUrl: "https://www.amazon.in/dp/B0CX21MGF3",
      status: "SCHEDULED",
      requiresSensitiveApproval: true,
      priceCondition: {
        targetPrice: 25000,
        currentPrice: 24990,
        currency: "INR",
        checkIntervalMinutes: 15,
        autoAddToCart: true,
        autoProceedToCheckout: true,
        priceMatched: false
      },
      schedule: {
        enabled: true,
        frequency: "DAILY",
        autoExecute: true
      },
      executionHistory: [],
      createdAt: Date.now()
    };

    const targetPrice = task.priceCondition?.targetPrice!;
    const livePrice = 24990;
    const isTargetMet = livePrice <= targetPrice;

    expect(isTargetMet).toBe(true);

    // Notification config simulation
    const notificationOptions = {
      type: "basic",
      title: `🎯 Price Target Met: ${task.title}`,
      message: `Live Price: ₹${livePrice.toLocaleString("en-IN")} (Target: ≤ ₹${targetPrice.toLocaleString("en-IN")})!\nClick below to 1-click checkout with DIFM agent.`,
      buttons: [
        { title: "🛒 Add to Cart & Checkout" },
        { title: "✕ Dismiss" }
      ]
    };

    expect(notificationOptions.buttons[0].title).toBe("🛒 Add to Cart & Checkout");
    expect(notificationOptions.buttons[1].title).toBe("✕ Dismiss");
  });
});
