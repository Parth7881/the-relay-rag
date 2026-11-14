import { describe, expect, it } from "vitest";
import { askRequestSchema, buildGroundedMessages } from "./ask-contract";

const evidence = [{ id: "S1", documentId: "doc", documentName: "Paper.pdf", page: 4, text: "Attention replaces recurrence." }];

describe("ask request contract", () => {
  it("accepts a bounded grounded question", () => {
    expect(askRequestSchema.safeParse({ question: "What replaces recurrence?", evidence }).success).toBe(true);
  });

  it("rejects empty evidence and oversized questions", () => {
    expect(askRequestSchema.safeParse({ question: "hello", evidence: [] }).success).toBe(false);
    expect(askRequestSchema.safeParse({ question: "x".repeat(2001), evidence }).success).toBe(false);
  });

  it("separates untrusted evidence from system instructions", () => {
    const messages = buildGroundedMessages("What replaces recurrence?", evidence);
    expect(messages[0].content).toContain("untrusted reference data");
    expect(messages[1].content).toContain("<evidence id=\"S1\"");
  });
});
