import { z } from "zod";

export const TaskPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskCategorySchema = z.enum([
  "GENERAL",
  "FORM_FILL",
  "ELECTRICITY",
  "WATER",
  "GAS",
  "INTERNET",
  "MOBILE",
  "CREDIT_CARD",
  "SHOPPING",
  "OTHER"
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

export const ScheduleFrequencySchema = z.enum([
  "ONCE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "CUSTOM_DAYS"
]);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencySchema>;

export const TaskScheduleSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: ScheduleFrequencySchema.default("ONCE"),
  time: z.string().optional(), // "HH:mm" e.g. "09:30"
  dayOfWeek: z.number().min(0).max(6).optional(), // 0=Sunday, 1=Monday, ...
  dayOfMonth: z.number().min(1).max(31).optional(), // e.g. 5 for 5th of each month
  intervalDays: z.number().min(1).optional(), // for CUSTOM_DAYS
  autoExecute: z.boolean().default(false), // true = run autonomously with AI agent, false = alert only
  nextRunAt: z.number().optional(), // epoch timestamp ms
  lastRunAt: z.number().optional()
});
export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;

export const ExecutionStepDetailSchema = z.object({
  id: z.string(),
  stepNumber: z.number(),
  timestamp: z.number(),
  actionType: z.string(),
  description: z.string(),
  targetName: z.string().optional(),
  targetSelector: z.string().optional(),
  targetRole: z.string().optional(),
  inputValue: z.string().optional(),
  url: z.string().optional(),
  pageTitle: z.string().optional(),
  status: z.enum(["SUCCESS", "FAILED", "APPROVED", "REJECTED", "SECURITY_PAUSED"]).default("SUCCESS"),
  elementsCount: z.number().optional(),
  error: z.string().optional(),
  durationMs: z.number().optional()
});
export type ExecutionStepDetail = z.infer<typeof ExecutionStepDetailSchema>;

export const TaskExecutionRecordSchema = z.object({
  id: z.string(),
  runAt: z.number(),
  status: z.enum(["SUCCESS", "FAILED", "CANCELLED"]),
  durationMs: z.number().default(0),
  summary: z.string(),
  stepsCount: z.number().default(1),
  steps: z.array(ExecutionStepDetailSchema).optional().default([]),
  error: z.string().optional()
});
export type TaskExecutionRecord = z.infer<typeof TaskExecutionRecordSchema>;

export const PendingTaskStatusSchema = z.enum([
  "PENDING",
  "SCHEDULED",
  "DUE_SOON",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "COMPLETED",
  "CANCELLED"
]);
export type PendingTaskStatus = z.infer<typeof PendingTaskStatusSchema>;

export const BillerInfoSchema = z.object({
  profileId: z.string().optional(),
  providerName: z.string().optional(),
  billType: TaskCategorySchema.default("GENERAL"),
  consumerNumber: z.string().optional(),
  subdivision: z.string().optional(),
  portalUrl: z.string().optional(),
  customerName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  emailAddress: z.string().optional(),
  additionalInstructions: z.string().optional()
});
export type BillerInfo = z.infer<typeof BillerInfoSchema>;

export const PendingTaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: TaskPrioritySchema.default("MEDIUM"),
  category: TaskCategorySchema.default("GENERAL"),
  dueDate: z.string().optional(), // ISO date or "YYYY-MM-DD"
  targetUrl: z.string().optional(),
  status: PendingTaskStatusSchema.default("PENDING"),
  schedule: TaskScheduleSchema.optional(),
  executionHistory: z.array(TaskExecutionRecordSchema).default([]),
  requiresSensitiveApproval: z.boolean().default(true),
  notes: z.string().optional(),
  billerInfo: BillerInfoSchema.optional(),
  createdAt: z.number(),
  completedAt: z.number().optional()
});
export type PendingTaskItem = z.infer<typeof PendingTaskItemSchema>;

export const CreatePendingTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: TaskPrioritySchema.optional().default("MEDIUM"),
  category: TaskCategorySchema.optional().default("GENERAL"),
  dueDate: z.string().optional(),
  targetUrl: z.string().optional(),
  schedule: TaskScheduleSchema.optional(),
  notes: z.string().optional(),
  billerInfo: BillerInfoSchema.optional()
});
export type CreatePendingTask = z.infer<typeof CreatePendingTaskSchema>;

export const UpdatePendingTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  priority: TaskPrioritySchema.optional(),
  category: TaskCategorySchema.optional(),
  dueDate: z.string().optional().nullable(),
  targetUrl: z.string().optional().nullable(),
  status: PendingTaskStatusSchema.optional(),
  schedule: TaskScheduleSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  billerInfo: BillerInfoSchema.optional().nullable()
});
export type UpdatePendingTask = z.infer<typeof UpdatePendingTaskSchema>;

/**
 * Calculates the next epoch timestamp (ms) for a given schedule configuration
 */
export function calculateNextRunTime(schedule: TaskSchedule, fromTime = Date.now()): number | undefined {
  if (!schedule.enabled) return undefined;

  const fromDate = new Date(fromTime);
  const targetDate = new Date(fromTime);

  // Parse time (HH:mm)
  let targetHours = 9;
  let targetMinutes = 0;
  if (schedule.time) {
    const [h, m] = schedule.time.split(":").map(Number);
    if (!isNaN(h)) targetHours = h;
    if (!isNaN(m)) targetMinutes = m;
  }

  targetDate.setHours(targetHours, targetMinutes, 0, 0);

  switch (schedule.frequency) {
    case "ONCE": {
      if (targetDate.getTime() <= fromDate.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      return targetDate.getTime();
    }
    case "DAILY": {
      if (targetDate.getTime() <= fromDate.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      return targetDate.getTime();
    }
    case "WEEKLY": {
      const targetDay = schedule.dayOfWeek ?? 1; // Default Monday
      const currentDay = targetDate.getDay();
      let diff = targetDay - currentDay;
      if (diff < 0 || (diff === 0 && targetDate.getTime() <= fromDate.getTime())) {
        diff += 7;
      }
      targetDate.setDate(targetDate.getDate() + diff);
      return targetDate.getTime();
    }
    case "MONTHLY": {
      const targetDom = schedule.dayOfMonth ?? 1; // Default 1st
      targetDate.setDate(targetDom);
      if (targetDate.getTime() <= fromDate.getTime()) {
        targetDate.setMonth(targetDate.getMonth() + 1);
        targetDate.setDate(targetDom);
      }
      return targetDate.getTime();
    }
    case "CUSTOM_DAYS": {
      const interval = schedule.intervalDays || 1;
      targetDate.setDate(targetDate.getDate() + interval);
      return targetDate.getTime();
    }
    default:
      return undefined;
  }
}

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

