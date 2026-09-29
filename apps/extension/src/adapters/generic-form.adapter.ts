import type { SiteAdapter, AdapterExecutionResult } from "./types.js";
import type { PageObservation, WorkflowStep, WorkflowPlan } from "@difm/shared";

export class GenericFormAdapter implements SiteAdapter {
  name = "GenericFormAdapter";

  matches(): boolean {
    return true; // Fallback adapter for general forms
  }

  async executeStep(
    step: WorkflowStep,
    doc: Document,
    observation: PageObservation,
    plan: WorkflowPlan
  ): Promise<AdapterExecutionResult> {
    if (step.type !== "AUTOFILL_FORM" && plan.goalType !== "FORM_AUTOFILL") {
      return { handled: false };
    }

    const formData = (step.type === "AUTOFILL_FORM" ? step.profileFields : plan.parameters.formData) || {};
    const inputs = Array.from(doc.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select"));

    let filledCount = 0;

    for (const input of inputs) {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        const nameAttr = (input.name || input.id || input.placeholder || "").toLowerCase();
        let valToFill = "";

        if (/first.*name|fname/i.test(nameAttr) && formData.firstName) valToFill = formData.firstName;
        else if (/last.*name|lname|surname/i.test(nameAttr) && formData.lastName) valToFill = formData.lastName;
        else if (/name/i.test(nameAttr) && formData.fullName) valToFill = formData.fullName;
        else if (/email|mail/i.test(nameAttr) && formData.email) valToFill = formData.email;
        else if (/phone|mobile|tel|contact/i.test(nameAttr) && formData.phone) valToFill = formData.phone;
        else if (/company|business|organization/i.test(nameAttr) && formData.company) valToFill = formData.company;
        else if (/gst|tax/i.test(nameAttr) && formData.taxId) valToFill = formData.taxId;
        else if (/address|street/i.test(nameAttr) && formData.address) valToFill = formData.address;
        else if (/city/i.test(nameAttr) && formData.city) valToFill = formData.city;
        else if (/state/i.test(nameAttr) && formData.state) valToFill = formData.state;
        else if (/zip|postal|pin/i.test(nameAttr) && formData.postalCode) valToFill = formData.postalCode;
        else if (/message|comments|notes|feedback/i.test(nameAttr) && formData.notes) valToFill = formData.notes;

        if (valToFill && input.value !== valToFill) {
          input.focus();
          input.value = valToFill;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          filledCount++;
        }
      }
    }

    if (filledCount > 0) {
      const submitBtn = doc.querySelector('input[type="submit"], button[type="submit"], button[name*="submit" i]') as HTMLElement | null;
      if (submitBtn) {
        submitBtn.click();
      }
      return {
        handled: true,
        completed: true,
        summary: `Autofilled ${filledCount} form fields with user profile data and submitted.`
      };
    }

    return { handled: false };
  }
}
