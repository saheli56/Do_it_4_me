import OpenAI from "openai";
import type { AgentAction, PageObservation } from "@difm/shared";
import { formatSemanticTreeForPrompt } from "@difm/a11y-tree";

const SYSTEM_PROMPT = `
You are the Autonomous Action Planner for "Do It For Me" (DIFM), a versatile, intelligent web action and form autofill agent.

Your mission is to autonomously fulfill the USER GOAL on any webpage—whether it is filling out forms, submitting inquiries, testing web forms/demos, navigating portals, signing up, or executing utility actions.

CORE CAPABILITIES & EXECUTION RULES:

1. GENERAL TASK & INSTRUCTION EXECUTION:
- Carefully analyze the USER GOAL and the interactive elements on the current webpage.
- Always be proactive and execute actions step-by-step on whatever page is currently loaded.
- NEVER abort or output FAIL simply because a page is a demo/test page, or because the task title/instructions contain different keywords (e.g. if the goal mentions "payment" or "bills" but the current webpage is a demo or contact form, STILL proceed to fill the user's details into the available form inputs on this page).

2. INTELLIGENT USER DETAILS, FORM FILLING & SUBMISSION:
- Extract all user details and target actions from the USER GOAL.
- Whenever the page contains textboxes or form fields, match and TYPE the user's details into them:
  * Name / Full Name / First Name / Last Name -> input matching "name", "full name", "first name", "last name", "account holder"
    - If user provides a single name like "mimi", fill "mimi" into First Name (or Name field).
  * Phone / Mobile -> input matching "phone", "mobile", "contact", "tel"
  * Email -> input matching "email", "mail", "e-mail"
  * Consumer / Account / Connection / ID No -> input matching "consumer", "account", "ca no", "k no", "id", "number"
  * Comments / Messages / Notes -> textarea or textbox matching "message", "notes", "description", "details"
- If form inputs already contain sample/demo values (e.g. "Jane", "Smith", "stopallbots@gmail.com") or are marked [disabled] on demo/test pages, ALWAYS OVERRIDE/REPLACE them with the user's provided details (e.g. User Name "mimi", Email "demo56@gmail.com").
- SUBMITTING THE FORM:
  * If the USER GOAL specifies submitting (e.g. "submit the form", "submit", "click submit", "send form", "proceed", "continue") OR all form inputs are already filled with user details, and a Submit / Proceed / Send / Continue button or input (type="submit" or role="button") exists on the page:
    -> YOU MUST OUTPUT A "CLICK" ACTION ON THAT SUBMIT BUTTON (e.g. targetId of Submit button).
    -> NEVER output COMPLETE without clicking the Submit button when the user explicitly asked to submit the form!
  * Only output COMPLETE after clicking the Submit button, or if no submission button exists and all fields are filled.

3. AUTONOMOUS NAVIGATION & DEEP LINKING:
- If on a homepage, index page, or search page, locate and click the relevant category or action link (e.g. "Contact Us", "Submit", "Sign Up", "Quick Pay", "Pay Bill", "Recharge", "Electricity", "Broadband").

4. UTILITY BILLS & PAYMENT QR CODES:
- For bill payments, advance through portal steps to reach the bill details or payment screen.
- Prefer selecting "UPI / QR Code" or "Scan to Pay" so the QR code appears directly on the user's screen.
- Never finalize a financial charge without explicit approval: output COMPLETE or REQUEST_APPROVAL when the QR code is displayed or when reaching final card submission.

5. GENERAL INTERACTION RULES:
- ONLY use targetId matching nodes in the interactive elements list.
- Only output FAIL if there are literally no elements to interact with and the page cannot be navigated.
- When the goal or form filling has been achieved, output COMPLETE with a clear summary of the fields filled.

OUTPUT FORMAT:
Respond with a SINGLE VALID JSON object in this exact schema:
{
  "action": {
    "type": "CLICK" | "TYPE" | "SELECT" | "SCROLL" | "NAVIGATE" | "WAIT" | "REQUEST_APPROVAL" | "REQUEST_USER_INPUT" | "COMPLETE" | "FAIL",
    "targetId": "node-123", // required for CLICK, TYPE, SELECT
    "text": "text to type", // required for TYPE
    "value": "option value", // required for SELECT
    "direction": "UP" | "DOWN" | "TOP" | "BOTTOM", // for SCROLL
    "url": "https://...", // for NAVIGATE
    "durationMs": 1000, // for WAIT
    "summary": "Outcome details or scan instruction", // for COMPLETE or REQUEST_APPROVAL
    "consequences": "Action consequences", // for REQUEST_APPROVAL
    "prompt": "Question to user", // for REQUEST_USER_INPUT
    "fieldKey": "field_name", // for REQUEST_USER_INPUT
    "error": "Error description", // for FAIL
    "recoverable": false, // for FAIL
    "description": "Clear step-by-step reasoning" // required
  }
}
`;

