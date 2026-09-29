import OpenAI from "openai";
import type { WorkflowPlan, WorkflowDomain, WorkflowGoalType } from "@difm/shared";

export class IntentCompiler {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  /**
   * Compiles user natural language goal into a structured, deterministic execution recipe.
   * Uses instant heuristic compilation when patterns match, falling back to 1-shot LLM compiler.
   */
  async compileGoal(goal: string, contextUrl = ""): Promise<WorkflowPlan> {
    const rawGoal = goal.trim();
    const lower = rawGoal.toLowerCase();

    // 1. Instant Zero-Token Heuristic Compiler for Top Sites
    // Amazon Product Search & Add to Cart
    if (lower.includes("amazon") || contextUrl.includes("amazon") || /\b(buy|cart|purchase|headphones|tv|laptop|phone|monitor)\b/i.test(lower)) {
      const priceMatch = lower.match(/(?:below|under|price drop below|less than)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
      const maxPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : undefined;

      let productQuery = rawGoal
        .replace(/automatically\s+/i, "")
        .replace(/add to cart\s+/i, "")
        .replace(/purchase\s+/i, "")
        .replace(/buy\s+/i, "")
        .replace(/when the price drops.*/i, "")
        .replace(/\(from amazon\)/i, "")
        .replace(/from amazon/i, "")
        .replace(/on amazon/i, "")
        .trim();

      if (!productQuery || productQuery.length < 3) {
        productQuery = "Sony XM6 headphones";
      }

      return {
        id: `plan_amazon_${Date.now()}`,
        domain: "amazon",
        goalType: maxPrice ? "PURCHASE_PRICE_DROP" : "ADD_TO_CART",
        targetUrl: "https://www.amazon.in",
        parameters: {
          productQuery,
          productModel: productQuery,
          maxPriceThreshold: maxPrice
        },
        steps: [
          { type: "NAVIGATE", url: "https://www.amazon.in", description: "Navigate to Amazon" },
          { type: "SEARCH", query: productQuery, description: `Search for "${productQuery}"` },
          { type: "SELECT_PRODUCT", matchQuery: productQuery, description: `Select product matching "${productQuery}"` },
          { type: "VERIFY_PRICE_AND_CART", maxPriceThreshold: maxPrice, description: `Verify price${maxPrice ? ` under ₹${maxPrice}` : ""} and Add to Cart` },
          { type: "COMPLETE", summary: `Item verified and added to Amazon shopping cart.` }
        ],
        createdAt: Date.now()
      };
    }

    // CESC Electricity Bill
    if (lower.includes("cesc") || lower.includes("electricity bill") || contextUrl.includes("cesc")) {
      let cycle: "Monthly Bill" | "Advance Payment" | "Quarterly Bill" | "Yearly Bill" = "Monthly Bill";
      if (lower.includes("advance")) cycle = "Advance Payment";
      else if (lower.includes("quarterly")) cycle = "Quarterly Bill";
      else if (lower.includes("yearly") || lower.includes("annual")) cycle = "Yearly Bill";

      const consMatch = lower.match(/\b\d{9,12}\b/);
      const consumerNumber = consMatch ? consMatch[0] : "102938492019";

      return {
        id: `plan_cesc_${Date.now()}`,
        domain: "cesc",
        goalType: "BILL_PAYMENT",
        targetUrl: "https://www.cesc.co.in",
        parameters: {
          billingCycle: cycle,
          consumerNumber
        },
        steps: [
          { type: "NAVIGATE", url: "https://www.cesc.co.in", description: "Navigate to CESC portal" },
          { type: "FILL_BILLER_INFO", cycle, consumerNumber, description: `Select ${cycle} and enter consumer ID "${consumerNumber}"` },
          { type: "COMPLETE", summary: "CESC bill details loaded and ready for payment." }
        ],
        createdAt: Date.now()
      };
    }

    // Generic Form Autofill
    if (lower.includes("form") || lower.includes("autofill") || lower.includes("contact") || lower.includes("feedback")) {
      return {
        id: `plan_form_${Date.now()}`,
        domain: "generic_form",
        goalType: "FORM_AUTOFILL",
        targetUrl: contextUrl || "https://example.com",
        parameters: {
          formData: {}
        },
        steps: [
          { type: "AUTOFILL_FORM", submitOnFinish: true, description: "Autofill form fields with user profile data" },
          { type: "COMPLETE", summary: "Form filled and submitted successfully." }
        ],
        createdAt: Date.now()
      };
    }

    // 2. One-Shot LLM Intent Compiler (for general custom goals)
    const candidateModels = [this.model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    for (const m of candidateModels) {
      try {
        const prompt = `You are the DIFM Workflow Plan Compiler.
Convert this user goal into a structured JSON execution plan.
USER GOAL: "${rawGoal}"
CURRENT CONTEXT URL: "${contextUrl}"

Respond ONLY in valid JSON matching this schema:
{
  "domain": "amazon" | "flipkart" | "cesc" | "airtel" | "jio" | "generic_form" | "generic_search",
  "goalType": "PURCHASE_PRICE_DROP" | "ADD_TO_CART" | "BILL_PAYMENT" | "FORM_AUTOFILL" | "GENERIC_SEARCH_NAVIGATE",
  "targetUrl": "https://...",
  "parameters": {
    "productQuery": "...",
    "maxPriceThreshold": 12345,
    "consumerNumber": "...",
    "billingCycle": "Monthly Bill"
  },
  "steps": [
    { "type": "NAVIGATE", "url": "https://...", "description": "..." },
    { "type": "SEARCH", "query": "...", "description": "..." },
    { "type": "SELECT_PRODUCT", "matchQuery": "...", "description": "..." },
    { "type": "VERIFY_PRICE_AND_CART", "maxPriceThreshold": 12345, "description": "..." },
    { "type": "COMPLETE", "summary": "..." }
  ]
}`;

        const res = await this.client.chat.completions.create({
          model: m,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 600
        });

        const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
        if (parsed.domain && parsed.steps && Array.isArray(parsed.steps)) {
          return {
            id: `plan_${Date.now()}`,
            domain: parsed.domain as WorkflowDomain,
            goalType: (parsed.goalType || "GENERIC_SEARCH_NAVIGATE") as WorkflowGoalType,
            targetUrl: parsed.targetUrl || contextUrl || "https://www.google.com",
            parameters: parsed.parameters || {},
            steps: parsed.steps,
            createdAt: Date.now()
          };
        }
      } catch {
        // Try next fallback model
      }
    }

    // Default Fallback Plan
    return {
      id: `plan_default_${Date.now()}`,
      domain: "generic_search",
      goalType: "GENERIC_SEARCH_NAVIGATE",
      targetUrl: contextUrl || "https://www.google.com",
      parameters: { productQuery: rawGoal },
      steps: [
        { type: "NAVIGATE", url: contextUrl || "https://www.google.com", description: `Navigate to ${contextUrl || 'search'}` },
        { type: "SEARCH", query: rawGoal, description: `Execute goal: ${rawGoal}` },
        { type: "COMPLETE", summary: `Action executed for "${rawGoal}".` }
      ],
      createdAt: Date.now()
    };
  }
}
