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
  * First Name / Name -> input matching "first name", "firstname", "name", "full name", "account holder"
    - If User First Name is provided (e.g. "mimi"), type it into First Name input.
  * Last Name / Surname -> input matching "last name", "lastname", "surname", "family name"
    - If User Last Name is provided (e.g. "mimi" or "doe"), type it into Last Name input.
  * Phone / Mobile -> input matching "phone", "mobile", "contact", "tel"
  * Email -> input matching "email", "mail", "e-mail"
  * Company / Business -> input matching "company", "business", "organization", "firm"
  * GSTIN / Tax ID -> input matching "gst", "gstin", "tax", "vat", "pan"
  * Street / Address Line -> input or textarea matching "address", "street", "addr", "line 1"
  * City / Town -> input matching "city", "town", "district"
  * State / Province -> input or select matching "state", "province", "region"
  * Postal / PIN / ZIP Code -> input matching "zip", "postal", "pin", "pincode"
  * Consumer / Account / Connection / ID No -> input matching "consumer", "account", "ca no", "k no", "id", "number"
  * Comments / Messages / Notes -> textarea or textbox matching "message", "notes", "description", "details"
- If form inputs already contain sample/demo values (e.g. "Jane", "Smith", "stopallbots@gmail.com") or are marked [disabled] on demo/test pages, ALWAYS OVERRIDE/REPLACE them with the user's provided details (e.g. First Name "mimi", Last Name "mimi", Email "demo56@gmail.com").
- SUBMITTING THE FORM & COMPLETION:
  * If the USER GOAL specifies submitting (e.g. "submit the form", "submit", "click submit", "send form", "proceed", "continue") OR all form inputs are already filled with user details, and a Submit / Proceed / Send / Continue button or input (type="submit" or role="button") exists on the page:
    -> YOU MUST OUTPUT A "CLICK" ACTION ON THAT SUBMIT BUTTON (e.g. targetId of Submit button).
    -> NEVER output COMPLETE without clicking the Submit button when the user explicitly asked to submit the form!
  * If the previous action already clicked the Submit button, or if the form is already submitted/reloaded, output COMPLETE with summary: "Form filled with user details and submitted successfully."
  * Only output COMPLETE after clicking the Submit button, or if no submission button exists and all fields are filled.

3. AUTONOMOUS NAVIGATION & DEEP LINKING:
- If on a homepage, index page, or search page, dynamically inspect the page links and locate the most relevant category or action link:
  * For bill payments: prioritize links matching "Quick Pay", "Pay Bill", "Online Payment", "Instant Payment", "Pay Online", "Recharge", "Electricity Bill", etc.
  * NEVER click social media links/icons (e.g. Facebook, Twitter/X, Instagram, YouTube, LinkedIn, Pinterest) unless the goal explicitly requests social media.
  * Avoid footer external feeds or irrelevant navigation links.

4. UTILITY BILLS, PAYMENT TIMELINE / CYCLE DISAMBIGUATION & QR CODES:
- When arriving at a payment portal, landing page, or options hub (such as "Payment Services", "Quick Bill Pay", "online_payment_options.php", "Quick Links", "Online Services"):
  * Look for the category or timeline payment links:
    - If "Monthly Bill" / "Monthly" (or if no specific cycle specified, default to standard "Monthly Bill" / "LT Customer"): Match and CLICK the "Monthly Bill" link (e.g. linking to "monthlybill.php" or labeled "Monthly Bill").
    - If "Advance Payment" / "Advance": Match and CLICK the "Advance Payment" link.
    - If "Quarterly Bill" / "Quarterly": Match and CLICK the "Quarterly Bill" link.
    - If "Yearly / Annual" / "Yearly" / "Annual": Match and CLICK the "Annual Bill" / "Yearly Bill" link.
  * NEVER output FAIL on an options hub or portal overview page when options like "Monthly Bill" exist. Always click the appropriate billing timeline link to navigate to the consumer number input form!
  * On the payment form (e.g. "monthlybill.php"), locate the Consumer Number / Account ID input, enter the user's account number (e.g. 102938492019), fill email/mobile if requested, solve/request any captcha if needed, and submit to view the bill.
  * Advance through portal steps to reach the bill review or payment method screen.
  * Prefer selecting "UPI / QR Code" or "Scan to Pay" so the QR code appears directly on the user's screen.
  * Never finalize a financial charge without explicit approval: output COMPLETE or REQUEST_APPROVAL when the QR code is displayed or when reaching final card submission.

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

