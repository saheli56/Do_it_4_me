import type {
  AgentAction,
  PageObservation,
  TaskState,
  SecurityChallenge
} from "@difm/shared";
import { isValidStateTransition, evaluateRiskTier } from "@difm/shared";
import type { PlannerService } from "./planner.js";

export interface TaskSession {
  id: string;
  goal: string;
  state: TaskState;
  stepIndex: number;
  history: string[];
  lastObservation?: PageObservation;
  pendingApprovalAction?: AgentAction;
  activeChallenge?: SecurityChallenge;
}

export class TaskOrchestrator {
  private sessions = new Map<string, TaskSession>();
  private planner: PlannerService;

  constructor(planner: PlannerService) {
    this.planner = planner;
  }

  createTask(taskId: string, goal: string): TaskSession {
    const session: TaskSession = {
      id: taskId,
      goal,
      state: "CREATED",
      stepIndex: 0,
      history: []
    };
    this.sessions.set(taskId, session);
    this.transitionState(session, "UNDERSTANDING");
    return session;
  }

  getSession(taskId: string): TaskSession | undefined {
    return this.sessions.get(taskId);
  }

  transitionState(session: TaskSession, nextState: TaskState): void {
    if (!isValidStateTransition(session.state, nextState)) {
      throw new Error(
        `Invalid state transition: cannot transition from ${session.state} to ${nextState}`
      );
    }
    session.state = nextState;
  }

  async handleObservation(
    taskId: string,
    observation: PageObservation
  ): Promise<{
    action?: AgentAction;
    requiresApproval: boolean;
    summary?: string;
    isSecurityChallenge?: boolean;
    challenge?: SecurityChallenge;
  }> {
    const session = this.sessions.get(taskId);
    if (!session) {
      throw new Error(`Task ${taskId} not found`);
    }

    session.lastObservation = observation;

    // Check for security challenge (Cloudflare / Captcha / OTP)
    if (observation.securityChallenge) {
      session.activeChallenge = observation.securityChallenge;
      this.transitionState(session, "HUMAN_TAKEOVER");
      session.history.push(`[Security Check]: ${observation.securityChallenge.description} detected. Pausing for human takeover.`);
      return {
        isSecurityChallenge: true,
        challenge: observation.securityChallenge,
        requiresApproval: false
      };
    }

    this.transitionState(session, "PLANNING");

    const plannedAction = await this.planner.planNextStep(
      session.goal,
      observation,
      session.history
    );

    const targetText =
      plannedAction.type === "CLICK" || plannedAction.type === "TYPE" || plannedAction.type === "SELECT"
        ? plannedAction.target.name
        : undefined;

    const riskPolicy = evaluateRiskTier(plannedAction.type, targetText);

    if (riskPolicy.requiresExplicitApproval || plannedAction.type === "REQUEST_APPROVAL") {
      session.pendingApprovalAction = plannedAction;
      this.transitionState(session, "WAITING_FOR_APPROVAL");
      return {
        action: plannedAction,
        requiresApproval: true,
        summary: `Action requires user confirmation: ${plannedAction.type}`
      };
    }

    if (plannedAction.type === "COMPLETE") {
      this.transitionState(session, "COMPLETED");
      session.history.push(`Completed: ${plannedAction.summary}`);
      return { action: plannedAction, requiresApproval: false };
    }

    if (plannedAction.type === "FAIL") {
      this.transitionState(session, "FAILED");
      session.history.push(`Failed: ${plannedAction.error}`);
      return { action: plannedAction, requiresApproval: false };
    }

    this.transitionState(session, "EXECUTING");
    session.stepIndex += 1;
    const actionDesc = this.getActionSummary(plannedAction);

    session.history.push(
      `Step ${session.stepIndex}: [${plannedAction.type}] ${actionDesc}`
    );

    return { action: plannedAction, requiresApproval: false };
  }

  private getActionSummary(action: AgentAction): string {
    switch (action.type) {
      case "CLICK":
      case "TYPE":
      case "SELECT":
      case "SCROLL":
      case "NAVIGATE":
        return action.description;
      case "WAIT":
        return action.reason;
      case "REQUEST_APPROVAL":
      case "COMPLETE":
        return action.summary;
      case "REQUEST_USER_INPUT":
        return action.prompt;
      case "FAIL":
        return action.error;
    }
  }

  handleApprovalDecision(taskId: string, approved: boolean): AgentAction | null {
    const session = this.sessions.get(taskId);
    if (!session || session.state !== "WAITING_FOR_APPROVAL" || !session.pendingApprovalAction) {
      throw new Error(`Task ${taskId} is not awaiting approval`);
    }

    const action = session.pendingApprovalAction;
    session.pendingApprovalAction = undefined;

    if (approved) {
      this.transitionState(session, "EXECUTING");
      session.stepIndex += 1;
      session.history.push(`Step ${session.stepIndex} (Approved): [${action.type}]`);
      return action;
    } else {
      this.transitionState(session, "CANCELLED");
      session.history.push("Task cancelled by user refusal.");
      return null;
    }
  }

  resolveSecurityChallenge(taskId: string): void {
    const session = this.sessions.get(taskId);
    if (!session || session.state !== "HUMAN_TAKEOVER") {
      return;
    }
    session.activeChallenge = undefined;
    this.transitionState(session, "PLANNING");
    session.history.push("Security challenge solved by user. Resuming automation.");
  }
}
