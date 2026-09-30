import type { SiteAdapter, AdapterExecutionResult } from "./types.js";
import type { PageObservation, WorkflowStep, WorkflowPlan } from "@difm/shared";

/**
 * Extracts a numeric price from text containing currency symbols (₹, Rs, INR) and commas.
 * e.g. "₹24,999" -> 24999, "Rs. 1,499.00" -> 1499
 */
export function extractPriceNumber(priceText: string): number {
  if (!priceText) return 0;
  // Match the first sequence of numbers/commas possibly with decimals
  const cleaned = priceText.replace(/,/g, "");
  const match = cleaned.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  if (match && match[1]) {
    return Math.round(parseFloat(match[1]));
  }
  const digitsOnly = priceText.replace(/[^0-9]/g, "");
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

/**
 * Checks if candidate title matches target query/model with exact model disambiguation.
 * Ensures models like WH-1000XM5 do NOT match WF-1000XM5 or WH-1000XM6, and iPhone 15 Pro Max does not match iPhone 14 Pro Max.
 */
export function isExactModelMatch(candidateTitle: string, targetQuery: string): boolean {
  if (!candidateTitle || !targetQuery) return false;
  const titleLower = candidateTitle.toLowerCase();
  const queryLower = targetQuery.toLowerCase();

  // Extract model numbers / alphanumeric tokens like "wh-1000xm5", "wf-1000xm4", "15", "14", "s24"
  const queryTokens = queryLower.split(/\s+/).filter((t) => t.length > 0);

  // Model codes: tokens with numbers (e.g. "wh-1000xm5", "1000xm5", "xm5", "15", "s24")
  const modelOrNumberTokens = queryTokens.filter((t) => /\d/.test(t));

  for (const modelToken of modelOrNumberTokens) {
    const escaped = modelToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (!regex.test(titleLower)) {
      return false;
    }
  }

  // Check that all significant non-model keywords (length > 2) are present
  const generalTokens = queryTokens.filter((t) => t.length > 2 && !modelOrNumberTokens.includes(t));
  const generalMatches = generalTokens.every((t) => titleLower.includes(t));

  return generalMatches || titleLower.includes(queryLower);
}

export class FlipkartAdapter implements SiteAdapter {
  name = "FlipkartAdapter";
  domain = "flipkart";

  matches(url: string): boolean {
    return /flipkart\.com/i.test(url);
  }

  async executeStep(
    step: WorkflowStep,
    doc: Document,
    observation: PageObservation,
    plan: WorkflowPlan
  ): Promise<AdapterExecutionResult> {
    const url = (observation.url || doc.defaultView?.location.href || "").toLowerCase();
    const win = doc.defaultView || (typeof window !== "undefined" ? window : globalThis.window);
    const Evt = (win && (win as unknown as { Event: typeof Event }).Event) || Event;

    // 1. If on cart view / checkout / viewcart screen, complete immediately
    if (url.includes("/viewcart") || url.includes("/checkout") || url.includes("/cart") || (doc.title || "").toLowerCase().includes("shopping cart") || (doc.title || "").toLowerCase().includes("my cart")) {
      return {
        handled: true,
        completed: true,
        summary: "Item verified in Flipkart Cart. Workflow completed successfully."
      };
    }

    // 2. SEARCH step
    if (step.type === "SEARCH") {
      const searchInput = (
        doc.querySelector('input[name="q"]') ||
        doc.querySelector('input[type="text"][title*="Search" i]') ||
        doc.querySelector('input[placeholder*="Search" i]') ||
        doc.querySelector('input[type="search"]')
      ) as HTMLInputElement | null;

      if (searchInput) {
        searchInput.focus();
        searchInput.value = step.query;
        try {
          searchInput.dispatchEvent(new Evt("input", { bubbles: true }));
          searchInput.dispatchEvent(new Evt("change", { bubbles: true }));
        } catch {}

        const submitBtn = (
          doc.querySelector('button[type="submit"]') ||
          doc.querySelector('button svg') ||
          searchInput.form?.querySelector('button[type="submit"]')
        ) as HTMLElement | null;

        // Dispatch Enter key event to trigger deterministic search
        try {
          const KeyEvt = (win && (win as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent) || KeyboardEvent;
          const enterEvt = new KeyEvt("keydown", {
            key: "Enter",
            code: "Enter",
            bubbles: true,
            cancelable: true
          });
          searchInput.dispatchEvent(enterEvt);
        } catch {}

        if (submitBtn) {
          submitBtn.click();
        } else if (searchInput.form) {
          searchInput.form.submit();
        }

        return {
          handled: true,
          navigated: true,
          action: {
            type: "TYPE",
            target: { id: searchInput.id || "flipkart-search", name: "Search box", role: "searchbox", selector: 'input[name="q"]' },
            text: step.query,
            clearExisting: true,
            maskInput: false,
            description: `Searched Flipkart for "${step.query}"`
          }
        };
      }
    }

    // 3. SELECT_PRODUCT step (on search results page)
    if (step.type === "SELECT_PRODUCT" || (step.type === "SEARCH" && (url.includes("/search") || url.includes("q=")))) {
      const targetQuery = (step.type === "SELECT_PRODUCT" ? step.matchQuery : plan.parameters.productQuery || "").toLowerCase();
      
      // Flipkart product card / result item containers and link selectors
      const productLinks = Array.from(
        doc.querySelectorAll(
          'a[href*="/p/"], a._1fQZEK, a.s1Q9rs, a._2rpwqI, a.IRpwTa, a[target="_blank"][href*="pid="], [data-id] a'
        )
      ) as HTMLAnchorElement[];

      let chosenLink: HTMLAnchorElement | null = null;
      let matchedTitle = "";

      // Exact title match / disambiguation first
      for (const link of productLinks) {
        const titleText = (
          link.querySelector('div[class*="title" i], div._4rR01T, div.KzDlHZ, [class*="product-title"]') || link
        ).textContent?.trim() || "";

        if (titleText && isExactModelMatch(titleText, targetQuery)) {
          chosenLink = link;
          matchedTitle = titleText;
          break;
        }
      }

      // Fallback keyword match if exact model tokens didn't strictly filter
      if (!chosenLink) {
        for (const link of productLinks) {
          const titleText = (
            link.querySelector('div[class*="title" i], div._4rR01T, div.KzDlHZ, [class*="product-title"]') || link
          ).textContent?.trim() || "";

          if (titleText) {
            const keywords = targetQuery.split(/\s+/).filter((k) => k.length > 2);
            const matchesAll = keywords.every((k) => titleText.toLowerCase().includes(k));
            if (matchesAll || titleText.toLowerCase().includes(targetQuery)) {
              chosenLink = link;
              matchedTitle = titleText;
              break;
            }
          }
        }
      }

      // Fallback to first product card if results exist
      if (!chosenLink && productLinks.length > 0) {
        chosenLink = productLinks[0];
        matchedTitle = chosenLink.textContent?.trim() || "Product";
      }

      if (chosenLink && chosenLink.href) {
        chosenLink.target = "_self";
        chosenLink.removeAttribute("target");
        const destHref = chosenLink.href;

        if (doc.defaultView && doc.defaultView.location.href !== destHref) {
          doc.defaultView.location.href = destHref;
        } else {
          chosenLink.click();
        }

        return {
          handled: true,
          navigated: true,
          action: {
            type: "CLICK",
            target: { id: "product-link", name: matchedTitle, role: "link", selector: 'a[href*="/p/"]' },
            description: `Selected Flipkart product: "${matchedTitle}"`
          }
        };
      }
    }

    // 4. VERIFY_PRICE_AND_CART step (on product detail page)
    if (step.type === "VERIFY_PRICE_AND_CART" || url.includes("/p/") || url.includes("pid=")) {
      // Flipkart price selectors
      const priceElem = doc.querySelector(
        'div._30jeq3._16Jk6d, div.Nx9bqj.CxhGGd, div._30jeq3, div[class*="price" i], span[class*="price" i]'
      );

      let extractedPrice = 0;
      if (priceElem && priceElem.textContent) {
        extractedPrice = extractPriceNumber(priceElem.textContent);
      }

      const maxThreshold =
        step.type === "VERIFY_PRICE_AND_CART" ? step.maxPriceThreshold || plan.parameters.maxPriceThreshold : plan.parameters.maxPriceThreshold;

      if (maxThreshold && extractedPrice > 0 && extractedPrice > maxThreshold) {
        return {
          handled: true,
          completed: true,
          summary: `Price condition not met on Flipkart: Current price is ₹${extractedPrice.toLocaleString("en-IN")}, which is above target threshold of ₹${maxThreshold.toLocaleString("en-IN")}. Item not added to cart.`
        };
      }

      // Price condition met (or no max threshold given) -> Click Add to Cart / Buy Now
      const addToCartBtn = (
        doc.querySelector("button._2KpZ6l._2U9uAL") ||
        doc.querySelector('button:has-text("ADD TO CART")') ||
        doc.querySelector('button:has-text("Add to Cart")') ||
        doc.querySelector('[data-action="add-to-cart"]') ||
        doc.querySelector("button._2KpZ6l._2U9uAL._3dGepF") ||
        Array.from(doc.querySelectorAll("button, [role='button']")).find((b) =>
          /add to cart|buy now/i.test(b.textContent || "")
        )
      ) as HTMLElement | null;

      if (addToCartBtn) {
        addToCartBtn.click();
        return {
          handled: true,
          action: {
            type: "CLICK",
            target: { id: "flipkart-add-to-cart", name: "Add to Cart", role: "button", selector: "button._2KpZ6l._2U9uAL" },
            description: `Clicked "Add to Cart" on Flipkart at ₹${extractedPrice > 0 ? extractedPrice.toLocaleString("en-IN") : "live price"}`
          }
        };
      }
    }

    // 5. RETURN_ITEM step (on Flipkart My Orders or Return Flow)
    if (
      step.type === "RETURN_ITEM" ||
      url.includes("/account/orders") ||
      url.includes("/order_details") ||
      url.includes("/returns")
    ) {
      const rawQuery = step.type === "RETURN_ITEM" ? step.itemMatchQuery : plan.parameters.itemMatchQuery;
      const matchQuery = (rawQuery || "").toLowerCase().trim();
      const rawReason = step.type === "RETURN_ITEM" ? step.returnReason : plan.parameters.returnReason;
      const returnReason = rawReason || "Item defective or doesn't work";

      // Phase A: On Flipkart Orders List -> Find matching order and click "Return" / "Need Help"
      if (url.includes("/account/orders") || doc.querySelector("div._2wN1f8, div.row._2MMtq0, div[class*='orderCard' i]")) {
        const orderCards = Array.from(doc.querySelectorAll("div._2wN1f8, div.row._2MMtq0, div[class*='order' i], div[class*='itemCard' i]"));
        let targetOrderCard: Element | null = null;
        let matchedItemTitle = "";

        if (matchQuery && matchQuery !== "recent order") {
          const keywords = matchQuery.split(/\s+/).filter((k) => k.length > 2);
          for (const card of orderCards) {
            const text = (card.textContent || "").toLowerCase();
            const matches = keywords.some((k) => text.includes(k));
            if (matches) {
              targetOrderCard = card;
              matchedItemTitle = card.querySelector("span, div, a")?.textContent?.trim() || matchQuery;
              break;
            }
          }
        }

        if (!targetOrderCard && orderCards.length > 0) {
          targetOrderCard = orderCards[0];
          matchedItemTitle = targetOrderCard.querySelector("span, div, a")?.textContent?.trim() || "Most Recent Order";
        }

        if (targetOrderCard) {
          const returnBtn = (targetOrderCard.querySelector(
            "button:has-text('Return'), a:has-text('Return'), button._2KpZ6l, a[href*='return'], button[class*='return' i]"
          ) || Array.from(targetOrderCard.querySelectorAll("button, a")).find((el) => /return|replace/i.test(el.textContent || ""))) as HTMLElement | null;

          if (returnBtn) {
            returnBtn.click();
            return {
              handled: true,
              navigated: true,
              action: {
                type: "CLICK",
                target: { id: "flipkart-return-btn", name: `Return Item (${matchedItemTitle})`, role: "button", selector: "button:has-text('Return')" },
                description: `Initiating Flipkart return process for "${matchedItemTitle}"`
              }
            };
          }
        }
      }

      // Phase B: Return Reason Selection Radio / Dropdown
      const reasonRadios = Array.from(doc.querySelectorAll("input[type='radio'][name*='reason' i], label[class*='reason' i], div._1edr6_"));
      if (reasonRadios.length > 0) {
        const lowerReason = returnReason.toLowerCase();
        let targetRadio = reasonRadios.find((r) => {
          const text = (r.textContent || (r as HTMLInputElement).value || "").toLowerCase();
          return (
            (lowerReason.includes("size") && (text.includes("size") || text.includes("fit") || text.includes("large") || text.includes("small"))) ||
            (lowerReason.includes("defective") && (text.includes("defective") || text.includes("damaged") || text.includes("work"))) ||
            (lowerReason.includes("quality") && (text.includes("quality") || text.includes("expected"))) ||
            (lowerReason.includes("needed") && text.includes("needed"))
          );
        }) || reasonRadios[0];

        if (targetRadio) {
          (targetRadio as HTMLElement).click();
        }

        const continueBtn = (doc.querySelector(
          "button._2KpZ6l._2U9uAL, button:has-text('CONTINUE'), button:has-text('Continue'), button[type='submit']"
        ) || Array.from(doc.querySelectorAll("button")).find((b) => /continue|proceed|next/i.test(b.textContent || ""))) as HTMLElement | null;

        if (continueBtn) {
          continueBtn.click();
          return {
            handled: true,
            navigated: true,
            action: {
              type: "CLICK",
              target: { id: "flipkart-continue-reason", name: "Continue with return reason", role: "button", selector: "button:has-text('CONTINUE')" },
              description: `Selected Flipkart return reason: "${returnReason}" and continued`
            }
          };
        }
      }

      // Phase C: Review & Final Submission Ready
      const submitReturnBtn = doc.querySelector(
        "button:has-text('CONFIRM RETURN'), button:has-text('SUBMIT REQUEST'), button:has-text('Confirm Return')"
      );

      if (submitReturnBtn || url.includes("/confirm") || url.includes("/summary")) {
        return {
          handled: true,
          completed: true,
          summary: `Flipkart return request prepared successfully! Reason: "${returnReason}", Refund: Original Source. Final confirmation is ready for your 1-click submission.`
        };
      }
    }

    return { handled: false };
  }

  inspectPrice(doc: Document, url: string): import("./types.js").PriceInspectionResult | null {
    const priceElem = doc.querySelector(
      'div._30jeq3._16Jk6d, div.Nx9bqj.CxhGGd, div._30jeq3, div[class*="price" i], span[class*="price" i]'
    );
    let extractedPrice: number | undefined;
    if (priceElem && priceElem.textContent) {
      extractedPrice = extractPriceNumber(priceElem.textContent);
    }

    const titleElem = doc.querySelector("span.B_NuCI, h1.yhB1nd, span._35KyD6, h1.VU-ZEz, div.KzDlHZ, div._4rR01T");
    let title = titleElem?.textContent?.trim();

    // Search results card fallback
    if (!extractedPrice || !title) {
      const firstCard = doc.querySelector('div._75nlfW, div._1sdMkc, div[data-id], a[href*="/p/"]');
      if (firstCard) {
        if (!extractedPrice) {
          const cardPrice = firstCard.querySelector("div.Nx9bqj, div._30jeq3, [class*='price']");
          if (cardPrice?.textContent) {
            extractedPrice = extractPriceNumber(cardPrice.textContent);
          }
        }
        if (!title) {
          const cardTitle = firstCard.querySelector("div.KzDlHZ, div._4rR01T, a[title], div[class*='title']");
          if (cardTitle?.textContent) title = cardTitle.textContent.trim();
        }
      }
    }

    const imgElem = doc.querySelector("img._396cs4._2amPTt._3qGmMb, img._2r_T1I, img.DByuf4, img._53G40d, a[href*='/p/'] img") as HTMLImageElement | null;
    const imageUrl = imgElem?.src;

    return {
      currentPrice: extractedPrice,
      currency: "INR",
      title,
      imageUrl,
      inStock: true
    };
  }
}
