import { describe, expect, it } from "vitest";
import { promptExamples } from "./prompt-examples";

describe("promptExamples", () => {
  it("does not suggest cross-document comparison for one selected source", () => {
    expect(promptExamples(1)).not.toContain("Compare the methods across these papers");
  });

  it("offers comparison when multiple sources are selected", () => {
    expect(promptExamples(2)).toContain("Compare the methods across these papers");
  });
});
