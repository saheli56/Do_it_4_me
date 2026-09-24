import { z } from "zod";

export const PendingTaskStatusSchema = z.enum([
  "PENDING",
  "DUE_SOON",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "COMPLETED",
  "CANCELLED"
]);

export type PendingTaskStatus = z.infer<typeof PendingTaskStatusSchema>;

export const BillerInfoSchema = z.object({
  providerName: z.string().optional(),
  billType: z.enum(["GENERAL", "FORM_FILL", "ELECTRICITY", "WATER", "GAS", "INTERNET", "MOBILE", "CREDIT_CARD", "OTHER"]).default("GENERAL"),
  consumerNumber: z.string().optional(),
  subdivision: z.string().optional(),
  portalUrl: z.string().optional(),
  customerName: z.string().optional(),
  phoneNumber: z.string().optional(),
  emailAddress: z.string().optional(),
  additionalInstructions: z.string().optional()
});

export type BillerInfo = z.infer<typeof BillerInfoSchema>;

export const PendingTaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().optional(), // ISO date string e.g. "2026-09-30T10:00:00Z"
  targetUrl: z.string().optional(),
  status: PendingTaskStatusSchema.default("PENDING"),
  requiresSensitiveApproval: z.boolean().default(true),
  notes: z.string().optional(),
  billerInfo: BillerInfoSchema.optional(),
  createdAt: z.number(),
  completedAt: z.number().optional()
});

export type PendingTaskItem = z.infer<typeof PendingTaskItemSchema>;

export const CreatePendingTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  targetUrl: z.string().optional(),
  notes: z.string().optional(),
  billerInfo: BillerInfoSchema.optional()
});

export type CreatePendingTask = z.infer<typeof CreatePendingTaskSchema>;

export function isTaskDueSoon(dueDateStr?: string, thresholdHours = 48): boolean {
  if (!dueDateStr) return false;
  const dueDate = new Date(dueDateStr).getTime();
  const now = Date.now();
  if (isNaN(dueDate)) return false;

  const diffHours = (dueDate - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= thresholdHours;
}

export function isTaskOverdue(dueDateStr?: string): boolean {
  if (!dueDateStr) return false;
  const dueDate = new Date(dueDateStr).getTime();
  const now = Date.now();
  if (isNaN(dueDate)) return false;

  return dueDate < now;
}
