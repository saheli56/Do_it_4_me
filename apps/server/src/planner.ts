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
5. E-COMMERCE, PRODUCT SEARCH & PRICE MONITORING RULES:
- When the goal specifies buying or tracking a specific product model (e.g. "Sony WH-1000XM5" or "Sony WH-1000XM4"):
  * If currently on a store homepage (e.g. amazon.in, flipkart.com, myntra.com):
    - DO NOT SCROLL on the homepage.
    - Locate the search input (e.g. "Search Amazon.in", "Search for Products", searchbox) and TYPE the exact product name (e.g. "Sony WH-1000XM5").
    - Then CLICK the Search / Submit button (e.g. "Go", "Search").
  * On search results pages or product cards:
    - Match the EXACT product model requested (e.g. "Sony WH-1000XM5").
    - Read ONLY the '[Current Price: ...]' or price attached to that EXACT matching product (e.g. ₹28,990).
    - NEVER read prices from other products, adjacent models, or sponsored items (e.g. DO NOT read XM6 at ₹49,900 when tracking XM5).
    - If live price <= target price (e.g. ₹28,990 <= ₹29,999):
      -> CLICK the matching "Add to cart" button (e.g. BUTTON "Add to cart" [for "Sony WH-1000XM5..." at ₹28,990]) or click the matching product title link.
      -> Advance to cart/checkout and output COMPLETE or REQUEST_APPROVAL with summary: "Price condition met: Found [Product] at ₹[Price] (under target ₹[Target]). Item added to cart and ready at checkout."
    - If live price > target price:
      -> DO NOT add to cart. Output COMPLETE with summary: "Found [Product] currently at ₹[Price] (above target ₹[Target]). Item not added to cart. Monitoring active."
  * On dedicated product pages:
    - Locate the live price (e.g. ₹28,990) and compare with target.
    - If price <= target: Click "Add to Cart" or "Buy Now" immediately.
    - If price > target: Do not add to cart and report status.

6. PROHIBITED ACTIONS & LOOP PREVENTION:
- NEVER output REQUEST_USER_INPUT to ask the user for public webpage information (such as product price, stock status, or bill amount). As an autonomous agent, you must inspect the elements and read the price from the webpage yourself.
- ONLY output REQUEST_USER_INPUT for private missing user credentials (e.g. Consumer Account ID, 2FA OTP).
- NEVER enter a loop of repeated SCROLL or REQUEST_USER_INPUT. If on a search page and a product link is visible, CLICK it. If on a homepage, TYPE into the search input.

7. GENERAL INTERACTION RULES:
- ONLY use targetId matching nodes in the interactive elements list.
- Only output FAIL if there are literally no elements to interact with and the page cannot be navigated.
- When the goal or form filling has been achieved, output COMPLETE with a clear summary.

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
  if (rawUrl && rawUrl.trim()) {
    let url = rawUrl.trim().replace(/[\.,;:)]+$/, "");
    if (/cesc\.(con|coin|co\.in|co|in|com)/i.test(url) || url.toLowerCase().includes("cesc.")) {
      return "https://www.cesc.co.in";
    }
    url = url.replace(/\.(con)\b/i, ".com");
    url = url.replace(/\.coin\b/i, ".co.in");
    
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    return url;
  }

  if (textContext) {
    if (/\bcesc\b/i.test(textContext)) return "https://www.cesc.co.in";
    if (/\bairtel\b/i.test(textContext)) return "https://www.airtel.in";
    if (/\bamazon\b/i.test(textContext)) return "https://www.amazon.in";
    if (/\bflipkart\b/i.test(textContext)) return "https://www.flipkart.com";
    if (/\bjio\b/i.test(textContext)) return "https://www.jio.com";
  }

  return undefined;
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
    // Keep last 5 steps to prevent prompt explosion on long tasks
    const recentHistory = stepHistory.slice(-5);
    const historyPrompt =
      recentHistory.length > 0
        ? `\nPREVIOUS ACTIONS TAKEN:\n${recentHistory.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : "";

    // Candidate models in preference order
    const candidateModels = [
      this.model,
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "allam-2-7b"
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let lastError: string = "";

    // Helper to build user prompt with variable tree detail level
    const buildUserPrompt = (maxNodes = 80, maxChars = 6000) => {
      const tree = formatSemanticTreeForPrompt(
        observation.interactiveNodes,
        maxNodes,
        maxChars,
        observation.productContext
      );
      return `
