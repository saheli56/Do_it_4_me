import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { Window } from "happy-dom";
import { createServer } from "@difm/server";
import { createMockApp } from "../src/mock-server.js";
import { extractSemanticNodes } from "@difm/a11y-tree";
import type { PageObservation, ServerMessage, ExtensionMessage } from "@difm/shared";

describe("Vertical Slice: Autonomous Multi-step Workflow Execution", () => {
  let difmServer: Awaited<ReturnType<typeof createServer>>;
  let mockWebsite: ReturnType<typeof createMockApp>;
  let difmPort: number;
  let mockPort: number;

  beforeAll(async () => {
    process.env.LLM_API_KEY = process.env.LLM_API_KEY || "dummy_test_key";
    difmServer = await createServer();
    const difmAddr = await difmServer.app.listen({ port: 0, host: "127.0.0.1" });
    difmPort = parseInt(difmAddr.match(/:(\d+)$/)![1], 10);

    mockWebsite = createMockApp();
    const mockAddr = await mockWebsite.listen({ port: 0, host: "127.0.0.1" });
    mockPort = parseInt(mockAddr.match(/:(\d+)$/)![1], 10);
  });

  afterAll(async () => {
    await difmServer.app.close();
    await mockWebsite.close();
  });

  it("orchestrates a full 3-step cancellation flow with human approval", async () => {
    const taskRes = await fetch(`http://127.0.0.1:${difmPort}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Cancel my subscription" })
    });
    const { taskId } = (await taskRes.json()) as { taskId: string };

    const ws = new WebSocket(`ws://127.0.0.1:${difmPort}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    const window = new Window({ url: `http://127.0.0.1:${mockPort}/` });
    const document = window.document as unknown as Document;

    const page1Html = await (await fetch(`http://127.0.0.1:${mockPort}/`)).text();
    document.body.innerHTML = page1Html;
    const page1Obs: PageObservation = {
      url: `http://127.0.0.1:${mockPort}/`,
      title: "Mock Store - Account",
      interactiveNodes: extractSemanticNodes(document.body),
      timestamp: Date.now()
    };

    difmServer.planner.planNextStep = async (goal, obs, history) => {
      if (obs.url.endsWith("/")) {
        return {
          type: "CLICK",
          target: { id: "node-1", selector: '[data-testid="manage-sub"]', name: "Manage Subscription" },
          description: "Click manage subscription link"
        };
      } else if (obs.url.includes("/cancel-subscription")) {
        return {
          type: "CLICK",
          target: { id: "node-2", selector: '[data-testid="confirm-cancel-button"]', name: "Confirm Cancellation" },
          description: "Confirm subscription cancellation"
        };
      } else {
        return {
          type: "COMPLETE",
          summary: "Subscription successfully cancelled."
        };
      }
    };

    const actionHistory: ServerMessage[] = [];

    const flowPromise = new Promise<void>((resolve, reject) => {
      ws.on("message", async (data) => {
        try {
          const msg = JSON.parse(data.toString()) as ServerMessage;
          console.log("TEST WS RECEIVED:", msg.type, JSON.stringify(msg));
          actionHistory.push(msg);

          if (msg.type === "EXECUTE_ACTION") {
            if (msg.action.type === "CLICK" && (msg.action.target.selector === '[data-testid="manage-sub"]' || msg.action.target.name === "Manage Subscription")) {
              const page2Html = await (await fetch(`http://127.0.0.1:${mockPort}/cancel-subscription`)).text();
              document.body.innerHTML = page2Html;
              const page2Obs: PageObservation = {
                url: `http://127.0.0.1:${mockPort}/cancel-subscription`,
                title: "Cancel Subscription",
                interactiveNodes: extractSemanticNodes(document.body),
                timestamp: Date.now()
              };
              ws.send(JSON.stringify({ type: "OBSERVATION_CAPTURED", taskId, observation: page2Obs }));
            } else if (msg.action.type === "CLICK" && (msg.action.target.selector === '[data-testid="confirm-cancel-button"]' || msg.action.target.name === "Confirm Cancellation")) {
              const page3Html = await (await fetch(`http://127.0.0.1:${mockPort}/confirm-cancellation`, { method: "POST" })).text();
              document.body.innerHTML = page3Html;
              const page3Obs: PageObservation = {
                url: `http://127.0.0.1:${mockPort}/confirm-cancellation`,
                title: "Subscription Cancelled",
                interactiveNodes: extractSemanticNodes(document.body),
                timestamp: Date.now()
              };
              ws.send(JSON.stringify({ type: "OBSERVATION_CAPTURED", taskId, observation: page3Obs }));
            } else if (msg.action.type === "COMPLETE") {
              resolve();
            }
          } else if (msg.type === "REQUEST_APPROVAL") {
            const approvalMsg: ExtensionMessage = {
              type: "USER_APPROVAL_RESPONSE",
              taskId,
              approved: true
            };
            ws.send(JSON.stringify(approvalMsg));
          }
        } catch (err) {
          console.error("Error in test ws handler:", err);
          reject(err);
        }
      });
    });

    ws.send(JSON.stringify({ type: "OBSERVATION_CAPTURED", taskId, observation: page1Obs }));

    await flowPromise;

    expect(actionHistory.length).toBeGreaterThanOrEqual(4);
    expect(actionHistory[0].type).toBe("EXECUTE_ACTION");
    expect(actionHistory[1].type).toBe("REQUEST_APPROVAL");
    expect(actionHistory[2].type).toBe("EXECUTE_ACTION");
    expect(actionHistory[3].type).toBe("EXECUTE_ACTION");

    const completeMsg = actionHistory[3];
    if (completeMsg.type === "EXECUTE_ACTION") {
      expect(completeMsg.action.type).toBe("COMPLETE");
    }

    ws.close();
  });
});
