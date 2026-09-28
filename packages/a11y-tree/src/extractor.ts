import type { SemanticNode } from "@difm/shared";

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "searchbox",
  "menuitem",
  "option",
  "tab",
  "switch"
]);

const INTERACTIVE_TAGS = new Set([
  "BUTTON",
  "A",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "DETAILS",
  "SUMMARY"
]);

const IGNORED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "PATH",
  "IFRAME",
  "OBJECT"
]);

export function getAccessibleRole(element: Element): string {
  const explicitRole = element.getAttribute("role");
  if (explicitRole) {
    return explicitRole.trim().toLowerCase();
  }

  const tagName = element.tagName.toUpperCase();
  if (tagName === "A" && element.hasAttribute("href")) return "link";
  if (tagName === "BUTTON") return "button";
  if (tagName === "INPUT") {
    const type = (element.getAttribute("type") || "text").toLowerCase();
    if (type === "button" || type === "submit" || type === "reset") return "button";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "search") return "searchbox";
    return "textbox";
  }
  if (tagName === "SELECT") return "combobox";
  if (tagName === "TEXTAREA") return "textbox";
  if (tagName === "SUMMARY") return "button";

  return "generic";
}

export function getAccessibleName(element: Element): string {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const target = element.ownerDocument?.getElementById(ariaLabelledBy);
    if (target && target.textContent) {
      return target.textContent.trim();
    }
  }

  const isControlElement =
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT";

  if (isControlElement) {
    const control = element as unknown as { labels?: NodeListOf<HTMLLabelElement>; placeholder?: string };
    if (control.labels && control.labels.length > 0) {
      const labelText = Array.from(control.labels)
        .map((l) => l.textContent?.trim() || "")
        .filter(Boolean)
        .join(" ");
      if (labelText) return labelText;
    }

    if (element.id) {
      const labelFor = element.ownerDocument?.querySelector(`label[for="${escapeCss(element.id)}"]`);
      if (labelFor && labelFor.textContent) {
        return labelFor.textContent.trim();
      }
    }

    const placeholder = element.getAttribute("placeholder");
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }
  }

  const title = element.getAttribute("title");
  if (title && title.trim()) {
    return title.trim();
  }

  const alt = element.getAttribute("alt");
  if (alt && alt.trim()) {
    return alt.trim();
  }

  if (element.tagName !== "SELECT") {
    const textContent = element.textContent?.trim().replace(/\s+/g, " ") || "";
    if (textContent.length > 0 && textContent.length <= 300) {
      return textContent;
    }
  }

  return "";
}

function escapeCss(str: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(str);
  }
  return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

export function generateStableSelector(element: Element): string {
  const testId =
    element.getAttribute("data-testid") ||
    element.getAttribute("data-test") ||
    element.getAttribute("data-qa");
  if (testId) {
    return `[data-testid="${escapeCss(testId)}"]`;
  }

  if (element.id && !/^\d/.test(element.id)) {
    return `#${escapeCss(element.id)}`;
  }

  const name = element.getAttribute("name");
  if (name) {
    return `${element.tagName.toLowerCase()}[name="${escapeCss(name)}"]`;
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return `${element.tagName.toLowerCase()}[aria-label="${escapeCss(ariaLabel)}"]`;
  }

  const tag = element.tagName.toLowerCase();
  let parent = element.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(parent.children).filter((c) => c.tagName === element.tagName);
  if (siblings.length > 1) {
    const index = siblings.indexOf(element) + 1;
    return `${tag}:nth-of-type(${index})`;
  }

  return tag;
}

export function isElementVisible(element: Element): boolean {
  if (IGNORED_TAGS.has(element.tagName.toUpperCase())) return false;

  const ariaHidden = element.getAttribute("aria-hidden");
  if (ariaHidden === "true") return false;

  const hidden = element.getAttribute("hidden");
  if (hidden !== null) return false;

  if (typeof window !== "undefined" && window.getComputedStyle) {
    try {
      const style = window.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden"
      ) {
        return false;
      }
    } catch {
      return true;
    }
  }

  return true;
}

