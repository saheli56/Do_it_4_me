import fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import { PlannerService } from "./planner.js";
import { TaskOrchestrator } from "./orchestrator.js";
import { IntentCompiler } from "./compiler.js";
import { PendingTaskManager } from "./pending-task-manager.js";
import { ProfileVaultManager } from "./profile-vault-manager.js";
import {
  ExtensionMessageSchema,
  TaskCreateRequestSchema,
  CreatePendingTaskSchema,
  CreateUserProfileSchema,
  UpdateUserProfileSchema,
  type ServerMessage
} from "@difm/shared";

export async function createServer() {
  const config = loadConfig();
  const app = fastify({ logger: false });

  await app.register(cors, { origin: "*" });
  await app.register(websocket);

  const planner = new PlannerService(
    config.LLM_API_KEY,
    config.LLM_BASE_URL,
    config.LLM_MODEL
  );
  const compiler = new IntentCompiler(
    config.LLM_API_KEY,
    config.LLM_BASE_URL,
    config.LLM_MODEL
  );
  const orchestrator = new TaskOrchestrator(planner, compiler);
  const pendingTaskManager = new PendingTaskManager();
  const profileVaultManager = new ProfileVaultManager();

  app.get("/health", async () => {
    return { status: "ok", timestamp: Date.now() };
  });

  // Mock Amazon Orders & Return Simulation Playground for Safe Testing
  app.get("/mock-amazon-orders", async (req, reply) => {
    reply.type("text/html");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Amazon.in - Your Orders</title>
  <style>
    body { font-family: Arial, sans-serif; background: #eaeded; margin: 0; padding: 20px; color: #0f1111; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 20px; }
    .order-card { background: #fff; border: 1px solid #d5d9d9; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .order-header { background: #f0f2f2; padding: 12px 18px; display: flex; justify-content: space-between; font-size: 12px; color: #565959; border-bottom: 1px solid #d5d9d9; }
    .order-body { padding: 18px; display: flex; justify-content: space-between; align-items: center; }
    .yo-card-title { font-size: 16px; font-weight: bold; color: #007185; margin-bottom: 6px; }
    .item-meta { font-size: 13px; color: #565959; }
    .return-or-replace-button { background: #fff; border: 1px solid #d5d9d9; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; text-decoration: none; color: #0f1111; font-weight: 500; display: inline-block; box-shadow: 0 2px 5px rgba(213,217,217,0.5); }
    .return-or-replace-button:hover { background: #f7fafa; }
    .return-panel { display: none; background: #fff; border: 1px solid #d5d9d9; border-radius: 8px; padding: 24px; margin-top: 16px; }
    select, textarea { width: 100%; padding: 8px; margin-top: 6px; margin-bottom: 12px; border: 1px solid #888; border-radius: 4px; box-sizing: border-box; }
    input[type="submit"], button.submit-btn { background: #ffd814; border: 1px solid #fcd200; border-radius: 8px; padding: 10px 20px; font-weight: bold; cursor: pointer; }
    input[type="submit"]:hover { background: #f7ca00; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Your Orders (Safe Test Simulator)</h1>

    <div class="order-card" id="order-1">
      <div class="order-header">
        <div>ORDER PLACED: 26 September 2026</div>
        <div>TOTAL: ₹1,299.00</div>
        <div>ORDER # 402-9182341-9281723</div>
      </div>
      <div class="order-body">
        <div>
          <div class="yo-card-title">Classic Blue Cotton Shirt</div>
          <div class="item-meta">Size: XL | Sold by: Retail Brand Store</div>
        </div>
        <div>
          <a class="return-or-replace-button" href="#return-form" onclick="openReturnForm('Classic Blue Cotton Shirt')">Return or replace items</a>
        </div>
      </div>
    </div>

    <div class="order-card" id="order-2">
      <div class="order-header">
        <div>ORDER PLACED: 18 September 2026</div>
        <div>TOTAL: ₹29,990.00</div>
        <div>ORDER # 402-5819204-1029384</div>
      </div>
      <div class="order-body">
        <div>
          <div class="yo-card-title">Sony WH-1000XM5 Noise Cancelling Headphones</div>
          <div class="item-meta">Color: Black | Electronic Device</div>
        </div>
        <div>
          <a class="return-or-replace-button" href="#return-form" onclick="openReturnForm('Sony WH-1000XM5')">Return or replace items</a>
        </div>
      </div>
    </div>

    <div id="return-panel" class="return-panel">
      <h2 id="return-item-heading">Return Items: Choose a reason</h2>
      <form onsubmit="proceedToSummary(event)">
        <label for="reasonCode"><b>Why are you returning this?</b></label>
        <select id="reasonCode" name="reasonCode">
          <option value="">Select a reason</option>
          <option value="DEFECTIVE">Item defective or doesn't work</option>
          <option value="TOO_LARGE">Wrong size / Size issue (Too large)</option>
          <option value="TOO_SMALL">Wrong size / Size issue (Too small)</option>
          <option value="QUALITY">Quality not as expected</option>
          <option value="NOT_NEEDED">No longer needed</option>
        </select>

        <label for="comment"><b>Comments:</b></label>
        <textarea id="comment" name="comment" rows="2" placeholder="Tell us more..."></textarea>

        <input type="submit" name="continue" value="Continue" />
      </form>
    </div>

    <div id="summary-panel" class="return-panel" style="background: #f0fdf4; border-color: #86efac;">
      <h2 style="color: #166534;">✓ Return Request Summary Ready for Review</h2>
      <p><b>Refund Destination:</b> Original Payment Method (Credit Card)</p>
      <p><b>Pickup Schedule:</b> Free Doorstep Pickup Scheduled for Tomorrow 10:00 AM - 1:00 PM</p>
      <input type="submit" value="Confirm your return" style="background: #16a34a; color: #fff; border-color: #15803d;" onclick="alert('Return Submitted Successfully in Simulator!')" />
    </div>
  </div>

  <script>
    function openReturnForm(title) {
      document.getElementById('return-panel').style.display = 'block';
      document.getElementById('return-item-heading').innerText = 'Return Item: ' + title;
    }
    function proceedToSummary(e) {
      e.preventDefault();
      document.getElementById('return-panel').style.display = 'none';
      document.getElementById('summary-panel').style.display = 'block';
    }
  </script>
</body>
</html>`;
  });

  // Bill Document Extraction Endpoint (Drag & Drop / Paste)
  app.post("/extract-bill", async (req, reply) => {
    const body = req.body as {
      text?: string;
      imageBase64?: string;
      mimeType?: string;
      filename?: string;
    };

    if (!body || (!body.text && !body.imageBase64)) {
      return reply.status(400).send({ error: "Either text or imageBase64 is required" });
    }

    try {
      const extracted = await planner.extractBillDetails(body);
      return { extracted };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract bill details";
      return reply.status(500).send({ error: msg });
    }
  });

  // AI Rough Task Parser & Auto-Scheduler Endpoint
  app.post("/parse-rough-task", async (req, reply) => {
    const body = req.body as {
      rawGoal?: string;
      currentUrl?: string;
      userProfile?: any;
    };

    if (!body || !body.rawGoal?.trim()) {
      return reply.status(400).send({ error: "rawGoal is required" });
    }

    try {
      const result = await planner.parseRoughTask({
        rawGoal: body.rawGoal.trim(),
        currentUrl: body.currentUrl,
        userProfile: body.userProfile
      });
      return { result };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse rough task";
      return reply.status(500).send({ error: msg });
    }
  });

  // Profile Vault Endpoints
  app.get("/profiles", async () => {
    return {
      profiles: profileVaultManager.getAllProfiles(),
      defaultProfile: profileVaultManager.getDefaultProfile()
    };
  });

  app.post("/profiles", async (req, reply) => {
    const parsed = CreateUserProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid profile data", details: parsed.error.issues });
    }
    const profile = profileVaultManager.createProfile(parsed.data);
    return { profile };
  });

  app.get("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const profile = profileVaultManager.getProfileById(id);
    if (!profile) return reply.status(404).send({ error: "Profile not found" });
    return { profile };
  });

  app.patch("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateUserProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid update data", details: parsed.error.issues });
    }
    try {
      const profile = profileVaultManager.updateProfile(id, parsed.data);
      return { profile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.delete("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const success = profileVaultManager.deleteProfile(id);
      return { success };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.post("/profiles/:id/set-default", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const profile = profileVaultManager.setDefaultProfile(id);
      return { profile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Set default failed";
      return reply.status(404).send({ error: msg });
    }
  });

  app.get("/pending-tasks", async (req) => {
    const query = req.query as {
      status?: string;
      priority?: string;
      category?: string;
      search?: string;
      sortBy?: "dueDate" | "nextRun" | "priority" | "created";
    };

    return {
      tasks: pendingTaskManager.getAllTasks(query),
      remindersDue: pendingTaskManager.getRemindersDue(),
      scheduledReady: pendingTaskManager.getScheduledTasksReadyToRun()
    };
  });

  app.get("/pending-tasks/due-soon", async () => {
    const reminders = pendingTaskManager.getRemindersDue();
    const scheduled = pendingTaskManager.getScheduledTasksReadyToRun();
    return {
      reminders,
      scheduled
    };
  });

  app.post("/pending-tasks", async (req, reply) => {
    const parsed = CreatePendingTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid pending task data", details: parsed.error.issues });
    }
    const task = pendingTaskManager.createTask(parsed.data);
    return { task };
  });

  app.patch("/pending-tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    
    try {
      const task = pendingTaskManager.updateTask(id, body);
      return { task };
    } catch {
      return reply.status(404).send({ error: "Task not found" });
    }
  });

  app.post("/pending-tasks/:id/record-run", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      status: "SUCCESS" | "FAILED" | "CANCELLED";
      durationMs: number;
      summary: string;
      stepsCount?: number;
      steps?: import("@difm/shared").ExecutionStepDetail[];
      error?: string;
    };

    try {
      const task = pendingTaskManager.recordExecution(id, body);
      return { task };
    } catch {
      return reply.status(404).send({ error: "Task not found" });
    }
  });

  app.post("/pending-tasks/:id/clone", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const task = pendingTaskManager.cloneTask(id);
      return { task };
    } catch {
      return reply.status(404).send({ error: "Task not found" });
    }
  });

  app.delete("/pending-tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = pendingTaskManager.deleteTask(id);
    return { success };
  });

  app.post("/tasks", async (req, reply) => {
    const parseResult = TaskCreateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid task request" });
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const session = orchestrator.createTask(
      taskId,
      parseResult.data.goal,
      parseResult.data.mode || "AUTONOMOUS"
    );

    return {
      taskId: session.id,
      goal: session.goal,
      state: session.state,
      mode: session.executionMode
    };
  });

  app.register(async function (fastifyInstance) {
    fastifyInstance.get("/ws", { websocket: true }, (socket, req) => {
      socket.on("message", async (data: Buffer | string) => {
        try {
          const raw = JSON.parse(data.toString());
          const parsed = ExtensionMessageSchema.safeParse(raw);

          if (!parsed.success) {
            console.error("WS Validation Error:", JSON.stringify(parsed.error.issues));
            return;
          }

          const msg = parsed.data;

          if (msg.type === "OBSERVATION_CAPTURED") {
            const result = await orchestrator.handleObservation(
              msg.taskId,
              msg.observation
            );

            if (result.isSecurityChallenge && result.challenge) {
              const serverMsg: ServerMessage = {
                type: "SECURITY_CHALLENGE_DETECTED",
                taskId: msg.taskId,
                challenge: result.challenge
              };
              socket.send(JSON.stringify(serverMsg));
            } else if (result.requiresApproval && result.action) {
              const serverMsg: ServerMessage = {
                type: "REQUEST_APPROVAL",
                taskId: msg.taskId,
                actionId: `act_${Date.now()}`,
                summary: result.summary || "Action approval needed",
                consequences: "This operation will modify account or order state.",
                targetText: result.action.type
              };
              socket.send(JSON.stringify(serverMsg));
            } else if (result.action) {
              const serverMsg: ServerMessage = {
                type: "EXECUTE_ACTION",
                taskId: msg.taskId,
                actionId: `act_${Date.now()}`,
                action: result.action
              };
              socket.send(JSON.stringify(serverMsg));
            }
          } else if (msg.type === "SECURITY_CHALLENGE_RESOLVED") {
            orchestrator.resolveSecurityChallenge(msg.taskId);
            const serverMsg: ServerMessage = {
              type: "TASK_STATE_CHANGED",
              taskId: msg.taskId,
              state: "PLANNING",
              stepIndex: 0,
              statusMessage: "Security challenge resolved. Resuming automated workflow..."
            };
            socket.send(JSON.stringify(serverMsg));
          } else if (msg.type === "USER_APPROVAL_RESPONSE") {
            const approvedAction = orchestrator.handleApprovalDecision(
              msg.taskId,
              msg.approved
            );

            if (approvedAction) {
              const serverMsg: ServerMessage = {
                type: "EXECUTE_ACTION",
                taskId: msg.taskId,
                actionId: `act_${Date.now()}`,
                action: approvedAction
              };
              socket.send(JSON.stringify(serverMsg));
            } else {
              const serverMsg: ServerMessage = {
                type: "TASK_STATE_CHANGED",
                taskId: msg.taskId,
                state: "CANCELLED",
                stepIndex: 0,
                statusMessage: "Task cancelled by user"
              };
              socket.send(JSON.stringify(serverMsg));
            }
          }
        } catch (err) {
          console.error("Server WS Error:", err);
        }
      });
    });
  });

  return { app, config, planner, orchestrator };
}

if (process.env.NODE_ENV !== "test") {
  createServer()
    .then(({ app, config }) => {
      app.listen({ port: config.PORT, host: config.HOST }, (err, address) => {
        if (err) {
          console.error("Failed to start server:", err);
          process.exit(1);
        }
        console.log(`🚀 DIFM Backend running at ${address}`);
        console.log(`🔌 WebSocket streaming active at ws://127.0.0.1:${config.PORT}/ws`);
      });
    })
    .catch((err) => {
      console.error("Server init error:", err);
      process.exit(1);
    });
}
