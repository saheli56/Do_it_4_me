import type { TaskCategory, BillingCycle } from "@difm/shared";

export interface DetectedBillInfo {
  providerName: string;
  category: TaskCategory;
  billingCycle: BillingCycle;
  dueAmount?: string;
  dueAmountNum?: number;
  dueDate?: string;
  daysRemaining?: number;
  consumerNumber?: string;
  customerName?: string;
  portalUrl: string;
  summaryText: string;
}

export function parseAmountDigits(text: string): { formatted: string; num: number } | null {
  const match = text.match(/(?:₹|Rs\.?|INR|\$)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!match || !match[1]) return null;
  const num = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(num) || num <= 0) return null;
  return {
    formatted: `₹${num.toLocaleString("en-IN")}`,
    num
  };
}

export function parseDueDateString(text: string): { isoDate?: string; daysRemaining?: number; displayDate?: string } {
  // 1. Matches DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
  const datePattern = /\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b|\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/;
  const match = text.match(datePattern);

  if (match) {
    let day = 1;
    let month = 1;
    let year = new Date().getFullYear();

    if (match[1] && match[2] && match[3]) {
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      let yr = parseInt(match[3], 10);
      if (yr < 100) yr += 2000;
      year = yr;
    } else if (match[4] && match[5] && match[6]) {
      year = parseInt(match[4], 10);
      month = parseInt(match[5], 10) - 1;
      day = parseInt(match[6], 10);
    }

    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const isoDate = `${year}-${mm}-${dd}`;
      return {
        isoDate,
        daysRemaining: diffDays,
        displayDate: parsedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      };
    }
  }

  // 2. Matches "Due in X days"
  const relativeMatch = text.match(/due\s+in\s+(\d+)\s+days?/i);
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1], 10);
    const target = new Date();
    target.setDate(target.getDate() + days);
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    const isoDate = `${target.getFullYear()}-${mm}-${dd}`;
    return {
      isoDate,
      daysRemaining: days,
      displayDate: `in ${days} days`
    };
  }

  // 3. Matches "15 Oct 2026", "25th October", etc.
  const wordMonthMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{2,4})?/i);
  if (wordMonthMatch) {
    const day = parseInt(wordMonthMatch[1], 10);
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(wordMonthMatch[2].toLowerCase().slice(0, 3));
    const year = wordMonthMatch[3] ? parseInt(wordMonthMatch[3], 10) : new Date().getFullYear();

    if (month >= 0) {
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const isoDate = `${year}-${mm}-${dd}`;
        return {
          isoDate,
          daysRemaining: diffDays,
          displayDate: parsedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        };
      }
    }
  }

  return {};
}

