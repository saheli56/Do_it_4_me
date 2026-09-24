import {
  type PendingTaskItem,
  type CreatePendingTask,
  isTaskDueSoon,
  isTaskOverdue
} from "@difm/shared";

export class PendingTaskManager {
  private tasks = new Map<string, PendingTaskItem>();

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
    return task;
  }

  updateTaskStatus(id: string, status: PendingTaskItem["status"]): PendingTaskItem {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Pending task ${id} not found`);
    task.status = status;
    if (status === "COMPLETED") {
      task.completedAt = Date.now();
    }
    return task;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  getRemindersDue(): PendingTaskItem[] {
    return this.getAllTasks().filter(
      (task) => (task.status === "PENDING" || task.status === "DUE_SOON") && isTaskDueSoon(task.dueDate)
    );
  }
}
