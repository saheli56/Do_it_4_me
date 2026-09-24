import { defineContentScript } from "wxt/sandbox";
import { extractSemanticNodes, detectSecurityChallenge } from "@difm/a11y-tree";
import type { PageObservation, AgentAction } from "@difm/shared";
import { executeAgentAction } from "../src/executor.js";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "CAPTURE_OBSERVATION") {
        const nodes = extractSemanticNodes(document.body);
        const securityChallenge = detectSecurityChallenge(document);
        const observation: PageObservation = {
          url: window.location.href,
          title: document.title,
          interactiveNodes: nodes,
          securityChallenge,
          timestamp: Date.now()
        };
        sendResponse({ success: true, observation });
      } else if (message.type === "EXECUTE_ACTION") {
        const action = message.action as AgentAction;
        executeAgentAction(action).then((res) => {
          sendResponse(res);
        });
        return true;
      }
      return true;
    });
  }
});