USER GOAL: "${goal}"
CURRENT URL: ${observation.url}
PAGE TITLE: "${observation.title}"
${historyPrompt}

<untrusted_webpage_content>
INTERACTIVE ELEMENTS:
${tree}
</untrusted_webpage_content>

Analyze the user goal and the interactive elements, then output the next JSON action.`;
    };

    let userMessage = buildUserPrompt(80, 6000);

    for (const modelToTry of candidateModels) {
      try {
        let messageContent = "";
        try {
          const response = await this.client.chat.completions.create({
            model: modelToTry,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 500
          });
          messageContent = response.choices[0]?.message?.content || "{}";
        } catch (apiErr: any) {
          const errStr = (apiErr?.message || "").toLowerCase();
          const isLengthError = errStr.includes("reduce the length") || errStr.includes("too long") || errStr.includes("context") || errStr.includes("token");

          // If prompt was too large, retry with compact tree (30 nodes, 2500 chars)
          if (isLengthError) {
            console.warn(`Prompt length exceeded for ${modelToTry}, retrying with compressed semantic tree...`);
            const compactUserMessage = buildUserPrompt(30, 2500);
            const retryResponse = await this.client.chat.completions.create({
              model: modelToTry,
              messages: [
                { role: "system", content: "You are the DIFM Web Action Planner. Respond ONLY in valid JSON matching: {\"action\": {\"type\": \"CLICK\"|\"TYPE\"|\"SELECT\"|\"COMPLETE\"|\"FAIL\", \"targetId\": \"...\", \"text\": \"...\", \"description\": \"...\"}}" },
                { role: "user", content: compactUserMessage }
              ],
              temperature: 0.1,
              max_tokens: 350
            });
            messageContent = retryResponse.choices[0]?.message?.content || "{}";
          } else if (apiErr?.status === 400 || errStr.includes("json")) {
            const fallbackResponse = await this.client.chat.completions.create({
              model: modelToTry,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `${userMessage}\n\nIMPORTANT: Return ONLY a valid JSON object matching the requested schema.` }
              ],
              temperature: 0.1,
              max_tokens: 500
            });
            messageContent = fallbackResponse.choices[0]?.message?.content || "{}";
          } else {
            throw apiErr;
          }
        }

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
          continue;
        }

        return this.mapToAgentAction(rawAction, observation);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Planner error";
        lastError = errorMsg;
        console.warn(`Planning attempt with model ${modelToTry} failed:`, errorMsg);
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

  async parseRoughTask(params: {
    rawGoal: string;
    currentUrl?: string;
    userProfile?: any;
  }): Promise<{
    formattedGoal: string;
    title: string;
    category: import("@difm/shared").TaskCategory;
    billingCycle: import("@difm/shared").BillingCycle;
    dueDate?: string;
    dueAmount?: string;
    consumerNumber?: string;
    providerName?: string;
    targetUrl?: string;
    schedule?: {
      enabled: boolean;
      frequency: import("@difm/shared").ScheduleFrequency;
      time: string;
      dayOfMonth?: number;
      dayOfWeek?: number;
      intervalDays?: number;
      autoExecute: boolean;
    };
    missingFields: Array<"consumerNumber" | "providerName" | "dueAmount" | "targetUrl" | "dueDate">;
    clarificationPrompt?: string;
    requiresHumanApproval: boolean;
    safetySummary: string;
    priceCondition?: import("@difm/shared").PriceCondition;
  }> {
    const prompt = `
You are the AI Task Architect for "Do It For Me" (DIFM).
The user gave a raw, rough, informal, or unstructured task description:
"${params.rawGoal}"

Current Webpage URL: ${params.currentUrl || "None"}
User Active Profile: ${JSON.stringify(params.userProfile || {})}

Your job:
1. Clean and format this into a clear, professional, step-by-step agent goal ("formattedGoal").
2. Create a concise task title ("title", max 50 chars).
3. Detect category from ["ELECTRICITY", "WATER", "GAS", "INTERNET", "MOBILE", "CREDIT_CARD", "SHOPPING", "COMMERCE_WATCH", "FORM_FILL", "GENERAL"].
   - If the task is about watching a price drop, monitoring e-commerce deals, or auto-buying an item when the price drops below a threshold (e.g. Amazon, Flipkart, Myntra, etc.), choose "COMMERCE_WATCH".
