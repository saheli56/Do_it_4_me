import fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import { PlannerService } from "./planner.js";
import { TaskOrchestrator } from "./orchestrator.js";
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
  const orchestrator = new TaskOrchestrator(planner);
  const pendingTaskManager = new PendingTaskManager();
  const profileVaultManager = new ProfileVaultManager();

  app.get("/health", async () => {
    return { status: "ok", timestamp: Date.now() };
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
    const session = orchestrator.createTask(taskId, parseResult.data.goal);

    return {
      taskId: session.id,
      goal: session.goal,
      state: session.state
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
