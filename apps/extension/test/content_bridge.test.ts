import { describe, it, expect, beforeEach, vi } from "vitest";
import { Window } from "happy-dom";
import { extractSemanticNodes } from "@difm/a11y-tree";
import type { PageObservation } from "@difm/shared";

describe("Extension Content Script Observation Bridge", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window({ url: "https://shop.example.com/returns" });
    document = window.document as unknown as Document;
  });

  it("captures full PageObservation from active document", () => {
    document.title = "Order Return Portal";
    document.body.innerHTML = `
      <div>
        <h2>Return Item</h2>
        <button id="btn-return" data-testid="start-return">Start Return</button>
      </div>
    `;

    const nodes = extractSemanticNodes(document.body);
    const observation: PageObservation = {
      url: window.location.href,
      title: document.title,
      interactiveNodes: nodes,
      timestamp: Date.now()
    };

    expect(observation.url).toBe("https://shop.example.com/returns");
    expect(observation.title).toBe("Order Return Portal");
    expect(observation.interactiveNodes.length).toBe(1);
    expect(observation.interactiveNodes[0].name).toBe("Start Return");
    expect(observation.interactiveNodes[0].selector).toBe('[data-testid="start-return"]');
  });
});
