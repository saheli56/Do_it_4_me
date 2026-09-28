import { z } from "zod";
import { AgentActionSchema } from "./actions.js";
import { TaskStateSchema } from "./state.js";

export const SemanticNodeSchema = z.object({
  id: z.string(),
  role: z.string(),
  name: z.string(),
  href: z.string().optional(),
  value: z.string().optional(),
  placeholder: z.string().optional(),
  checked: z.boolean().optional(),
  disabled: z.boolean().optional(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  selector: z.string(),
  isInteractive: z.boolean()
});

export type SemanticNode = z.infer<typeof SemanticNodeSchema>;

export const SecurityChallengeTypeSchema = z.enum([
  "CAPTCHA",
  "CLOUDFLARE",
  "RECAPTCHA",
  "HCAPTCHA",
  "OTP",
  "TWO_FACTOR"
]);

export type SecurityChallengeType = z.infer<typeof SecurityChallengeTypeSchema>;

export const SecurityChallengeSchema = z.object({
  type: SecurityChallengeTypeSchema,
  description: z.string(),
  detectedAt: z.number()
});

export type SecurityChallenge = z.infer<typeof SecurityChallengeSchema>;

export const ProductContextSchema = z.object({
  productTitle: z.string().optional(),
  price: z.string().optional(),
  priceNumber: z.number().optional(),
  currency: z.string().optional(),
  inStock: z.boolean().optional(),
  addToCartNodeId: z.string().optional(),
  buyNowNodeId: z.string().optional(),
  searchResults: z.array(z.object({
    nodeId: z.string(),
    title: z.string(),
    price: z.string().optional(),
    priceNumber: z.number().optional()
  })).optional()
});

export type ProductContext = z.infer<typeof ProductContextSchema>;

export const PageObservationSchema = z.object({
  url: z.string(),
  title: z.string(),
  interactiveNodes: z.array(SemanticNodeSchema),
  securityChallenge: SecurityChallengeSchema.optional(),
  productContext: ProductContextSchema.optional(),
  timestamp: z.number()
});

export type PageObservation = z.infer<typeof PageObservationSchema>;

export const TaskCreateRequestSchema = z.object({
  goal: z.string().min(3),
  url: z.string().url().optional()
});

export type TaskCreateRequest = z.infer<typeof TaskCreateRequestSchema>;

export const ExtensionMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("OBSERVATION_CAPTURED"),
    taskId: z.string(),
    observation: PageObservationSchema
  }),
  z.object({
    type: z.literal("ACTION_EXECUTED"),
    taskId: z.string(),
    actionId: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  z.object({
    type: z.literal("USER_APPROVAL_RESPONSE"),
    taskId: z.string(),
    approved: z.boolean(),
    reason: z.string().optional()
  }),
  z.object({
    type: z.literal("HUMAN_TAKEOVER_COMPLETED"),
    taskId: z.string()
  }),
  z.object({
    type: z.literal("SECURITY_CHALLENGE_RESOLVED"),
    taskId: z.string()
  })
]);

export type ExtensionMessage = z.infer<typeof ExtensionMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TASK_STATE_CHANGED"),
    taskId: z.string(),
    state: TaskStateSchema,
    stepIndex: z.number(),
    statusMessage: z.string()
  }),
  z.object({
    type: z.literal("EXECUTE_ACTION"),
    taskId: z.string(),
    actionId: z.string(),
    action: AgentActionSchema
  }),
  z.object({
    type: z.literal("REQUEST_APPROVAL"),
    taskId: z.string(),
    actionId: z.string(),
    summary: z.string(),
    consequences: z.string(),
    targetText: z.string().optional()
  }),
  z.object({
    type: z.literal("SECURITY_CHALLENGE_DETECTED"),
    taskId: z.string(),
    challenge: SecurityChallengeSchema
  })
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