export function detectBillOnDocument(doc: Document, url: string): DetectedBillInfo | null {
  const host = (new URL(url).hostname || "").toLowerCase();
  const fullText = (doc.body?.innerText || "").slice(0, 40000);

  // 1. Identify Provider & Category
  let providerName = "";
  let category: TaskCategory = "GENERAL";
  let billingCycle: BillingCycle = "MONTHLY";

  if (host.includes("cesc.co.in") || /\bcesc\b\s*(?:limited|electricity)?/i.test(fullText)) {
    providerName = "CESC Electricity";
    category = "ELECTRICITY";
  } else if (host.includes("wbsedcl.in") || /\bwbsedcl\b/i.test(fullText)) {
    providerName = "WBSEDCL Electricity";
    category = "ELECTRICITY";
    billingCycle = "QUARTERLY";
  } else if (host.includes("bescom") || /\bbescom\b/i.test(fullText)) {
    providerName = "BESCOM Electricity";
    category = "ELECTRICITY";
  } else if (host.includes("airtel.in") || /airtel\s*(?:broadband|thanks|xstream|fiber|bill)?/i.test(fullText)) {
    providerName = "Airtel";
    category = host.includes("broadband") || /fiber|broadband/i.test(fullText) ? "INTERNET" : "MOBILE";
  } else if (host.includes("jio.com") || /jio\s*(?:fiber|airfiber|postpaid)?/i.test(fullText)) {
    providerName = "Jio";
    category = host.includes("fiber") || /fiber/i.test(fullText) ? "INTERNET" : "MOBILE";
  } else if (host.includes("hdfcbank.com") || /hdfc\s*(?:bank|credit\s*card)?/i.test(fullText)) {
    providerName = "HDFC Bank";
    category = "CREDIT_CARD";
  } else if (/electricity\s*bill|bill\s*payment|consumer\s*portal|utility\s*bill/i.test(fullText)) {
    const titleMatch = doc.title.match(/^([A-Za-z0-9\s\-]+?)(?:\s*[-|–]\s*|\s*:\s*|$)/);
    providerName = titleMatch ? titleMatch[1].trim() : "Utility Bill";
    category = "ELECTRICITY";
  } else {
    // Not a recognized billing portal
    return null;
  }

  // 2. Extract Due Amount
  let dueAmount = "";
  let dueAmountNum = 0;

  // Check designated amount containers
  const amountElements = Array.from(
    doc.querySelectorAll(
      ".bill-amount, .amount-due, .total-payable, .due-amount, #netAmount, #totalAmount, #payableAmount, .payable_amount, [data-testid*='amount'], [class*='payable' i], [class*='dueAmount' i]"
    )
  );

  for (const el of amountElements) {
    const parsed = parseAmountDigits(el.textContent || "");
    if (parsed && parsed.num > 10) {
      dueAmount = parsed.formatted;
      dueAmountNum = parsed.num;
      break;
    }
  }

  // Fallback regex over text snippets near keywords
  if (!dueAmount) {
    const amountRegex = /(?:Amount\s*Due|Total\s*Payable|Payable\s*Amount|Bill\s*Amount|Net\s*Payable|Total\s*Amount|Outstanding\s*Amount|Recharge\s*Amount)[\s:]*([₹Rs\.]*\s*[\d,]+(?:\.\d+)?)/i;
    const m = fullText.match(amountRegex);
    if (m && m[1]) {
      const parsed = parseAmountDigits(m[1]);
      if (parsed && parsed.num > 10) {
        dueAmount = parsed.formatted;
        dueAmountNum = parsed.num;
      }
    }
  }

  // 3. Extract Due Date
  let dueDate: string | undefined;
  let daysRemaining: number | undefined;
  let displayDueDate: string | undefined;

  const dueDateElements = Array.from(
    doc.querySelectorAll(".due-date, .payment-due, #dueDate, [data-testid*='due-date'], [class*='dueDate' i], [class*='payBy' i]")
  );

  for (const el of dueDateElements) {
    const parsedDate = parseDueDateString(el.textContent || "");
    if (parsedDate.isoDate) {
      dueDate = parsedDate.isoDate;
      daysRemaining = parsedDate.daysRemaining;
      displayDueDate = parsedDate.displayDate;
      break;
    }
  }

  if (!dueDate) {
    const dueDateRegex = /(?:Due\s*Date|Pay\s*By|Payment\s*Due\s*Date|Last\s*Date\s*of\s*Payment|Valid\s*Till)[\s:]*([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{2,4}|in\s+\d+\s+days)/i;
    const m = fullText.match(dueDateRegex);
    if (m && m[1]) {
      const parsedDate = parseDueDateString(m[1]);
      if (parsedDate.isoDate) {
        dueDate = parsedDate.isoDate;
        daysRemaining = parsedDate.daysRemaining;
        displayDueDate = parsedDate.displayDate;
      }
    }
  }

  // 4. Extract Consumer / Account Number
  let consumerNumber: string | undefined;

  // Check inputs or elements with consumer number IDs
  const consumerInput = doc.querySelector(
    "input[name*='consumer' i], input[id*='consumer' i], input[name*='account' i], input[id*='account' i], #consumer_no, #consumerNo, #caNumber, #kNo"
  ) as HTMLInputElement | null;

  if (consumerInput && consumerInput.value && consumerInput.value.length >= 6) {
    consumerNumber = consumerInput.value.trim();
  } else {
    const consMatch = fullText.match(/(?:Consumer\s*No\b|Consumer\s*ID\b|Account\s*No\b|A\/C\s*No\b|CA\s*Number\b|Consumer\s*Number\b|K\s*No\b|Customer\s*ID\b)\.?[\s:]*([A-Za-z0-9\-\/]{6,20})/i);
    if (consMatch && consMatch[1] && /\d/.test(consMatch[1])) {
      consumerNumber = consMatch[1].trim();
    }
  }

  // 5. Extract Customer Name
  let customerName: string | undefined;
  const nameMatch = fullText.match(/(?:Customer\s*Name|Consumer\s*Name|Name)[\s:]*([A-Za-z\s\.]{3,35})(?:\n|\r|\||<|$)/i);
  if (nameMatch && nameMatch[1] && !/due|amount|bill|date|number/i.test(nameMatch[1])) {
    customerName = nameMatch[1].trim();
  }

  // Must have at least an amount OR a consumer number OR a due date to qualify as a valid detected bill
  if (!dueAmount && !consumerNumber && !dueDate) {
    return null;
  }

  // Compose clean summary headline
  let summaryText = `${providerName} Bill Found`;
  if (dueAmount && daysRemaining !== undefined) {
    if (daysRemaining < 0) {
      summaryText = `${providerName} Overdue: ${dueAmount} (was due ${Math.abs(daysRemaining)} days ago)`;
    } else if (daysRemaining === 0) {
      summaryText = `${providerName} Due Today: ${dueAmount}`;
    } else {
      summaryText = `${providerName} Found: ${dueAmount} due in ${daysRemaining} days`;
    }
  } else if (dueAmount && displayDueDate) {
    summaryText = `${providerName} Found: ${dueAmount} (Due: ${displayDueDate})`;
  } else if (dueAmount) {
    summaryText = `${providerName} Bill Found: ${dueAmount}`;
  } else if (consumerNumber) {
    summaryText = `${providerName} Account Detected: #${consumerNumber}`;
  }

  return {
    providerName,
    category,
    billingCycle,
    dueAmount,
    dueAmountNum,
    dueDate,
    daysRemaining,
    consumerNumber,
    customerName,
    portalUrl: url,
    summaryText
  };
}
