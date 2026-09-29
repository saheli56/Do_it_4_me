import type { PageObservation, AgentAction, WorkflowStep, WorkflowPlan } from "@difm/shared";

export interface AdapterExecutionResult {
  action?: AgentAction;
  completed?: boolean;
  summary?: string;
  navigated?: boolean;
  handled: boolean;
}

export interface PriceInspectionResult {
  currentPrice?: number;
  currency?: string;
  title?: string;
  imageUrl?: string;
  inStock?: boolean;
}

export interface SiteAdapter {
  name: string;
  matches(url: string, plan?: WorkflowPlan): boolean;
  executeStep(
    step: WorkflowStep,
    doc: Document,
    observation: PageObservation,
    plan: WorkflowPlan
  ): Promise<AdapterExecutionResult>;
  inspectPrice?(doc: Document, url: string): Promise<PriceInspectionResult | null> | PriceInspectionResult | null;
}

