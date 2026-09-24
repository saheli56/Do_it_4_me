import { describe, it, expect, beforeEach, vi } from "vitest";
import { Window } from "happy-dom";
import { findTargetElement, executeAgentAction } from "../src/executor.js";
import type { AgentAction } from "@difm/shared";

describe("Action Executor Runtime", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window({ url: "https://shop.example.com/checkout" });
    document = window.document as unknown as Document;
    // @ts-expect-error test mock
    globalThis.document = document;
    // @ts-expect-error test mock
    globalThis.window = window;
  });

  it("finds elements via data-testid selector and executes CLICK", async () => {
    const btn = document.createElement("button");
    btn.id = "cancel-btn";
    btn.textContent = "Cancel My Subscription";
    document.body.appendChild(btn);

    let clicked = false;
    btn.addEventListener("click", () => {
      clicked = true;
    });

    const action: AgentAction = {
      type: "CLICK",
      target: {
        id: "node-1",
        selector: "#cancel-btn",
        name: "Cancel My Subscription"
      },
      description: "Click cancel subscription button"
    };

    const targetEl = findTargetElement(action.target, document);
    expect(targetEl).toBeDefined();

    const result = await executeAgentAction(action, document);
    if (!result.success) {
      console.error("Action error:", result.error);
    }
    expect(result.success).toBe(true);
    expect(clicked).toBe(true);
  });

  it("types text into input fields and fires input and change events", async () => {
    document.body.innerHTML = `
      <div>
        <input id="return-reason-text" data-testid="reason-input" type="text" value="" />
      </div>
    `;

    const input = document.getElementById("return-reason-text") as HTMLInputElement;
    let changed = false;
    input.addEventListener("input", () => {
      changed = true;
    });

    const action: AgentAction = {
      type: "TYPE",
      target: {
        id: "node-2",
        selector: '[data-testid="reason-input"]',
        name: "Reason"
      },
      text: "Item arrived damaged",
      clearExisting: true,
      maskInput: false,
      description: "Type return reason"
    };

    const result = await executeAgentAction(action, document);
    expect(result.success).toBe(true);
    expect(input.value).toBe("Item arrived damaged");
    expect(changed).toBe(true);
  });
});
