import fs from "fs";
import path from "path";
import {
  type PendingTaskItem,
  type CreatePendingTask,
  type UpdatePendingTask,
  type TaskExecutionRecord,
  calculateNextRunTime,
  isTaskDueSoon
} from "@difm/shared";

export class PendingTaskManager {
  private tasks = new Map<string, PendingTaskItem>();
  private storageFilePath: string;

  constructor(storageDir = process.cwd()) {
    const dataDir = path.join(storageDir, "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.storageFilePath = path.join(dataDir, "pending_tasks.json");
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id) {
              if (!Array.isArray(item.executionHistory)) {
                item.executionHistory = [];
              }
              if (!item.priority) {
                item.priority = "MEDIUM";
              }
              if (!item.category) {
                item.category = item.billerInfo?.billType || "GENERAL";
              }
              this.tasks.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading pending tasks from disk:", err);
    }
  }

  private saveToDisk(): void {
    try {
      const list = Array.from(this.tasks.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving pending tasks to disk:", err);
    }
  }

  createTask(input: CreatePendingTask): PendingTaskItem {
    const taskId = `ptask_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    let schedule = input.schedule;
    if (schedule && schedule.enabled) {
      schedule.nextRunAt = calculateNextRunTime(schedule);
    }

    const task: PendingTaskItem = {
      id: taskId,
      title: input.title,
      description: input.description,
      priority: input.priority || "MEDIUM",
      category: input.category || (input.billerInfo?.billType as any) || "GENERAL",
      dueDate: input.dueDate,
      targetUrl: input.targetUrl,
      status: schedule && schedule.enabled ? "SCHEDULED" : "PENDING",
      schedule,
      executionHistory: [],
      requiresSensitiveApproval: true,
      notes: input.notes,
      billerInfo: input.billerInfo,
      priceCondition: input.priceCondition || input.billerInfo?.priceCondition,
      createdAt: Date.now()
    };

    this.tasks.set(taskId, task);
    this.saveToDisk();
    return task;
  }

  getAllTasks(filter?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    sortBy?: "dueDate" | "nextRun" | "priority" | "created";
  }): PendingTaskItem[] {
    let list = Array.from(this.tasks.values());

    // Update dynamic statuses for due dates and schedules
    list = list.map((task) => {
      if (task.status === "PENDING" || task.status === "DUE_SOON") {
        if (isTaskDueSoon(task.dueDate)) {
          task.status = "DUE_SOON";
        }
      }
      return task;
    });

    if (filter) {
      if (filter.status && filter.status !== "ALL") {
        list = list.filter((t) => t.status === filter.status);
      }
      if (filter.priority && filter.priority !== "ALL") {
        list = list.filter((t) => t.priority === filter.priority);
      }
      if (filter.category && filter.category !== "ALL") {
        list = list.filter((t) => t.category === filter.category);
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.notes && t.notes.toLowerCase().includes(q)) ||
            (t.billerInfo?.providerName && t.billerInfo.providerName.toLowerCase().includes(q)) ||
            (t.targetUrl && t.targetUrl.toLowerCase().includes(q))
        );
      }
      if (filter.sortBy) {
        list.sort((a, b) => {
          if (filter.sortBy === "dueDate") {
            const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return timeA - timeB;
          }
          if (filter.sortBy === "nextRun") {
            const timeA = a.schedule?.nextRunAt ?? Infinity;
            const timeB = b.schedule?.nextRunAt ?? Infinity;
            return timeA - timeB;
          }
          if (filter.sortBy === "priority") {
            const map: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            return (map[b.priority] || 0) - (map[a.priority] || 0);
          }
          if (filter.sortBy === "created") {
            return b.createdAt - a.createdAt;
          }
          return 0;
        });
      }
    }

    return list;
  }

  getTask(id: string): PendingTaskItem | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, updates: UpdatePendingTask): PendingTaskItem {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Pending task ${id} not found`);

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.category !== undefined) task.category = updates.category;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate ?? undefined;
    if (updates.targetUrl !== undefined) task.targetUrl = updates.targetUrl ?? undefined;
    if (updates.notes !== undefined) task.notes = updates.notes ?? undefined;
    if (updates.billerInfo !== undefined) task.billerInfo = updates.billerInfo ?? undefined;
    if (updates.priceCondition !== undefined) task.priceCondition = updates.priceCondition ?? undefined;
    if (updates.status !== undefined) {
      task.status = updates.status;
      if (updates.status === "COMPLETED") {
        task.completedAt = Date.now();
      }
    }

