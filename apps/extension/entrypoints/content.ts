import { defineContentScript } from "wxt/sandbox";
import { extractSemanticNodes, detectSecurityChallenge } from "@difm/a11y-tree";
import type { PageObservation, AgentAction } from "@difm/shared";
import { executeAgentAction, injectOtpCode } from "../src/executor.js";

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
        executeAgentAction(action).then(async (res) => {
          // Allow DOM to settle and capture fresh observation
          await new Promise((r) => setTimeout(r, 200));
          const nodes = extractSemanticNodes(document.body);
          const securityChallenge = detectSecurityChallenge(document);
          const observation: PageObservation = {
            url: window.location.href,
            title: document.title,
            interactiveNodes: nodes,
            securityChallenge,
            timestamp: Date.now()
          };
          sendResponse({ ...res, observation });
        });
        return true;
      } else if (message.type === "INJECT_OTP") {
        injectOtpCode(message.code).then(async (res) => {
          await new Promise((r) => setTimeout(r, 350));
          const nodes = extractSemanticNodes(document.body);
          const securityChallenge = detectSecurityChallenge(document);
          const observation: PageObservation = {
            url: window.location.href,
            title: document.title,
            interactiveNodes: nodes,
            securityChallenge,
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
