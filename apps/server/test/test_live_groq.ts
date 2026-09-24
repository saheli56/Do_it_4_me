import { PlannerService } from "../src/planner.js";
import { loadConfig } from "../src/config.js";
import type { PageObservation } from "@difm/shared";

async function runLiveTest() {
  const config = loadConfig();
  console.log("Testing live Groq planner with model:", config.LLM_MODEL);
  const planner = new PlannerService(config.LLM_API_KEY, config.LLM_BASE_URL, config.LLM_MODEL);

  const mockObservation: PageObservation = {
    url: "https://www.amazon.in/cart/localmarket",
    title: "Amazon.in Shopping Cart",
    interactiveNodes: [
      {
        id: "node-1",
        role: "link",
        name: "Amul Table Butter Salted 100 Gm.",
        selector: "a.product-title",
        bounds: { x: 100, y: 100, width: 200, height: 30 },
        isInteractive: true
      },
      {
        id: "node-2",
        role: "button",
        name: "Delete",
        selector: 'input[value="Delete"]',
        bounds: { x: 150, y: 140, width: 60, height: 25 },
        isInteractive: true
      }
    ],
    timestamp: Date.now()
  };

  const action = await planner.planNextStep(
    "remove amul butter from cart",
    mockObservation,
    []
  );

  console.log("Planned Action Result:", JSON.stringify(action, null, 2));
}

runLiveTest().catch((err) => console.error(err));
