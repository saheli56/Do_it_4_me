import { describe, it, expect, beforeEach } from "vitest";
import { Window } from "happy-dom";
import {
  extractSemanticNodes,
  formatSemanticTreeForPrompt,
  getAccessibleRole,
  getAccessibleName
} from "../src/extractor.js";

describe("a11y-tree extractor", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
  });

  it("extracts accessible role and name correctly", () => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Submit Return Request");
    expect(getAccessibleRole(btn)).toBe("button");
    expect(getAccessibleName(btn)).toBe("Submit Return Request");
  });

  it("extracts interactive elements and ignores hidden/script tags", () => {
    document.body.innerHTML = `
      <header>
        <h1>Order Return Portal</h1>
        <script>console.log("secret script")</script>
        <style>.hidden { display: none; }</style>
      </header>
      <main>
        <div aria-hidden="true">
          <button>Hidden Button</button>
        </div>
        <form>
          <label for="order-id">Order ID</label>
          <input id="order-id" type="text" placeholder="e.g. 123-456" />
          
          <label for="return-reason">Reason for return</label>
          <select id="return-reason">
            <option value="DEFECTIVE">Defective item</option>
            <option value="TOO_SMALL">Too small</option>
          </select>

          <button type="submit" data-testid="submit-btn">Continue Return</button>
        </form>
      </main>
    `;

    const nodes = extractSemanticNodes(document.body);
    expect(nodes.length).toBe(3);

    const inputNode = nodes.find((n) => n.role === "textbox");
    expect(inputNode).toBeDefined();
    expect(inputNode?.name).toBe("Order ID");
    expect(inputNode?.placeholder).toBe("e.g. 123-456");

    const selectNode = nodes.find((n) => n.role === "combobox");
    expect(selectNode).toBeDefined();
    expect(selectNode?.name).toBe("Reason for return");

    const btnNode = nodes.find((n) => n.role === "button");
    expect(btnNode).toBeDefined();
    expect(btnNode?.name).toBe("Continue Return");
    expect(btnNode?.selector).toBe('[data-testid="submit-btn"]');

    const formatted = formatSemanticTreeForPrompt(nodes);
    expect(formatted).toContain('[node-1] TEXTBOX "Order ID"');
    expect(formatted).toContain('[node-2] COMBOBOX "Reason for return"');
    expect(formatted).toContain('[node-3] BUTTON "Continue Return"');
  });
});