export class PlannerService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL
    });
    this.model = model;
  }

  async planNextStep(
    goal: string,
    observation: PageObservation,
    stepHistory: string[]
  ): Promise<AgentAction> {
    const formattedTree = formatSemanticTreeForPrompt(observation.interactiveNodes);

    const historyPrompt =
      stepHistory.length > 0
        ? `\nPREVIOUS ACTIONS TAKEN:\n${stepHistory.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : "";

    const userMessage = `
USER GOAL: "${goal}"
CURRENT URL: ${observation.url}
PAGE TITLE: "${observation.title}"
${historyPrompt}

<untrusted_webpage_content>
INTERACTIVE ELEMENTS:
${formattedTree}
</untrusted_webpage_content>

Analyze the user goal and the interactive elements, then output the next JSON action.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const messageContent = response.choices[0]?.message?.content || "{}";
      let rawAction: any = null;

      try {
        const parsed = JSON.parse(messageContent);
        rawAction = parsed.action || parsed;
      } catch {
        const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          rawAction = parsed.action || parsed;
        }
      }

      if (!rawAction || !rawAction.type) {
        return {
          type: "FAIL",
          error: "Could not determine next action from model response",
          recoverable: false
        };
      }

      return this.mapToAgentAction(rawAction, observation);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Planner error";
      console.error("Groq Planning error:", errorMsg);
      return {
        type: "FAIL",
        error: `LLM Planner error: ${errorMsg}`,
        recoverable: false
      };
    }
  }

  private mapToAgentAction(
    raw: {
      type: string;
      targetId?: string;
      text?: string;
      value?: string;
      direction?: "UP" | "DOWN" | "TOP" | "BOTTOM";
      url?: string;
      durationMs?: number;
      summary?: string;
      consequences?: string;
      prompt?: string;
      fieldKey?: string;
      error?: string;
      recoverable?: boolean;
      description: string;
    },
    observation: PageObservation
  ): AgentAction {
    const targetNode = raw.targetId
      ? observation.interactiveNodes.find((n) => n.id === raw.targetId)
      : undefined;

    const targetLocator = targetNode
      ? {
          id: targetNode.id,
          role: targetNode.role,
          name: targetNode.name,
          selector: targetNode.selector,
          bounds: targetNode.bounds
        }
      : { id: "unknown", selector: "body" };

    switch (raw.type) {
      case "CLICK":
        return {
          type: "CLICK",
          target: targetLocator,
          description: raw.description
        };
      case "TYPE":
        return {
          type: "TYPE",
          target: targetLocator,
          text: raw.text || "",
          clearExisting: true,
          maskInput: false,
          description: raw.description
        };
      case "SELECT":
        return {
          type: "SELECT",
          target: targetLocator,
          value: raw.value || "",
          description: raw.description
        };
      case "SCROLL":
        return {
          type: "SCROLL",
          direction: raw.direction || "DOWN",
          description: raw.description
        };
      case "NAVIGATE":
        return {
          type: "NAVIGATE",
          url: raw.url || observation.url,
          description: raw.description
        };
      case "WAIT":
        return {
          type: "WAIT",
          durationMs: raw.durationMs || 1000,
          reason: raw.description
        };
      case "REQUEST_APPROVAL":
        return {
          type: "REQUEST_APPROVAL",
          summary: raw.summary || raw.description,
          details: { url: observation.url },
          consequences: raw.consequences || "This action cannot be undone."
        };
      case "REQUEST_USER_INPUT":
        return {
          type: "REQUEST_USER_INPUT",
          prompt: raw.prompt || raw.description,
          fieldKey: raw.fieldKey || "input",
          isSecret: false
        };
      case "COMPLETE":
        return {
          type: "COMPLETE",
          summary: raw.summary || raw.description
        };
      case "FAIL":
      default:
        return {
          type: "FAIL",
          error: raw.error || raw.description,
          recoverable: raw.recoverable ?? false
        };
    }
  }
}