4. If "COMMERCE_WATCH" or shopping price alert is detected, extract priceCondition:
   - targetPrice (number, e.g. 19999 if user says "under 20000" or "drop to 19999")
   - currentPrice (number if user mentions current price)
   - currency (e.g. "INR")
   - checkIntervalMinutes (default 30)
   - autoAddToCart (boolean, default true)
   - autoProceedToCheckout (boolean, default true)
   - productTitle (string if product is named)
5. Detect billingCycle from ["MONTHLY", "QUARTERLY", "YEARLY", "ADVANCE", "ONE_TIME", "CUSTOM"].
6. Extract dueDate (YYYY-MM-DD), dueAmount (e.g. ₹1,450.00), consumerNumber (account/CA/consumer ID/phone), providerName (e.g. CESC, Airtel, Amazon, Flipkart, Tata Power, etc.), targetUrl (official portal or target webpage).
7. Detect if schedule is requested (e.g. "every month on 5th", "daily at 9am", "check every 30 mins"):
   - frequency: "MONTHLY" | "WEEKLY" | "DAILY" | "CUSTOM_DAYS" | "ONCE"
   - time: e.g. "09:30"
   - dayOfMonth: (1-31) if monthly
   - dayOfWeek: (0-6) if weekly
   - autoExecute: false (CRITICAL: always false for financial actions so user confirms payment).
8. Identify missing critical fields needed for execution/scheduling from ["consumerNumber", "providerName", "dueAmount", "targetUrl", "dueDate"].
9. Write a friendly, polite clarificationPrompt asking for the missing fields if any are required.
10. State safety reminder: "Safety Guard: Agent will navigate, verify price/bill, add to cart or prepare payment, and always pause for human approval before final payment authorization."

