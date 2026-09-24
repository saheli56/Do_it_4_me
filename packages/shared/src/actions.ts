import { z } from "zod";

export const ActionTypeSchema = z.enum([
  "CLICK",
  "TYPE",
  "SELECT",
  "SCROLL",
  "NAVIGATE",
  "WAIT",
  "REQUEST_APPROVAL",
  "REQUEST_USER_INPUT",
  "COMPLETE",
  "FAIL"
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ElementLocatorSchema = z.object({
  id: z.string(),
  role: z.string().optional(),
  name: z.string().optional(),
  selector: z.string().optional(),
  bounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    })
    .optional()
});

export type ElementLocator = z.infer<typeof ElementLocatorSchema>;

export const ClickActionSchema = z.object({
  type: z.literal("CLICK"),
  target: ElementLocatorSchema,
  description: z.string()
});

export const TypeActionSchema = z.object({
  type: z.literal("TYPE"),
  target: ElementLocatorSchema,
  text: z.string(),
  clearExisting: z.boolean().default(true),
  maskInput: z.boolean().default(false),
  description: z.string()
});

export const SelectActionSchema = z.object({
  type: z.literal("SELECT"),
  target: ElementLocatorSchema,
  value: z.string(),
  description: z.string()
});

export const ScrollActionSchema = z.object({
  type: z.literal("SCROLL"),
  direction: z.enum(["UP", "DOWN", "TOP", "BOTTOM"]),
  amount: z.number().optional(),
  description: z.string()
});

export const NavigateActionSchema = z.object({
  type: z.literal("NAVIGATE"),
  url: z.string().url(),
  description: z.string()
});

export const WaitActionSchema = z.object({
  type: z.literal("WAIT"),
  durationMs: z.number().min(100).max(10000),
  reason: z.string()
});

export const RequestApprovalActionSchema = z.object({
  type: z.literal("REQUEST_APPROVAL"),
  summary: z.string(),
  details: z.record(z.unknown()),
  consequences: z.string()
});

export const RequestUserInputActionSchema = z.object({
  type: z.literal("REQUEST_USER_INPUT"),
  prompt: z.string(),
  fieldKey: z.string(),
  isSecret: z.boolean().default(false)
});

export const CompleteActionSchema = z.object({
  type: z.literal("COMPLETE"),
  summary: z.string(),
  resultData: z.record(z.unknown()).optional()
});

export const FailActionSchema = z.object({
  type: z.literal("FAIL"),
  error: z.string(),
  recoverable: z.boolean()
});

export const AgentActionSchema = z.discriminatedUnion("type", [
  ClickActionSchema,
  TypeActionSchema,
  SelectActionSchema,
  ScrollActionSchema,
  NavigateActionSchema,
  WaitActionSchema,
  RequestApprovalActionSchema,
  RequestUserInputActionSchema,
  CompleteActionSchema,
  FailActionSchema
]);

export type AgentAction = z.infer<typeof AgentActionSchema>;