export function isElementInteractive(element: Element, role: string): boolean {
  if (INTERACTIVE_TAGS.has(element.tagName.toUpperCase())) return true;
  if (INTERACTIVE_ROLES.has(role)) return true;
  if (
    element.hasAttribute("onclick") ||
    element.getAttribute("tabindex") === "0" ||
    element.hasAttribute("data-toggle") ||
    element.hasAttribute("data-bs-toggle")
  ) {
    return true;
  }
  return false;
}

const SOCIAL_KEYWORDS = [
  "facebook",
  "fb.com",
  "twitter",
  "x.com",
  "instagram",
  "linkedin",
  "youtube",
  "pinterest",
  "whatsapp",
  "telegram",
  "social-share",
  "social_share"
];

function isSocialElement(element: Element, href?: string, name?: string): boolean {
  const checkStr = [
    href || "",
    name || "",
    element.getAttribute("aria-label") || "",
    element.getAttribute("title") || "",
    element.getAttribute("id") || "",
    element.className && typeof element.className === "string" ? element.className : "",
    element.getAttribute("onclick") || ""
  ]
    .join(" ")
    .toLowerCase();

  // Also check child img alt or svgs
  const imgAlt = element.querySelector("img")?.getAttribute("alt") || "";
  const fullContext = `${checkStr} ${imgAlt.toLowerCase()}`;

  return SOCIAL_KEYWORDS.some((kw) => fullContext.includes(kw));
}

function findCardContext(element: Element): { price?: string; title?: string } {
  try {
    const card = element.closest(
      '[data-component-type="s-search-result"], .s-result-item, [data-asin]:not([data-asin=""]), .product-card, .s-card-container, div[data-id], ._1AtVbE, .product-item, .s-result-card'
    );
    if (!card) return {};

    // 1. Extract accurate current selling price (excluding strikethrough/MRP)
    let price: string | undefined = undefined;
    const priceEl = card.querySelector(
      '.a-price:not(.a-text-price) .a-offscreen, .a-price:not(.a-text-price) .a-price-whole, [data-a-color="price"]:not(.a-text-price), .Nx9bqj, ._30jeq3, span[class*="price" i]:not([class*="strike" i]):not([class*="mrp" i])'
    );
    if (priceEl && priceEl.textContent) {
      const txt = priceEl.textContent.trim().replace(/\s+/g, " ");
      if (txt && /[\d,]+/.test(txt)) {
        price = txt.startsWith("₹") || txt.startsWith("$") ? txt : `₹${txt}`;
      }
    }

    // 2. Extract product title inside the same card
    let title: string | undefined = undefined;
    const titleEl = card.querySelector('h2 a, h2 span, .a-size-medium, .a-size-base-plus, ._4rR01T, .KzDlHZ, a[class*="title" i]');
    if (titleEl && titleEl.textContent) {
      const t = titleEl.textContent.trim().replace(/\s+/g, " ");
      if (t.length > 5) {
        title = t.length > 60 ? t.slice(0, 57) + "..." : t;
      }
    }

    return { price, title };
  } catch {
    return {};
  }
}

