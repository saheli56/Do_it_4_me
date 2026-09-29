import type { PageObservation, AgentAction, WorkflowStep, WorkflowPlan } from "@difm/shared";

export interface AdapterExecutionResult {
  action?: AgentAction;
  completed?: boolean;
  summary?: string;
  navigated?: boolean;
  handled: boolean;
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
}
