import { z } from "zod";

export const WorkflowDomainSchema = z.enum([
  "amazon",
  "flipkart",
  "cesc",
  "airtel",
  "jio",
  "generic_form",
  "generic_search",
  "multi_store"
]);
export type WorkflowDomain = z.infer<typeof WorkflowDomainSchema>;

export const WorkflowGoalTypeSchema = z.enum([
  "PURCHASE_PRICE_DROP",
  "ADD_TO_CART",
  "BILL_PAYMENT",
  "FORM_AUTOFILL",
  "GENERIC_SEARCH_NAVIGATE",
  "MULTI_STORE_PRICE_COMPARE",
  "RETURN_OR_REFUND"
]);
export type WorkflowGoalType = z.infer<typeof WorkflowGoalTypeSchema>;

export const RefundMethodSchema = z.enum([
  "ORIGINAL_PAYMENT_METHOD",
  "AMAZON_PAY_BALANCE",
  "FLIPKART_WALLET",
  "BANK_ACCOUNT"
]);
export type RefundMethod = z.infer<typeof RefundMethodSchema>;

export const WorkflowStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("NAVIGATE"),
    url: z.string().url(),
    description: z.string()
  }),
  z.object({
    type: z.literal("SEARCH"),
    query: z.string(),
    description: z.string()
  }),
  z.object({
    type: z.literal("SELECT_PRODUCT"),
    matchQuery: z.string(),
    description: z.string()
  }),
  z.object({
    type: z.literal("VERIFY_PRICE_AND_CART"),
    maxPriceThreshold: z.number().optional(),
    description: z.string()
  }),
  z.object({
    type: z.literal("RETURN_ITEM"),
    itemMatchQuery: z.string().optional(),
    returnReason: z.string().optional(),
    refundMethod: RefundMethodSchema.optional(),
    description: z.string()
  }),
  z.object({
    type: z.literal("FILL_BILLER_INFO"),
    cycle: z.enum(["Monthly Bill", "Advance Payment", "Quarterly Bill", "Yearly Bill"]).optional(),
    consumerNumber: z.string().optional(),
    description: z.string()
  }),
  z.object({
    type: z.literal("AUTOFILL_FORM"),
    profileFields: z.record(z.string()).optional(),
    submitOnFinish: z.boolean().default(true),
    description: z.string()
  }),
  z.object({
    type: z.literal("COMPLETE"),
    summary: z.string()
  })
]);
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowPlanSchema = z.object({
  id: z.string(),
  domain: WorkflowDomainSchema,
  goalType: WorkflowGoalTypeSchema,
  targetUrl: z.string(),
  parameters: z.object({
    productQuery: z.string().optional(),
    productModel: z.string().optional(),
    maxPriceThreshold: z.number().optional(),
    itemMatchQuery: z.string().optional(),
    returnReason: z.string().optional(),
    refundMethod: RefundMethodSchema.optional(),
    billingCycle: z.enum(["Monthly Bill", "Advance Payment", "Quarterly Bill", "Yearly Bill"]).optional(),
    consumerNumber: z.string().optional(),
    formData: z.record(z.string()).optional()
  }),
  steps: z.array(WorkflowStepSchema),
  createdAt: z.number().default(() => Date.now())
});
export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;
