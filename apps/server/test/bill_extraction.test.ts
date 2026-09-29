import { describe, it, expect, vi } from "vitest";
import { PlannerService, normalizeExtractedUrl } from "../src/planner.js";

describe("Bill Document Extraction & Parsing", () => {
  const planner = new PlannerService("dummy_key", "https://api.groq.com/openai/v1", "qwen/qwen3.8-27b");

  it("normalizes extracted URLs and fixes OCR typos like cesc.con / cesc.coin", () => {
    expect(normalizeExtractedUrl("https://www.cesc.con")).toBe("https://www.cesc.co.in");
    expect(normalizeExtractedUrl("cesc.con")).toBe("https://www.cesc.co.in");
    expect(normalizeExtractedUrl("cesc.coin")).toBe("https://www.cesc.co.in");
    expect(normalizeExtractedUrl("http://cesc.co.in")).toBe("https://www.cesc.co.in");
    expect(normalizeExtractedUrl(undefined, "CESC Limited Electricity Bill portal: cesc.con")).toBe("https://www.cesc.co.in");
  });

  it("extracts biller, consumer number, due date, portalUrl, and amount via heuristic fallback", async () => {
    // Ensure instant fallback by mocking offline / failed LLM response
    const spy = vi.spyOn(planner["client"].chat.completions, "create").mockRejectedValueOnce(new Error("LLM offline"));
    
    const billSampleText = `
      CESC Limited - Electricity Bill for August 2026
      Consumer ID: 102938492019
      Customer Name: Saheli Mukherjee
      Bill Due Date: 2026-10-15
      Net Payable Amount: Rs. 1,450.00
      Subdivision: Central Kolkata Zone
      Payment website: https://www.cesc.con
    `;

    const result = await planner.extractBillDetails({
      text: billSampleText,
      filename: "CESC_Electricity_Bill_Aug2026.pdf"
    });

    expect(result).toBeDefined();
    expect(result.billerName).toContain("CESC");
    expect(result.consumerNumber).toBe("102938492019");
    expect(result.dueDate).toBe("2026-10-15");
    expect(result.dueAmount).toContain("1,450.00");
    expect(result.category).toBe("ELECTRICITY");
    expect(result.customerName).toBe("Saheli Mukherjee");
    expect(result.portalUrl).toBe("https://www.cesc.co.in");
  });

  it("extracts mobile / broadband invoice correctly", async () => {
    vi.spyOn(planner["client"].chat.completions, "create").mockRejectedValueOnce(new Error("LLM offline"));
    const rechargeSampleText = `
      Airtel Broadband Fiber Receipt
      Account Number: 8888989261
      Amount Due: ₹999.00
      Due Date: 2026-10-02
    `;

    const result = await planner.extractBillDetails({
      text: rechargeSampleText,
      filename: "Airtel_Fiber_Receipt.png"
    });

    expect(result).toBeDefined();
    expect(result.billerName).toContain("Mobile / Broadband");
    expect(result.consumerNumber).toBe("8888989261");
    expect(result.dueDate).toBe("2026-10-02");
    expect(result.dueAmount).toContain("999.00");
    expect(result.category).toBe("MOBILE");
  });
});

