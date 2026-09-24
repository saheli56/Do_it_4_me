import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { createServer } from "../src/index.js";
import type { PageObservation, ServerMessage } from "@difm/shared";

describe("Server HTTP and WebSocket Integration Test", () => {
  let serverInstance: Awaited<ReturnType<typeof createServer>>;
  let port: number;

  beforeAll(async () => {
    process.env.LLM_API_KEY = process.env.LLM_API_KEY || "dummy_test_key";
    serverInstance = await createServer();
    const address = await serverInstance.app.listen({ port: 0, host: "127.0.0.1" });
    const match = address.match(/:(\d+)$/);
    port = match ? parseInt(match[1], 10) : 3001;
  });

  afterAll(async () => {
    await serverInstance.app.close();
  });

  it("responds to /health endpoint", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("creates a new task via POST /tasks", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Return defective item" })
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { taskId: string; goal: string; state: string };
    expect(body.taskId).toMatch(/^task_/);
    expect(body.goal).toBe("Return defective item");
    expect(body.state).toBe("UNDERSTANDING");
  });

  it("connects via WebSocket and exchanges messages", async () => {
    const taskRes = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Test websocket stream" })
    });
    const { taskId } = (await taskRes.json()) as { taskId: string };

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });
});
