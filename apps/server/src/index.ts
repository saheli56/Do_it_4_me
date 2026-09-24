import fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import { PlannerService } from "./planner.js";
import { TaskOrchestrator } from "./orchestrator.js";
import { PendingTaskManager } from "./pending-task-manager.js";
import {
  ExtensionMessageSchema,
  TaskCreateRequestSchema,
  CreatePendingTaskSchema,
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

  app.get("/health", async () => {
    return { status: "ok", timestamp: Date.now() };
  });

  app.get("/pending-tasks", async () => {
    return {
      tasks: pendingTaskManager.getAllTasks(),
      remindersDue: pendingTaskManager.getRemindersDue()
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
    const body = req.body as { notes?: string; status?: "PENDING" | "COMPLETED" | "CANCELLED" };
    
    try {
      if (body.notes !== undefined) {
        pendingTaskManager.updateTaskNotes(id, body.notes);
      }
      if (body.status !== undefined) {
        pendingTaskManager.updateTaskStatus(id, body.status);
      }
      return { task: pendingTaskManager.getTask(id) };
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
