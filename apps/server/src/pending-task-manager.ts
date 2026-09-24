import fs from "fs";
import path from "path";
import {
  type PendingTaskItem,
  type CreatePendingTask,
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
    const task: PendingTaskItem = {
      id: taskId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      targetUrl: input.targetUrl,
      status: "PENDING",
      requiresSensitiveApproval: true,
      notes: input.notes,
      billerInfo: input.billerInfo,
      createdAt: Date.now()
    };

    this.tasks.set(taskId, task);
    this.saveToDisk();
    return task;
  }

  getAllTasks(): PendingTaskItem[] {
    const list = Array.from(this.tasks.values());

    return list.map((task) => {
      if (task.status === "PENDING" || task.status === "DUE_SOON") {
        if (isTaskDueSoon(task.dueDate)) {
          task.status = "DUE_SOON";
        }
      }
      return task;
    });
  }

  getTask(id: string): PendingTaskItem | undefined {
    return this.tasks.get(id);
  }

  updateTaskNotes(id: string, notes: string): PendingTaskItem {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Pending task ${id} not found`);
    task.notes = notes;
    this.saveToDisk();
    return task;
  }

  updateTaskStatus(id: string, status: PendingTaskItem["status"]): PendingTaskItem {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Pending task ${id} not found`);
    task.status = status;
    if (status === "COMPLETED") {
      task.completedAt = Date.now();
    }
    this.saveToDisk();
    return task;
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
}