export function extractSemanticNodes(root: Element = document.body): SemanticNode[] {
  const results: SemanticNode[] = [];
  let nodeIdCounter = 1;

  function traverse(node: Element) {
    if (!isElementVisible(node)) {
      return;
    }

    const role = getAccessibleRole(node);
    const isInteractive = isElementInteractive(node, role);

    if (isInteractive) {
      const rawHref = node.tagName === "A" ? node.getAttribute("href") || undefined : undefined;
      let name = getAccessibleName(node);

      // Completely filter out social media links/buttons/icons so the agent never gets distracted
      if (isSocialElement(node, rawHref, name)) {
        return;
      }

      // Associate contextual price and product info for e-commerce search cards
      if (role === "link" || role === "button") {
        const { price: cardPrice, title: cardTitle } = findCardContext(node);
        if (cardPrice) {
          if (role === "button" && (name.toLowerCase().includes("add to cart") || name.toLowerCase().includes("buy"))) {
            name = `${name} [for "${cardTitle || "product"}" at ${cardPrice}]`;
          } else if (!name.includes(cardPrice)) {
            name = `${name} [Current Price: ${cardPrice}]`;
          }
        }
      }

      const selector = generateStableSelector(node);

      let bounds = { x: 0, y: 0, width: 0, height: 0 };
      if (typeof node.getBoundingClientRect === "function") {
        try {
          const rect = node.getBoundingClientRect();
          bounds = {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        } catch {
          bounds = { x: 0, y: 0, width: 0, height: 0 };
        }
      }

      const inputElem = node as HTMLInputElement;
      const rawValue = inputElem.value;
      const nodeId = `node-${nodeIdCounter++}`;
      try {
        node.setAttribute("data-difm-id", nodeId);
      } catch {}

      const semanticNode: SemanticNode = {
        id: nodeId,
        role,
        name,
        href: rawHref,
        selector,
        bounds,
        isInteractive: true,
        value: typeof rawValue === "string" ? rawValue : undefined,
        placeholder: inputElem.placeholder || undefined,
        checked: typeof inputElem.checked === "boolean" ? inputElem.checked : undefined,
        disabled: typeof inputElem.disabled === "boolean" ? inputElem.disabled : undefined
      };

      results.push(semanticNode);
    }

    const children = Array.from(node.children);
    for (const child of children) {
      traverse(child);
    }
  }

  traverse(root);
  return results;
}

export function detectSecurityChallenge(doc: Document = typeof document !== "undefined" ? document : (globalThis.document as Document)): import("@difm/shared").SecurityChallenge | undefined {
  if (!doc) return undefined;

  // 1. Cloudflare Turnstile / Challenge (standalone blocking screen)
  const cfElem = doc.querySelector('iframe[src*="turnstile"], iframe[src*="cloudflare"], #challenge-stage, #cf-challenge-running, #cf-wrapper');
  const title = (doc.title || "").toLowerCase();
  if (cfElem || title.includes("just a moment...") || title.includes("attention required! | cloudflare")) {
    return {
      type: "CLOUDFLARE",
      description: "Cloudflare bot protection or Turnstile verification active on page",
      detectedAt: Date.now()
    };
  }

  // 2. Full-page blocking Google reCAPTCHA / hCaptcha (e.g. Google sorry/unusual traffic or standalone captcha screen)
  const bodyText = (doc.body && doc.body.innerText) ? doc.body.innerText.toLowerCase() : "";
  const isBlockingCaptchaPage =
    bodyText.includes("our systems have detected unusual traffic") ||
    bodyText.includes("please complete the security check to access") ||
    title.includes("security check") ||
    (title.includes("captcha") && !title.includes("demo"));

  if (isBlockingCaptchaPage) {
    const recaptchaElem = doc.querySelector('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"], .g-recaptcha, #g-recaptcha, iframe[src*="hcaptcha"], .h-captcha');
    if (recaptchaElem && isElementVisible(recaptchaElem)) {
      return {
        type: "RECAPTCHA",
        description: "Google reCAPTCHA / security challenge detected",
        detectedAt: Date.now()
      };
    }
  }

  // 3. OTP / 2FA SMS & Email prompt
  const otpInput = doc.querySelector(
    'input[autocomplete="one-time-code"], input[name*="otp" i], input[id*="otp" i], input[name*="2fa" i], input[id*="2fa" i], input[placeholder*="otp" i], input[placeholder*="verification code" i]'
  );
  if (otpInput && isElementVisible(otpInput)) {
    return {
      type: "OTP",
      description: "SMS / Email One-Time Password (OTP) or 2FA verification prompt detected",
      detectedAt: Date.now()
    };
  }

  return undefined;
}

export function detectProductContext(doc: Document = typeof document !== "undefined" ? document : (globalThis.document as Document)): import("@difm/shared").ProductContext | undefined {
  if (!doc) return undefined;

  try {
    // 1. Check if dedicated product details page (Amazon / Flipkart / generic e-commerce)
    const productTitleEl = doc.querySelector(
      '#productTitle, h1.a-size-large, span.B_NuCI, .product-title, h1[class*="product" i], h1[class*="title" i]'
    );
    const addToCartEl = doc.querySelector(
      '#add-to-cart-button, #add-to-cart-button-ubb, input[name="submit.add-to-cart"], button[name="submit.add-to-cart"], button._2KpZ6l._2U9uOA._3v1-ww, button[class*="add-to-cart" i], [id*="add-to-cart" i], [aria-label*="Add to Cart" i]'
    );
    const buyNowEl = doc.querySelector(
      '#buy-now-button, input[name="submit.buy-now"], button[name="submit.buy-now"], button._2KpZ6l._2U9uOA._12ko4O, button[class*="buy-now" i], [id*="buy-now" i], [aria-label*="Buy Now" i]'
    );

    let currentPriceText: string | undefined = undefined;
    const priceEl = doc.querySelector(
      '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #corePrice_desktop .a-price-whole, .priceToPay .a-price-whole, .apexPriceToPay .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, span.a-price span.a-offscreen, ._30jeq3._16Jk6d, [class*="priceToPay" i], .product-price'
    );
    if (priceEl && priceEl.textContent) {
      currentPriceText = priceEl.textContent.trim().replace(/\s+/g, " ");
    }

    const inStockEl = doc.querySelector('#availability, .availability, [id*="availability" i]');
    const isOutOfStock = inStockEl && /currently unavailable|out of stock/i.test(inStockEl.textContent || "");

    const addToCartNodeId = addToCartEl ? addToCartEl.getAttribute("data-difm-id") || undefined : undefined;
    const buyNowNodeId = buyNowEl ? buyNowEl.getAttribute("data-difm-id") || undefined : undefined;

    let priceNumber: number | undefined = undefined;
    if (currentPriceText) {
      const numMatch = currentPriceText.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
      if (numMatch) priceNumber = parseFloat(numMatch[1]);
    }

    // 2. Search results page check
    const searchResultCards = doc.querySelectorAll(
      '[data-component-type="s-search-result"], .s-result-item[data-asin]:not([data-asin=""]), div[data-id]'
    );
    const searchResults: Array<{ nodeId: string; title: string; price?: string; priceNumber?: number }> = [];

    if (searchResultCards.length > 0) {
      searchResultCards.forEach((card) => {
        const titleLink = card.querySelector('h2 a, a.a-link-normal.s-underline-text, a[href*="/dp/"], a[class*="product" i]');
        const cardPriceEl = card.querySelector('.a-price .a-offscreen, .a-price-whole, ._30jeq3');
        if (titleLink) {
          const nodeId = titleLink.getAttribute("data-difm-id") || "";
          const title = titleLink.textContent?.trim().replace(/\s+/g, " ") || "";
          const price = cardPriceEl?.textContent?.trim().replace(/\s+/g, " ");
          let num: number | undefined = undefined;
          if (price) {
            const m = price.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
            if (m) num = parseFloat(m[1]);
          }
          if (nodeId && title) {
            searchResults.push({ nodeId, title, price, priceNumber: num });
          }
        }
      });
    }

    if (productTitleEl || addToCartEl || currentPriceText || searchResults.length > 0) {
      return {
        productTitle: productTitleEl?.textContent?.trim().replace(/\s+/g, " ") || undefined,
        price: currentPriceText,
        priceNumber,
        currency: currentPriceText?.includes("₹") ? "INR" : currentPriceText?.includes("$") ? "USD" : undefined,
        inStock: !isOutOfStock,
        addToCartNodeId,
        buyNowNodeId,
        searchResults: searchResults.length > 0 ? searchResults.slice(0, 15) : undefined
      };
    }
  } catch {}

  return undefined;
}

export function formatSemanticTreeForPrompt(
  nodes: SemanticNode[],
  maxNodes = 140,
  maxChars = 11000,
  productContext?: import("@difm/shared").ProductContext
): string {
  const headerLines: string[] = [];

  if (productContext) {
    if (productContext.productTitle || productContext.price) {
      headerLines.push("=== E-COMMERCE PRODUCT PAGE CONTEXT ===");
      if (productContext.productTitle) headerLines.push(`* DETECTED PRODUCT: ${productContext.productTitle}`);
      if (productContext.price) headerLines.push(`* DETECTED CURRENT PRICE: ${productContext.price} (${productContext.inStock ? "IN STOCK" : "OUT OF STOCK"})`);
      if (productContext.addToCartNodeId) headerLines.push(`* ADD TO CART ACTION: [${productContext.addToCartNodeId}] BUTTON "Add to Cart"`);
      if (productContext.buyNowNodeId) headerLines.push(`* BUY NOW ACTION: [${productContext.buyNowNodeId}] BUTTON "Buy Now"`);
      headerLines.push("========================================");
    } else if (productContext.searchResults && productContext.searchResults.length > 0) {
      headerLines.push("=== SEARCH RESULTS MATCHES ===");
      for (const res of productContext.searchResults.slice(0, 8)) {
        headerLines.push(`* [${res.nodeId}] "${res.title}" -> Price: ${res.price || "N/A"}`);
      }
      headerLines.push("==============================");
    }
  }

  if (!nodes || nodes.length === 0) {
    return headerLines.length > 0 ? headerLines.join("\n") + "\n\nNo other interactive elements detected on page." : "No interactive elements detected on page.";
  }

  // Segment elements so product/content links aren't starved out by 100+ sidebar filter checkboxes
  const inputs: SemanticNode[] = [];
  const buttons: SemanticNode[] = [];
  const contentLinks: SemanticNode[] = [];
  const otherControls: SemanticNode[] = [];

  for (const n of nodes) {
    const role = (n.role || "").toLowerCase();
    const name = (n.name || "").trim();

    if (role === "textbox" || role === "searchbox" || role === "combobox") {
      inputs.push(n);
    } else if (role === "button" || role === "summary") {
      buttons.push(n);
    } else if (role === "link") {
      // Descriptive links (e.g. product titles, search items, category pages)
      if (name.length > 5 || n.href) {
        contentLinks.push(n);
      } else {
        otherControls.push(n);
      }
    } else {
      otherControls.push(n);
    }
  }

  // Prioritize primary action buttons like Add to Cart
  buttons.sort((a, b) => {
    const aName = (a.name || "").toLowerCase();
    const bName = (b.name || "").toLowerCase();
    const aPri = aName.includes("cart") || aName.includes("buy") || aName.includes("pay") || aName.includes("submit") ? 1 : 0;
    const bPri = bName.includes("cart") || bName.includes("buy") || bName.includes("pay") || bName.includes("submit") ? 1 : 0;
    return bPri - aPri;
  });

  // Allocate slots fairly
  const selectedNodes: SemanticNode[] = [
    ...inputs.slice(0, 25),
    ...buttons.slice(0, 35),
    ...contentLinks.slice(0, 65),
    ...otherControls.slice(0, 20)
  ];

  const lines: string[] = headerLines.length > 0 ? [...headerLines, ""] : [];
  let totalLen = lines.join("\n").length;

  for (const n of selectedNodes) {
    let desc = `[${n.id}] ${n.role.toUpperCase()}`;
    if (n.name) {
      const cleanName = n.name.length > 90 ? n.name.slice(0, 87) + "..." : n.name;
      desc += ` "${cleanName}"`;
    }
    if (n.value) {
      const cleanVal = n.value.length > 50 ? n.value.slice(0, 47) + "..." : n.value;
      desc += ` (value: "${cleanVal}")`;
    }
    if (n.placeholder) {
      const cleanPl = n.placeholder.length > 50 ? n.placeholder.slice(0, 47) + "..." : n.placeholder;
      desc += ` (placeholder: "${cleanPl}")`;
    }
    if (n.href) {
      const cleanHref = n.href.length > 100 ? n.href.slice(0, 97) + "..." : n.href;
      desc += ` (href: "${cleanHref}")`;
    }
    if (n.checked !== undefined) desc += ` [checked=${n.checked}]`;
    if (n.disabled) desc += ` [disabled]`;

    if (totalLen + desc.length + 1 > maxChars) {
      lines.push(`... [${nodes.length - lines.length} more interactive elements omitted for length]`);
      break;
    }
    lines.push(desc);
    totalLen += desc.length + 1;
  }

  return lines.join("\n");
}
