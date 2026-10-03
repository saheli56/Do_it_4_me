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

    // 0. Return & Refund Workflows (Amazon, Flipkart, etc.)
    if (
      lower.includes("return") ||
      lower.includes("refund") ||
      lower.includes("replace") ||
      lower.includes("return item") ||
      lower.includes("return order")
    ) {
      let domain: WorkflowDomain = "amazon";
      let targetUrl = "https://www.amazon.in/gp/css/order-history";

      if (lower.includes("flipkart") || contextUrl.includes("flipkart")) {
        domain = "flipkart";
        targetUrl = "https://www.flipkart.com/account/orders";
      }

      let reason = "Item defective or doesn't work";
      if (/too\s+large|too\s+small|wrong\s+size|size\s+issue|size\s+not\s+fitting|fit/i.test(rawGoal)) {
        reason = "Wrong size / Size issue";
      } else if (/defective|damaged|broken|not\s+working|does\s*not\s*work|dead/i.test(rawGoal)) {
        reason = "Item defective or doesn't work";
      } else if (/poor\s+quality|quality\s+issue|not\s+as\s+described|different\s+item/i.test(rawGoal)) {
        reason = "Quality not as expected";
      } else if (/no\s+longer\s+needed|not\s+needed|mistake/i.test(rawGoal)) {
        reason = "No longer needed";
      }

      let itemQuery = rawGoal
        .replace(/^return\s+(?:the\s+)?/i, "")
        .replace(/^request\s+refund\s+(?:for\s+)?/i, "")
        .replace(/^replace\s+(?:the\s+)?/i, "")
        .replace(/on\s+amazon(?:\.in)?/i, "")
        .replace(/from\s+amazon(?:\.in)?/i, "")
        .replace(/to\s+amazon(?:\.in)?/i, "")
        .replace(/on\s+flipkart/i, "")
        .replace(/from\s+flipkart/i, "")
        .replace(/to\s+flipkart/i, "")
        .replace(/because\s+.*$/i, "")
        .replace(/due\s+to\s+.*$/i, "")
        .replace(/as\s+it.*$/i, "")
        .replace(/order\s*$/i, "")
        .trim();

      if (!itemQuery || itemQuery.length < 2) {
        itemQuery = "recent order";
      }

      return {
        id: `plan_return_${Date.now()}`,
        domain,
        goalType: "RETURN_OR_REFUND",
        targetUrl,
        parameters: {
          itemMatchQuery: itemQuery,
          returnReason: reason,
          refundMethod: "ORIGINAL_PAYMENT_METHOD"
        },
        steps: [
          { type: "NAVIGATE", url: targetUrl, description: `Navigate to ${domain === "flipkart" ? "Flipkart My Orders" : "Amazon Your Orders"}` },
          {
            type: "RETURN_ITEM",
            itemMatchQuery: itemQuery,
            returnReason: reason,
            refundMethod: "ORIGINAL_PAYMENT_METHOD",
            description: `Locate "${itemQuery}", select reason "${reason}", and prepare return/refund to original payment method`
          },
          { type: "COMPLETE", summary: `Return process prepared for "${itemQuery}". Ready for your final 1-click confirmation.` }
        ],
        createdAt: Date.now()
      };
    }

    // 1. Instant Zero-Token Heuristic Compiler for Top Sites
    // Multi-Store Price Comparison (e.g. "compare price of X on Myntra and Flipkart", "compare X between Amazon and Myntra")
    const storeKeywords = ["amazon", "flipkart", "myntra", "croma", "reliance", "meesho", "tatacliq"];
    const matchedStores = storeKeywords.filter((s) => lower.includes(s));

    if (lower.includes("compare") || matchedStores.length >= 2) {
      const storesToCompare = matchedStores.length >= 2
        ? matchedStores.slice(0, 2)
        : ["myntra", "flipkart"];

      const storeUrls: Record<string, string> = {
        amazon: "https://www.amazon.in",
        flipkart: "https://www.flipkart.com",
        myntra: "https://www.myntra.com",
        croma: "https://www.croma.com",
        reliance: "https://www.reliancedigital.in",
        meesho: "https://www.meesho.com",
        tatacliq: "https://www.tatacliq.com"
      };

      const priceMatch = lower.match(/(?:below|under|price drop below|less than)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
      const maxPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : undefined;

      let productQuery = rawGoal
        .replace(/compare\s+(?:the\s+)?(?:price|prices)?\s*(?:of)?/i, "")
        .replace(/on (?:amazon|flipkart|myntra|croma|reliance|meesho|tatacliq)(?:\.in|\.com)?/gi, "")
        .replace(/and (?:amazon|flipkart|myntra|croma|reliance|meesho|tatacliq)(?:\.in|\.com)?/gi, "")
        .replace(/between (?:amazon|flipkart|myntra|croma|reliance|meesho|tatacliq)(?:\.in|\.com)?/gi, "")
        .replace(/across (?:amazon|flipkart|myntra|croma|reliance|meesho|tatacliq)(?:\.in|\.com)?/gi, "")
        .replace(/from (?:amazon|flipkart|myntra|croma|reliance|meesho|tatacliq)(?:\.in|\.com)?/gi, "")
        .replace(/check both store pages.*$/i, "")
        .replace(/report the live price.*$/i, "")
        .replace(/and which store.*$/i, "")
        .replace(/under\s+(?:₹|rs\.?|inr)?\s*[0-9,]+/i, "")
        .replace(/below\s+(?:₹|rs\.?|inr)?\s*[0-9,]+/i, "")
        .trim();

      if (!productQuery || productQuery.length < 2) {
        productQuery = "Airdopes 311 Pro TWS";
      }

      const store1 = storesToCompare[0];
      const store2 = storesToCompare[1];
      const url1 = storeUrls[store1] || "https://www.myntra.com";
      const url2 = storeUrls[store2] || "https://www.flipkart.com";

      return {
        id: `plan_multistore_${Date.now()}`,
        domain: "multi_store",
        goalType: "MULTI_STORE_PRICE_COMPARE",
        targetUrl: url1,
        parameters: {
          productQuery,
          productModel: productQuery,
          maxPriceThreshold: maxPrice
        },
        steps: [
          { type: "NAVIGATE", url: url1, description: `Navigate to ${store1.toUpperCase()} for price check` },
          { type: "SEARCH", query: productQuery, description: `Search ${store1.toUpperCase()} for "${productQuery}"` },
          { type: "SELECT_PRODUCT", matchQuery: productQuery, description: `Select matching product on ${store1.toUpperCase()}` },
          { type: "NAVIGATE", url: url2, description: `Navigate to ${store2.toUpperCase()} for price check` },
          { type: "SEARCH", query: productQuery, description: `Search ${store2.toUpperCase()} for "${productQuery}"` },
          { type: "SELECT_PRODUCT", matchQuery: productQuery, description: `Select matching product on ${store2.toUpperCase()}` },
          { type: "COMPLETE", summary: `Multi-store price comparison completed across ${store1.toUpperCase()} and ${store2.toUpperCase()} for "${productQuery}".` }
        ],
        createdAt: Date.now()
      };
    }

    // Flipkart Product Search & Add to Cart / Price Drop
    if (lower.includes("flipkart") || contextUrl.includes("flipkart")) {
      const priceMatch = lower.match(/(?:below|under|price drop below|less than)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
      const maxPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : undefined;

      let productQuery = rawGoal
        .replace(/automatically\s+/i, "")
        .replace(/add to cart\s+/i, "")
        .replace(/purchase\s+/i, "")
        .replace(/buy\s+/i, "")
        .replace(/when the price drops.*/i, "")
        .replace(/\(from flipkart\)/i, "")
        .replace(/from flipkart/i, "")
        .replace(/on flipkart/i, "")
        .replace(/to flipkart cart/i, "")
        .replace(/to flipkart/i, "")
        .replace(/in flipkart/i, "")
        .replace(/watch\s+/i, "")
        .replace(/track\s+/i, "")
        .replace(/under\s+(?:₹|rs\.?|inr)?\s*[0-9,]+/i, "")
        .replace(/below\s+(?:₹|rs\.?|inr)?\s*[0-9,]+/i, "")
        .trim();

      if (!productQuery || productQuery.length < 2) {
        productQuery = "Sony WH-1000XM5";
      }

      return {
        id: `plan_flipkart_${Date.now()}`,
        domain: "flipkart",
        goalType: maxPrice ? "PURCHASE_PRICE_DROP" : "ADD_TO_CART",
        targetUrl: "https://www.flipkart.com",
        parameters: {
          productQuery,
          productModel: productQuery,
          maxPriceThreshold: maxPrice
        },
        steps: [
          { type: "NAVIGATE", url: "https://www.flipkart.com", description: "Navigate to Flipkart" },
          { type: "SEARCH", query: productQuery, description: `Search for "${productQuery}" on Flipkart` },
          { type: "SELECT_PRODUCT", matchQuery: productQuery, description: `Select product matching "${productQuery}"` },
          { type: "VERIFY_PRICE_AND_CART", maxPriceThreshold: maxPrice, description: `Verify price${maxPrice ? ` under ₹${maxPrice}` : ""} and Add to Cart on Flipkart` },
          { type: "COMPLETE", summary: `Item verified and added to Flipkart shopping cart.` }
        ],
        createdAt: Date.now()
      };
    }

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
        .replace(/to amazon cart/i, "")
        .replace(/to amazon/i, "")
        .replace(/in amazon/i, "")
        .replace(/watch\s+/i, "")
        .replace(/track\s+/i, "")
        .replace(/under\s+(?:₹|rs\.?|inr)?\s*[0-9,]+/i, "")
        .replace(/below\s+(?:₹|rs\.?|inr)?\s*[0-9,]+/i, "")
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
    const candidateModels = [this.model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"].filter((m, idx, arr) => m && arr.indexOf(m) === idx);
    for (const m of candidateModels) {
      try {
        const prompt = `You are the DIFM Workflow Plan Compiler.
Convert this user goal into a structured JSON execution plan.
USER GOAL: "${rawGoal}"
CURRENT CONTEXT URL: "${contextUrl}"

Respond ONLY in valid JSON matching this schema:
{
  "domain": "amazon" | "flipkart" | "cesc" | "airtel" | "jio" | "generic_form" | "generic_search" | "multi_store",
  "goalType": "PURCHASE_PRICE_DROP" | "ADD_TO_CART" | "BILL_PAYMENT" | "FORM_AUTOFILL" | "GENERIC_SEARCH_NAVIGATE" | "MULTI_STORE_PRICE_COMPARE",
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
