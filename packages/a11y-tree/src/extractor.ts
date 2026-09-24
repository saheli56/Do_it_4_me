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
    if (textContent.length > 0 && textContent.length <= 120) {
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
        style.visibility === "hidden" ||
        style.opacity === "0"
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
  if (element.hasAttribute("onclick") || element.getAttribute("tabindex") === "0") return true;
  return false;
}

const SOCIAL_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "pinterest.com"
];

function isOffsiteSocialLink(href?: string): boolean {
  if (!href) return false;
  return SOCIAL_DOMAINS.some((domain) => href.toLowerCase().includes(domain));
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

      // Filter out offsite social media links so the agent doesn't get distracted
      if (isOffsiteSocialLink(rawHref)) {
        return;
      }

      const name = getAccessibleName(node);
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
      const semanticNode: SemanticNode = {
        id: `node-${nodeIdCounter++}`,
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

  // 1. Cloudflare Turnstile / Challenge
  const cfElem = doc.querySelector('iframe[src*="turnstile"], iframe[src*="cloudflare"], .cf-turnstile, #challenge-stage, #cf-challenge-running, #cf-wrapper');
  const title = (doc.title || "").toLowerCase();
  if (cfElem || title.includes("just a moment...") || title.includes("attention required! | cloudflare")) {
    return {
      type: "CLOUDFLARE",
      description: "Cloudflare bot protection or Turnstile verification active on page",
      detectedAt: Date.now()
    };
  }

  // 2. Google reCAPTCHA
  const recaptchaElem = doc.querySelector('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"], .g-recaptcha, #g-recaptcha');
  if (recaptchaElem && isElementVisible(recaptchaElem)) {
    return {
      type: "RECAPTCHA",
      description: "Google reCAPTCHA challenge detected",
      detectedAt: Date.now()
    };
  }

  // 3. hCaptcha
  const hcaptchaElem = doc.querySelector('iframe[src*="hcaptcha"], .h-captcha');
  if (hcaptchaElem && isElementVisible(hcaptchaElem)) {
    return {
      type: "HCAPTCHA",
      description: "hCaptcha verification challenge detected",
      detectedAt: Date.now()
    };
  }

  // 4. OTP / 2FA SMS & Email prompt
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

export function formatSemanticTreeForPrompt(nodes: SemanticNode[]): string {
  if (nodes.length === 0) {
    return "No interactive elements detected on page.";
  }

  return nodes
    .map((n) => {
      let desc = `[${n.id}] ${n.role.toUpperCase()}`;
      if (n.name) desc += ` "${n.name}"`;
      if (n.href) desc += ` (href: "${n.href}")`;
      if (n.value) desc += ` (value: "${n.value}")`;
      if (n.placeholder) desc += ` (placeholder: "${n.placeholder}")`;
      if (n.checked !== undefined) desc += ` [checked=${n.checked}]`;
      if (n.disabled) desc += ` [disabled]`;
      return desc;
    })
    .join("\n");
}
