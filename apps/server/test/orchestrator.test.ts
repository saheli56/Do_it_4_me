import { describe, it, expect, vi } from "vitest";
import { TaskOrchestrator } from "../src/orchestrator.js";
import { PlannerService } from "../src/planner.js";
import type { PageObservation } from "@difm/shared";

describe("TaskOrchestrator state machine & risk boundaries", () => {
  it("transitions state to EXECUTING for normal non-critical click", async () => {
    const mockPlanner = {
      planNextStep: vi.fn().mockResolvedValue({
        type: "CLICK",
        target: { id: "node-1", name: "Filter options" },
        description: "Click filter options"
      })
    } as unknown as PlannerService;

    const orchestrator = new TaskOrchestrator(mockPlanner);
    const session = orchestrator.createTask("task-1", "Find sports shoes");
    expect(session.state).toBe("UNDERSTANDING");

    const mockObservation: PageObservation = {
      url: "https://shop.example.com",
      title: "Store",
      interactiveNodes: [
        {
          id: "node-1",
          role: "button",
          name: "Filter options",
          selector: "button.filter",
          bounds: { x: 10, y: 10, width: 50, height: 20 },
          isInteractive: true
        }
      ],
      timestamp: Date.now()
    };

    const result = await orchestrator.handleObservation("task-1", mockObservation);
    expect(result.requiresApproval).toBe(false);
    expect(result.action.type).toBe("CLICK");
    expect(session.state).toBe("EXECUTING");
    expect(session.stepIndex).toBe(1);
  });

  it("intercepts critical actions (e.g. Place Order) and forces WAITING_FOR_APPROVAL state", async () => {
    const mockPlanner = {
      planNextStep: vi.fn().mockResolvedValue({
        type: "CLICK",
        target: { id: "node-2", name: "Place Order Now" },
        description: "Click place order button"
      })
    } as unknown as PlannerService;

    const orchestrator = new TaskOrchestrator(mockPlanner);
    const session = orchestrator.createTask("task-2", "Buy item");

    const mockObservation: PageObservation = {
      url: "https://shop.example.com/checkout",
      title: "Checkout",
      interactiveNodes: [
        {
          id: "node-2",
          role: "button",
          name: "Place Order Now",
          selector: "button.checkout",
          bounds: { x: 10, y: 10, width: 100, height: 40 },
          isInteractive: true
        }
      ],
      timestamp: Date.now()
    };

    const result = await orchestrator.handleObservation("task-2", mockObservation);
    expect(result.requiresApproval).toBe(true);
    expect(session.state).toBe("WAITING_FOR_APPROVAL");

    const approvedAction = orchestrator.handleApprovalDecision("task-2", true);
    expect(approvedAction).toBeDefined();
    expect(approvedAction?.type).toBe("CLICK");
    expect(session.state).toBe("EXECUTING");
  });

  it("requires step-by-step approval for ordinary clicks when mode is STEP_APPROVAL", async () => {
    const mockPlanner = {
      planNextStep: vi.fn().mockResolvedValue({
        type: "CLICK",
        target: { id: "node-search", name: "Search Button" },
        description: "Click search button to submit query"
      })
    } as unknown as PlannerService;

    const orchestrator = new TaskOrchestrator(mockPlanner);
    const session = orchestrator.createTask("task-step-mode", "Search for headphones", "STEP_APPROVAL");
    expect(session.executionMode).toBe("STEP_APPROVAL");

    const mockObservation: PageObservation = {
      url: "https://shop.example.com",
      title: "Store",
      interactiveNodes: [
        {
          id: "node-search",
          role: "button",
          name: "Search Button",
          selector: "button.search",
          bounds: { x: 10, y: 10, width: 50, height: 20 },
          isInteractive: true
        }
      ],
      timestamp: Date.now()
    };

    const result = await orchestrator.handleObservation("task-step-mode", mockObservation);
    expect(result.requiresApproval).toBe(true);
    expect(result.action?.type).toBe("CLICK");
    expect(session.state).toBe("WAITING_FOR_APPROVAL");
    expect(result.summary).toContain("Click search button");

    // User approves step
    const approvedAction = orchestrator.handleApprovalDecision("task-step-mode", true);
    expect(approvedAction).toBeDefined();
    expect(approvedAction?.type).toBe("CLICK");
    expect(session.state).toBe("EXECUTING");
  });
});
