import { defineContentScript } from "wxt/sandbox";
import { extractSemanticNodes, detectSecurityChallenge } from "@difm/a11y-tree";
import type { PageObservation, AgentAction } from "@difm/shared";
import { executeAgentAction } from "../src/executor.js";
import { findMatchingAdapter } from "../src/adapters/index.js";

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
          if (res && (res as any).navigated) {
            sendResponse({ ...res });
            return;
          }
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
      } else if (message.type === "INSPECT_PRICE") {
        (async () => {
          const adapter = findMatchingAdapter(window.location.href);
          let result = adapter?.inspectPrice ? await adapter.inspectPrice(document, window.location.href) : null;
          
          if (!result || !result.currentPrice) {
          // Fallback generic DOM extraction for ecommerce sites
          const metaPrice = document.querySelector(
            'meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]'
          );
          let foundPrice: number | undefined;
          if (metaPrice) {
            const content = metaPrice.getAttribute("content");
            if (content) {
              const p = parseFloat(content.replace(/[^0-9.]/g, ""));
              if (!isNaN(p) && p > 0) foundPrice = Math.round(p);
            }
          }

          if (!foundPrice) {
            const priceSelectors = [
              ".price", ".product-price", "[data-price]", "#price",
              ".a-price .a-offscreen", ".current-price", ".offer-price",
              "span.price", "div.price", "span.a-price-whole"
            ];
            for (const sel of priceSelectors) {
              const el = document.querySelector(sel);
              if (el && el.textContent) {
                const match = el.textContent.match(/(?:₹|Rs\.?|\$)\s*([\d,]+(?:\.\d+)?)/i);
                if (match && match[1]) {
                  const val = parseFloat(match[1].replace(/,/g, ""));
                  if (!isNaN(val) && val > 0) {
                    foundPrice = Math.round(val);
                    break;
                  }
                }
              }
            }
          }

          const pageTitle =
            document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
            document.querySelector("#productTitle")?.textContent?.trim() ||
            document.title;
          const imageUrl =
            document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
            (document.querySelector("#landingImage, #imgBlkFront") as HTMLImageElement | null)?.src;

            result = {
              currentPrice: foundPrice,
              currency: "INR",
              title: pageTitle,
              imageUrl
            };
          }

          sendResponse({ success: true, result });
        })();
        return true;
      }
      return true;
    });
  }
});
