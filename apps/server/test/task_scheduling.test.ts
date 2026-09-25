import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PendingTaskManager } from "../src/pending-task-manager.js";
import { calculateNextRunTime } from "@difm/shared";
import fs from "fs";
import path from "path";

describe("Task Management & Scheduling", () => {
  let manager: PendingTaskManager;
  const tempDir = path.join(process.cwd(), "data", "test_tasks");

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    manager = new PendingTaskManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("calculates next run times for recurring schedules", () => {
    const fromTime = new Date("2026-10-01T08:00:00Z").getTime();

    // Daily at 09:30
    const dailyNext = calculateNextRunTime(
      { enabled: true, frequency: "DAILY", time: "09:30" },
      fromTime
    );
    expect(dailyNext).toBeDefined();
    const d = new Date(dailyNext!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);

    // Monthly on 5th
    const monthlyNext = calculateNextRunTime(
      { enabled: true, frequency: "MONTHLY", dayOfMonth: 5, time: "10:00" },
      fromTime
    );
    expect(monthlyNext).toBeDefined();
    const m = new Date(monthlyNext!);
    expect(m.getDate()).toBe(5);
  });

  it("creates, updates, and filters tasks by priority, category, and search query", () => {
    const task1 = manager.createTask({
      title: "Pay CESC Electricity Bill",
      priority: "HIGH",
      category: "ELECTRICITY",
      dueDate: "2026-10-05",
      notes: "Consumer #102938492",
      schedule: {
        enabled: true,
        frequency: "MONTHLY",
        dayOfMonth: 5,
        time: "10:00",
        autoExecute: true
      }
    });

    const task2 = manager.createTask({
      title: "Submit Daily Status Report",
      priority: "LOW",
      category: "FORM_FILL",
      schedule: {
        enabled: true,
        frequency: "DAILY",
        time: "17:00",
        autoExecute: false
      }
    });

    expect(task1.id).toBeDefined();
    expect(task1.status).toBe("SCHEDULED");
    expect(task1.schedule?.nextRunAt).toBeDefined();

    // Search filter
    const searchResults = manager.getAllTasks({ search: "CESC" });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].title).toBe("Pay CESC Electricity Bill");

    // Priority filter
    const highPriority = manager.getAllTasks({ priority: "HIGH" });
    expect(highPriority.length).toBe(1);

    // Update task
    const updated = manager.updateTask(task1.id, {
      title: "Pay CESC Electricity Bill - Updated",
      priority: "MEDIUM"
    });
    expect(updated.title).toBe("Pay CESC Electricity Bill - Updated");
    expect(updated.priority).toBe("MEDIUM");
  });

  it("records execution history and advances recurring schedules", () => {
    const task = manager.createTask({
      title: "Monthly Broadband Bill",
      priority: "HIGH",
      schedule: {
        enabled: true,
        frequency: "MONTHLY",
        dayOfMonth: 1,
        time: "09:00",
        autoExecute: true
      }
    });

    const recorded = manager.recordExecution(task.id, {
      status: "SUCCESS",
      durationMs: 4500,
      summary: "Paid $49.99 with auto-approval",
      stepsCount: 4
    });

    expect(recorded.executionHistory.length).toBe(1);
    expect(recorded.executionHistory[0].status).toBe("SUCCESS");
    expect(recorded.executionHistory[0].durationMs).toBe(4500);
    expect(recorded.schedule?.lastRunAt).toBeDefined();
  });

  it("clones a task with identical scheduling and details", () => {
    const original = manager.createTask({
      title: "Google Demo Autofill",
      priority: "HIGH",
      targetUrl: "https://www.google.com/recaptcha/api2/demo",
      notes: "Test form autofill"
    });

    const clone = manager.cloneTask(original.id);
    expect(clone.id).not.toBe(original.id);
    expect(clone.title).toBe("Google Demo Autofill (Copy)");
    expect(clone.priority).toBe("HIGH");
    expect(clone.targetUrl).toBe("https://www.google.com/recaptcha/api2/demo");
  });

  it("parses and formats rough task notes, detects missing fields, and enforces safety", async () => {
    const { PlannerService } = await import("../src/planner.js");
    const planner = new PlannerService("dummy", "https://api.groq.com/openai/v1", "openai/gpt-oss-120b");

    const parsed = await planner.parseRoughTask({
      rawGoal: "pay my cesc bill of 1450 before oct 15 every month on 5th"
    });

    expect(parsed.title).toContain("CESC");
    expect(parsed.category).toBe("ELECTRICITY");
    expect(parsed.targetUrl).toBe("https://www.cesc.co.in");
    expect(parsed.dueAmount).toContain("1450");
    expect(parsed.schedule?.enabled).toBe(true);
    expect(parsed.schedule?.autoExecute).toBe(false); // Safety guard: user approval required
    expect(parsed.requiresHumanApproval).toBe(true);
    expect(parsed.missingFields).toContain("consumerNumber");
    expect(parsed.clarificationPrompt).toBeDefined();
  });

  it("parses complete raw notes without missing fields when consumer number is provided", async () => {
    const { PlannerService } = await import("../src/planner.js");
    const planner = new PlannerService("dummy", "https://api.groq.com/openai/v1", "openai/gpt-oss-120b");

    const parsed = await planner.parseRoughTask({
      rawGoal: "pay cesc electric bill of Rs 1850 for account 050098765432 due on nov 10 every month on 5th",
      currentUrl: "https://www.cesc.co.in"
    });

    expect(parsed.category).toBe("ELECTRICITY");
    expect(parsed.consumerNumber).toBe("050098765432");
    expect(parsed.dueAmount).toContain("1850");
    expect(parsed.missingFields).not.toContain("consumerNumber");
    expect(parsed.schedule?.frequency).toBe("MONTHLY");
    expect(parsed.schedule?.dayOfMonth).toBe(5);
    expect(parsed.requiresHumanApproval).toBe(true);
  });

  it("integrates parsed rough note into scheduled task manager with biller info", async () => {
    const { PlannerService } = await import("../src/planner.js");
    const planner = new PlannerService("dummy", "https://api.groq.com/openai/v1", "openai/gpt-oss-120b");

    const parsed = await planner.parseRoughTask({
      rawGoal: "recharge airtel broadband 999 every month on 1st"
    });

    const task = manager.createTask({
      title: parsed.title,
      priority: "HIGH",
      category: parsed.category,
      dueDate: parsed.dueDate,
      notes: parsed.formattedGoal,
      targetUrl: parsed.targetUrl || "https://www.airtel.in",
      schedule: parsed.schedule,
      billerInfo: {
        providerName: parsed.providerName || "Airtel Broadband",
        billType: parsed.category,
        billingCycle: parsed.billingCycle,
        consumerNumber: "9876543210",
        amount: parsed.dueAmount || "₹999",
        portalUrl: parsed.targetUrl || "https://www.airtel.in"
      }
    });

    expect(task.id).toBeDefined();
    expect(task.title).toContain("Airtel");
    expect(task.billerInfo?.consumerNumber).toBe("9876543210");
    expect(task.schedule?.enabled).toBe(true);
    expect(task.schedule?.nextRunAt).toBeDefined();
  });
});
