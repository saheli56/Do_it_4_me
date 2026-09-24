import { z } from "zod";
import { ActionType } from "./actions.js";

export const RiskTierSchema = z.enum(["TIER_0", "TIER_1", "TIER_2", "TIER_3"]);
export type RiskTier = z.infer<typeof RiskTierSchema>;

export interface ActionRiskPolicy {
  tier: RiskTier;
  requiresExplicitApproval: boolean;
  requiresVisualIndicator: boolean;
}

export const ACTION_TYPE_RISK_MAP: Record<ActionType, RiskTier> = {
  SCROLL: "TIER_0",
  WAIT: "TIER_0",
  COMPLETE: "TIER_0",
  FAIL: "TIER_0",
  NAVIGATE: "TIER_1",
  CLICK: "TIER_1",
  SELECT: "TIER_1",
  TYPE: "TIER_1",
  REQUEST_USER_INPUT: "TIER_1",
  REQUEST_APPROVAL: "TIER_3"
};

const CRITICAL_SELECTOR_PATTERNS = [
  /place[\s_-]?order/i,
  /confirm[\s_-]?purchase/i,
  /buy[\s_-]?now/i,
  /pay[\s_-]?now/i,
  /cancel[\s_-]?subscription/i,
  /confirm[\s_-]?cancellation/i,
  /confirm[\s_-]?cancel/i,
  /delete[\s_-]?account/i,
  /confirm[\s_-]?return/i,
  /submit[\s_-]?payment/i
];

export function evaluateRiskTier(actionType: ActionType, elementTextOrLabel?: string): ActionRiskPolicy {
  let tier: RiskTier = ACTION_TYPE_RISK_MAP[actionType];

  if (elementTextOrLabel && (actionType === "CLICK" || actionType === "TYPE")) {
    const isCritical = CRITICAL_SELECTOR_PATTERNS.some((pattern) => pattern.test(elementTextOrLabel));
    if (isCritical) {
      tier = "TIER_3";
    }
  }

  return {
    tier,
    requiresExplicitApproval: tier === "TIER_3",
    requiresVisualIndicator: tier === "TIER_1" || tier === "TIER_2" || tier === "TIER_3"
  };
}
