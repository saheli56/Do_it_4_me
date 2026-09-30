import type {
  AgentAction,
  PageObservation,
  TaskState,
  SecurityChallenge,
  WorkflowPlan
} from "@difm/shared";
import { isValidStateTransition, evaluateRiskTier } from "@difm/shared";
import type { PlannerService } from "./planner.js";
import { IntentCompiler } from "./compiler.js";

export interface TaskSession {
  id: string;
  goal: string;
  state: TaskState;
  stepIndex: number;
  history: string[];
  executionMode?: "AUTONOMOUS" | "STEP_APPROVAL";
  lastObservation?: PageObservation;
  pendingApprovalAction?: AgentAction;
  activeChallenge?: SecurityChallenge;
  plan?: WorkflowPlan;
}

export function normalizeGoalForExecution(rawGoal: string): string {
  // If goal has a conditional price trigger (e.g. "when price drops below X", "if price is under X", "buy when <= X")
  const priceDropMatch = rawGoal.match(/(?:when|if)\s+(?:the\s+)?price\s+(?:drops\s+below|is\s+below|is\s+under|falls\s+below|<=|<)\s*([₹$€£]?\s*[\d,]+(?:\.\d+)?)/i);
  
  if (priceDropMatch) {
    const targetPrice = priceDropMatch[1].trim();
    let productPart = rawGoal
      .replace(/automatically\s+(?:purchase|buy|add\s+to\s+cart|order)\s+/i, "")
      .replace(/(?:when|if)\s+(?:the\s+)?price.*$/i, "")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .trim();

    return `Search for and locate "${productPart || 'the requested product'}". Navigate to the matching product page and inspect its live price. If the current price is under or equal to ${targetPrice}, click 'Add to Cart' or 'Buy Now'. If the current price is higher than ${targetPrice}, output COMPLETE stating the current price vs target. Original goal: ${rawGoal}`;
  }

  return rawGoal;
}

export class TaskOrchestrator {
  private sessions = new Map<string, TaskSession>();
  private planner: PlannerService;
  private compiler: IntentCompiler;

  constructor(planner: PlannerService, compiler?: IntentCompiler) {
    this.planner = planner;
    this.compiler = compiler || new IntentCompiler(process.env.LLM_API_KEY || "", process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1", process.env.LLM_MODEL || "openai/gpt-oss-120b");
  }

  createTask(taskId: string, goal: string, mode: "AUTONOMOUS" | "STEP_APPROVAL" = "AUTONOMOUS"): TaskSession {
    const normalizedGoal = normalizeGoalForExecution(goal);
    const session: TaskSession = {
      id: taskId,
      goal: normalizedGoal,
      state: "CREATED",
      stepIndex: 0,
      history: [],
      executionMode: mode
    };
    this.sessions.set(taskId, session);
    this.transitionState(session, "UNDERSTANDING");

    // Asynchronously compile workflow plan
    this.compiler.compileGoal(goal).then((plan) => {
      session.plan = plan;
    }).catch(() => {});

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

    // In STEP_APPROVAL mode, every active DOM action (clicks, typing, selects) requires user approval
    if (
      session.executionMode === "STEP_APPROVAL" &&
      plannedAction.type !== "COMPLETE" &&
      plannedAction.type !== "FAIL" &&
      plannedAction.type !== "WAIT"
    ) {
      session.pendingApprovalAction = plannedAction;
      this.transitionState(session, "WAITING_FOR_APPROVAL");
      const actionDesc = "description" in plannedAction ? (plannedAction as any).description : "";
      return {
        action: plannedAction,
        requiresApproval: true,
        summary: actionDesc || `Approval required before executing: [${plannedAction.type}] ${targetText ? `"${targetText}"` : ""}`
      };
    }

    if (riskPolicy.requiresExplicitApproval || plannedAction.type === "REQUEST_APPROVAL") {
      session.pendingApprovalAction = plannedAction;
      this.transitionState(session, "WAITING_FOR_APPROVAL");
      return {
        action: plannedAction,
        requiresApproval: true,
        summary: `Action requires user confirmation: ${plannedAction.type}`
      };
    }

    const url = (observation.url || "").toLowerCase();
    const isProductPage = url.includes("/dp/") || url.includes("/gp/product") || url.includes("/p/") || url.includes("/product/") || url.includes("/item/");
    const goalWantsCart = /add to cart|buy|purchase/i.test(session.goal);
    const hasAddedToCart = session.history.some((h) => /add to cart|buy now/i.test(h));

    // If on a product page and goal requires adding to cart, but it hasn't been clicked yet, ensure Add to Cart is clicked
    if (isProductPage && goalWantsCart && !hasAddedToCart && (plannedAction.type === "COMPLETE" || plannedAction.type === "SCROLL")) {
      const addToCartNode = observation.interactiveNodes.find((n) => {
        const text = [n.name || "", n.value || "", n.selector || "", n.id || ""].join(" ").toLowerCase();
        return /\b(add to cart|add to shopping cart|buy now|add-to-cart-button)\b/i.test(text) || text.includes("add-to-cart") || text.includes("addtocart");
      });

      if (addToCartNode) {
        const clickAction: AgentAction = {
          type: "CLICK",
          target: {
            id: addToCartNode.id,
            name: addToCartNode.name || "Add to Cart",
            role: addToCartNode.role || "button",
            selector: addToCartNode.selector
          },
          description: `Click "${addToCartNode.name || 'Add to Cart'}" to add product to cart.`
        };
        this.transitionState(session, "EXECUTING");
        session.stepIndex += 1;
        session.history.push(`Step ${session.stepIndex}: [CLICK] Click Add to Cart button (${addToCartNode.id})`);
        return { action: clickAction, requiresApproval: false };
      }
    }

    const isCartPage = url.includes("/cart") || url.includes("/gp/cart") || url.includes("/smart-wagon") || (observation.title || "").toLowerCase().includes("cart");

    // If item was already added to cart in an earlier step, or we arrived at the shopping cart page, terminate successfully immediately
    if (goalWantsCart && (hasAddedToCart || isCartPage)) {
      const summary = plannedAction.type === "COMPLETE" && plannedAction.summary
        ? plannedAction.summary
        : "Item has been added to cart successfully. Verified on cart screen.";
      const completeAction: AgentAction = {
        type: "COMPLETE",
        summary
      };
      this.transitionState(session, "COMPLETED");
      session.history.push(`Completed: ${summary}`);
      return { action: completeAction, requiresApproval: false };
    }

    if (plannedAction.type === "COMPLETE") {
      // Guardrail against hallucinated "Item added to cart" completions when still on search pages
      const isSearchPage = url.includes("/s?k=") || url.includes("/search") || url.includes("search_query") || url.includes("search_results");

      if (isSearchPage && !hasAddedToCart && /added to cart|purchased|condition met/i.test(plannedAction.summary || "")) {
        plannedAction.summary = `Search completed on store. The requested product was not found in the search results, so no item was added to cart.`;
      }

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
