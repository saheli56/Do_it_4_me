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

  it("extracts demo form inputs with sample values and disabled attributes without premature blocking", () => {
    document.body.innerHTML = `
      <form action="demo" method="POST">
        <div class="form-group">
          <label for="input-1">First Name</label>
          <input id="input-1" name="input1" type="text" value="Jane" disabled aria-disabled="true">
        </div>
        <div class="form-group">
          <label for="input-2">Last Name</label>
          <input id="input-2" name="input2" type="text" value="Smith" disabled aria-disabled="true">
        </div>
        <div class="form-group">
          <label for="input-3">Email</label>
          <input id="input-3" name="input3" type="text" value="stopallbots@gmail.com" disabled aria-disabled="true">
        </div>
        <div class="form-group">
          <input id="recaptcha-demo-submit" type="submit" value="Submit">
        </div>
      </form>
    `;

    const nodes = extractSemanticNodes(document.body);
    expect(nodes.length).toBe(4);

    const firstName = nodes.find((n) => n.name === "First Name");
    expect(firstName).toBeDefined();
    expect(firstName?.value).toBe("Jane");
    expect(firstName?.disabled).toBe(true);

    const email = nodes.find((n) => n.name === "Email");
    expect(email).toBeDefined();
    expect(email?.value).toBe("stopallbots@gmail.com");
  });
});
