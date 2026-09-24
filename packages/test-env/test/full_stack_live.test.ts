import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { Window } from "happy-dom";
import { createServer } from "@difm/server";
import { extractSemanticNodes } from "@difm/a11y-tree";
import { executeAgentAction, findTargetElement } from "../../../apps/extension/src/executor.js";
import type { PageObservation, ServerMessage, ExtensionMessage } from "@difm/shared";

import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(__dirname, "../../../apps/server/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  }
} catch {
  // Ignored
}

describe("Full Stack Live Test: Frontend Extension Runtime + Backend LLM Planner (Groq)", () => {
  let serverInstance: Awaited<ReturnType<typeof createServer>>;
  let port: number;

  beforeAll(async () => {
    serverInstance = await createServer();
    const addr = await serverInstance.app.listen({ port: 0, host: "127.0.0.1" });
    port = parseInt(addr.match(/:(\d+)$/)![1], 10);
  });

  afterAll(async () => {
    await serverInstance.app.close();
  });

  it("completes full live loop: DOM extraction -> Groq planning -> frontend action execution on Amazon Cart DOM", async () => {
    // 1. Setup simulated browser environment with Amazon Cart DOM
    const window = new Window({ url: "https://www.amazon.in/cart/localmarket" });
    const document = window.document as unknown as Document;

    document.body.innerHTML = `
      <div id="cart-items">
        <h2>Delivery from Amazon Fresh (1 item)</h2>
        <div class="sc-list-item" data-item-id="item-amul-100g">
          <a class="product-title">Amul Table Butter Salted 100 Gm.</a>
          <span class="product-price">₹63.00</span>
          <button id="delete-amul-btn" data-testid="delete-amul-button" name="Delete">Delete</button>
        </div>
      </div>
    `;

    const button = document.getElementById("delete-amul-btn") as HTMLButtonElement;
    let buttonClicked = false;
    button.onclick = () => {
      buttonClicked = true;
    };

    // 2. Client initiates task via HTTP API
    const createRes = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "remove amul butter from cart" })
    });
    const { taskId } = (await createRes.json()) as { taskId: string };

    // 3. Client connects to WebSocket
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    // 4. Frontend extracts page observation using @difm/a11y-tree
    const interactiveNodes = extractSemanticNodes(document.body);
    const observation: PageObservation = {
      url: "https://www.amazon.in/cart/localmarket",
      title: "Amazon.in Shopping Cart",
      interactiveNodes,
      timestamp: Date.now()
    };

    // 5. Send observation to backend and execute planned action on frontend
    const executedActionPromise = new Promise<ServerMessage>((resolve) => {
      ws.on("message", async (data) => {
        const msg = JSON.parse(data.toString()) as ServerMessage;

        if (msg.type === "EXECUTE_ACTION") {
          // Run frontend action executor directly on the DOM
          const execResult = await executeAgentAction(msg.action, document);
          expect(execResult.success).toBe(true);
          resolve(msg);
        }
      });
    });

    const observationMsg: ExtensionMessage = {
      type: "OBSERVATION_CAPTURED",
      taskId,
      observation
    };
    ws.send(JSON.stringify(observationMsg));

    const serverResponse = await executedActionPromise;

    // 6. Verify assertions
    expect(serverResponse.type).toBe("EXECUTE_ACTION");
    if (serverResponse.type === "EXECUTE_ACTION") {
      expect(serverResponse.action.type).toBe("CLICK");
      expect(buttonClicked).toBe(true);
    }

    ws.close();
  }, 20000);
});
