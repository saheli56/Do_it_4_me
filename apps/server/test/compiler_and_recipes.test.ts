import { describe, it, expect } from "vitest";
import { IntentCompiler } from "../src/compiler.js";
import { WorkflowPlanSchema } from "@difm/shared";

describe("Workflow Compiler & Deterministic Recipes", () => {
  const compiler = new IntentCompiler("mock_api_key", "http://localhost:3001", "mock_model");

  it("compiles Amazon price-drop purchase goals into deterministic workflow plans in 0ms (0 tokens)", async () => {
    const goal = "Automatically add to cart Sony XM6 headphones when the price drops below ₹49,999. (from amazon)";
    const plan = await compiler.compileGoal(goal);

    expect(plan.domain).toBe("amazon");
    expect(plan.goalType).toBe("PURCHASE_PRICE_DROP");
    expect(plan.targetUrl).toBe("https://www.amazon.in");
    expect(plan.parameters.maxPriceThreshold).toBe(49999);
    expect(plan.parameters.productQuery).toContain("Sony XM6");
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);

    // Validate against strict Zod schema
    const validated = WorkflowPlanSchema.safeParse(plan);
    expect(validated.success).toBe(true);
  });

  it("compiles utility bill payment goals into deterministic workflow plans", async () => {
    const goal = "Pay electricity bill on CESC for Monthly Bill consumer 102938492019";
    const plan = await compiler.compileGoal(goal);

    expect(plan.domain).toBe("cesc");
    expect(plan.goalType).toBe("BILL_PAYMENT");
    expect(plan.parameters.billingCycle).toBe("Monthly Bill");
    expect(plan.parameters.consumerNumber).toBe("102938492019");

    const validated = WorkflowPlanSchema.safeParse(plan);
    expect(validated.success).toBe(true);
  });

  it("compiles form autofill goals into deterministic workflow plans", async () => {
    const goal = "Autofill contact & feedback form";
    const plan = await compiler.compileGoal(goal, "https://example.com/contact");

    expect(plan.domain).toBe("generic_form");
    expect(plan.goalType).toBe("FORM_AUTOFILL");
    expect(plan.steps.some((s) => s.type === "AUTOFILL_FORM")).toBe(true);

    const validated = WorkflowPlanSchema.safeParse(plan);
    expect(validated.success).toBe(true);
  });

  it("compiles Flipkart price-drop and add-to-cart goals into deterministic workflow plans", async () => {
    const goal = "watch Sony WH-1000XM5 on flipkart under 25000";
    const plan = await compiler.compileGoal(goal);

    expect(plan.domain).toBe("flipkart");
    expect(plan.goalType).toBe("PURCHASE_PRICE_DROP");
    expect(plan.targetUrl).toBe("https://www.flipkart.com");
    expect(plan.parameters.maxPriceThreshold).toBe(25000);
    expect(plan.parameters.productQuery).toContain("Sony WH-1000XM5");
    expect(plan.steps.some((s) => s.type === "SEARCH")).toBe(true);
    expect(plan.steps.some((s) => s.type === "VERIFY_PRICE_AND_CART")).toBe(true);

    const validated = WorkflowPlanSchema.safeParse(plan);
    expect(validated.success).toBe(true);
  });

  it("compiles Flipkart add-to-cart goals without price threshold", async () => {
    const goal = "add Sony WH-1000XM5 to flipkart cart";
    const plan = await compiler.compileGoal(goal);

    expect(plan.domain).toBe("flipkart");
    expect(plan.goalType).toBe("ADD_TO_CART");
    expect(plan.targetUrl).toBe("https://www.flipkart.com");
    expect(plan.parameters.productQuery).toContain("Sony WH-1000XM5");

    const validated = WorkflowPlanSchema.safeParse(plan);
    expect(validated.success).toBe(true);
  });

  it("compiles Multi-Store price comparison goals across Amazon and Flipkart", async () => {
    const goal = "compare price of Sony WH-1000XM5 on amazon and flipkart";
    const plan = await compiler.compileGoal(goal);

    expect(plan.domain).toBe("multi_store");
    expect(plan.goalType).toBe("MULTI_STORE_PRICE_COMPARE");
    expect(plan.parameters.productQuery).toContain("Sony WH-1000XM5");
    expect(plan.steps.some((s) => s.type === "NAVIGATE" && s.url.includes("amazon"))).toBe(true);
    expect(plan.steps.some((s) => s.type === "NAVIGATE" && s.url.includes("flipkart"))).toBe(true);

    const validated = WorkflowPlanSchema.safeParse(plan);
    expect(validated.success).toBe(true);
  });
});