Respond with ONLY a JSON object in this schema:
{
  "formattedGoal": "...",
  "title": "...",
  "category": "COMMERCE_WATCH",
  "billingCycle": "ONE_TIME",
  "dueDate": "YYYY-MM-DD",
  "dueAmount": "₹1,450.00",
  "consumerNumber": "...",
  "providerName": "...",
  "targetUrl": "...",
  "priceCondition": {
    "targetPrice": 19999,
    "currentPrice": 24999,
    "currency": "INR",
    "checkIntervalMinutes": 30,
    "autoAddToCart": true,
    "autoProceedToCheckout": true,
    "productTitle": "..."
  },
  "schedule": {
    "enabled": true,
    "frequency": "DAILY",
    "time": "09:30",
    "dayOfMonth": 5,
    "autoExecute": false
  },
  "missingFields": [],
  "clarificationPrompt": "...",
  "requiresHumanApproval": true,
  "safetySummary": "..."
}
`;

    const candidateModels = [
      this.model,
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "allam-2-7b"
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    for (const modelToTry of candidateModels) {
      try {
        let messageContent = "";
        try {
          const response = await this.client.chat.completions.create({
            model: modelToTry,
            messages: [
              { role: "system", content: "You are the DIFM Task Architect. Respond in valid JSON." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 800
          });
          messageContent = response.choices[0]?.message?.content || "{}";
        } catch (jsonErr: any) {
          if (jsonErr?.status === 400 || jsonErr?.message?.includes("JSON")) {
            const fallbackResponse = await this.client.chat.completions.create({
              model: modelToTry,
              messages: [
                { role: "system", content: "You are the DIFM Task Architect. Respond in valid JSON." },
                { role: "user", content: `${prompt}\n\nReturn ONLY a valid JSON object.` }
              ],
              temperature: 0.1,
              max_tokens: 800
            });
            messageContent = fallbackResponse.choices[0]?.message?.content || "{}";
          } else {
            throw jsonErr;
          }
        }

        let parsed: any = {};
        try {
          parsed = JSON.parse(messageContent);
        } catch {
          const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        if (parsed.title || parsed.formattedGoal) {
          return {
            formattedGoal: parsed.formattedGoal || params.rawGoal,
            title: parsed.title || params.rawGoal.slice(0, 50),
            category: parsed.category || "GENERAL",
            billingCycle: parsed.billingCycle || "MONTHLY",
            dueDate: parsed.dueDate || undefined,
            dueAmount: parsed.dueAmount || undefined,
            consumerNumber: parsed.consumerNumber || undefined,
            providerName: parsed.providerName || undefined,
            targetUrl: normalizeExtractedUrl(parsed.targetUrl || params.currentUrl, params.rawGoal),
            priceCondition: parsed.priceCondition ? {
              targetPrice: typeof parsed.priceCondition.targetPrice === "number" ? parsed.priceCondition.targetPrice : (parsed.priceCondition.targetPrice ? parseFloat(String(parsed.priceCondition.targetPrice).replace(/[^0-9.]/g, "")) : undefined),
              currentPrice: typeof parsed.priceCondition.currentPrice === "number" ? parsed.priceCondition.currentPrice : (parsed.priceCondition.currentPrice ? parseFloat(String(parsed.priceCondition.currentPrice).replace(/[^0-9.]/g, "")) : undefined),
              currency: parsed.priceCondition.currency || "INR",
              checkIntervalMinutes: parsed.priceCondition.checkIntervalMinutes || 30,
              autoAddToCart: parsed.priceCondition.autoAddToCart ?? true,
              autoProceedToCheckout: parsed.priceCondition.autoProceedToCheckout ?? true,
              priceMatched: false,
              productTitle: parsed.priceCondition.productTitle || undefined
            } : undefined,
            schedule: parsed.schedule || {
              enabled: /every|monthly|daily|weekly|schedule/i.test(params.rawGoal),
              frequency: "MONTHLY",
              time: "09:30",
              dayOfMonth: 5,
              autoExecute: false
            },
            missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
            clarificationPrompt: parsed.clarificationPrompt || undefined,
            requiresHumanApproval: true,
            safetySummary: parsed.safetySummary || "Safety Guard: Agent will navigate and prepare actions, pausing for your explicit confirmation before any purchase or payment."
          };
        }
      } catch (err) {
        console.warn(`parseRoughTask attempt with model ${modelToTry} failed:`, err);
        continue;
      }
    }

    // Heuristic Fallback
    const raw = params.rawGoal;
    let category: import("@difm/shared").TaskCategory = "GENERAL";
    let providerName: string | undefined = undefined;
    let portalUrl = params.currentUrl || "";
    let priceCondition: import("@difm/shared").PriceCondition | undefined = undefined;

    // Check for shopping / commerce watch
    const isCommerce = /amazon|flipkart|myntra|meesho|ajio|croma|price\s*drop|track\s*price|when\s*price|below\s*(?:₹|rs\.?|\$)?\s*\d+|under\s*(?:₹|rs\.?|\$)?\s*\d+/i.test(raw) ||
      (portalUrl && /amazon\.|flipkart\.|myntra\.|meesho\.|ajio\./i.test(portalUrl));

    if (isCommerce) {
      category = "COMMERCE_WATCH";
      if (/amazon/i.test(raw) || /amazon\./i.test(portalUrl)) {
        providerName = "Amazon";
        if (!portalUrl) portalUrl = "https://www.amazon.in";
      } else if (/flipkart/i.test(raw) || /flipkart\./i.test(portalUrl)) {
        providerName = "Flipkart";
        if (!portalUrl) portalUrl = "https://www.flipkart.com";
      } else if (/myntra/i.test(raw) || /myntra\./i.test(portalUrl)) {
        providerName = "Myntra";
        if (!portalUrl) portalUrl = "https://www.myntra.com";
      } else {
        providerName = "Shopping Store";
      }

      // Extract target price (e.g., "under 20000", "below 15000", "drop to 999")
      const targetMatch = raw.match(/(?:below|under|drops?\s+to|target|reach(?:es)?)\s*(?:rs\.?|inr|₹|\$)?\s*([\d,]+)/i) ||
        raw.match(/(?:rs\.?|inr|₹|\$)\s*([\d,]+)\s*(?:or\s+(?:below|less)|target)/i);
      const currentMatch = raw.match(/(?:currently|current\s+price|now\s+at)\s*(?:rs\.?|inr|₹|\$)?\s*([\d,]+)/i);

      const targetPrice = targetMatch ? parseFloat(targetMatch[1].replace(/,/g, "")) : undefined;
      const currentPrice = currentMatch ? parseFloat(currentMatch[1].replace(/,/g, "")) : undefined;

      priceCondition = {
        targetPrice,
        currentPrice,
        currency: "INR",
        checkIntervalMinutes: 30,
        autoAddToCart: true,
        autoProceedToCheckout: true,
        priceMatched: false
      };
    } else if (/cesc/i.test(raw)) {
      category = "ELECTRICITY";
      providerName = "CESC Electricity";
      portalUrl = "https://www.cesc.co.in";
    } else if (/bescom/i.test(raw)) {
      category = "ELECTRICITY";
      providerName = "BESCOM Electricity";
      portalUrl = "https://www.bescom.co.in";
    } else if (/tata power/i.test(raw)) {
      category = "ELECTRICITY";
      providerName = "Tata Power";
    } else if (/electricity|power|wbsedcl/i.test(raw)) {
      category = "ELECTRICITY";
      providerName = "Electricity Board";
    } else if (/airtel/i.test(raw)) {
      category = /broadband|wifi|fiber/i.test(raw) ? "INTERNET" : "MOBILE";
      providerName = "Airtel";
      portalUrl = "https://www.airtel.in";
    } else if (/jio/i.test(raw)) {
      category = /fiber|broadband|wifi/i.test(raw) ? "INTERNET" : "MOBILE";
      providerName = "Jio";
      portalUrl = "https://www.jio.com";
    } else if (/broadband|internet|wifi/i.test(raw)) {
      category = "INTERNET";
      providerName = "Internet Service Provider";
    } else if (/recharge|mobile/i.test(raw)) {
      category = "MOBILE";
      providerName = "Mobile Operator";
    } else if (/water/i.test(raw)) {
      category = "WATER";
      providerName = "Water Department";
    }

    const numMatch = raw.match(/\b(\d{6,18})\b/);
    const amtMatch =
      raw.match(/(?:rs\.?|inr|₹|\$|bill\s+of|amount\s+of|amount\s*:?|amt\s*:?|of)\s*([\d,]+(?:\.\d{2})?)/i) ||
      raw.match(/\b([\d,]+(?:\.\d{2})?)\s*(?:rs|rupees|inr)\b/i);
    const dateMatch = raw.match(/(?:by|before|on|due)?\s*((\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{0,4}))/i);

    const missing: Array<"consumerNumber" | "providerName" | "dueAmount" | "targetUrl" | "dueDate"> = [];
    if (!numMatch && category !== ("GENERAL" as string) && category !== ("COMMERCE_WATCH" as string) && category !== ("SHOPPING" as string)) missing.push("consumerNumber");
    if (!providerName && !portalUrl) missing.push("providerName");

    const title = category === "COMMERCE_WATCH"
      ? `Watch Price: ${providerName || "Product"}${priceCondition?.targetPrice ? ` (Under ₹${priceCondition.targetPrice.toLocaleString("en-IN")})` : ""}`
      : (providerName ? `Pay ${providerName} Bill` : (raw.length > 50 ? raw.slice(0, 47) + "..." : raw));
    
    const formattedGoal = category === "COMMERCE_WATCH"
      ? `Monitor product price on ${providerName || "store"}. When price drops below ${priceCondition?.targetPrice ? `₹${priceCondition.targetPrice}` : "target"}, add item to cart and pause at checkout for 1-click human confirmation.`
      : `Autonomously perform: ${raw}. Locate target form/account field, populate verified user details, verify amount, and present confirmation for human approval.`;

    return {
      formattedGoal,
      title,
      category,
      billingCycle: /quarterly/i.test(raw) ? "QUARTERLY" : /yearly/i.test(raw) ? "YEARLY" : (category === "COMMERCE_WATCH" ? "ONE_TIME" : "MONTHLY"),
      dueDate: dateMatch ? dateMatch[1] : undefined,
      dueAmount: amtMatch ? (amtMatch[1].startsWith("₹") ? amtMatch[1] : `₹${amtMatch[1]}`) : (priceCondition?.targetPrice ? `₹${priceCondition.targetPrice.toLocaleString("en-IN")}` : undefined),
      consumerNumber: numMatch ? numMatch[1] : undefined,
      providerName,
      targetUrl: normalizeExtractedUrl(portalUrl, raw),
      priceCondition,
      schedule: {
        enabled: category === "COMMERCE_WATCH" ? true : /every|monthly|schedule|repeat|daily|weekly/i.test(raw),
        frequency: category === "COMMERCE_WATCH" ? "DAILY" : "MONTHLY",
        time: "09:30",
        dayOfMonth: 5,
        autoExecute: false
      },
      missingFields: missing,
      clarificationPrompt: missing.length > 0 ? `Please provide your ${missing.join(" and ")} to finalize this scheduled task.` : undefined,
      requiresHumanApproval: true,
      safetySummary: "Safety Guard: Irreversible payments and submissions will always pause for your explicit confirmation."
    };
  }
}