    if (updates.schedule !== undefined) {
      if (updates.schedule === null) {
        task.schedule = undefined;
      } else {
        const nextSchedule = updates.schedule;
        if (nextSchedule.enabled) {
          nextSchedule.nextRunAt = calculateNextRunTime(nextSchedule);
          if (task.status === "PENDING") {
            task.status = "SCHEDULED";
          }
        }
        task.schedule = nextSchedule;
      }
    }

    this.saveToDisk();
    return task;
  }

  updateTaskNotes(id: string, notes: string): PendingTaskItem {
    return this.updateTask(id, { notes });
  }

  updateTaskStatus(id: string, status: PendingTaskItem["status"]): PendingTaskItem {
    return this.updateTask(id, { status });
  }

  recordExecution(
    id: string,
    record: {
      status: "SUCCESS" | "FAILED" | "CANCELLED";
      durationMs?: number;
      summary: string;
      stepsCount?: number;
      steps?: import("@difm/shared").ExecutionStepDetail[];
      error?: string;
    }
  ): PendingTaskItem {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Pending task ${id} not found`);

    const runItem: TaskExecutionRecord = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      runAt: Date.now(),
      status: record.status,
      durationMs: record.durationMs || 0,
      summary: record.summary,
      stepsCount: record.stepsCount || (record.steps ? record.steps.length : 1),
      steps: record.steps || [],
      error: record.error
    };

    if (!Array.isArray(task.executionHistory)) {
      task.executionHistory = [];
    }
    task.executionHistory.unshift(runItem);

    // Keep last 15 execution records
    if (task.executionHistory.length > 15) {
      task.executionHistory = task.executionHistory.slice(0, 15);
    }

    // If task has active recurring schedule, advance nextRunAt
    if (task.schedule && task.schedule.enabled) {
      task.schedule.lastRunAt = Date.now();
      task.schedule.nextRunAt = calculateNextRunTime(task.schedule, Date.now() + 1000);
      task.status = "SCHEDULED";
    }

    this.saveToDisk();
    return task;
  }

  cloneTask(id: string): PendingTaskItem {
    const original = this.tasks.get(id);
    if (!original) throw new Error(`Pending task ${id} not found`);

    const cloned = this.createTask({
      title: `${original.title} (Copy)`,
      description: original.description,
      priority: original.priority,
      category: original.category,
      dueDate: original.dueDate,
      targetUrl: original.targetUrl,
      schedule: original.schedule ? { ...original.schedule } : undefined,
      notes: original.notes,
      billerInfo: original.billerInfo ? { ...original.billerInfo } : undefined
    });

    return cloned;
  }

  deleteTask(id: string): boolean {
    const res = this.tasks.delete(id);
    if (res) {
      this.saveToDisk();
    }
    return res;
  }

  getRemindersDue(): PendingTaskItem[] {
    return this.getAllTasks().filter(
      (task) => (task.status === "PENDING" || task.status === "DUE_SOON") && isTaskDueSoon(task.dueDate)
    );
  }

  getScheduledTasksReadyToRun(): PendingTaskItem[] {
    const now = Date.now();
    return this.getAllTasks().filter(
      (task) =>
        task.schedule &&
        task.schedule.enabled &&
        task.schedule.nextRunAt &&
        task.schedule.nextRunAt <= now &&
        task.status !== "COMPLETED" &&
        task.status !== "CANCELLED"
    );
  }
}

