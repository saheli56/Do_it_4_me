import { defineContentScript } from "wxt/sandbox";
import { extractSemanticNodes, detectSecurityChallenge, detectProductContext } from "@difm/a11y-tree";
import type { PageObservation, AgentAction } from "@difm/shared";
import { executeAgentAction } from "../src/executor.js";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "CAPTURE_OBSERVATION") {
        const nodes = extractSemanticNodes(document.body);
        const securityChallenge = detectSecurityChallenge(document);
        const productContext = detectProductContext(document);
        const observation: PageObservation = {
          url: window.location.href,
          title: document.title,
          interactiveNodes: nodes,
          securityChallenge,
          productContext,
          timestamp: Date.now()
        };
        sendResponse({ success: true, observation });
      } else if (message.type === "EXECUTE_ACTION") {
        const action = message.action as AgentAction;
        executeAgentAction(action).then(async (res) => {
          // Allow DOM to settle and capture fresh observation
          await new Promise((r) => setTimeout(r, 150));
          const nodes = extractSemanticNodes(document.body);
          const securityChallenge = detectSecurityChallenge(document);
          const productContext = detectProductContext(document);
          const observation: PageObservation = {
            url: window.location.href,
            title: document.title,
            interactiveNodes: nodes,
            securityChallenge,
            productContext,
            timestamp: Date.now()
          };
          sendResponse({ ...res, observation });
        });
        return true;
      }
      return true;
    });
  }
});