export function normalizeExtractedUrl(rawUrl?: string, textContext = ""): string | undefined {
  const combined = ((rawUrl || "") + " " + textContext).toLowerCase();
  if (combined.includes("cesc")) {
    return "https://www.cesc.co.in";
  }

  if (!rawUrl) return undefined;
  let url = rawUrl.trim().replace(/[\.,;:)]+$/, "");
  url = url.replace(/cesc\.(con|coin|co\b)/i, "cesc.co.in");
  url = url.replace(/\.(con)\b/i, ".com");
  url = url.replace(/\.coin\b/i, ".co.in");
  
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

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

    // Prioritize configured model, followed by verified live Groq models (qwen/qwen3.8-27b, openai/gpt-oss-120b, openai/gpt-oss-20b)
    const candidateModels = [
      this.model,
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "allam-2-7b"
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let lastError: string = "";

    for (const modelToTry of candidateModels) {
      try {
        const response = await this.client.chat.completions.create({
          model: modelToTry,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 350
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
        lastError = errorMsg;
        console.warn(`Planning attempt with model ${modelToTry} failed:`, errorMsg);
        // Try next candidate model if current model fails (404, 429, decommissioned, rate limit, etc.)
        continue;
      }
    }

    return {
      type: "FAIL",
      error: `LLM Planner error: ${lastError}`,
      recoverable: false
    };
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

  async extractBillDetails(params: {
    text?: string;
    imageBase64?: string;
    mimeType?: string;
    filename?: string;
  }): Promise<import("@difm/shared").BillExtractResult> {
    let ocrText = "";
    if (params.imageBase64) {
      try {
        const { createWorker } = await import("tesseract.js");
        const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const worker = await createWorker("eng");
        const ret = await worker.recognize(buffer);
        await worker.terminate();
        ocrText = ret.data?.text || "";
      } catch (ocrErr) {
        console.warn("Local OCR warning:", ocrErr);
      }
    }

    const combinedText = [params.text, ocrText].filter(Boolean).join("\n\n");

    const promptInstructions = `
You are an expert AI parser for utility bills, invoices, recharge slips, broadband receipts, and payment statements.
Your job is to analyze the provided document content (text/receipt/invoice) and extract key attributes with high accuracy.

Extract:
1. billerName: Name of the service provider, vendor, utility board, or company (e.g., "CESC", "Tata Power", "Airtel", "Jio", "BSNL", "AWS", "Google Cloud", "Bangalore Water Supply", "HDFC Credit Card").
2. consumerNumber: Account number, consumer number, CA number, customer ID, connection ID, phone number (for mobile/broadband recharges), or invoice number.
3. dueDate: The exact payment due date or bill deadline formatted as YYYY-MM-DD (e.g., "2026-10-05"). If only month/day given, assume the upcoming due date.
4. dueAmount: The total payable amount, net payable amount, or invoice total formatted with currency or number (e.g., "₹1,450.00", "$45.99", "1450").
5. category: One of ["ELECTRICITY", "WATER", "GAS", "INTERNET", "MOBILE", "CREDIT_CARD", "SHOPPING", "FORM_FILL", "GENERAL", "OTHER"].
6. billingCycle: One of ["MONTHLY", "QUARTERLY", "YEARLY", "ADVANCE", "ONE_TIME", "CUSTOM"]. (e.g. "MONTHLY" for regular monthly utility bills, "QUARTERLY" for 3-month cycle, "YEARLY" for annual bills/subscriptions, "ADVANCE" for advance payments).
7. portalUrl: Official payment portal URL if known or found (e.g. "https://www.cesc.co.in", "https://www.airtel.in"), else null.
8. customerName: Name of the consumer or customer on the bill if present.
9. notes: A concise summary of the bill details (e.g. "CESC Electricity Bill of ₹1,450 due on 05 Oct 2026").

Respond with ONLY a valid JSON object matching this structure:
{
  "billerName": "...",
  "consumerNumber": "...",
  "dueDate": "YYYY-MM-DD",
  "dueAmount": "...",
  "category": "ELECTRICITY",
  "billingCycle": "MONTHLY",
  "portalUrl": "...",
  "customerName": "...",
  "notes": "..."
}
`;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];

    if (combinedText.trim()) {
      userContent.push({
        type: "text",
        text: `Document Filename: ${params.filename || "Uploaded Bill"}\n\nDocument Text / Extracted Content:\n${combinedText}`
      });
    } else {
      userContent.push({
        type: "text",
        text: `Document Filename: ${params.filename || "Uploaded Bill Image"}\nPlease inspect the attached document to extract biller name, consumer number, due date, and amount.`
      });
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: promptInstructions },
          { role: "user", content: userContent as any }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      const rawContent = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawContent);

      return {
        billerName: parsed.billerName || (/cesc/i.test(combinedText) ? "CESC Electricity" : undefined),
        consumerNumber: parsed.consumerNumber || undefined,
        dueDate: parsed.dueDate || undefined,
        dueAmount: parsed.dueAmount || undefined,
        category: parsed.category || "GENERAL",
        billingCycle: parsed.billingCycle || "MONTHLY",
        portalUrl: normalizeExtractedUrl(parsed.portalUrl, combinedText),
        customerName: parsed.customerName || undefined,
        notes: parsed.notes || undefined
      };
    } catch (err) {
      // Fallback heuristics if LLM fails or is offline
      const textToScan = [params.text, ocrText, params.filename].filter(Boolean).join(" ");
      let billerName = "Utility Service";
      let category: import("@difm/shared").TaskCategory = "GENERAL";
      let billingCycle: import("@difm/shared").BillingCycle = "MONTHLY";
      let portalUrl = "";
      let customerName: string | undefined = undefined;

      if (/quarterly|quarter/i.test(textToScan)) {
        billingCycle = "QUARTERLY";
      } else if (/annual|yearly|per year/i.test(textToScan)) {
        billingCycle = "YEARLY";
      } else if (/advance/i.test(textToScan)) {
        billingCycle = "ADVANCE";
      }

      if (/cesc/i.test(textToScan)) {
        billerName = "CESC Electricity";
        category = "ELECTRICITY";
        portalUrl = "https://www.cesc.co.in";
      } else if (/electricity|power|tneb|bescom|tata power|wbsetcl/i.test(textToScan)) {
        billerName = "Electricity Board";
        category = "ELECTRICITY";
      } else if (/airtel|jio|vi |vodafone|bsnl/i.test(textToScan)) {
        billerName = "Mobile / Broadband";
        category = "MOBILE";
      } else if (/water|bwssb|jal/i.test(textToScan)) {
        billerName = "Water Department";
        category = "WATER";
      } else if (/gas|indane|hp gas|bharat gas|adani/i.test(textToScan)) {
        billerName = "Gas Utility";
        category = "GAS";
      }

      // Customer name regex
      const custMatch = textToScan.match(/(?:customer|consumer|account\s*holder)?\s*name\s*[:\-]\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,3})/i);
      if (custMatch && custMatch[1]) {
        customerName = custMatch[1].trim().replace(/\s+(category|phone|email|subdivision|connection|meter|bill|due).*/i, "").trim();
      }

      // Regex for portal URL
      const urlMatch = textToScan.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch && !portalUrl) {
        portalUrl = urlMatch[0].replace(/[\.,;:)]+$/, "");
      }

      // Regex for consumer / account numbers
      const numMatch = textToScan.match(/(?:consumer(?:\s*id|\s*no|\s*number)?|ca\s*no|account(?:\s*no|\s*number|\s*id)?|acct|k\s*no|ref\s*no|customer\s*id)[^\d\n\r]{0,10}(\d{6,18})/i) || textToScan.match(/\b(\d{10,14})\b/);
      
      // Regex for dates (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
      const dateMatch = textToScan.match(/(?:due(?:\s*date)?|deadline|by)[^\d\n\r]{0,10}((\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}))/i) || textToScan.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/);

      // Regex for due amount (avoiding 4-digit years like 2026)
      const amtMatch = textToScan.match(/(?:payable\s*amount(?:\s*due)?|total\s*payable|net\s*payable|amount\s*due|total\s*due|bill\s*amount|rs\.?|inr|₹|\$)[^\d\n\r]{0,10}([\d,]+(?:\.\d{2})?)/i) || textToScan.match(/(?:amount|due|total)[^\d\n\r]{0,10}([\d,]+\.\d{2})/i);

      let formattedDate: string | undefined = undefined;
      const rawDateStr = dateMatch ? (dateMatch[1] || dateMatch[0]) : undefined;
      if (rawDateStr) {
        try {
          const d = new Date(rawDateStr);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString().split("T")[0];
          }
        } catch {}
      }

      return {
        billerName,
        consumerNumber: numMatch ? numMatch[1] : undefined,
        dueDate: formattedDate,
        dueAmount: amtMatch ? (amtMatch[1].startsWith("₹") ? amtMatch[1] : `₹${amtMatch[1]}`) : undefined,
        category,
        billingCycle,
        portalUrl: normalizeExtractedUrl(portalUrl, textToScan),
        customerName: customerName || undefined,
        notes: `Extracted from ${params.filename || "bill document"}`
      };
    }
  }
}
