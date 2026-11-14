import { describe, expect, it } from "vitest";
import { assertPageBudget, createTextBudget, MAX_PDF_PAGES } from "./pdf-budget";

describe("PDF derived-work budgets", () => {
  it("rejects excessive page metadata before extraction", () => {
    expect(() => assertPageBudget(MAX_PDF_PAGES + 1)).toThrow(/page limit/i);
  });

  it("rejects cumulative extracted text beyond the limit", () => {
    const budget = createTextBudget({ maxCharacters: 10, maxDurationMs: 10_000, startedAt: 0, now: () => 1 });
    budget.add(6);
    expect(() => budget.add(5)).toThrow(/text limit/i);
  });

  it("rejects work after the processing deadline", () => {
    const budget = createTextBudget({ maxCharacters: 100, maxDurationMs: 10, startedAt: 0, now: () => 11 });
    expect(() => budget.add(1)).toThrow(/too long/i);
  });
});
