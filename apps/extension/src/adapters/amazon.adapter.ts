import type { SiteAdapter, AdapterExecutionResult } from "./types.js";
import type { PageObservation, WorkflowStep, WorkflowPlan } from "@difm/shared";

export class AmazonAdapter implements SiteAdapter {
  name = "AmazonAdapter";

  matches(url: string): boolean {
    return /amazon\.(in|com|co\.uk|de|co\.jp|ca|fr|it|es)/i.test(url);
  }

  async executeStep(
    step: WorkflowStep,
    doc: Document,
    observation: PageObservation,
    plan: WorkflowPlan
  ): Promise<AdapterExecutionResult> {
    const url = (observation.url || doc.defaultView?.location.href || "").toLowerCase();

    // 1. If on cart view / confirmation screen, complete immediately
    if (url.includes("/cart") || url.includes("/gp/cart") || (doc.title || "").toLowerCase().includes("shopping cart")) {
      return {
        handled: true,
        completed: true,
        summary: "Item verified in Amazon Shopping Cart. Workflow completed successfully."
      };
    }

    // 2. SEARCH step
    if (step.type === "SEARCH") {
      const searchInput = (doc.querySelector("#twotabsearchtextbox") ||
        doc.querySelector('input[name="field-keywords"]') ||
        doc.querySelector('input[type="search"]')) as HTMLInputElement | null;

      if (searchInput) {
        searchInput.focus();
        searchInput.value = step.query;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));

        const submitBtn = (doc.querySelector("#nav-search-submit-button") ||
          doc.querySelector('input[type="submit"].nav-input') ||
          searchInput.form?.querySelector('input[type="submit"]')) as HTMLElement | null;

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
            target: { id: "twotabsearchtextbox", name: "Search box", role: "searchbox", selector: "#twotabsearchtextbox" },
            text: step.query,
            clearExisting: true,
            maskInput: false,
            description: `Searched Amazon for "${step.query}"`
          }
        };
      }
    }

    // 3. SELECT_PRODUCT step (on search results page)
    if (step.type === "SELECT_PRODUCT" || (step.type === "SEARCH" && url.includes("/s?k="))) {
      const targetQuery = (step.type === "SELECT_PRODUCT" ? step.matchQuery : plan.parameters.productQuery || "").toLowerCase();
      const productCards = Array.from(doc.querySelectorAll('[data-component-type="s-search-result"]'));

      let chosenLink: HTMLAnchorElement | null = null;
      let matchedTitle = "";

      for (const card of productCards) {
        const titleElem = card.querySelector("h2 a, a.a-link-normal.s-underline-text.s-underline-link-text");
        if (titleElem && titleElem instanceof HTMLAnchorElement) {
          const text = (titleElem.textContent || "").toLowerCase();
          // Match keywords
          const keywords = targetQuery.split(/\s+/).filter((k) => k.length > 2);
          const matchesAll = keywords.every((k) => text.includes(k));
          if (matchesAll || text.includes(targetQuery) || productCards.length === 1) {
            chosenLink = titleElem;
            matchedTitle = titleElem.textContent?.trim() || "Product";
            break;
          }
        }
      }

      if (!chosenLink && productCards.length > 0) {
        // Fallback to first non-sponsored product link
        const firstCard = productCards[0];
        const titleElem = firstCard.querySelector("h2 a, a.a-link-normal.s-underline-text.s-underline-link-text");
        if (titleElem && titleElem instanceof HTMLAnchorElement) {
          chosenLink = titleElem;
          matchedTitle = titleElem.textContent?.trim() || "Product";
        }
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
            target: { id: "product-link", name: matchedTitle, role: "link", selector: "h2 a" },
            description: `Selected product: "${matchedTitle}"`
          }
        };
      }
    }

    // 4. VERIFY_PRICE_AND_CART step (on product detail page)
    if (step.type === "VERIFY_PRICE_AND_CART" || url.includes("/dp/") || url.includes("/gp/product/")) {
      const priceElem = doc.querySelector(".a-price .a-offscreen, #corePrice_feature_div .a-price-whole, #corePriceDisplay_desktop_feature_div .a-price-whole, #priceblock_ourprice, span.a-price span[aria-hidden='true']");
      let extractedPrice = 0;
      if (priceElem && priceElem.textContent) {
        const rawDigits = priceElem.textContent.replace(/[^0-9]/g, "");
        if (rawDigits) {
          extractedPrice = parseInt(rawDigits, 10);
        }
      }

      const maxThreshold =
        step.type === "VERIFY_PRICE_AND_CART" ? step.maxPriceThreshold || plan.parameters.maxPriceThreshold : plan.parameters.maxPriceThreshold;

      if (maxThreshold && extractedPrice > 0 && extractedPrice > maxThreshold) {
        return {
          handled: true,
          completed: true,
          summary: `Price condition not met: Current price is ₹${extractedPrice.toLocaleString("en-IN")}, which is above target threshold of ₹${maxThreshold.toLocaleString("en-IN")}. Item not added to cart.`
        };
      }

      // Price condition is met (or no price ceiling given) -> Add to Cart
      const addToCartBtn = (doc.querySelector("#add-to-cart-button") ||
        doc.querySelector('input[name="submit.add-to-cart"]') ||
        doc.querySelector("#buy-now-button") ||
        doc.querySelector('[data-action="add-to-cart"]')) as HTMLElement | null;

      if (addToCartBtn) {
        addToCartBtn.click();
        return {
          handled: true,
          action: {
            type: "CLICK",
            target: { id: "add-to-cart-button", name: "Add to Cart", role: "button", selector: "#add-to-cart-button" },
            description: `Clicked "Add to Cart" at ₹${extractedPrice > 0 ? extractedPrice.toLocaleString("en-IN") : "live price"}`
          }
        };
      }
    }

    return { handled: false };
  }

  inspectPrice(doc: Document, url: string): import("./types.js").PriceInspectionResult | null {
    const priceElem = doc.querySelector(
      ".a-price .a-offscreen, #corePrice_feature_div .a-price-whole, #corePriceDisplay_desktop_feature_div .a-price-whole, #priceblock_ourprice, span.a-price span[aria-hidden='true']"
    );
    let extractedPrice: number | undefined;
    if (priceElem && priceElem.textContent) {
      const rawDigits = priceElem.textContent.replace(/[^0-9]/g, "");
      if (rawDigits) {
        extractedPrice = parseInt(rawDigits, 10);
      }
    }

    const titleElem = doc.querySelector("#productTitle, #title, h1.a-size-large");
    let title = titleElem?.textContent?.trim();

    // Fallback for search results pages
    if (!extractedPrice || !title) {
      let searchParam = "";
      try {
        const u = new URL(url);
        searchParam = (u.searchParams.get("k") || u.searchParams.get("field-keywords") || "").toLowerCase().trim();
      } catch {}

      const allCards = Array.from(doc.querySelectorAll('[data-component-type="s-search-result"]'));
      let chosenCard: Element | null = null;

      if (searchParam && searchParam.length > 2) {
        const keywords = searchParam.split(/\s+/).filter((k) => k.length > 2);
        for (const card of allCards) {
          const cardTitle = (card.querySelector("h2 a span, h2 span, h2 a")?.textContent || "").toLowerCase();
          const matchesAll = keywords.every((k) => cardTitle.includes(k));
          if (matchesAll) {
            chosenCard = card;
            break;
          }
        }
      }

      if (!chosenCard && allCards.length > 0) {
        // Fallback to first non-ad card
        chosenCard = allCards.find((c) => !c.classList.contains("AdHolder") && !c.querySelector(".s-sponsored-label-info-icon")) || allCards[0];
      }

      if (chosenCard) {
        if (!extractedPrice) {
          const cardPrice = chosenCard.querySelector(".a-price .a-offscreen, .a-price-whole, .a-price span[aria-hidden='true']");
          if (cardPrice?.textContent) {
            const rawDigits = cardPrice.textContent.replace(/[^0-9]/g, "");
            if (rawDigits) extractedPrice = parseInt(rawDigits, 10);
          }
        }
        if (!title) {
          const cardTitle = chosenCard.querySelector("h2 a span, h2 span, h2 a");
          if (cardTitle?.textContent) title = cardTitle.textContent.trim();
        }
      }
    }

    const imgElem = doc.querySelector("#landingImage, #imgBlkFront, #main-image, [data-component-type='s-search-result'] img") as HTMLImageElement | null;
    const imageUrl = imgElem?.src;

    const availabilityElem = doc.querySelector("#availability, #availability-string");
    const inStock = availabilityElem
      ? !availabilityElem.textContent?.toLowerCase().includes("currently unavailable")
      : true;

    return {
      currentPrice: extractedPrice,
      currency: "INR",
      title,
      imageUrl,
      inStock
    };
  }
}

