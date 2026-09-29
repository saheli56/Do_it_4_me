import { PlannerService } from "../src/planner.js";
import { loadConfig } from "../src/config.js";
import type { PageObservation } from "@difm/shared";

async function runLiveTest() {
  const config = loadConfig();
  console.log("Testing live Groq planner with model:", config.LLM_MODEL);
  const planner = new PlannerService(config.LLM_API_KEY, config.LLM_BASE_URL, config.LLM_MODEL);

  const mockObservation: PageObservation = {
    url: "https://www.amazon.in/Sony-WH-1000XM5-Wireless-Cancelling-Headphones/dp/B09XS7JWHH",
    title: "Sony WH-1000XM5 Wireless Industry Leading Active Noise Cancelling Headphones - Amazon.in",
    interactiveNodes: [
      {
        id: "node-50",
        role: "generic",
        name: "Price: ₹28,990.00 M.R.P: ₹34,990.00 (17% off)",
        isInteractive: true
      },
      {
        id: "node-51",
        role: "button",
        name: "Add to Cart",
        selector: "#add-to-cart-button",
        isInteractive: true
      },
      {
        id: "node-52",
        role: "button",
        name: "Buy Now",
        selector: "#buy-now-button",
        isInteractive: true
      }
    ],
    timestamp: Date.now()
  };

  const action = await planner.planNextStep(
    "Automatically add to cart Sony XM5 headphones when the price drops below ₹29,999. (from amazon)",
    mockObservation,
    [
      "Typed 'Sony WH-1000XM5' into search input",
      "Clicked Search button",
      "Clicked product link for Sony WH-1000XM5"
    ]
  );

  console.log("Planned Action Result:", JSON.stringify(action, null, 2));
}

runLiveTest().catch((err) => console.error(err));
