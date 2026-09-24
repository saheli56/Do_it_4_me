import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { createServer } from "../src/index.js";
import type {
  PageObservation,
  ServerMessage,
  ExtensionMessage
} from "@difm/shared";

describe("Complete End-to-End WebSocket Orchestration Lifecycle", () => {
  let serverInstance: Awaited<ReturnType<typeof createServer>>;
  let port: number;

  beforeAll(async () => {
    process.env.LLM_API_KEY = process.env.LLM_API_KEY || "dummy_key";
    serverInstance = await createServer();
    
    serverInstance.planner.planNextStep = async () => {
      return {
        type: "CLICK",
        target: { id: "node-1", name: "Cancel Subscription" },
        description: "Click cancel subscription button"
      };
    };

    const address = await serverInstance.app.listen({ port: 0, host: "127.0.0.1" });
    const match = address.match(/:(\d+)$/);
    port = match ? parseInt(match[1], 10) : 3001;
  });

  afterAll(async () => {
    await serverInstance.app.close();
  });

  it("handles observation -> plan -> user approval lifecycle over WebSocket", async () => {
    const taskRes = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Cancel Netflix Subscription" })
    });
    const { taskId } = (await taskRes.json()) as { taskId: string };

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    const mockObservation: PageObservation = {
      url: "https://netflix.com/your-account",
      title: "Account Settings",
      interactiveNodes: [
        {
          id: "node-1",
          role: "button",
          name: "Cancel Subscription",
          selector: "button.btn-cancel",
          bounds: { x: 50, y: 150, width: 200, height: 45 },
          isInteractive: true
        }
      ],
      timestamp: Date.now()
    };

    const serverMessagesPromise = new Promise<ServerMessage[]>((resolve) => {
      const messages: ServerMessage[] = [];
      ws.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString()) as ServerMessage;
        messages.push(parsed);

        if (parsed.type === "REQUEST_APPROVAL") {
          const approvalMsg: ExtensionMessage = {
            type: "USER_APPROVAL_RESPONSE",
            taskId,
            approved: true
          };
          ws.send(JSON.stringify(approvalMsg));
        } else if (parsed.type === "EXECUTE_ACTION") {
          resolve(messages);
        }
      });
    });

    const observationMsg: ExtensionMessage = {
      type: "OBSERVATION_CAPTURED",
      taskId,
      observation: mockObservation
    };
    ws.send(JSON.stringify(observationMsg));

    const receivedMessages = await serverMessagesPromise;

    expect(receivedMessages.length).toBeGreaterThanOrEqual(2);
    expect(receivedMessages[0].type).toBe("REQUEST_APPROVAL");
    expect(receivedMessages[1].type).toBe("EXECUTE_ACTION");

    ws.close();
  });
});
